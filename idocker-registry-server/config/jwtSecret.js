/**
 * JWT signing secret resolution
 *
 * JWT 是自包含令牌——服务端不查库，只验签名，所以**谁掌握这个密钥谁就能伪造任意身份**
 * （包括构造一个 role=admin 的 token）。它因此不能是写在代码里的固定值（本仓库是公开的，
 * 任何默认值都等于公开密钥），也不该逼着部署者手抄一串随机串。
 *
 * 解析顺序：
 *   1. 环境变量 JWT_SECRET —— 显式指定，多实例共享同一密钥时用这个
 *   2. <数据目录>/.env 里的 JWT_SECRET —— 首次启动生成后持久化在这里
 *   3. 都没有时：生成 48 字节随机值、写入该文件、之后一直复用
 *   4. 兼容：若 .env 里还没有，但历史文件 <数据目录>/.jwt_secret 存在，则迁移其值
 *
 * 文件与 registry.db 同目录（容器内是 /app/data，bind mount 持久化），权限 0600。
 * 密钥只存在于挂载的数据卷里，从不进镜像。
 *
 * ⚠️ 这个 .env 是**存储载体**，后端不会去加载它：dotenv 读的是进程工作目录下的 .env
 * （生产是 /app/.env，开发是 /app/idocker/.env），不是 /app/data/.env。即便将来被加载
 * 也无害——加载进来的正是同一个 JWT_SECRET 值。文件按 KEY=VALUE 行读写，只增改
 * JWT_SECRET 这一行，其余行原样保留。
 *
 * ⚠️ 首次部署（或删除该文件后）会生成新密钥，所有已签发 token 随之失效，
 * 在线用户需要重新登录一次。从历史版本升级时会自动迁移，不会踢掉在线用户。
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DB_PATH } from './env.js';
import { logger } from '../utils/logger.js';

const DATA_DIR = path.dirname(DB_PATH);
const ENV_FILE = path.join(DATA_DIR, '.env');
const LEGACY_SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');
const SECRET_KEY = 'JWT_SECRET';
const SECRET_FILE_MODE = 0o600;
const ENV_LINE_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

let cachedSecret = null;

function generateSecret() {
  return crypto.randomBytes(48).toString('hex');
}

function stripQuotes(value) {
  const v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1).trim();
  }
  return v;
}

function readFileOrNull(file, label) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // 文件存在但读不出来（权限、损坏）不能当作"没有"静默处理：
      // 那会悄悄生成新密钥，把所有人的会话踢掉，且每次重启重复发生。
      logger.error(`${label} exists but cannot be read (${file}): ${error.message}`);
    }
    return null;
  }
}

function readSecretFromEnvFile() {
  const content = readFileOrNull(ENV_FILE, 'JWT secret env file');
  if (!content) {
    return null;
  }
  for (const line of content.split('\n')) {
    const match = line.match(ENV_LINE_RE);
    if (match && match[1] === SECRET_KEY) {
      return stripQuotes(match[2]) || null;
    }
  }
  return null;
}

function readLegacySecret() {
  const content = readFileOrNull(LEGACY_SECRET_FILE, 'Legacy JWT secret file');
  return content ? content.trim() || null : null;
}

/** 生成新的 .env 内容：替换已有的 JWT_SECRET 行，没有就追加，其余行原样保留。 */
function upsertSecretLine(content, secret) {
  const trimmed = (content || '').replace(/\n+$/, '');
  const lines = trimmed ? trimmed.split('\n') : [];
  const entry = `${SECRET_KEY}=${secret}`;
  const index = lines.findIndex(line => {
    const match = line.match(ENV_LINE_RE);
    return match && match[1] === SECRET_KEY;
  });
  if (index >= 0) {
    lines[index] = entry;
  } else {
    lines.push(entry);
  }
  return `${lines.join('\n')}\n`;
}

function persistSecret(secret) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const next = upsertSecretLine(readFileOrNull(ENV_FILE, 'JWT secret env file') || '', secret);
    fs.writeFileSync(ENV_FILE, next, { mode: SECRET_FILE_MODE });
    try {
      // writeFileSync 的 mode 只在创建文件时生效，已存在时需要显式收紧权限
      fs.chmodSync(ENV_FILE, SECRET_FILE_MODE);
    } catch {
      // 改不动权限不影响正确性，忽略
    }
    logger.info(`JWT secret persisted to ${ENV_FILE}`);
    return true;
  } catch (error) {
    logger.error(
      `JWT secret was generated but could NOT be persisted to ${ENV_FILE}: ${error.message}. ` +
      'This run works, but every restart will invalidate all issued tokens.'
    );
    return false;
  }
}

/**
 * Resolve the JWT signing secret (cached after first call).
 * @returns {string} JWT signing secret
 */
export function getJwtSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }

  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv) {
    cachedSecret = fromEnv;
    logger.info('JWT secret taken from the JWT_SECRET environment variable');
    return cachedSecret;
  }

  const persisted = readSecretFromEnvFile();
  if (persisted) {
    cachedSecret = persisted;
    return cachedSecret;
  }

  // 历史版本把密钥存成 <数据目录>/.jwt_secret：迁移其值而不是重新生成，
  // 否则升级瞬间所有已签发 token 失效，在线用户会被强制登出。
  const legacy = readLegacySecret();
  if (legacy) {
    cachedSecret = legacy;
    logger.info(`JWT secret migrated from ${LEGACY_SECRET_FILE} to ${ENV_FILE} (legacy file kept)`);
    persistSecret(legacy);
    return cachedSecret;
  }

  cachedSecret = generateSecret();
  logger.info('JWT secret not found; generating a new one');
  persistSecret(cachedSecret);
  return cachedSecret;
}

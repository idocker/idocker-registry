/**
 * JWT signing secret resolution
 *
 * JWT 是自包含令牌——服务端不查库，只验签名，所以**谁掌握这个密钥谁就能伪造任意身份**
 * （包括构造一个 role=admin 的 token）。它因此不能是写在代码里的固定值（本仓库是公开的，
 * 任何默认值都等于公开密钥），也不该逼着部署者手抄一串随机串。
 *
 * 解析顺序：
 *   1. 环境变量 JWT_SECRET —— 显式指定，多实例共享同一密钥时用这个
 *   2. <数据目录>/.jwt_secret —— 首次启动生成后持久化在这里
 *   3. 都没有时：生成 48 字节随机值、写入该文件、之后一直复用
 *
 * 文件与 registry.db 同目录（容器内是 /app/data，bind mount 持久化），权限 0600。
 *
 * ⚠️ 首次部署（或删除该文件后）会生成新密钥，所有已签发 token 随之失效，
 * 在线用户需要重新登录一次。
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DB_PATH } from './env.js';
import { logger } from '../utils/logger.js';

const SECRET_FILE = path.join(path.dirname(DB_PATH), '.jwt_secret');
const SECRET_FILE_MODE = 0o600;

let cachedSecret = null;

function generateSecret() {
  return crypto.randomBytes(48).toString('hex');
}

function readPersistedSecret() {
  try {
    const value = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    return value || null;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // 文件存在但读不出来（权限、损坏）不能当作"没有"静默处理：
      // 那会悄悄生成新密钥，把所有人的会话踢掉，且每次重启重复发生。
      logger.error(`JWT secret file exists but cannot be read (${SECRET_FILE}): ${error.message}`);
    }
    return null;
  }
}

function persistSecret(secret) {
  try {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret, { mode: SECRET_FILE_MODE });
    logger.info(`JWT secret generated and persisted to ${SECRET_FILE}`);
    return true;
  } catch (error) {
    logger.error(
      `JWT secret was generated but could NOT be persisted to ${SECRET_FILE}: ${error.message}. ` +
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

  const persisted = readPersistedSecret();
  if (persisted) {
    cachedSecret = persisted;
    return cachedSecret;
  }

  cachedSecret = generateSecret();
  persistSecret(cachedSecret);
  return cachedSecret;
}

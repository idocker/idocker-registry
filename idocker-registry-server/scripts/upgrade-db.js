#!/usr/bin/env node
/**
 * iDocker Registry 数据库升级工具
 *
 * 解决的问题
 * ----------
 * 1.2.x 的库缺 2.0.x 需要的 `deleted_at` / `deleted_by` 三组列（回收站功能），
 * 而 2.0.x 启动时会先执行 `CREATE INDEX ... ON projects(deleted_at)`，再执行补列的
 * ALTER TABLE。对老库来说 CREATE TABLE IF NOT EXISTS 不会给已存在的表补列，
 * 于是建索引直接抛 `SQLITE_ERROR: no such column: deleted_at`。
 * 该异常经 winston 的 exceptionHandler 落盘后进程即退出（exitOnError 默认 true），
 * `docker logs` 里只看得到 “database connect success” 和一句 “failed to start”。
 *
 * 本脚本在**容器启动之前**把库结构补齐，并在改动前自动备份，避免“起不来 → 只能猜”的循环。
 *
 * 用法
 * ----
 *   node scripts/upgrade-db.js --check          # 只体检，不改动（推荐先跑）
 *   node scripts/upgrade-db.js                  # 备份 + 升级
 *   node scripts/upgrade-db.js --db /app/data/registry.db
 *   node scripts/upgrade-db.js --no-backup      # 跳过备份（不推荐）
 *
 * 在容器里跑（镜像内自带 node 与 sqlite3）：
 *   docker run --rm -v /data/docker/idocker/data:/app/data \
 *     --entrypoint node <镜像> /app/idocker/scripts/upgrade-db.js --check
 *
 * 设计取舍
 * --------
 * - **按目标结构驱动，不认版本号**：只判断“该有的列/索引在不在”，
 *   所以对 1.0.x / 1.2.x 任意小版本都适用，也可重复执行（幂等）。
 * - **只加不改不删**：全部是 ADD COLUMN 与 CREATE INDEX IF NOT EXISTS，
 *   不触碰既有数据，不需要重建表。
 * - **失败即回滚**：所有 DDL 在一个事务里，出错回滚并保留备份文件。
 */
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const hasFlag = name => argv.includes(name);
const getOpt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DB_FILE = path.resolve(getOpt('--db', process.env.DB_PATH || '/app/data/registry.db'));
const CHECK_ONLY = hasFlag('--check') || hasFlag('--dry-run');
const NO_BACKUP = hasFlag('--no-backup');

// ---------- 目标结构 ----------
// 只列出“历史上新增过、老库里可能缺失”的列。新增列时按同样格式追加即可。
const TARGET_COLUMNS = {
  users: [['last_login', 'DATETIME']],
  namespaces: [
    ['deleted_at', 'DATETIME'],
    ['deleted_by', 'INTEGER']
  ],
  projects: [
    ['namespace_id', 'INTEGER'],
    ['deleted_at', 'DATETIME'],
    ['deleted_by', 'INTEGER']
  ],
  repositories: [
    ['deleted_at', 'DATETIME'],
    ['deleted_by', 'INTEGER']
  ],
  image_tags: [['pushed_by', 'INTEGER']]
};

// [索引名, 表, 列] —— 列补齐之后才建
const TARGET_INDEXES = [
  ['idx_projects_namespace_id', 'projects', 'namespace_id'],
  ['idx_namespaces_deleted_at', 'namespaces', 'deleted_at'],
  ['idx_projects_deleted_at', 'projects', 'deleted_at'],
  ['idx_repositories_deleted_at', 'repositories', 'deleted_at']
];

// ---------- 工具 ----------
const log = msg => console.log(msg);

/**
 * 把 sqlite3 的错误码翻译成可操作的提示。
 * 这几个都是部署时真实碰过的坑（CANTOPEN 是挂载目录属主不对，
 * NOTADB 是文件损坏），原始信息里看不出该怎么处理。
 */
function translateError(err, file) {
  const dir = path.dirname(file);
  // 容器内的 <dir> 在宿主机上对应哪个目录只有使用者知道（由 compose 的 -
  // volumes 决定），所以这里不猜路径，只把容器内路径和要执行的命令说清楚。
  const permHint =
    `\n  容器内路径 ${dir} 对 uid 1000（node 用户）不可写。\n` +
    '  在宿主机对映射到该目录的路径执行（路径见 compose 的 volumes）：\n' +
    '    chown -R 1000:1000 <宿主机数据目录>';

  if (err.code === 'SQLITE_CANTOPEN') {
    return `无法打开数据库：${file}` + permHint;
  }
  if (err.code === 'SQLITE_READONLY') {
    return `数据库只读：${file}` + permHint;
  }
  if (err.code === 'SQLITE_NOTADB') {
    return (
      `文件不是有效的 SQLite 数据库：${file}\n` +
      '  该文件已损坏。可从 data/ 目录的备份恢复，或删掉后由程序重建（镜像数据在 registry/ 不受影响）。'
    );
  }
  return err.message;
}

const fail = (errOrMsg, file = DB_FILE) => {
  const msg = typeof errOrMsg === 'string' ? errOrMsg : translateError(errOrMsg, file);
  console.error(`\n[错误] ${msg}`);
  process.exit(1);
};

function openDatabase(file, readOnly) {
  const mode = readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE;
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, mode, err => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => (err ? reject(err) : resolve()));
  });
}

function close(db) {
  return new Promise(resolve => db.close(() => resolve()));
}

async function tableExists(db, name) {
  const rows = await all(db, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", [name]);
  return rows.length > 0;
}

async function columnsOf(db, table) {
  const rows = await all(db, `PRAGMA table_info(${table})`);
  return rows.map(r => r.name);
}

async function indexExists(db, name) {
  const rows = await all(db, "SELECT name FROM sqlite_master WHERE type='index' AND name=?", [name]);
  return rows.length > 0;
}

function backup(dbFile) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const base = `${dbFile}.bak-${stamp}`;
  const copied = [];

  // WAL 模式下主文件可能不含最新写入，必须把 -wal / -shm 一并复制
  for (const suffix of ['', '-wal', '-shm']) {
    const src = dbFile + suffix;
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, base + suffix);
      copied.push(base + suffix);
    }
  }
  return copied;
}

// ---------- 主流程 ----------
async function main() {
  log('iDocker Registry 数据库升级工具');
  log('='.repeat(50));

  if (!fs.existsSync(DB_FILE)) {
    fail(
      `数据库文件不存在：${DB_FILE}\n` +
        '  这是全新部署，不需要升级 —— 直接启动容器，程序会自动建库。'
    );
  }

  // 先做文件级校验，损坏的库不必再往下走
  const header = Buffer.alloc(16);
  const fd = fs.openSync(DB_FILE, 'r');
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);
  if (header.toString('utf8') !== 'SQLite format 3\u0000') {
    fail(
      `${DB_FILE} 不是有效的 SQLite 数据库（文件头不匹配）。\n` +
        '  该文件已损坏，无法在结构层面修复。\n' +
        '  可从 data/ 下的备份恢复；或删除后由程序重建（registry/ 里的镜像 blob 不受影响）。'
    );
  }

  const sizeKB = (fs.statSync(DB_FILE).size / 1024).toFixed(1);
  log(`数据库：${DB_FILE}  (${sizeKB} KB)`);
  log(`模式  ：${CHECK_ONLY ? '只检查（不修改）' : NO_BACKUP ? '升级（跳过备份）' : '备份 + 升级'}`);
  log('');

  // --check 用只读方式打开：体检不应该要求写权限。
  // WAL 模式下只读打开需要 -shm，极端情况下会失败，此时回退到读写再试一次。
  let db;
  try {
    db = await openDatabase(DB_FILE, CHECK_ONLY);
  } catch (err) {
    if (!CHECK_ONLY) {
      fail(err);
    }
    db = await openDatabase(DB_FILE, false);
  }

  try {
    const versionRow = await all(db, 'PRAGMA user_version');
    const userVersion = versionRow[0]?.user_version ?? 0;

    // ---- 1. 盘点缺失项 ----
    const missingColumns = [];
    const missingTables = [];
    for (const [table, columns] of Object.entries(TARGET_COLUMNS)) {
      if (!(await tableExists(db, table))) {
        missingTables.push(table);
        continue;
      }
      const existing = await columnsOf(db, table);
      for (const [column, type] of columns) {
        if (!existing.includes(column)) {
          missingColumns.push({ table, column, type });
        }
      }
    }

    const missingIndexes = [];
    for (const [name, table, column] of TARGET_INDEXES) {
      if (!(await indexExists(db, name))) {
        missingIndexes.push({ name, table, column });
      }
    }

    log(`schema user_version : ${userVersion}`);
    log(`缺失的表           : ${missingTables.length ? missingTables.join(', ') : '无'}`);
    log(`缺失的列           : ${missingColumns.length ? missingColumns.map(c => `${c.table}.${c.column}`).join(', ') : '无'}`);
    log(`缺失的索引         : ${missingIndexes.length ? missingIndexes.map(i => i.name).join(', ') : '无'}`);
    log('');

    if (missingTables.length) {
      // 表整体缺失通常意味着库不完整，交给程序建表更安全
      fail(
        `以下表整体缺失：${missingTables.join(', ')}\n` +
          '  这不是正常的老库形态（老库至少有这些表）。请确认是否挂载了正确的数据目录。'
      );
    }

    if (!missingColumns.length && !missingIndexes.length) {
      log('结论：结构已是最新，无需升级。');
      await close(db);
      process.exit(0);
    }

    if (CHECK_ONLY) {
      log('结论：需要升级。去掉 --check 即可执行（会自动备份）。');
      await close(db);
      process.exit(0);
    }

    // ---- 2. 备份 ----
    if (NO_BACKUP) {
      log('⚠ 已跳过备份（--no-backup）。');
    } else {
      // 先把 WAL 合并进主文件，让备份是一个完整快照
      try {
        await exec(db, 'PRAGMA wal_checkpoint(TRUNCATE)');
      } catch {
        // 非 WAL 模式或 checkpoint 失败都不影响：下面会把 -wal 一并复制
      }
      const files = backup(DB_FILE);
      log('已备份：');
      files.forEach(f => log(`  ${f}`));
      log('');
    }

    // ---- 3. 升级（单事务，失败回滚）----
    const applied = [];
    await exec(db, 'BEGIN');
    try {
      for (const { table, column, type } of missingColumns) {
        await exec(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        applied.push(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
      for (const { name, table, column } of missingIndexes) {
        await exec(db, `CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${column})`);
        applied.push(`CREATE INDEX ${name} ON ${table}(${column})`);
      }
      await exec(db, 'COMMIT');
    } catch (err) {
      await exec(db, 'ROLLBACK').catch(() => {});
      fail(
        `升级失败，已回滚：${err.message}\n` +
          (NO_BACKUP ? '  （本次未备份，请从 data/ 下既有备份恢复）' : '  库内容未改变，可用上面的 .bak 文件核对。')
      );
    }

    log('已执行：');
    applied.forEach(s => log(`  ${s}`));
    log('');

    // ---- 4. 校验 ----
    let ok = true;
    for (const { table, column } of missingColumns) {
      const cols = await columnsOf(db, table);
      if (!cols.includes(column)) {
        ok = false;
        console.error(`  校验失败：${table}.${column} 仍不存在`);
      }
    }
    for (const { name } of missingIndexes) {
      if (!(await indexExists(db, name))) {
        ok = false;
        console.error(`  校验失败：索引 ${name} 仍不存在`);
      }
    }

    await close(db);

    if (!ok) {
      fail('升级后校验未通过，请保留现场并检查上面的输出。');
    }
    log('结论：升级完成，校验通过。可以启动新版本了。');
  } catch (err) {
    await close(db).catch(() => {});
    fail(err);
  }
}

main().catch(err => fail(err));

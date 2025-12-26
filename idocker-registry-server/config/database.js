/**
 * 数据库配置模块
 * 
 * 负责sqlite3数据库的连接、初始化和基础表结构创建
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');
const DB_PATH = process.env.DB_PATH || path.join(projectRoot, 'data', 'registry.db');

let db = null;

/**
 * 获取数据库连接
 * @returns {Object} 数据库连接对象
 */
export function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

/**
 * 初始化数据库，创建所有必要的表
 * @returns {Promise<Object>} 数据库连接对象
 */
export async function initDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // 创建数据目录（如果不存在）
      const dataDir = path.dirname(DB_PATH);
      try {
        await fs.access(dataDir);
      } catch (error) {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // 打开数据库连接
      db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          logger.error('数据库连接错误:', err);
          reject(err);
          return;
        }
        
        logger.info('数据库连接成功');
        
        // 启用外键约束和性能优化
        db.serialize(() => {
          db.run('PRAGMA foreign_keys = ON');
          db.run('PRAGMA journal_mode = WAL');
          db.run('PRAGMA synchronous = NORMAL');
          db.run('PRAGMA cache_size = 1000');
          db.run('PRAGMA temp_store = MEMORY');

          // 创建用户表
          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username VARCHAR(50) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              email VARCHAR(255),
              full_name VARCHAR(100),
              role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
              is_active BOOLEAN DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // 创建项目表
          db.run(`
            CREATE TABLE IF NOT EXISTS projects (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(100) UNIQUE NOT NULL,
              description TEXT,
              namespace VARCHAR(100),
              is_active BOOLEAN DEFAULT 1,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
          `);

          // 创建项目成员表（多对多关系）
          db.run(`
            CREATE TABLE IF NOT EXISTS project_members (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'maintainer', 'viewer')),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(project_id, user_id),
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `);

          // 创建镜像仓库表
          db.run(`
            CREATE TABLE IF NOT EXISTS repositories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL,
              project_id INTEGER NOT NULL,
              description TEXT,
              is_public BOOLEAN DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(name, project_id),
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `);

          // 创建镜像标签表
          db.run(`
            CREATE TABLE IF NOT EXISTS image_tags (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              repository_id INTEGER NOT NULL,
              tag VARCHAR(255) NOT NULL,
              digest VARCHAR(255),
              size INTEGER DEFAULT 0,
              architecture VARCHAR(50),
              os VARCHAR(50),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(repository_id, tag),
              FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
            )
          `);

          // 创建审计日志表
          db.run(`
            CREATE TABLE IF NOT EXISTS audit_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              action VARCHAR(100) NOT NULL,
              resource_type VARCHAR(50),
              resource_id VARCHAR(255),
              details TEXT,
              ip_address VARCHAR(45),
              user_agent TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
          `);

          // 创建Docker Registry配置表
          db.run(`
            CREATE TABLE IF NOT EXISTS registry_configs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(100) NOT NULL,
              url VARCHAR(500) NOT NULL,
              username VARCHAR(100),
              password VARCHAR(255),
              is_default BOOLEAN DEFAULT 0,
              is_active BOOLEAN DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // 创建同步日志表
          db.run(`
            CREATE TABLE IF NOT EXISTS sync_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              sync_type VARCHAR(50) NOT NULL,
              project_id INTEGER,
              user_id INTEGER,
              status VARCHAR(20) NOT NULL,
              processed_count INTEGER DEFAULT 0,
              error_count INTEGER DEFAULT 0,
              duration INTEGER DEFAULT 0,
              details TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
          `);

          // 创建索引以提高查询性能
          db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
          db.run('CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)');
          db.run('CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_repositories_project_id ON repositories(project_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_image_tags_repository_id ON image_tags(repository_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
          db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');

          // 检查并创建默认管理员用户
          db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', [], async (err, row) => {
            if (err) {
              logger.error('查询管理员用户错误:', err);
              reject(err);
              return;
            }
            
            if (row.count === 0) {
              const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
              const hashedPassword = await bcrypt.hash(defaultPassword, 10);
              
              db.run('INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)', 
                ['admin', hashedPassword, 'admin@idocker.registry', '系统管理员', 'admin'], 
                (err) => {
                  if (err) {
                    logger.error('创建默认管理员用户错误:', err);
                  } else {
                    logger.info('默认管理员账户已创建: admin/admin123');
                  }
                }
              );
            }

            // 检查并创建默认Docker Registry配置
            db.get('SELECT COUNT(*) as count FROM registry_configs', [], (err, row) => {
              if (err) {
                logger.error('查询Registry配置错误:', err);
                reject(err);
                return;
              }
              
              if (row.count === 0) {
                db.run('INSERT INTO registry_configs (name, url, is_default, is_active) VALUES (?, ?, ?, ?)', 
                  ['默认Registry', process.env.REGISTRY_URL || 'http://localhost:5000', 1, 1], 
                  (err) => {
                    if (err) {
                      logger.error('创建默认Registry配置错误:', err);
                    } else {
                      logger.info(`默认Docker Registry配置已创建: ${process.env.REGISTRY_URL || 'http://localhost:5000'}`);
                    }
                  }
                );
              }

              logger.info('数据库初始化完成');
              resolve(db);
            });
          });
        });
      });
    } catch (error) {
      logger.error('数据库初始化失败:', error);
      reject(error);
    }
  });
}

/**
 * 关闭数据库连接
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          logger.error('关闭数据库连接错误:', err);
          reject(err);
        } else {
          db = null;
          logger.info('数据库连接已关闭');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
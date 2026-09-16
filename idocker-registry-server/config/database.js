/**
 * Database Module
 * 
 * Provides database connection and initialization functionality
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
import * as env from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const DB_PATH = env.DB_PATH || path.join(projectRoot, 'data', 'registry.db');
//const DB_PATH = path.join(projectRoot, '../data', 'registry.db');

let db = null;

/**
 * get db
 * @returns {Object} database connection object
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not init，initDatabase()');
  }
  return db;
}

/**
 * init database
 * @returns {Promise<Object>} database connection object
 */
export async function initDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // create data dir(if not exist)
      const dataDir = path.dirname(DB_PATH);
      try {
        await fs.access(dataDir);
      } catch (error) {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // open database connection
      db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          logger.error('database connect error:', err);
          reject(err);
          return;
        }
        
        logger.info('database connect success');
        
        // enable foreign key constraints
        db.serialize(() => {
          db.run('PRAGMA foreign_keys = ON');
          db.run('PRAGMA journal_mode = WAL');
          db.run('PRAGMA synchronous = NORMAL');
          db.run('PRAGMA cache_size = 1000');
          db.run('PRAGMA temp_store = MEMORY');

          // create users table
          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username VARCHAR(50) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              email VARCHAR(255),
              full_name VARCHAR(100),
              role VARCHAR(20) DEFAULT 'developer' CHECK (role IN ('admin', 'project_manager', 'developer', 'operator')),
              is_active BOOLEAN DEFAULT 1,
              last_login DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // add last_login column if upgrading from older version
          db.run(`ALTER TABLE users ADD COLUMN last_login DATETIME`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              logger.error('Failed to add last_login column:', err.message);
            }
          });

          // create projects table
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

          // create repository_members table
          db.run(`
            CREATE TABLE IF NOT EXISTS repository_members (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              repository_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              role VARCHAR(20) DEFAULT 'developer' CHECK (role IN ('project_manager', 'developer', 'operator')),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(repository_id, user_id),
              FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `);

          // create repositories table
          db.run(`
            CREATE TABLE IF NOT EXISTS repositories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL,
              project_id INTEGER NOT NULL,
              description TEXT,
              is_public BOOLEAN DEFAULT 0,
              is_active BOOLEAN DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(name, project_id),
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `);

          // create image_tags table
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

          // create audit_logs table
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

          // create registry_configs table
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

          // create sync_logs table
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

          // create namespaces table
          db.run(`
            CREATE TABLE IF NOT EXISTS namespaces (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL UNIQUE,
              description TEXT,
              is_active INTEGER DEFAULT 1,
              created_by INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
          `);

          // create indexes
          db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
          db.run('CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)');
          db.run('CREATE INDEX IF NOT EXISTS idx_repository_members_repository_id ON repository_members(repository_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_repository_members_user_id ON repository_members(user_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_repositories_project_id ON repositories(project_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_image_tags_repository_id ON image_tags(repository_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
          db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
          db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
          db.run('CREATE INDEX IF NOT EXISTS idx_namespaces_name ON namespaces(name)');
          db.run('CREATE INDEX IF NOT EXISTS idx_namespaces_is_active ON namespaces(is_active)');
          db.run('CREATE INDEX IF NOT EXISTS idx_namespaces_created_by ON namespaces(created_by)');

          // ===== Schema Migration: use PRAGMA user_version to ensure migration runs exactly once =====
          db.get("PRAGMA user_version", [], (err, row) => {
            const schemaVersion = row?.user_version || 0;
            if (schemaVersion < 1) {
              // Check if project_members exists (old schema) or repository_members (new schema)
              db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='project_members'", [], (checkErr, checkRow) => {
                if (!checkRow) {
                  // Fresh DB with new schema - skip v1, go directly to v2
                  logger.info('Fresh database detected, setting schema version to 2');
                  db.run("PRAGMA user_version = 2");
                  return;
                }
                logger.info('Running schema migration v1: upgrading role system...');
                db.serialize(() => {
                  db.run("PRAGMA ignore_check_constraints = ON");
                  db.run("PRAGMA foreign_keys = OFF");

                  // Migrate user roles: old (admin/user) → new (admin/project_manager/developer/operator)
                  db.run(`UPDATE users SET role = 'project_manager' WHERE role = 'user' AND id IN (SELECT user_id FROM project_members WHERE role = 'owner')`);
                  db.run(`UPDATE users SET role = 'developer' WHERE role = 'user' AND id IN (SELECT user_id FROM project_members WHERE role = 'maintainer')`);
                  db.run(`UPDATE users SET role = 'operator' WHERE role = 'user' AND id IN (SELECT user_id FROM project_members WHERE role = 'viewer')`);
                  db.run(`UPDATE users SET role = 'developer' WHERE role = 'user'`);

                  db.run(`ALTER TABLE users RENAME TO users_old`);
                  db.run(`CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    full_name VARCHAR(100),
                    role VARCHAR(20) DEFAULT 'developer' CHECK (role IN ('admin', 'project_manager', 'developer', 'operator')),
                    is_active BOOLEAN DEFAULT 1,
                    last_login DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                  )`);
                  db.run(`INSERT INTO users SELECT * FROM users_old`);
                  db.run(`DROP TABLE users_old`);

                  db.run(`UPDATE project_members SET role = 'project_manager' WHERE role = 'owner'`);
                  db.run(`UPDATE project_members SET role = 'developer' WHERE role = 'maintainer'`);
                  db.run(`UPDATE project_members SET role = 'operator' WHERE role = 'viewer'`);

                  db.run(`ALTER TABLE project_members RENAME TO project_members_old`);
                  db.run(`CREATE TABLE project_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role VARCHAR(20) DEFAULT 'developer' CHECK (role IN ('project_manager', 'developer', 'operator')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(project_id, user_id),
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                  )`);
                  db.run(`INSERT INTO project_members SELECT * FROM project_members_old`);
                  db.run(`DROP TABLE project_members_old`);

                  db.run("PRAGMA foreign_keys = ON");
                  db.run("PRAGMA user_version = 1");
                  logger.info('Schema migration v1 completed');
                });
              });
            }
          });

          // Add namespace_id column to projects table if it doesn't exist
          db.all("PRAGMA table_info(projects)", [], (err, columns) => {
            if (!err && columns) {
              const hasNamespaceColumn = columns.some(col => col.name === 'namespace_id');
              if (!hasNamespaceColumn) {
                db.run(`ALTER TABLE projects ADD COLUMN namespace_id INTEGER DEFAULT 1`, (alterErr) => {
                  if (alterErr) {
                    logger.error('Error adding namespace_id column to projects table:', alterErr);
                  } else {
                    db.run('CREATE INDEX IF NOT EXISTS idx_projects_namespace_id ON projects(namespace_id)');
                  }
                });
              }
            }
          });

          // ===== Schema Migration v2: repository-level permissions =====
          db.get("PRAGMA user_version", [], (err, row) => {
            const schemaVersion = row?.user_version || 0;
            if (schemaVersion >= 1 && schemaVersion < 2) {
              logger.info('Running schema migration v2: repository-level permissions...');
              db.serialize(() => {
                db.run("PRAGMA foreign_keys = OFF");
                db.run(`DROP TABLE IF EXISTS project_members`);
                db.run(`CREATE TABLE IF NOT EXISTS repository_members (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  repository_id INTEGER NOT NULL,
                  user_id INTEGER NOT NULL,
                  role VARCHAR(20) DEFAULT 'developer' CHECK (role IN ('project_manager', 'developer', 'operator')),
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE(repository_id, user_id),
                  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`);
                db.run('CREATE INDEX IF NOT EXISTS idx_repository_members_repo_id ON repository_members(repository_id)');
                db.run('CREATE INDEX IF NOT EXISTS idx_repository_members_user_id ON repository_members(user_id)');
                db.run("PRAGMA foreign_keys = ON");
                db.run("PRAGMA user_version = 2");
                logger.info('Schema migration v2 completed');
              });
            }
          });

          // ===== Schema Migration v3: record which user pushed each tag =====
          // Guarded by a column check rather than user_version: the version
          // pragma is written asynchronously above, so a fresh database may
          // still read 0 at this point.
          db.all("PRAGMA table_info(image_tags)", [], (err, columns) => {
            if (err || !columns) {
              return;
            }
            if (columns.some(col => col.name === 'pushed_by')) {
              return;
            }
            db.run('ALTER TABLE image_tags ADD COLUMN pushed_by INTEGER', (alterErr) => {
              if (alterErr) {
                logger.error('Error adding pushed_by column to image_tags:', alterErr);
              } else {
                db.run('PRAGMA user_version = 3');
                logger.info('Schema migration v3 completed: image_tags.pushed_by');
              }
            });
          });

          // ===== Data Migration v4: attribute legacy tags that never recorded a pusher =====
          // One-off correction for image_tags rows created before pushed_by existed.
          // Rules: project 'crm' -> wangys, every other missing row -> joe.
          // Each UPDATE carries an EXISTS guard, so a database lacking the target
          // account simply leaves those rows untouched instead of writing NULL.
          // Order matters: 'crm' runs first so the catch-all cannot claim it.
          db.all("PRAGMA table_info(image_tags)", [], (err, columns) => {
            if (err || !columns || !columns.some(col => col.name === 'pushed_by')) {
              return; // v3 has not finished yet
            }
            db.get("PRAGMA user_version", [], (getErr, versionRow) => {
              if (getErr || (versionRow && versionRow.user_version >= 4)) {
                return;
              }

              const crmSql = `
                UPDATE image_tags
                   SET pushed_by = (SELECT id FROM users WHERE username = 'wangys')
                 WHERE pushed_by IS NULL
                   AND repository_id IN (
                     SELECT r.id FROM repositories r
                       JOIN projects p ON p.id = r.project_id
                      WHERE p.name = 'crm'
                   )
                   AND EXISTS (SELECT 1 FROM users WHERE username = 'wangys')
              `;
              const restSql = `
                UPDATE image_tags
                   SET pushed_by = (SELECT id FROM users WHERE username = 'joe')
                 WHERE pushed_by IS NULL
                   AND repository_id NOT IN (
                     SELECT r.id FROM repositories r
                       JOIN projects p ON p.id = r.project_id
                      WHERE p.name = 'crm'
                   )
                   AND EXISTS (SELECT 1 FROM users WHERE username = 'joe')
              `;

              db.serialize(() => {
                db.run(crmSql, function (crmErr) {
                  if (crmErr) {
                    logger.error('Data migration v4 (crm -> wangys) failed:', crmErr);
                  } else if (this.changes > 0) {
                    logger.info(`Data migration v4: attributed ${this.changes} tag(s) of project 'crm' to wangys`);
                  }
                });
                db.run(restSql, function (restErr) {
                  if (restErr) {
                    logger.error('Data migration v4 (rest -> joe) failed:', restErr);
                  } else if (this.changes > 0) {
                    logger.info(`Data migration v4: attributed ${this.changes} remaining tag(s) to joe`);
                  }
                });
                db.run('PRAGMA user_version = 4');
              });
            });
          });

          // check and create default admin user
          db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', [], async (err, row) => {
            if (err) {
              logger.error('check default admin user error:', err);
              reject(err);
              return;
            }
            
            if (row.count === 0) {
              const defaultPassword = env.DEFAULT_ADMIN_PASSWORD;
              const hashedPassword = await bcrypt.hash(defaultPassword, 10);
              
              db.run('INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)', 
                ['admin', hashedPassword, 'admin@idocker.vip', 'administrator', 'admin'], 
                (err) => {
                  if (err) {
                    logger.error('create default admin user error:', err);
                  } else {
                    logger.info('default admin user created: admin/' + defaultPassword);
                  }
                }
              );
            }

            // Initialize default namespace
            db.get('SELECT COUNT(*) as count FROM namespaces', [], (err, row) => {
              if (err) {
                logger.error('check default namespace error:', err);
                reject(err);
                return;
              }
              
              if (row.count === 0) {
                db.run('INSERT INTO namespaces (name, description, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', 
                  ['default', 'Default namespace for organizing Docker repositories', 1, 1], 
                  (err) => {
                    if (err) {
                      logger.error('create default namespace error:', err);
                    } else {
                      logger.info('Default namespace created: default');
                    }
                  }
                );
              }

              // Ensure all projects without a namespace are assigned to the default namespace
              db.run(`UPDATE projects 
                      SET namespace_id = (SELECT id FROM namespaces WHERE name = 'default' LIMIT 1)
                      WHERE namespace_id IS NULL`, (err) => {
                if (err) {
                  logger.error('Error updating projects with default namespace:', err);
                }
              });

              // Initialize the built-in default project (shared base images, single-segment path)
              db.get('SELECT COUNT(*) as count FROM projects WHERE name = ?', ['default'], (err, row) => {
                if (err) {
                  logger.error('check default project error:', err);
                  return;
                }
                if (row.count === 0) {
                  db.run(
                    `INSERT INTO projects (name, description, namespace, is_active, created_by, namespace_id)
                     VALUES (?, ?, ?, ?, ?, (SELECT id FROM namespaces WHERE name = 'default' LIMIT 1))`,
                    ['default', 'Default project for shared base images (pull/push without project path)', 'default', 1, 1],
                    (err2) => {
                      if (err2) {
                        logger.error('create default project error:', err2);
                      } else {
                        logger.info('Default project created: default');
                      }
                    }
                  );
                }
              });

              // Docker Registry setting
              db.get('SELECT COUNT(*) as count FROM registry_configs', [], (err, row) => {
                if (err) {
                  logger.error('check default docker registry config error:', err);
                  reject(err);
                  return;
                }
                
                if (row.count === 0) {
                  db.run('INSERT INTO registry_configs (name, url, is_default, is_active) VALUES (?, ?, ?, ?)', 
                    ['Default Docker Registry', env.DOCKER_REGISTRY_URL, 1, 1], 
                    (err) => {
                      if (err) {
                        logger.error('Create Default Registry config error:', err);
                      } else {
                        logger.info(`Default Docker Registry created: ${env.DOCKER_REGISTRY_URL}`);
                      }
                    }
                  );
                }

                logger.info('Database initialized');
                resolve(db);
              });
            });
          });
        });
      });
    } catch (error) {
      logger.error('Database initialization error:', error);
      reject(error);
    }
  });
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          logger.error('Close database connection error:', err);
          reject(err);
        } else {
          db = null;
          logger.info('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
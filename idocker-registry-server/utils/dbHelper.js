/**
 * 数据库辅助工具
 * 提供对sqlite3数据库的便捷操作方法
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { getDb } from '../config/database.js';
import { logger } from './logger.js';

/**
 * 执行查询并返回单个结果
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Object|null>} 查询结果
 */
export async function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('数据库查询错误:', { sql, params, error: err.message });
          reject(err);
        } else {
          resolve(row);
        }
      });
    } catch (error) {
      logger.error('数据库查询错误:', { sql, params, error: error.message });
      reject(error);
    }
  });
}

/**
 * 执行查询并返回所有结果
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果数组
 */
export async function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('数据库查询错误:', { sql, params, error: err.message });
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } catch (error) {
      logger.error('数据库查询错误:', { sql, params, error: error.message });
      reject(error);
    }
  });
}

/**
 * 执行插入、更新或删除操作
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数
 * @returns {Promise<Object>} 操作结果
 */
export async function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      db.run(sql, params, function(err) {
        if (err) {
          logger.error('数据库执行错误:', { sql, params, error: err.message });
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            changes: this.changes
          });
        }
      });
    } catch (error) {
      logger.error('数据库执行错误:', { sql, params, error: error.message });
      reject(error);
    }
  });
}

/**
 * 执行批量操作
 * @param {string} sql - SQL语句
 * @param {Array} paramsArray - 参数数组
 * @returns {Promise<Array>} 批量操作结果
 */
export async function dbBatch(sql, paramsArray) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDb();
      db.serialize(() => {
        const results = [];
        let hasError = false;
        
        db.run('BEGIN TRANSACTION');
        
        paramsArray.forEach((params, index) => {
          if (hasError) return;
          
          db.run(sql, params, function(err) {
            if (err) {
              hasError = true;
              logger.error('数据库批量操作错误:', { sql, params, error: err.message });
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            results.push({
              id: this.lastID,
              changes: this.changes
            });
            
            // 最后一个操作完成
            if (index === paramsArray.length - 1 && !hasError) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  logger.error('提交事务错误:', { error: commitErr.message });
                  reject(commitErr);
                } else {
                  resolve(results);
                }
              });
            }
          });
        });
      });
    } catch (error) {
      logger.error('数据库批量操作错误:', { sql, paramsArray, error: error.message });
      reject(error);
    }
  });
}

/**
 * 执行事务
 * @param {Function} callback - 事务回调函数
 * @returns {Promise<*>} 事务结果
 */
export async function dbTransaction(callback) {
  return new Promise((resolve, reject) => {
    try {
      const db = getDb();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            logger.error('开始事务错误:', { error: err.message });
            reject(err);
            return;
          }
          
          // 执行事务回调
          Promise.resolve(callback(db))
            .then(result => {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  logger.error('提交事务错误:', { error: commitErr.message });
                  db.run('ROLLBACK');
                  reject(commitErr);
                } else {
                  resolve(result);
                }
              });
            })
            .catch(error => {
              logger.error('执行事务回调错误:', { error: error.message });
              db.run('ROLLBACK');
              reject(error);
            });
        });
      });
    } catch (error) {
      logger.error('数据库事务错误:', { error: error.message });
      reject(error);
    }
  });
}

/**
 * 获取最后插入的ID
 * @returns {Promise<number>} 最后插入的ID
 */
export async function getLastInsertId() {
  try {
    const result = await dbGet('SELECT last_insert_rowid() as id');
    return result ? result.id : null;
  } catch (error) {
    logger.error('获取最后插入ID错误:', error.message);
    throw error;
  }
}

/**
 * 检查记录是否存在
 * @param {string} table - 表名
 * @param {string} condition - WHERE条件
 * @param {Array} params - 参数
 * @returns {Promise<boolean>} 是否存在
 */
export async function dbExists(table, condition = '1=1', params = []) {
  try {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`;
    const result = await dbGet(sql, params);
    return result && result.count > 0;
  } catch (error) {
    logger.error('检查记录存在性错误:', { table, condition, params, error: error.message });
    throw error;
  }
}

/**
 * 计算记录数量
 * @param {string} table - 表名
 * @param {string} condition - WHERE条件
 * @param {Array} params - 参数
 * @returns {Promise<number>} 记录数量
 */
export async function dbCount(table, condition = '1=1', params = []) {
  try {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`;
    const result = await dbGet(sql, params);
    return result ? result.count : 0;
  } catch (error) {
    logger.error('计算记录数量错误:', { table, condition, params, error: error.message });
    throw error;
  }
}

/**
 * 分页查询
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<Object>} 分页结果
 */
export async function dbPaginate(sql, params = [], page = 1, limit = 20) {
  try {
    // 计算总数
    let countSql = sql.replace(/SELECT .+? FROM/i, 'SELECT COUNT(*) as total FROM');
    // 移除ORDER BY和LIMIT部分
    countSql = countSql.replace(/ORDER BY .+?$/i, '').replace(/LIMIT .+?$/i, '');
    
    const totalResult = await dbGet(countSql, params);
    const total = totalResult ? totalResult.total : 0;
    
    // 计算分页
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    
    // 添加LIMIT和OFFSET
    const paginatedSql = `${sql} LIMIT ${limit} OFFSET ${offset}`;
    const items = await dbAll(paginatedSql, params);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('分页查询错误:', { sql, params, page, limit, error: error.message });
    throw error;
  }
}
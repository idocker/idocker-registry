/**
 * 基础数据模型类
 * 提供通用的数据库操作方法
 * 所有具体模型类都应继承此类
 */
import { getDb } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * 获取数据库连接
   */
  async getDb() {
    return await getDb();
  }

  /**
   * 执行查询并返回单条记录
   */
  async get(sql, params = []) {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            logger.error(`数据库查询错误 [${this.tableName}.get]:`, err);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      logger.error(`获取数据库连接失败 [${this.tableName}.get]:`, error);
      throw error;
    }
  }

  /**
   * 执行查询并返回多条记录
   */
  async all(sql, params = []) {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            logger.error(`数据库查询错误 [${this.tableName}.all]:`, err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    } catch (error) {
      logger.error(`获取数据库连接失败 [${this.tableName}.all]:`, error);
      throw error;
    }
  }

  /**
   * 执行SQL语句（INSERT, UPDATE, DELETE）
   */
  async run(sql, params = []) {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            logger.error(`数据库执行错误 [${this.tableName}.run]:`, err);
            reject(err);
          } else {
            resolve({ 
              changes: this.changes,
              lastID: this.lastID 
            });
          }
        });
      });
    } catch (error) {
      logger.error(`获取数据库连接失败 [${this.tableName}.run]:`, error);
      throw error;
    }
  }

  /**
   * 分页查询
   */
  async paginate(sql, params = [], page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
      
      const [totalResult, data] = await Promise.all([
        this.get(countSql, params),
        this.all(`${sql} LIMIT ? OFFSET ?`, [...params, limit, offset])
      ]);

      return {
        data: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error(`分页查询错误 [${this.tableName}.paginate]:`, error);
      throw error;
    }
  }

  /**
   * 根据ID查找记录
   */
  async findById(id) {
    return await this.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  /**
   * 查找所有记录
   */
  async findAll(where = '', params = []) {
    const sql = `SELECT * FROM ${this.tableName} ${where ? 'WHERE ' + where : ''}`;
    return await this.all(sql, params);
  }

  /**
   * 创建新记录
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.run(sql, values);
    
    return { ...data, id: result.lastID };
  }

  /**
   * 更新记录
   */
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await this.run(sql, [...values, id]);
    
    return { ...data, id, changes: result.changes };
  }

  /**
   * 删除记录
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.run(sql, [id]);
    return { changes: result.changes };
  }
}
/**
 * Base data model class
 * Provides common database operation methods
 * All specific model classes should inherit from this class
 */
import { getDb } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Get database connection
   */
  async getDb() {
    return await getDb();
  }

  /**
   * Execute query and return single record
   */
  async get(sql, params = []) {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            logger.error(`Database query error [${this.tableName}.get]:`, err);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      logger.error(`Failed to get database connection [${this.tableName}.get]:`, error);
      throw error;
    }
  }

  /**
   * Execute query and return multiple records
   */
  async all(sql, params = []) {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            logger.error(`Database query error [${this.tableName}.all]:`, err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    } catch (error) {
      logger.error(`Failed to get database connection [${this.tableName}.all]:`, error);
      throw error;
    }
  }

  /**
   * Execute SQL statements (INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    const tableName = this.tableName;
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            logger.error(`Database execution error [${tableName}.run]:`, err);
            reject(err);
          } else {
            resolve({ 
              changes: this.changes,
              lastID: this.lastID 
            });
          }
        });
      });
    } catch (e) {
      logger.error(`Failed to get database connection [${tableName}.run]:`, e);
      throw e;
    }
  }

  /**
   * Paginated query
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
      logger.error(`Pagination query error [${this.tableName}.paginate]:`, error);
      throw error;
    }
  }

  /**
   * Find record by ID
   */
  async findById(id) {
    return await this.get(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  /**
   * Find all records
   */
  async findAll(where = '', params = []) {
    const sql = `SELECT * FROM ${this.tableName} ${where ? 'WHERE ' + where : ''}`;
    return await this.all(sql, params);
  }

  /**
   * Create new record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    logger.info(`create:${sql} ::: ${JSON.stringify(values)}`);
    try {
      const result = await this.run(sql, values);
      logger.info(`create:${JSON.stringify(result)}`);
      return { ...data, id: result.lastID };
    } catch (error) {
      logger.error(`Create record error [${this.tableName}.create]:`, error);
      throw error;
    }
  }

  /**
   * Update record
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
   * Delete record
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.run(sql, [id]);
    return { changes: result.changes };
  }
}
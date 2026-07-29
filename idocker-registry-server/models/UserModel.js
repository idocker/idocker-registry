/**
 * 用户数据模型类
 * 处理所有与用户相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * 获取用户列表（支持分页和搜索）
   */
  async getUsersList({ page = 1, limit = 20, search = '' } = {}) {
    try {
      let query = `
        SELECT id, username, full_name, email, role, is_active, created_at, updated_at, last_login
        FROM users
        WHERE 1=1
      `;
      let params = [];

      if (search) {
        query += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.paginate(query, params, page, limit);
      return result;
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    try {
      return await this.get(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      );
    } catch (error) {
      logger.error('根据用户名查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email) {
    try {
      return await this.get(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email]
      );
    } catch (error) {
      logger.error('根据邮箱查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建新用户
   */
  async createUser(userData) {
    try {
      const data = {
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await this.create(data);
      return result;
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updateData) {
    try {
      const data = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.update(userId, data);
      return result;
    } catch (error) {
      logger.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(userId) {
    try {
      const result = await this.update(userId, { 
        is_active: 0,
        updated_at: new Date().toISOString() 
      });
      return result;
    } catch (error) {
      logger.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户名是否唯一
   */
  async isUsernameUnique(username, excludeId = null) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM users WHERE username = ? AND is_active = 1';
      const params = [username];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await this.get(sql, params);
      return result.count === 0;
    } catch (error) {
      logger.error('检查用户名唯一性失败:', error);
      throw error;
    }
  }

  /**
   * 检查邮箱是否唯一
   */
  async isEmailUnique(email, excludeId = null) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM users WHERE email = ? AND is_active = 1';
      const params = [email];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await this.get(sql, params);
      return result.count === 0;
    } catch (error) {
      logger.error('检查邮箱唯一性失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats() {
    try {
      const [totalUsers, activeUsers, adminUsers] = await Promise.all([
        this.get('SELECT COUNT(*) as count FROM users'),
        this.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
        this.get('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1')
      ]);

      return {
        total: totalUsers.count,
        active: activeUsers.count,
        admins: adminUsers.count
      };
    } catch (error) {
      logger.error('获取用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId, hashedPassword) {
    try {
      const result = await this.update(userId, { 
        password: hashedPassword,
        updated_at: new Date().toISOString() 
      });
      return result;
    } catch (error) {
      logger.error('更新用户密码失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户参与的项目列表
   */
  async getUserProjects(userId) {
    try {
      const sql = `
        SELECT DISTINCT p.id, p.name, p.description, p.namespace
        FROM projects p
        JOIN repositories r ON r.project_id = p.id
        JOIN repository_members rm ON rm.repository_id = r.id
        WHERE rm.user_id = ? AND p.is_active = 1
        ORDER BY p.name
      `;
      
      return await this.all(sql, [userId]);
    } catch (error) {
      logger.error('获取用户项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否存在
   */
  async userExists(userId) {
    try {
      const result = await this.get('SELECT id FROM users WHERE id = ?', [userId]);
      return !!result;
    } catch (error) {
      logger.error('检查用户存在失败:', error);
      throw error;
    }
  }

  /**
   * 获取管理员用户数量
   */
  async getAdminCount() {
    try {
      const result = await this.get(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1'
      );
      return result.count || 0;
    } catch (error) {
      logger.error('获取管理员数量失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详情（不包含敏感信息）
   */
  async getUserDetails(userId) {
    try {
      return await this.get(
        'SELECT id, username, email, full_name, role, is_active, created_at, updated_at, last_login FROM users WHERE id = ?',
        [userId]
      );
    } catch (error) {
      logger.error('获取用户详情失败:', error);
      throw error;
    }
  }
}
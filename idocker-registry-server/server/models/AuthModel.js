/**
 * 认证数据模型类
 * 处理所有与认证相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class AuthModel extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * 验证用户登录
   */
  async validateLogin(username, password) {
    try {
      const user = await this.get(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
        [username, username]
      );

      if (!user) {
        return { success: false, message: '用户不存在或已被禁用' };
      }

      // 密码验证将在控制器层进行，这里只返回用户信息
      return { 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          password: user.password // 返回密码用于后续验证
        }
      };
    } catch (error) {
      logger.error('验证用户登录失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLogin(userId) {
    try {
      const result = await this.update(userId, {
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('更新用户最后登录时间失败:', error);
      throw error;
    }
  }

  /**
   * 记录登录日志
   */
  async logLoginAttempt(userId, username, ipAddress, userAgent, success, reason = '') {
    try {
      const sql = `
        INSERT INTO login_logs (user_id, username, ip_address, user_agent, success, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [userId, username, ipAddress, userAgent, success ? 1 : 0, reason, new Date().toISOString()];
      const result = await this.run(sql, params);
      return { id: result.lastID };
    } catch (error) {
      logger.error('记录登录日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户登录日志
   */
  async getLoginLogs(userId, { page = 1, limit = 20 } = {}) {
    try {
      const query = `
        SELECT * FROM login_logs 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
      
      const result = await this.paginate(query, [userId], page, limit);
      return result;
    } catch (error) {
      logger.error('获取用户登录日志失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否被锁定
   */
  async isUserLocked(userId) {
    try {
      // 检查最近5分钟内的失败登录次数
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const result = await this.get(
        `SELECT COUNT(*) as count FROM login_logs 
         WHERE user_id = ? AND success = 0 AND created_at > ?`,
        [userId, fiveMinutesAgo]
      );

      // 如果5分钟内失败次数超过5次，则锁定用户
      return result.count >= 5;
    } catch (error) {
      logger.error('检查用户锁定状态失败:', error);
      throw error;
    }
  }

  /**
   * 重置用户密码
   */
  async resetPassword(userId, newHashedPassword) {
    try {
      const result = await this.update(userId, {
        password: newHashedPassword,
        updated_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('重置用户密码失败:', error);
      throw error;
    }
  }

  /**
   * 验证令牌有效性
   */
  async validateToken(userId) {
    try {
      const user = await this.findById(userId);
      
      if (!user || user.is_active === 0) {
        return { valid: false, message: '用户不存在或已被禁用' };
      }

      return { valid: true, user };
    } catch (error) {
      logger.error('验证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户权限信息
   */
  async getUserPermissions(userId) {
    try {
      const user = await this.findById(userId);
      
      if (!user) {
        return { hasAccess: false, permissions: [] };
      }

      // 管理员拥有所有权限
      if (user.role === 'admin') {
        return {
          hasAccess: true,
          permissions: ['*'],
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        };
      }

      // 普通用户权限（可根据需要扩展）
      const permissions = ['read:projects', 'read:repositories'];
      
      return {
        hasAccess: true,
        permissions,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      logger.error('获取用户权限失败:', error);
      throw error;
    }
  }
}
/**
 * Authentication data model class
 * Handles all database operations related to authentication
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class AuthModel extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Validate user login
   */
  async validateLogin(username, password) {
    try {
      const user = await this.get(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
        [username, username]
      );

      if (!user) {
        return { success: false, message: 'User does not exist or has been disabled' };
      }

      // Password validation will be done in the controller layer, here we only return user information
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
      logger.error('Failed to validate user login:', error);
      throw error;
    }
  }

  /**
   * Update user's last login time
   */
  async updateLastLogin(userId) {
    try {
      const result = await this.update(userId, {
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('Failed to update user last login time:', error);
      throw error;
    }
  }

  /**
   * Record login attempt
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
      logger.error('Failed to record login attempt:', error);
      throw error;
    }
  }

  /**
   * Get user login logs
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
      logger.error('Failed to get user login logs:', error);
      throw error;
    }
  }

  /**
   * Check if user is locked
   */
  async isUserLocked(userId) {
    try {
      // Check failed login attempts in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const result = await this.get(
        `SELECT COUNT(*) as count FROM login_logs 
         WHERE user_id = ? AND success = 0 AND created_at > ?`,
        [userId, fiveMinutesAgo]
      );

      // Lock user if failed attempts exceed 5 times within 5 minutes
      return result.count >= 5;
    } catch (error) {
      logger.error('Failed to check user lock status:', error);
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(userId, newHashedPassword) {
    try {
      const result = await this.update(userId, {
        password: newHashedPassword,
        updated_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('Failed to reset user password:', error);
      throw error;
    }
  }

  /**
   * Validate token validity
   */
  async validateToken(userId) {
    try {
      const user = await this.findById(userId);
      
      if (!user || user.is_active === 0) {
        return { valid: false, message: 'User does not exist or has been disabled' };
      }

      return { valid: true, user };
    } catch (error) {
      logger.error('Failed to validate token:', error);
      throw error;
    }
  }

/**
 * Get user permission information
 */
  async getUserPermissions(userId) {
    try {
      const user = await this.findById(userId);

      if (!user) {
        return { hasAccess: false, permissions: [] };
      }

      // Administrators have all permissions
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

      // Regular user permissions (can be extended as needed)
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
      logger.error('Failed to get user permissions:', error);
      throw error;
    }
  }

  /**
   * Find user by username (including password)
   */
  async findByUsernameWithPassword(username) {
    try {
      if (!username) {
        return null;
      }
      const user = await this.get(
        'SELECT id, username, password, email, full_name, role, is_active FROM users WHERE username = ?',
        [username]
      );
      return user;
    } catch (error) {
      logger.error('Failed to find user by username:', error);
      throw error;
    }
  }

  /**
   * Check if username already exists
   */
  async isUsernameExists(username) {
    try {
      if (!username) {
        return false;
      }
      const existing = await this.get(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      return !!existing;
    } catch (error) {
      logger.error('Failed to check if username exists:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      if (!userData || !userData.username || !userData.password) {
        throw new Error('Username and password cannot be empty');
      }

      const result = await this.run(
        `INSERT INTO users (username, password, email, full_name, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.password,
          userData.email || null,
          userData.full_name || null,
          userData.role || 'user',
          userData.is_active !== undefined ? userData.is_active : 1
        ]
      );

      return { id: result.lastID };
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Get user detailed information (excluding password)
   */
  async getUserById(userId) {
    try {
      if (!userId) {
        return null;
      }
      const user = await this.get(
        `SELECT id, username, email, full_name, role, is_active, created_at
         FROM users WHERE id = ?`,
        [userId]
      );
      return user;
    } catch (error) {
      logger.error('Failed to get user detailed information:', error);
      throw error;
    }
  }

  /**
   * Get user basic information (for validation and password update)
   */
  async getUserForPasswordUpdate(userId) {
    try {
      if (!userId) {
        return null;
      }
      const user = await this.get(
        'SELECT id, password, is_active FROM users WHERE id = ?',
        [userId]
      );
      return user;
    } catch (error) {
      logger.error('Failed to get user password information:', error);
      throw error;
    }
  }

  /**
   * Get user basic information (for token refresh)
   */
  async getUserBasicInfo(userId) {
    try {
      if (!userId) {
        return null;
      }
      const user = await this.get(
        'SELECT id, username, role, is_active FROM users WHERE id = ?',
        [userId]
      );
      return user;
    } catch (error) {
      logger.error('Failed to get user basic information:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId, hashedPassword) {
    try {
      if (!userId || !hashedPassword) {
        throw new Error('User ID and password cannot be empty');
      }
      const result = await this.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, userId]
      );
      return result;
    } catch (error) {
      logger.error('Failed to update user password:', error);
      throw error;
    }
  }

  /**
   * Record audit log
   */
  async logAudit(auditData) {
    try {
      if (!auditData || !auditData.user_id || !auditData.action) {
        throw new Error('Audit log data is incomplete');
      }

      const sql = `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        auditData.user_id,
        auditData.action,
        auditData.resource_type || '',
        auditData.resource_id || '',
        auditData.details ? JSON.stringify(auditData.details) : '{}',
        auditData.ip_address || '',
        auditData.user_agent || ''
      ];

      await this.run(sql, params);
    } catch (error) {
      logger.error('Failed to record audit log:', error);
      throw error;
    }
  }
}
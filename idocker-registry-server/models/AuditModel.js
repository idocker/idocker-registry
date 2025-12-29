/**
 * Audit log data model class
 * Handles all database operations related to audit logs
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class AuditModel extends BaseModel {
  constructor() {
    super('audit_logs');
  }

  /**
   * Get audit logs list (with pagination, search and filtering support)
   */
  async getAuditLogs({
    page = 1,
    limit = 50,
    search = '',
    action = '',
    resourceType = '',
    userId = '',
    startDate = '',
    endDate = ''
  } = {}) {
    try {
      let query = `
        SELECT 
          al.id, al.action, al.resource_type, al.resource_id, al.details,
          al.ip_address, al.user_agent, al.created_at,
          u.username, u.full_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      // Add search conditions
      if (search) {
        query += ' AND (al.action LIKE ? OR al.resource_type LIKE ? OR al.resource_id LIKE ? OR u.username LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Add action type filter
      if (action) {
        query += ' AND al.action = ?';
        params.push(action);
      }

      // Add resource type filter
      if (resourceType) {
        query += ' AND al.resource_type = ?';
        params.push(resourceType);
      }

      // Add user filter
      if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
      }

      // Add date range filter
      if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate + ' 23:59:59');
      }

      query += ' ORDER BY al.created_at DESC';

      const result = await this.paginate(query, params, page, limit);
      //logger.info(`result:${JSON.stringify(result)}`)
      
      // Format log details (if it's a JSON string)
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach(log => {
          try {
            if (log.details) {
              log.details = JSON.parse(log.details);
            }
          } catch (e) {
            // Keep as is if not valid JSON
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to get audit logs list:', error);
      throw error;
    }
  }

  /**
   * Get detailed information of a specific audit log
   */
  async getAuditLogById(id) {
    try {
      const query = `
        SELECT 
          al.id, al.action, al.resource_type, al.resource_id, al.details,
          al.ip_address, al.user_agent, al.created_at,
          u.username, u.full_name, u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.id = ?
      `;
      
      const log = await this.get(query, [id]);
      
      if (log) {
        // Format log details
        try {
          if (log.details) {
            log.details = JSON.parse(log.details);
          }
        } catch (e) {
          // Keep as is if not valid JSON
        }
      }

      return log;
    } catch (error) {
      logger.error('Failed to get audit log details:', error);
      throw error;
    }
  }

  /**
   * Create audit log
   */
  async createAuditLog(auditData) {
    try {
      const data = {
        ...auditData,
        created_at: new Date().toISOString()
      };

      const result = await this.create(data);
      return result;
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditStatistics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      const startDateStr = startDate.toISOString().split('T')[0];

      // Total operations count
      const totalOperations = await this.get(
        'SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?',
        [startDateStr]
      );

      // Count by action type
      const actionsCount = await this.all(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= ?
        GROUP BY action
        ORDER BY count DESC
      `, [startDateStr]);

      // Count by resource type
      const resourceTypesCount = await this.all(`
        SELECT resource_type, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= ?
        GROUP BY resource_type
        ORDER BY count DESC
      `, [startDateStr]);

      // Count by user
      const usersCount = await this.all(`
        SELECT u.username, u.full_name, COUNT(al.id) as count
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.created_at >= ?
        GROUP BY u.id, u.username, u.full_name
        ORDER BY count DESC
        LIMIT 10
      `, [startDateStr]);

      // Count by date (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];

      const dailyStats = await this.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs 
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [lastWeekStr]);

      // Most active operations (excluding login/logout)
      const activeOperations = await this.all(`
        SELECT action, COUNT(*) as count
        FROM audit_logs 
        WHERE created_at >= ? AND action NOT IN ('LOGIN', 'LOGOUT')
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `, [startDateStr]);

      return {
        summary: {
          totalOperations: totalOperations.count,
          daysRange: days
        },
        byAction: actionsCount,
        byResourceType: resourceTypesCount,
        byUser: usersCount,
        dailyStats,
        activeOperations
      };
    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(days = 90) {
    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // Count logs to be deleted
      const deleteCount = await this.get(
        'SELECT COUNT(*) as count FROM audit_logs WHERE created_at < ?',
        [cutoffDateStr]
      );

      if (deleteCount.count === 0) {
        return {
          deletedCount: 0,
          cutoffDate: cutoffDateStr
        };
      }

      // Execute deletion
      const result = await this.run(
        'DELETE FROM audit_logs WHERE created_at < ?',
        [cutoffDateStr]
      );

      logger.info(`Audit log cleanup completed: deleted ${result.changes} records`);

      return {
        deletedCount: result.changes,
        cutoffDate: cutoffDateStr
      };
    } catch (error) {
      logger.error('Failed to clean up audit logs:', error);
      throw error;
    }
  }

  /**
   * Get all available action types
   */
  async getAvailableActions() {
    try {
      const actions = await this.all(
        'SELECT DISTINCT action FROM audit_logs ORDER BY action'
      );
      return actions.map(item => item.action);
    } catch (error) {
      logger.error('Failed to get action types list:', error);
      throw error;
    }
  }

  /**
   * Get all available resource types
   */
  async getAvailableResourceTypes() {
    try {
      const resourceTypes = await this.all(
        'SELECT DISTINCT resource_type FROM audit_logs ORDER BY resource_type'
      );
      return resourceTypes.map(item => item.resource_type);
    } catch (error) {
      logger.error('Failed to get resource types list:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs({
    action = '',
    resourceType = '',
    userId = '',
    startDate = '',
    endDate = ''
  } = {}) {
    try {
      let query = `
        SELECT 
          al.id, al.action, al.resource_type, al.resource_id, al.details,
          al.ip_address, al.user_agent, al.created_at,
          u.username, u.full_name, u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      // Add filter conditions
      if (action) {
        query += ' AND al.action = ?';
        params.push(action);
      }

      if (resourceType) {
        query += ' AND al.resource_type = ?';
        params.push(resourceType);
      }

      if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
      }

      if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate + ' 23:59:59');
      }

      query += ' ORDER BY al.created_at DESC';

      const logs = await this.all(query, params);

      // Format log details
      if (logs && Array.isArray(logs)) {
        logs.forEach(log => {
          try {
            if (log.details) {
              log.details = JSON.parse(log.details);
            }
          } catch (e) {
            // Keep as is if not valid JSON
          }
        });
      }

      return logs;
    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }
}
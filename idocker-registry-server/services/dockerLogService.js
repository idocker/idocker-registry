/**
 * Docker Operation Logging Service
 *
 * Handles logging of Docker Registry operations for audit and monitoring
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { dbRun, dbGet } from '../utils/dbHelper.js';
import { logger } from '../utils/logger.js';

export class DockerLogService {
  /**
   * Log a Docker operation
   * @param {Object} logData - Log data object
   * @param {number} logData.userId - User ID
   * @param {string} logData.username - Username
   * @param {string} logData.action - Docker action (pull, push, delete, etc.)
   * @param {string} logData.repository - Repository name
   * @param {string} logData.tag - Tag name (optional)
   * @param {string} logData.status - Operation status (success, error)
   * @param {string} logData.ipAddress - Client IP address
   * @param {string} logData.userAgent - Client user agent
   * @param {string} logData.errorMessage - Error message (if status is error)
   * @param {Object} logData.additionalData - Additional data (JSON string)
   * @returns {Promise<Object>} Log entry result
   */
  static async logOperation(logData) {
    try {
      const sql = `
        INSERT INTO docker_operation_logs (
          user_id, username, action, repository, tag, status, 
          ip_address, user_agent, error_message, additional_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        logData.userId,
        logData.username,
        logData.action,
        logData.repository,
        logData.tag || null,
        logData.status,
        logData.ipAddress,
        logData.userAgent,
        logData.errorMessage || null,
        logData.additionalData ? JSON.stringify(logData.additionalData) : null,
        new Date().toISOString()
      ];
      
      const result = await dbRun(sql, params);
      return { id: result.lastID };
    } catch (error) {
      logger.error('Failed to log Docker operation:', error);
      throw error;
    }
  }
  
  /**
   * Get Docker operation logs with pagination
   * @param {Object} filters - Filter options
   * @param {number} filters.userId - Filter by user ID (optional)
   * @param {string} filters.repository - Filter by repository name (optional)
   * @param {string} filters.action - Filter by action (optional)
   * @param {string} filters.status - Filter by status (optional)
   * @param {Date} filters.startDate - Filter start date (optional)
   * @param {Date} filters.endDate - Filter end date (optional)
   * @param {Object} pagination - Pagination options
   * @param {number} pagination.page - Page number (default: 1)
   * @param {number} pagination.limit - Items per page (default: 20)
   * @returns {Promise<Object>} Logs with pagination info
   */
  static async getOperationLogs(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      let sql = 'SELECT * FROM docker_operation_logs WHERE 1=1';
      const params = [];
      
      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }
      
      if (filters.repository) {
        sql += ' AND repository LIKE ?';
        params.push(`%${filters.repository}%`);
      }
      
      if (filters.action) {
        sql += ' AND action = ?';
        params.push(filters.action);
      }
      
      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters.startDate) {
        sql += ' AND created_at >= ?';
        params.push(filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        sql += ' AND created_at <= ?';
        params.push(filters.endDate.toISOString());
      }
      
      sql += ' ORDER BY created_at DESC';
      
      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pagination.limit, offset);
      
      const logs = await dbAll(sql, params);
      
      // Parse additional_data JSON for each log entry
      logs.forEach(log => {
        try {
          if (log.additional_data) {
            log.additional_data = JSON.parse(log.additional_data);
          }
        } catch (e) {
          // If parsing fails, leave as is
        }
      });
      
      // Get total count for pagination
      let countSql = 'SELECT COUNT(*) as total FROM docker_operation_logs WHERE 1=1';
      const countParams = [];
      
      if (filters.userId) {
        countSql += ' AND user_id = ?';
        countParams.push(filters.userId);
      }
      
      if (filters.repository) {
        countSql += ' AND repository LIKE ?';
        countParams.push(`%${filters.repository}%`);
      }
      
      if (filters.action) {
        countSql += ' AND action = ?';
        countParams.push(filters.action);
      }
      
      if (filters.status) {
        countSql += ' AND status = ?';
        countParams.push(filters.status);
      }
      
      if (filters.startDate) {
        countSql += ' AND created_at >= ?';
        countParams.push(filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        countSql += ' AND created_at <= ?';
        countParams.push(filters.endDate.toISOString());
      }
      
      const countResult = await dbGet(countSql, countParams);
      const total = countResult.total;
      
      return {
        logs,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNextPage: pagination.page < Math.ceil(total / pagination.limit),
          hasPrevPage: pagination.page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to get Docker operation logs:', error);
      throw error;
    }
  }
  
  /**
   * Get Docker operation statistics
   * @param {Object} filters - Filter options (same as getOperationLogs)
   * @returns {Promise<Object>} Statistics object
   */
  static async getOperationStatistics(filters = {}) {
    try {
      let sql = 'SELECT COUNT(*) as total FROM docker_operation_logs WHERE 1=1';
      const params = [];
      
      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }
      
      if (filters.repository) {
        sql += ' AND repository LIKE ?';
        params.push(`%${filters.repository}%`);
      }
      
      if (filters.action) {
        sql += ' AND action = ?';
        params.push(filters.action);
      }
      
      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters.startDate) {
        sql += ' AND created_at >= ?';
        params.push(filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        sql += ' AND created_at <= ?';
        params.push(filters.endDate.toISOString());
      }
      
      const totalResult = await dbGet(sql, params);
      const total = totalResult.total;
      
      // Get counts by action
      let actionSql = sql.replace('COUNT(*) as total', 'action, COUNT(*) as count');
      actionSql += ' GROUP BY action';
      const actionResults = await dbAll(actionSql, params);
      
      // Get counts by status
      let statusSql = sql.replace('COUNT(*) as total', 'status, COUNT(*) as count');
      statusSql += ' GROUP BY status';
      const statusResults = await dbAll(statusSql, params);
      
      return {
        total,
        byAction: actionResults.reduce((acc, item) => {
          acc[item.action] = item.count;
          return acc;
        }, {}),
        byStatus: statusResults.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Failed to get Docker operation statistics:', error);
      throw error;
    }
  }
}
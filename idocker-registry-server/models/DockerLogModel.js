/**
 * Docker Operation Log data model class
 * Handles all database operations related to Docker operation logs
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class DockerLogModel extends BaseModel {
  constructor() {
    super('docker_operation_logs');
  }

  /**
   * Log a Docker operation
   * @param {Object} logData - Log data object
   * @returns {Promise<Object>} Log entry result
   */
  async logOperation(logData) {
    try {
      const data = {
        user_id: logData.userId,
        username: logData.username,
        action: logData.action,
        repository: logData.repository,
        tag: logData.tag || null,
        status: logData.status,
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent,
        error_message: logData.errorMessage || null,
        additional_data: logData.additionalData ? JSON.stringify(logData.additionalData) : null,
        created_at: new Date().toISOString()
      };
      
      const result = await this.create(data);
      return { id: result.id };
    } catch (error) {
      logger.error('Failed to log Docker operation:', error);
      throw error;
    }
  }

  /**
   * Get Docker operation logs with pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Logs with pagination info
   */
  async getOperationLogs(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      let whereConditions = [];
      let params = [];
      
      if (filters.userId) {
        whereConditions.push('user_id = ?');
        params.push(filters.userId);
      }
      
      if (filters.repository) {
        whereConditions.push('repository LIKE ?');
        params.push(`%${filters.repository}%`);
      }
      
      if (filters.action) {
        whereConditions.push('action = ?');
        params.push(filters.action);
      }
      
      if (filters.status) {
        whereConditions.push('status = ?');
        params.push(filters.status);
      }
      
      if (filters.startDate) {
        whereConditions.push('created_at >= ?');
        params.push(filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        whereConditions.push('created_at <= ?');
        params.push(filters.endDate.toISOString());
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const orderBy = 'ORDER BY created_at DESC';
      
      const result = await this.paginate(
        `SELECT * FROM ${this.tableName} ${whereClause} ${orderBy}`,
        params,
        pagination.page,
        pagination.limit
      );
      
      // Parse additional_data JSON for each log entry
      result.data.forEach(log => {
        try {
          if (log.additional_data) {
            log.additional_data = JSON.parse(log.additional_data);
          }
        } catch (e) {
          // If parsing fails, leave as is
        }
      });
      
      return {
        logs: result.data,
        pagination: result.pagination
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
  async getOperationStatistics(filters = {}) {
    try {
      let whereConditions = [];
      let params = [];
      
      if (filters.userId) {
        whereConditions.push('user_id = ?');
        params.push(filters.userId);
      }
      
      if (filters.repository) {
        whereConditions.push('repository LIKE ?');
        params.push(`%${filters.repository}%`);
      }
      
      if (filters.action) {
        whereConditions.push('action = ?');
        params.push(filters.action);
      }
      
      if (filters.status) {
        whereConditions.push('status = ?');
        params.push(filters.status);
      }
      
      if (filters.startDate) {
        whereConditions.push('created_at >= ?');
        params.push(filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        whereConditions.push('created_at <= ?');
        params.push(filters.endDate.toISOString());
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Get total count
      const totalResult = await this.get(
        `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`,
        params
      );
      const total = totalResult.total;
      
      // Get counts by action
      const actionResults = await this.all(
        `SELECT action, COUNT(*) as count FROM ${this.tableName} ${whereClause} GROUP BY action`,
        params
      );
      
      // Get counts by status
      const statusResults = await this.all(
        `SELECT status, COUNT(*) as count FROM ${this.tableName} ${whereClause} GROUP BY status`,
        params
      );
      
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

export default new DockerLogModel();
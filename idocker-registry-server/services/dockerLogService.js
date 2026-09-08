/**
 * Docker Operation Logging Service
 *
 * Handles logging of Docker Registry operations for audit and monitoring
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { DockerLogModel } from '../models/DockerLogModel.js';
import { logger } from '../utils/logger.js';

export class DockerLogService {
  /**
   * Log a Docker operation into the audit_logs table.
   * Never throws: audit failures must not break the registry request flow.
   */
  static async logOperation(logData) {
    try {
      const { AuthModel } = await import('../models/AuthModel.js');
      await new AuthModel().logAudit({
        user_id: logData.userId,
        action: `docker:${logData.action}`,
        resource_type: 'repository',
        resource_id: logData.repository || '',
        details: {
          username: logData.username,
          repository: logData.repository || '',
          tag: logData.tag || null,
          status: logData.status,
          ip_address: logData.ipAddress,
          user_agent: logData.userAgent,
          error_message: logData.errorMessage || null,
          ...(logData.additionalData || {})
        },
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent
      });
    } catch (error) {
      logger.error('Failed to log Docker operation:', error);
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
      const result = await new DockerLogModel().getOperationLogs(filters, pagination);
      return result;
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
      const result = await new DockerLogModel().getOperationStatistics(filters);
      return result;
    } catch (error) {
      logger.error('Failed to get Docker operation statistics:', error);
      throw error;
    }
  }
}
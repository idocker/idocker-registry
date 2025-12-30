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
      const result = await DockerLogModel.logOperation(logData);
      return result;
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
      const result = await DockerLogModel.getOperationLogs(filters, pagination);
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
      const result = await DockerLogModel.getOperationStatistics(filters);
      return result;
    } catch (error) {
      logger.error('Failed to get Docker operation statistics:', error);
      throw error;
    }
  }
}
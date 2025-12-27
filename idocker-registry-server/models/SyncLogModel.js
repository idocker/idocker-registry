/**
 * SyncLog 数据模型类
 * 处理同步日志相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class SyncLogModel extends BaseModel {
  constructor() {
    super('sync_logs');
  }

  /**
   * 创建同步日志记录
   */
  async createSyncLog(syncData) {
    try {
      const data = {
        sync_type: syncData.type || 'full',
        project_id: syncData.projectId || null,
        user_id: syncData.userId || null,
        status: syncData.status || 'completed',
        processed_count: syncData.processedCount || 0,
        error_count: syncData.errorCount || 0,
        duration: syncData.duration || 0,
        details: syncData.details ? JSON.stringify(syncData.details) : null,
        created_at: new Date().toISOString()
      };

      return await this.create(data);
    } catch (error) {
      logger.error('创建同步日志记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取最近的同步日志
   */
  async getLastSync() {
    try {
      const log = await this.get(
        'SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 1'
      );
      return log;
    } catch (error) {
      logger.error('获取最近同步日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取同步日志列表
   */
  async getSyncLogs(page = 1, limit = 20) {
    try {
      const sql = `
        SELECT * FROM sync_logs 
        ORDER BY created_at DESC
      `;
      
      return await this.paginate(sql, [], page, limit);
    } catch (error) {
      logger.error('获取同步日志列表失败:', error);
      throw error;
    }
  }
}
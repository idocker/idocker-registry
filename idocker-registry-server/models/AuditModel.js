/**
 * 审计日志数据模型类
 * 处理所有与审计日志相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class AuditModel extends BaseModel {
  constructor() {
    super('audit_logs');
  }

  /**
   * 获取审计日志列表（支持分页、搜索和过滤）
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

      // 添加搜索条件
      if (search) {
        query += ' AND (al.action LIKE ? OR al.resource_type LIKE ? OR al.resource_id LIKE ? OR u.username LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      // 添加操作类型过滤
      if (action) {
        query += ' AND al.action = ?';
        params.push(action);
      }

      // 添加资源类型过滤
      if (resourceType) {
        query += ' AND al.resource_type = ?';
        params.push(resourceType);
      }

      // 添加用户过滤
      if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
      }

      // 添加日期范围过滤
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
      
      // 格式化日志详情（如果是JSON字符串）
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach(log => {
          try {
            if (log.details) {
              log.details = JSON.parse(log.details);
            }
          } catch (e) {
            // 保持原样，如果不是有效的JSON
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('获取审计日志列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定审计日志的详细信息
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
        // 格式化日志详情
        try {
          if (log.details) {
            log.details = JSON.parse(log.details);
          }
        } catch (e) {
          // 保持原样，如果不是有效的JSON
        }
      }

      return log;
    } catch (error) {
      logger.error('获取审计日志详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建审计日志
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
      logger.error('创建审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取审计日志统计信息
   */
  async getAuditStatistics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      const startDateStr = startDate.toISOString().split('T')[0];

      // 总操作数
      const totalOperations = await this.get(
        'SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?',
        [startDateStr]
      );

      // 按操作类型统计
      const actionsCount = await this.all(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= ?
        GROUP BY action
        ORDER BY count DESC
      `, [startDateStr]);

      // 按资源类型统计
      const resourceTypesCount = await this.all(`
        SELECT resource_type, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= ?
        GROUP BY resource_type
        ORDER BY count DESC
      `, [startDateStr]);

      // 按用户统计
      const usersCount = await this.all(`
        SELECT u.username, u.full_name, COUNT(al.id) as count
        FROM audit_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.created_at >= ?
        GROUP BY u.id, u.username, u.full_name
        ORDER BY count DESC
        LIMIT 10
      `, [startDateStr]);

      // 按日期统计（最近7天）
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

      // 最活跃的操作（排除登录/登出）
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
      logger.error('获取审计统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 清理旧的审计日志
   */
  async cleanupOldLogs(days = 90) {
    try {
      // 计算截止日期
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // 统计要删除的日志数量
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

      // 执行删除
      const result = await this.run(
        'DELETE FROM audit_logs WHERE created_at < ?',
        [cutoffDateStr]
      );

      logger.info(`审计日志清理完成: 删除了 ${result.changes} 条记录`);

      return {
        deletedCount: result.changes,
        cutoffDate: cutoffDateStr
      };
    } catch (error) {
      logger.error('清理审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有可用的操作类型
   */
  async getAvailableActions() {
    try {
      const actions = await this.all(
        'SELECT DISTINCT action FROM audit_logs ORDER BY action'
      );
      return actions.map(item => item.action);
    } catch (error) {
      logger.error('获取操作类型列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有可用的资源类型
   */
  async getAvailableResourceTypes() {
    try {
      const resourceTypes = await this.all(
        'SELECT DISTINCT resource_type FROM audit_logs ORDER BY resource_type'
      );
      return resourceTypes.map(item => item.resource_type);
    } catch (error) {
      logger.error('获取资源类型列表失败:', error);
      throw error;
    }
  }

  /**
   * 导出审计日志
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

      // 添加过滤条件
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

      // 格式化日志详情
      if (logs && Array.isArray(logs)) {
        logs.forEach(log => {
          try {
            if (log.details) {
              log.details = JSON.parse(log.details);
            }
          } catch (e) {
            // 保持原样，如果不是有效的JSON
          }
        });
      }

      return logs;
    } catch (error) {
      logger.error('导出审计日志失败:', error);
      throw error;
    }
  }
}
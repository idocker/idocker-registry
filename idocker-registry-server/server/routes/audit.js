/**
 * 审计日志路由模块
 * 
 * 提供审计日志的查询和管理功能
 * 记录系统中的所有重要操作
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { dbGet, dbAll, dbPaginate } from '../utils/dbHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有审计日志接口都需要管理员权限
router.use(requireAdmin);

/**
 * GET /api/audit/logs
 * 获取审计日志列表
 * 支持分页、搜索和过滤
 */
router.get('/logs', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    search = '', 
    action = '', 
    resourceType = '', 
    userId = '',
    startDate = '',
    endDate = ''
  } = req.query;
  
  const offset = (page - 1) * limit;
  
  try {
    const db = await getDb();
    
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
      params.push(endDate + ' 23:59:59'); // 包含整天
    }
    
    // 添加排序和分页
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const logs = await db.all(query, params);
    
    // 格式化日志详情（如果是JSON字符串）
    logs.forEach(log => {
      try {
        if (log.details) {
          log.details = JSON.parse(log.details);
        }
      } catch (e) {
        // 保持原样，如果不是有效的JSON
      }
    });
    
    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (search) {
      countQuery += ' AND (al.action LIKE ? OR al.resource_type LIKE ? OR al.resource_id LIKE ? OR u.username LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (action) {
      countQuery += ' AND al.action = ?';
      countParams.push(action);
    }
    
    if (resourceType) {
      countQuery += ' AND al.resource_type = ?';
      countParams.push(resourceType);
    }
    
    if (userId) {
      countQuery += ' AND al.user_id = ?';
      countParams.push(userId);
    }
    
    if (startDate) {
      countQuery += ' AND al.created_at >= ?';
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ' AND al.created_at <= ?';
      countParams.push(endDate + ' 23:59:59');
    }
    
    const { total } = await db.get(countQuery, countParams);
    
    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取审计日志时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取审计日志失败'
    });
  }
}));

/**
 * GET /api/audit/logs/:id
 * 获取特定审计日志的详细信息
 */
router.get('/logs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const db = await getDb();
    
    const log = await db.get(`
      SELECT 
        al.id, al.action, al.resource_type, al.resource_id, al.details,
        al.ip_address, al.user_agent, al.created_at,
        u.username, u.full_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `, [id]);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '审计日志不存在'
      });
    }
    
    // 格式化日志详情
    try {
      if (log.details) {
        log.details = JSON.parse(log.details);
      }
    } catch (e) {
      // 保持原样，如果不是有效的JSON
    }
    
    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    logger.error('获取审计日志详情时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取审计日志详情失败'
    });
  }
}));

/**
 * GET /api/audit/statistics
 * 获取审计日志统计信息
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  const startDateStr = startDate.toISOString().split('T')[0];
  
  try {
    const db = await getDb();
    
    // 总操作数
    const totalOperations = await db.get(`
      SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?
    `, [startDateStr]);
    
    // 按操作类型统计
    const actionsCount = await db.all(`
      SELECT action, COUNT(*) as count 
      FROM audit_logs 
      WHERE created_at >= ?
      GROUP BY action
      ORDER BY count DESC
    `, [startDateStr]);
    
    // 按资源类型统计
    const resourceTypesCount = await db.all(`
      SELECT resource_type, COUNT(*) as count 
      FROM audit_logs 
      WHERE created_at >= ?
      GROUP BY resource_type
      ORDER BY count DESC
    `, [startDateStr]);
    
    // 按用户统计
    const usersCount = await db.all(`
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
    
    const dailyStats = await db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [lastWeekStr]);
    
    // 最活跃的操作（排除登录/登出）
    const activeOperations = await db.all(`
      SELECT action, COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= ? AND action NOT IN ('LOGIN', 'LOGOUT')
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `, [startDateStr]);
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOperations: totalOperations.count,
          daysRange: days
        },
        byAction: actionsCount,
        byResourceType: resourceTypesCount,
        byUser: usersCount,
        dailyStats,
        activeOperations
      }
    });
  } catch (error) {
    logger.error('获取审计统计信息时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取审计统计信息失败'
    });
  }
}));

/**
 * DELETE /api/audit/logs/cleanup
 * 清理旧的审计日志
 */
router.delete('/logs/cleanup', asyncHandler(async (req, res) => {
  const { days = 90 } = req.query; // 默认清理90天前的日志
  
  try {
    const db = await getDb();
    
    // 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    // 统计要删除的日志数量
    const deleteCount = await db.get(`
      SELECT COUNT(*) as count FROM audit_logs WHERE created_at < ?
    `, [cutoffDateStr]);
    
    if (deleteCount.count === 0) {
      return res.status(200).json({
        success: true,
        message: '没有需要清理的日志',
        data: {
          deletedCount: 0,
          cutoffDate: cutoffDateStr
        }
      });
    }
    
    // 执行删除
    const result = await db.run(`
      DELETE FROM audit_logs WHERE created_at < ?
    `, [cutoffDateStr]);
    
    // 记录清理操作
    await db.run(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      'CLEANUP_LOGS',
      'audit_logs',
      '',
      JSON.stringify({ 
        deletedCount: result.changes, 
        cutoffDate: cutoffDateStr,
        days 
      }),
      req.ip,
      req.headers['user-agent']
    ]);
    
    logger.info(`审计日志清理完成: 删除了 ${result.changes} 条记录`);
    
    res.status(200).json({
      success: true,
      message: '审计日志清理完成',
      data: {
        deletedCount: result.changes,
        cutoffDate: cutoffDateStr
      }
    });
  } catch (error) {
    logger.error('清理审计日志时出错:', error);
    res.status(500).json({
      success: false,
      message: '清理审计日志失败'
    });
  }
}));

/**
 * GET /api/audit/actions
 * 获取所有可用的操作类型
 */
router.get('/actions', asyncHandler(async (req, res) => {
  try {
    const db = await getDb();
    
    const actions = await db.all(`
      SELECT DISTINCT action FROM audit_logs ORDER BY action
    `);
    
    res.status(200).json({
      success: true,
      data: actions.map(item => item.action)
    });
  } catch (error) {
    logger.error('获取操作类型列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取操作类型列表失败'
    });
  }
}));

/**
 * GET /api/audit/resource-types
 * 获取所有可用的资源类型
 */
router.get('/resource-types', asyncHandler(async (req, res) => {
  try {
    const db = await getDb();
    
    const resourceTypes = await db.all(`
      SELECT DISTINCT resource_type FROM audit_logs ORDER BY resource_type
    `);
    
    res.status(200).json({
      success: true,
      data: resourceTypes.map(item => item.resource_type)
    });
  } catch (error) {
    logger.error('获取资源类型列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取资源类型列表失败'
    });
  }
}));

/**
 * POST /api/audit/export
 * 导出审计日志
 */
router.post('/export', asyncHandler(async (req, res) => {
  const { 
    action = '', 
    resourceType = '', 
    userId = '',
    startDate = '',
    endDate = '',
    format = 'json'
  } = req.body;
  
  try {
    const db = await getDb();
    
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
    
    // 查询日志
    const logs = await db.all(query, params);
    
    // 格式化日志详情
    logs.forEach(log => {
      try {
        if (log.details) {
          log.details = JSON.parse(log.details);
        }
      } catch (e) {
        // 保持原样，如果不是有效的JSON
      }
    });
    
    // 记录导出操作
    await db.run(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      'EXPORT_LOGS',
      'audit_logs',
      '',
      JSON.stringify({ 
        filters: { action, resourceType, userId, startDate, endDate },
        format,
        count: logs.length
      }),
      req.ip,
      req.headers['user-agent']
    ]);
    
    // 设置响应头
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${timestamp}.${format}`);
    
    // 根据请求的格式返回数据
    if (format === 'csv') {
      // 转换为CSV格式
      const csv = convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.status(200).send(csv);
    } else {
      // 默认返回JSON格式
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({
        success: true,
        data: logs,
        meta: {
          count: logs.length,
          filters: { action, resourceType, userId, startDate, endDate },
          exportTime: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error('导出审计日志时出错:', error);
    res.status(500).json({
      success: false,
      message: '导出审计日志失败'
    });
  }
}));

/**
 * 将日志数组转换为CSV格式
 */
function convertToCSV(logs) {
  if (logs.length === 0) return '';
  
  // 定义CSV列名
  const headers = [
    'ID', '时间', '用户', '邮箱', '操作', '资源类型', '资源ID', 'IP地址', '用户代理', '详情'
  ];
  
  // 将每条日志转换为CSV行
  const rows = logs.map(log => [
    log.id,
    log.created_at,
    log.username || '',
    log.email || '',
    log.action,
    log.resource_type || '',
    log.resource_id || '',
    log.ip_address || '',
    log.user_agent ? `"${log.user_agent.replace(/"/g, '""')}"` : '',
    log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : ''
  ]);
  
  // 合并头部和数据行
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export default router;
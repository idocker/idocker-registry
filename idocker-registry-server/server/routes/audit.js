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
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { AuditModel } from '../models/AuditModel.js';

const router = express.Router();
const auditModel = new AuditModel();

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
  
  try {
    const result = await auditModel.getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      action,
      resourceType,
      userId,
      startDate,
      endDate
    });
    
    res.status(200).json({
      success: true,
      data: result.data
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
    const log = await auditModel.getAuditLogById(id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '审计日志不存在'
      });
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
  
  try {
    const statistics = await auditModel.getAuditStatistics(parseInt(days));
    
    res.status(200).json({
      success: true,
      data: statistics
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
    const result = await auditModel.cleanupOldLogs(parseInt(days));
    
    if (result.deletedCount === 0) {
      return res.status(200).json({
        success: true,
        message: '没有需要清理的日志',
        data: result
      });
    }
    
    // 记录清理操作
    await auditModel.createAuditLog({
      user_id: req.user.id,
      action: 'CLEANUP_LOGS',
      resource_type: 'audit_logs',
      resource_id: '',
      details: JSON.stringify({ 
        deletedCount: result.deletedCount, 
        cutoffDate: result.cutoffDate,
        days 
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(200).json({
      success: true,
      message: '审计日志清理完成',
      data: result
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
    const actions = await auditModel.getAvailableActions();
    
    res.status(200).json({
      success: true,
      data: actions
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
    const resourceTypes = await auditModel.getAvailableResourceTypes();
    
    res.status(200).json({
      success: true,
      data: resourceTypes
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
    const logs = await auditModel.exportAuditLogs({
      action,
      resourceType, 
      userId,
      startDate,
      endDate
    });
    
    // 记录导出操作
    await auditModel.createAuditLog({
      user_id: req.user.id,
      action: 'EXPORT_LOGS',
      resource_type: 'audit_logs',
      resource_id: '',
      details: JSON.stringify({ 
        filters: { action, resourceType, userId, startDate, endDate },
        format,
        count: logs.length
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
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
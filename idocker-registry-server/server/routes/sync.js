/**
 * Docker Registry 同步路由模块
 * 
 * 提供Docker Registry数据同步的API接口
 * 只有管理员可以执行同步操作
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { dbPaginate } from '../utils/dbHelper.js';
import { getDb } from '../config/database.js';
import registrySyncService from '../services/registrySyncService.js';

const router = express.Router();

// 所有同步接口都需要管理员权限
router.use(requireAdmin);

/**
 * GET /api/sync/status
 * 获取同步状态信息
 */
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const status = await registrySyncService.getSyncStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步状态失败'
    });
  }
}));

/**
 * POST /api/sync/all
 * 同步所有仓库数据
 */
router.post('/all', asyncHandler(async (req, res) => {
  try {
    const { stopOnError = false } = req.body;
    
    logger.info(`管理员 ${req.user.username} 开始执行全量同步...`);
    
    // 记录同步开始
    await registrySyncService.logSync({
      type: 'full',
      status: 'started',
      userId: req.user.id,
      details: { stopOnError }
    });
    
    const result = await registrySyncService.syncAllRepositories({ stopOnError });
    
    // 记录同步完成
    await registrySyncService.logSync({
      type: 'full',
      status: result.success ? 'completed' : 'failed',
      userId: req.user.id,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      duration: result.duration,
      details: result
    });
    
    logger.info(`全量同步完成: ${JSON.stringify(result)}`);
    
    res.status(200).json({
      success: true,
      message: '同步完成',
      data: result
    });
  } catch (error) {
    logger.error('全量同步失败:', error);
    
    // 记录同步失败
    await registrySyncService.logSync({
      type: 'full',
      status: 'failed',
      userId: req.user.id,
      errorCount: 1,
      details: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: `同步失败: ${error.message}`
    });
  }
}));

/**
 * POST /api/sync/project/:projectId
 * 同步指定项目的仓库数据
 */
router.post('/project/:projectId', asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.params;
    const { stopOnError = false } = req.body;
    
    logger.info(`管理员 ${req.user.username} 开始同步项目 ${projectId} 的仓库数据...`);
    
    // 记录同步开始
    await registrySyncService.logSync({
      type: 'project',
      projectId: parseInt(projectId),
      status: 'started',
      userId: req.user.id,
      details: { stopOnError }
    });
    
    const result = await registrySyncService.syncProjectRepositories(parseInt(projectId), { stopOnError });
    
    // 记录同步完成
    await registrySyncService.logSync({
      type: 'project',
      projectId: parseInt(projectId),
      status: result.success ? 'completed' : 'failed',
      userId: req.user.id,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      duration: result.duration,
      details: result
    });
    
    logger.info(`项目同步完成: ${JSON.stringify(result)}`);
    
    res.status(200).json({
      success: true,
      message: '项目同步完成',
      data: result
    });
  } catch (error) {
    logger.error('项目同步失败:', error);
    
    // 记录同步失败
    await registrySyncService.logSync({
      type: 'project',
      projectId: parseInt(req.params.projectId),
      status: 'failed',
      userId: req.user.id,
      errorCount: 1,
      details: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: `项目同步失败: ${error.message}`
    });
  }
}));

/**
 * GET /api/sync/logs
 * 获取同步日志列表
 */
router.get('/logs', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, type = '' } = req.query;
    
    const db = await getDb();
    
    let query = `
      SELECT 
        sl.*,
        p.name as project_name,
        u.username as user_name
      FROM sync_logs sl
      LEFT JOIN projects p ON sl.project_id = p.id
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type) {
      query += ' AND sl.sync_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY sl.created_at DESC';
    
    const result = await dbPaginate(query, params, parseInt(page), parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: {
        logs: result.items,
        pagination: result.pagination
      }
    });
  } catch (error) {
    logger.error('获取同步日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步日志失败'
    });
  }
}));

export default router;
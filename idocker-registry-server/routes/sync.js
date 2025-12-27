/**
 * Docker Repository Sync Routes Module
 *
 * Provides API interfaces for Docker Repository data synchronization
 * Only administrators can perform sync operations
 *
 * @author IDocker Repository Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import repositorySyncService from '../services/repositorySyncService.js';
import { AuthModel } from '../models/AuthModel.js';
import { success, error } from '../utils/apiResponse.js';

const router = express.Router();
const authModel = new AuthModel();

// All sync endpoints require admin permission
router.use(requireAdmin);

/**
 * GET /api/sync/status
 * Get sync status information
 */
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const status = await repositorySyncService.getSyncStatus();
    
    res.status(200).json(success(status));
  } catch (error) {
    logger.error('Failed to get sync status:', error);
    res.status(500).json(error('Failed to get sync status'));
  }
}));

/**
 * POST /api/sync/all
 * Sync all repository data
 */
router.post('/all', asyncHandler(async (req, res) => {
  try {
    const { stopOnError = false } = req.body;
    
    logger.info(`Admin ${req.user.username} starting full sync...`);
    
    // Log sync start
    // await repositorySyncService.logSync({
    //   type: 'full',
    //   status: 'started',
    //   userId: req.user.id,
    //   details: { stopOnError }
    // });
    
    // Start syncing all repositories
    const result = await repositorySyncService.syncAllRepositories({ stopOnError });
    
    // Log sync completion
    await repositorySyncService.logSync({
      type: 'full',
      status: result.success ? 'completed' : 'failed',
      userId: req.user.id,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      duration: result.duration,
      details: result
    });
    
    logger.info(`Full sync completed: ${JSON.stringify(result)}`);
    
    res.status(200).json(success(result, 'Sync completed'));
  } catch (error) {
    logger.error('Full sync failed:', error);
    
    // Log sync failure
    await repositorySyncService.logSync({
      type: 'full',
      status: 'failed',
      userId: req.user.id,
      errorCount: 1,
      details: { error: error.message }
    });
    
    res.status(500).json(error(`Sync failed: ${error.message}`));
  }
}));

/**
 * POST /api/sync/project/:projectId
 * Sync repository data for a specific project
 */
router.post('/project/:projectId', asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.params;
    const { stopOnError = false } = req.body;
    
    logger.info(`Admin ${req.user.username} starting sync for project ${projectId}...`);
    
    // Log sync start
    await repositorySyncService.logSync({
      type: 'project',
      projectId: parseInt(projectId),
      status: 'started',
      userId: req.user.id,
      details: { stopOnError }
    });
    
    const result = await repositorySyncService.syncProjectRepositories(parseInt(projectId), { stopOnError });
    
    // Log sync completion
    await repositorySyncService.logSync({
      type: 'project',
      projectId: parseInt(projectId),
      status: result.success ? 'completed' : 'failed',
      userId: req.user.id,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      duration: result.duration,
      details: result
    });
    
    logger.info(`Project sync completed: ${JSON.stringify(result)}`);
    
    res.status(200).json(success(result, 'Project sync completed'));
  } catch (error) {
    logger.error('Project sync failed:', error);
    
    // Log sync failure
    await repositorySyncService.logSync({
      type: 'project',
      projectId: parseInt(req.params.projectId),
      status: 'failed',
      userId: req.user.id,
      errorCount: 1,
      details: { error: error.message }
    });
    
    res.status(500).json(error(`Project sync failed: ${error.message}`));
  }
}));

/**
 * GET /api/sync/logs
 * Get sync log list
 */
router.get('/logs', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, type = '' } = req.query;

    // 使用authModel的all方法获取同步日志
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

    const result = await authModel.paginate(query, params, parseInt(page), parseInt(limit));

    res.status(200).json(success({
      logs: result.data,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Failed to get sync logs:', error);
    res.status(500).json(error('Failed to get sync logs'));
  }
}));

export default router;
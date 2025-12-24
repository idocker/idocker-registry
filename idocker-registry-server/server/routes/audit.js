/**
 * Audit Log Routes Module
 *
 * Provides audit log query and management functionality
 * Records all important operations in the system
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { AuditModel } from '../models/AuditModel.js';
import { success, error } from '../utils/apiResponse.js';

const router = express.Router();
const auditModel = new AuditModel();

// All audit log endpoints require admin permission
router.use(requireAdmin);

/**
 * GET /api/audit/logs
 * Get audit log list
 * Supports pagination, search, and filtering
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
    
    res.status(200).json(success(result.data));
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    res.status(500).json(error('Failed to get audit logs'));
  }
}));

/**
 * GET /api/audit/logs/:id
 * Get specific audit log details
 */
router.get('/logs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const log = await auditModel.getAuditLogById(id);
    
    if (!log) {
      return res.status(404).json(error('Audit log not found', 404));
    }
    
    res.status(200).json(success(log));
  } catch (error) {
    logger.error('Error getting audit log details:', error);
    res.status(500).json(error('Failed to get audit log details'));
  }
}));

/**
 * GET /api/audit/statistics
 * Get audit log statistics
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  try {
    const statistics = await auditModel.getAuditStatistics(parseInt(days));
    
    res.status(200).json(success(statistics));
  } catch (error) {
    logger.error('Error getting audit statistics:', error);
    res.status(500).json(error('Failed to get audit statistics'));
  }
}
}));

/**
 * DELETE /api/audit/logs/cleanup
 * Clean up old audit logs
 */
router.delete('/logs/cleanup', asyncHandler(async (req, res) => {
  const { days = 90 } = req.query; // Default to cleaning logs from 90 days ago
  
  try {
    const result = await auditModel.cleanupOldLogs(parseInt(days));
    
    if (result.deletedCount === 0) {
      return res.status(200).json(success({ ...result, message: 'No logs need to be cleaned' }, 'No logs need to be cleaned'));
    }
    
    // Log cleanup operation
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
    
    res.status(200).json(success(result, 'Audit log cleanup completed'));
  } catch (error) {
    logger.error('Error cleaning up audit logs:', error);
    res.status(500).json(error('Failed to clean up audit logs'));
  }
}
}));

/**
 * GET /api/audit/actions
 * Get all available action types
 */
router.get('/actions', asyncHandler(async (req, res) => {
  try {
    const actions = await auditModel.getAvailableActions();
    
    res.status(200).json(success(actions));
  } catch (error) {
    logger.error('Error getting action type list:', error);
    res.status(500).json(error('Failed to get action type list'));
  }
}));

/**
 * GET /api/audit/resource-types
 * Get all available resource types
 */
router.get('/resource-types', asyncHandler(async (req, res) => {
  try {
    const resourceTypes = await auditModel.getAvailableResourceTypes();
    
    res.status(200).json(success(resourceTypes));
  } catch (error) {
    logger.error('Error getting resource type list:', error);
    res.status(500).json(error('Failed to get resource type list'));
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
    
    // Log export operation
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
    
    // Set response headers
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${timestamp}.${format}`);
    
    // Return data in requested format
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.status(200).send(csv);
    } else {
      // Default to JSON format
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(success({
        logs,
        meta: {
          count: logs.length,
          filters: { action, resourceType, userId, startDate, endDate },
          exportTime: new Date().toISOString()
        }
      }));
    }
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json(error('Failed to export audit logs'));
  }
}));

/**
 * Convert log array to CSV format
 */
function convertToCSV(logs) {
  if (logs.length === 0) return '';
  
  // Define CSV column names
  const headers = [
    'ID', 'Time', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Details'
  ];
  
  // Convert each log to CSV row
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
  
  // Merge headers and data rows
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

export default router;
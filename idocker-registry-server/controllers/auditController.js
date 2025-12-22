import AuditLog from '../models/AuditLog.js';

class AuditController {
  async getAuditLogs(req, res) {
    try {
      const { 
        userId, 
        projectId, 
        action, 
        resourceType, 
        startDate, 
        endDate, 
        limit = 50, 
        offset = 0 
      } = req.query;
      
      const filters = {
        userId: userId ? parseInt(userId) : undefined,
        projectId: projectId ? parseInt(projectId) : undefined,
        action,
        resourceType,
        startDate,
        endDate
      };
      
      const logs = await AuditLog.getAll(
        filters, 
        parseInt(limit), 
        parseInt(offset)
      );
      
      return res.json({ logs });
    } catch (error) {
      console.error('Get audit logs error:', error);
      return res.status(500).json({ error: 'Failed to get audit logs' });
    }
  }

  async getAuditLogStats(req, res) {
    try {
      const { userId, projectId, startDate, endDate } = req.query;
      
      const filters = {
        userId: userId ? parseInt(userId) : undefined,
        projectId: projectId ? parseInt(projectId) : undefined,
        startDate,
        endDate
      };
      
      const stats = await AuditLog.getStats(filters);
      
      return res.json({ stats });
    } catch (error) {
      console.error('Get audit log stats error:', error);
      return res.status(500).json({ error: 'Failed to get audit log stats' });
    }
  }

  async getAuditLogCount(req, res) {
    try {
      const { 
        userId, 
        projectId, 
        action, 
        resourceType, 
        startDate, 
        endDate 
      } = req.query;
      
      const filters = {
        userId: userId ? parseInt(userId) : undefined,
        projectId: projectId ? parseInt(projectId) : undefined,
        action,
        resourceType,
        startDate,
        endDate
      };
      
      const count = await AuditLog.count(filters);
      
      return res.json({ count });
    } catch (error) {
      console.error('Get audit log count error:', error);
      return res.status(500).json({ error: 'Failed to get audit log count' });
    }
  }

  async deleteAuditLogs(req, res) {
    try {
      const { 
        userId, 
        projectId, 
        action, 
        resourceType, 
        startDate, 
        endDate,
        ids  // 允许根据ID删除特定日志
      } = req.body;
      
      let deletedCount = 0;
      
      // 如果提供了ID列表，只删除这些日志
      if (ids && Array.isArray(ids) && ids.length > 0) {
        const idParams = ids.map(() => '?').join(',');
        const query = `DELETE FROM audit_logs WHERE id IN (${idParams})`;
        const result = await AuditLog.run(query, ids);
        deletedCount = result.changes;
      } else {
        // 否则根据过滤条件删除
        const filters = {
          userId: userId ? parseInt(userId) : undefined,
          projectId: projectId ? parseInt(projectId) : undefined,
          action,
          resourceType,
          startDate,
          endDate
        };
        
        deletedCount = await AuditLog.deleteByFilters(filters);
      }
      
      // 记录删除审计日志的操作
      await AuditLog.create({
        userId: req.user.id,
        action: 'delete_audit_logs',
        resourceType: 'system',
        details: { 
          deletedCount,
          filters: { userId, projectId, action, resourceType, startDate, endDate, ids }
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({ 
        message: 'Audit logs deleted successfully', 
        deletedCount 
      });
    } catch (error) {
      console.error('Delete audit logs error:', error);
      return res.status(500).json({ error: 'Failed to delete audit logs' });
    }
  }

  async deleteOldLogs(req, res) {
    try {
      const { daysOld = 365 } = req.body;
      
      const deletedCount = await AuditLog.deleteOldLogs(daysOld);
      
      // 记录删除旧日志的操作
      await AuditLog.create({
        userId: req.user.id,
        action: 'delete_old_logs',
        resourceType: 'system',
        details: { daysOld, deletedCount },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({ 
        message: `Audit logs older than ${daysOld} days deleted successfully`, 
        deletedCount 
      });
    } catch (error) {
      console.error('Delete old audit logs error:', error);
      return res.status(500).json({ error: 'Failed to delete old audit logs' });
    }
  }
}

export default new AuditController();
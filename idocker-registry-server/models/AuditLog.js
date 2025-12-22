import Database from '../config/database.js';

class AuditLog {
  static async create(logData) {
    const { userId, action, resourceType, resourceId, details, projectId, ipAddress, userAgent } = logData;
    
    try {
      const result = await Database.run(
        `INSERT INTO audit_logs 
         (user_id, action, resource_type, resource_id, details, project_id, ip_address, user_agent, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, action, resourceType, resourceId, JSON.stringify(details || {}), projectId || 'not-project', ipAddress, userAgent]
      );
      
      return await AuditLog.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating audit log: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const log = await Database.get(
        `SELECT al.*, u.username 
         FROM audit_logs al 
         LEFT JOIN users u ON al.user_id = u.id 
         WHERE al.id = ?`,
        [id]
      );
      
      if (log && log.details) {
        log.details = JSON.parse(log.details);
      }
      
      return log;
    } catch (error) {
      throw new Error(`Error finding audit log by ID: ${error.message}`);
    }
  }

  static async getAll(filters = {}, limit = 50, offset = 0) {
    const { userId, projectId, action, resourceType, startDate, endDate } = filters;
    
    try {
      let query = `
        SELECT al.*, u.username 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        WHERE 1=1
      `;
      const params = [];
      
      if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
      }
      
      if (projectId) {
        query += ' AND al.project_id = ?';
        params.push(projectId);
      }
      
      if (action) {
        query += ' AND al.action = ?';
        params.push(action);
      }
      
      if (resourceType) {
        query += ' AND al.resource_type = ?';
        params.push(resourceType);
      }
      
      if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const logs = await Database.all(query, params);
      
      for (const log of logs) {
        if (log.details) {
          log.details = JSON.parse(log.details);
        }
      }
      
      return logs;
    } catch (error) {
      throw new Error(`Error getting all audit logs: ${error.message}`);
    }
  }

  static async count(filters = {}) {
    const { userId, projectId, action, resourceType, startDate, endDate } = filters;
    
    try {
      let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
      const params = [];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }
      
      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }
      
      if (resourceType) {
        query += ' AND resource_type = ?';
        params.push(resourceType);
      }
      
      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }
      
      const result = await Database.get(query, params);
      return result.count;
    } catch (error) {
      throw new Error(`Error counting audit logs: ${error.message}`);
    }
  }

  static async deleteOldLogs(daysOld = 365) {
    try {
      const result = await Database.run(
        'DELETE FROM audit_logs WHERE created_at < datetime("now", "-" || ? || " days")',
        [daysOld]
      );
      return result.changes;
    } catch (error) {
      throw new Error(`Error deleting old audit logs: ${error.message}`);
    }
  }

  static async getStats(filters = {}) {
    const { userId, projectId, startDate, endDate } = filters;
    
    try {
      let query = `
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE 1=1
      `;
      const params = [];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }
      
      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY action';
      
      const stats = await Database.all(query, params);
      return stats;
    } catch (error) {
      throw new Error(`Error getting audit log stats: ${error.message}`);
    }
  }

  static async deleteByFilters(filters = {}) {
    const { userId, projectId, action, resourceType, startDate, endDate } = filters;
    
    try {
      let query = 'DELETE FROM audit_logs WHERE 1=1';
      const params = [];
      
      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }
      
      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }
      
      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }
      
      if (resourceType) {
        query += ' AND resource_type = ?';
        params.push(resourceType);
      }
      
      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }
      
      const result = await Database.run(query, params);
      return result.changes;
    } catch (error) {
      throw new Error(`Error deleting audit logs by filters: ${error.message}`);
    }
  }

  static async run(sql, params = []) {
    try {
      return await Database.run(sql, params);
    } catch (error) {
      throw new Error(`Error executing SQL in AuditLog: ${error.message}`);
    }
  }
}

export default AuditLog;
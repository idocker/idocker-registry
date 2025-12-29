/**
 * Docker Registry data model class
 * Handles database operations related to Docker Registry API
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class DockerRegistryModel extends BaseModel {
  constructor() {
    super('projects');
  }

  /**
   * Parse and get project information by repository name
   * Repository name format: project/imagename or namespace/project/imagename
   */
  async getProjectByRepositoryName(repository) {
    try {
      if (!repository) {
        return null;
      }

      const repoParts = repository.split('/');
      let projectName = null;

      if (repoParts.length >= 2) {
        projectName = repoParts[0];
      }

      if (!projectName) {
        return null;
      }

      const project = await this.get(
        'SELECT * FROM projects WHERE name = ? AND is_active = 1',
        [projectName]
      );

      return project;
    } catch (error) {
      logger.error('Failed to get project by repository name:', error);
      throw error;
    }
  }

  /**
   * Check user access to project
   */
  async checkProjectAccess(projectId, userId, userRole) {
    try {
      if (!projectId || !userId) {
        return false;
      }

      // Administrators have all permissions
      if (userRole === 'admin') {
        return true;
      }

      const membership = await this.get(
        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      return !!membership;
    } catch (error) {
      logger.error('Failed to check project access:', error);
      throw error;
    }
  }

  /**
   * Check user delete access to project
   * Administrators or project owners/maintainers can delete
   */
  async checkProjectDeleteAccess(projectId, userId, userRole) {
    try {
      if (!projectId || !userId) {
        return false;
      }

      // Administrators have all permissions
      if (userRole === 'admin') {
        return true;
      }

      const membership = await this.get(
        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (!membership) {
        return false;
      }

      return ['owner', 'maintainer'].includes(membership.role);
    } catch (error) {
      logger.error('Failed to check project delete access:', error);
      throw error;
    }
  }

  /**
   * Check user upload access to project
   * Administrators or project owners/maintainers can upload
   */
  async checkProjectUploadAccess(projectId, userId, userRole) {
    try {
      if (!projectId || !userId) {
        return false;
      }

      // Administrators have all permissions
      if (userRole === 'admin') {
        return true;
      }

      const membership = await this.get(
        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (!membership) {
        return false;
      }

      return ['owner', 'maintainer'].includes(membership.role);
    } catch (error) {
      logger.error('Failed to check project upload access:', error);
      throw error;
    }
  }

  /**
   * Log Docker API operation
   */
  async logDockerApiOperation(logData) {
    try {
      if (!logData || !logData.user_id || !logData.action) {
        throw new Error('Log data is incomplete');
      }

      const sql = `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        logData.user_id,
        logData.action,
        logData.resource_type || 'repository',
        logData.resource_id || '',
        logData.details ? JSON.stringify(logData.details) : '{}',
        logData.ip_address || '',
        logData.user_agent || ''
      ];

      await this.run(sql, params);
    } catch (error) {
      logger.error('Failed to log Docker API operation:', error);
      throw error;
    }
  }
}

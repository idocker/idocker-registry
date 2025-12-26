/**
 * Docker Registry 数据模型类
 * 处理Docker Registry API相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class DockerRegistryModel extends BaseModel {
  constructor() {
    super('projects');
  }

  /**
   * 根据仓库名称解析并获取项目信息
   * 仓库名称格式: project/imagename 或 namespace/project/imagename
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
      logger.error('根据仓库名称获取项目失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户对项目的访问权限
   */
  async checkProjectAccess(projectId, userId, userRole) {
    try {
      if (!projectId || !userId) {
        return false;
      }

      // 管理员拥有所有权限
      if (userRole === 'admin') {
        return true;
      }

      const membership = await this.get(
        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      return !!membership;
    } catch (error) {
      logger.error('检查项目访问权限失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户对项目的删除权限
   * 管理员或项目owner/maintainer可以删除
   */
  async checkProjectDeleteAccess(projectId, userId, userRole) {
    try {
      if (!projectId || !userId) {
        return false;
      }

      // 管理员拥有所有权限
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
      logger.error('检查项目删除权限失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户对项目的上传权限
   * 管理员或项目owner/maintainer可以上传
   */
  async checkProjectUploadAccess(projectId, userId, userRole) {
    try {
      if (!projectId || !userId) {
        return false;
      }

      // 管理员拥有所有权限
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
      logger.error('检查项目上传权限失败:', error);
      throw error;
    }
  }

  /**
   * 记录Docker API操作日志
   */
  async logDockerApiOperation(logData) {
    try {
      if (!logData || !logData.user_id || !logData.action) {
        throw new Error('日志数据不完整');
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
      logger.error('记录Docker API操作日志失败:', error);
      throw error;
    }
  }
}

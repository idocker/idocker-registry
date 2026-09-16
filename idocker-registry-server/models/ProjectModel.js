/**
 * Project data model class
 * Handles all database operations related to projects
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class ProjectModel extends BaseModel {
  constructor() {
    super('projects');
  }

  /**
   * Search by project name
   * @param {*} projectName 
   * @returns 
   */
  async findByName(projectName) {
    return await this.get(
      'SELECT * FROM projects WHERE name = ?',
      [projectName]
    );
  }

  /**
   * Get all projects list (for admin management, without permission filtering)
   * @param {*} isActive Whether active 
   * @returns 
   */
  async getProjectsAllList(isActive , { page = 1, limit = 20, search = '' } = {}) {
    try {
      let query;
      let params = [];

      query = `
        SELECT * FROM projects WHERE 1 = 1
      `;

      if (isActive && isActive !== 'all') {
        query += ' AND is_active = ?';
        params.push(isActive);
      }

      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ? OR namespace LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const result = await this.paginate(
        query,
        params,
        page,
        limit
      );
      logger.info(`getProjectsAllList:${JSON.stringify(result)}`);
      return result || [];
    } catch (error) {
      logger.error('Failed to get project list (All):', error);
      throw error;
    }
  }

  /**
   * Get project list (with pagination and search, including permission filtering)
   */
  async getProjectsList(userId, userRole, isActive, { page = 1, limit = 20, search = '' } = {}) {
    try {
      let query;
      let params = [];
      logger.info(`getProjectsList:${JSON.stringify(isActive)}`)
      if (userRole === 'admin') {
        query = `
          SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at, 
                 u.username as created_by_username, u.full_name as created_by_name
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          WHERE 1=1
        `;
        
        if (isActive && isActive !== 'all') {
          query += ' AND p.is_active = ?';
          params.push(isActive);
        }

        if (search) {
          query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.namespace LIKE ?)';
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
      } else {
        query = `
          SELECT DISTINCT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at,
                 u.username as created_by_username, u.full_name as created_by_name
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          WHERE p.is_active = 1
            AND (p.name = 'default'
                 OR EXISTS (SELECT 1
                              FROM repositories r
                              JOIN repository_members rm ON rm.repository_id = r.id
                             WHERE r.project_id = p.id AND rm.user_id = ?))
        `;
        params = [userId];

        if (search) {
          query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.namespace LIKE ?)';
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
      }

      query += ' ORDER BY p.created_at DESC';

      logger.info(`getProjectsList:${JSON.stringify(query)}`)

      const result = await this.paginate(query, params, page, limit);

      // Add member count and repository count for each project
      if (result.data && result.data.length > 0) {
        const enrichedProjects = await Promise.all(
          result.data.map(async (project) => {
            const [memberCount, repoCount] = await Promise.all([
              this.getProjectMemberCount(project.id),
              this.getProjectRepositoryCount(project.id)
            ]);

            return {
              ...project,
              memberCount: memberCount.count || 0,
              repositoryCount: repoCount.count || 0
            };
          })
        );

        result.data = enrichedProjects;
        //result.name = "projects";
      }

      //result = result || [];

      return result || [];
    } catch (error) {
      logger.error('Failed to get project list:', error);
      throw error;
    }
  }

  /**
   * Get project member count (distinct users across the project's repositories)
   */
  async getProjectMemberCount(projectId) {
    const result = await this.get(
      `SELECT COUNT(DISTINCT rm.user_id) as count
         FROM repository_members rm
         JOIN repositories r ON r.id = rm.repository_id
        WHERE r.project_id = ? AND r.is_active = 1`,
      [projectId]
    );
    return { count: result ? result.count : 0 };
  }

  /**
   * Get project repository count
   */
  async getProjectRepositoryCount(projectId) {
    return await this.get(
      'SELECT COUNT(*) as count FROM repositories WHERE project_id = ? AND is_active = 1',
      [projectId]
    );
  }

  /**
   * Create new project
   */
  async createProject(projectData, createdBy) {
    try {
      const data = {
        ...projectData,
        created_by: createdBy ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await this.create(data);
      return result;
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Update project information
   */
  async updateProject(projectId, updateData) {
    try {
      const data = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.update(projectId, data);
      return result;
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(projectId) {
    try {
      // The built-in 'default' project backs single-segment image paths
      // (e.g. idocker.vip/nginx) and must always remain available.
      const project = await this.get(
        'SELECT id, name FROM projects WHERE id = ?',
        [projectId]
      );
      if (project && project.name === 'default') {
        throw new Error('Cannot delete the default project');
      }

      const result = await this.update(projectId, {
        is_active: 0,
        updated_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Check if project name is unique
   */
  async isProjectNameUnique(name, excludeId = null) {
    try {
      let sql = 'SELECT COUNT(*) as count FROM projects WHERE name = ? AND is_active = 1';
      const params = [name];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await this.get(sql, params);
      return result.count === 0;
    } catch (error) {
      logger.error('Failed to check project name uniqueness:', error);
      throw error;
    }
  }

  /**
   * Check if user has project access permission.
   * project_members 表已废弃；项目成员 = 该项目下任一仓库的成员（repository_members）
   */
  async checkProjectPermission(projectId, userId, userRole) {
    try {
      if (userRole === 'admin') {
        return true;
      }

      const result = await this.get(
        `SELECT rm.id
           FROM repository_members rm
           JOIN repositories r ON r.id = rm.repository_id
          WHERE r.project_id = ? AND rm.user_id = ? AND r.is_active = 1
          LIMIT 1`,
        [projectId, userId]
      );

      return !!result;
    } catch (error) {
      logger.error('检查项目权限失败:', error);
      throw error;
    }
  }

  /**
   * 检查项目是否存在
   */
  async projectExists(projectId) {
    try {
      const result = await this.get('SELECT id FROM projects WHERE id = ?', [projectId]);
      return !!result;
    } catch (error) {
      logger.error('检查项目存在失败:', error);
      throw error;
    }
  }

  /**
   * 检查成员是否存在
   * project_members 表已废弃；项目成员 = 该项目下任一仓库的成员（repository_members）
   */
  async memberExists(projectId, userId) {
    try {
      const result = await this.get(
        `SELECT rm.id
           FROM repository_members rm
           JOIN repositories r ON r.id = rm.repository_id
          WHERE r.project_id = ? AND rm.user_id = ? AND r.is_active = 1
          LIMIT 1`,
        [projectId, userId]
      );
      return !!result;
    } catch (error) {
      logger.error('检查成员存在失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取项目基本信息（用于权限检查）
   */
  async getProjectBasicInfo(projectId) {
    try {
      if (!projectId) {
        return null;
      }
      const project = await this.get(
        'SELECT id, name FROM projects WHERE id = ? AND is_active = 1',
        [projectId]
      );
      return project;
    } catch (error) {
      logger.error('获取项目基本信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查成员ID是否存在
   * project_members 表已废弃；项目成员 = 该项目下任一仓库的成员（repository_members）
   */
  async getMemberId(projectId, userId) {
    try {
      if (!projectId || !userId) {
        return null;
      }
      const membership = await this.get(
        `SELECT rm.id
           FROM repository_members rm
           JOIN repositories r ON r.id = rm.repository_id
          WHERE r.project_id = ? AND rm.user_id = ? AND r.is_active = 1
          LIMIT 1`,
        [projectId, userId]
      );
      return membership ? membership.id : null;
    } catch (error) {
      logger.error('获取项目成员ID失败:', error);
      throw error;
    }
  }

  /**
   * 根据名称查找项目（用于同步功能）
   */
  async findActiveProjectByName(projectName) {
    try {
      if (!projectName) {
        return null;
      }
      const project = await this.get(
        'SELECT id FROM projects WHERE name = ? AND is_active = 1',
        [projectName]
      );
      return project;
    } catch (error) {
      logger.error('根据名称查找项目失败:', error);
      throw error;
    }
  }

  /**
   * 解析命名空间名称为对应的命名空间 ID（供同步自动创建项目使用）
   * 优先匹配活跃的同名命名空间；找不到时回退到 default 命名空间，再兜底 ID 1
   * @param {string} namespaceName - 命名空间名称，可为空字符串
   * @returns {Promise<number>} 命名空间 ID
   */
  async resolveNamespaceId(namespaceName) {
    try {
      if (namespaceName) {
        const ns = await this.get(
          'SELECT id FROM namespaces WHERE name = ? AND is_active = 1',
          [namespaceName]
        );
        if (ns) {
          return ns.id;
        }
      }
      const defaultNs = await this.get(
        "SELECT id FROM namespaces WHERE name = 'default' AND is_active = 1"
      );
      return defaultNs ? defaultNs.id : 1;
    } catch (error) {
      logger.error('解析命名空间 ID 失败:', error);
      throw error;
    }
  }

  /**
   * 简单创建项目（用于同步功能）
   */
  async createSimpleProject(projectName, description, namespace, createdBy) {
    try {
      if (!projectName) {
        throw new Error('项目名称不能为空');
      }

      const namespaceId = await this.resolveNamespaceId(namespace);

      const result = await this.run(
        `INSERT INTO projects (name, description, namespace, namespace_id, created_by, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [projectName, description || '', namespace || '', namespaceId, createdBy ?? null]
      );

      return { id: result.lastID };
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * 获取活跃项目数量
   */
  async getActiveProjectCount() {
    try {
      const result = await this.get('SELECT COUNT(*) as count FROM projects WHERE is_active = 1');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('获取活跃项目数量失败:', error);
      throw error;
    }
  }
}
/**
 * 项目数据模型类
 * 处理所有与项目相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class ProjectModel extends BaseModel {
  constructor() {
    super('projects');
  }

  /**
   * 根据项目名称搜索
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
   * 获取所有项目列表(管理员管理专用，不含权限过滤)
   * @param {*} isActive 是否活跃 
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
      logger.error('获取项目(All)列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目列表（支持分页和搜索，含权限过滤）
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
          SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at,
                 u.username as created_by_username, u.full_name as created_by_name,
                 pm.role as member_role, pm.created_at as member_since
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          JOIN project_members pm ON p.id = pm.project_id
          WHERE pm.user_id = ? AND p.is_active = 1
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

      // 为每个项目添加成员数量和仓库数量
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
      logger.error('获取项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目成员数量
   */
  async getProjectMemberCount(projectId) {
    return await this.get(
      'SELECT COUNT(*) as count FROM project_members WHERE project_id = ?',
      [projectId]
    );
  }

  /**
   * 获取项目仓库数量
   */
  async getProjectRepositoryCount(projectId) {
    return await this.get(
      'SELECT COUNT(*) as count FROM repositories WHERE project_id = ? AND is_active = 1',
      [projectId]
    );
  }

  /**
   * 创建新项目
   */
  async createProject(projectData, createdBy) {
    try {
      const data = {
        ...projectData,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await this.create(data);
      return result;
    } catch (error) {
      logger.error('创建项目失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目信息
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
      logger.error('更新项目失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目（软删除）
   */
  async deleteProject(projectId) {
    try {
      const result = await this.update(projectId, {
        is_active: 0,
        updated_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 检查项目名称是否唯一
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
      logger.error('检查项目名称唯一性失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否有项目访问权限
   */
  async checkProjectPermission(projectId, userId, userRole) {
    try {
      if (userRole === 'admin') {
        return true;
      }

      const result = await this.get(`
        SELECT COUNT(*) as count FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `, [projectId, userId]);

      return result.count > 0;
    } catch (error) {
      logger.error('检查项目权限失败:', error);
      throw error;
    }
  }

  /**
   * 添加项目成员
   */
  async addProjectMember(projectId, userId, role = 'member') {
    try {
      const sql = `
        INSERT INTO project_members (project_id, user_id, role, created_at) 
        VALUES (?, ?, ?, ?)
      `;
      const params = [projectId, userId, role, new Date().toISOString()];

      const result = await this.run(sql, params);
      return { id: result.lastID, projectId, userId, role };
    } catch (error) {
      logger.error('添加项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目成员列表
   */
  async getProjectMembers(projectId) {
    try {
      const sql = `
        SELECT pm.*, u.username, u.full_name, u.email, u.role as user_role
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        ORDER BY pm.created_at
      `;

      return await this.all(sql, [projectId]);
    } catch (error) {
      logger.error('获取项目成员列表失败:', error);
      throw error;
    }
  }

  /**
   * 移除项目成员
   */
  async removeProjectMember(projectId, userId) {
    try {
      const sql = 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?';
      const result = await this.run(sql, [projectId, userId]);
      return { changes: result.changes };
    } catch (error) {
      logger.error('移除项目成员失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目成员角色
   */
  async updateProjectMemberRole(projectId, userId, role) {
    try {
      const sql = 'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?';
      const result = await this.run(sql, [role, projectId, userId]);
      return { changes: result.changes };
    } catch (error) {
      logger.error('更新项目成员角色失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否为项目所有者
   */
  async isProjectOwner(projectId, userId) {
    try {
      const result = await this.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? AND role = ?',
        [projectId, userId, 'owner']
      );
      return !!result;
    } catch (error) {
      logger.error('检查项目所有者失败:', error);
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
   */
  async memberExists(projectId, userId) {
    try {
      const result = await this.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      return !!result;
    } catch (error) {
      logger.error('检查成员存在失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目所有者数量
   */
  async getProjectOwnerCount(projectId) {
    try {
      const result = await this.get(
        'SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND role = ?',
        [projectId, 'owner']
      );
      return result.count || 0;
    } catch (error) {
      logger.error('获取项目所有者数量失败:', error);
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
   * 获取项目成员角色信息
   */
  async getMemberRole(projectId, userId) {
    try {
      if (!projectId || !userId) {
        return null;
      }
      const membership = await this.get(
        'SELECT id, role FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      return membership;
    } catch (error) {
      logger.error('获取项目成员角色失败:', error);
      throw error;
    }
  }

  /**
   * 检查成员ID是否存在
   */
  async getMemberId(projectId, userId) {
    try {
      if (!projectId || !userId) {
        return null;
      }
      const membership = await this.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
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
   * 简单创建项目（用于同步功能）
   */
  async createSimpleProject(projectName, description, namespace, createdBy) {
    try {
      if (!projectName) {
        throw new Error('项目名称不能为空');
      }

      const result = await this.run(
        'INSERT INTO projects (name, description, namespace, created_by, is_active) VALUES (?, ?, ?, ?, 1)',
        [projectName, description || '', namespace || '', createdBy]
      );

      return { id: result.lastID };
    } catch (error) {
      logger.error('创建项目失败:', error);
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
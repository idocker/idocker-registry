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
   * 获取项目列表（支持分页和搜索）
   */
  async getProjectsList(userId, userRole, { page = 1, limit = 20, search = '' } = {}) {
    try {
      let query;
      let params;

      if (userRole === 'admin') {
        query = `
          SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at, 
                 u.username as created_by_username, u.full_name as created_by_name
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          WHERE 1=1
        `;
        params = [];

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

      query += ' ORDER BY p.name';

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
      }

      return result;
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
}
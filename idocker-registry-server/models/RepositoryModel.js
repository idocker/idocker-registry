/**
 * 仓库数据模型类
 * 处理所有与仓库相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class RepositoryModel extends BaseModel {
  constructor() {
    super('repositories');
  }

  /**
   * 根据项目ID和仓库名称查找仓库
   */
  async findByProjectIdAndName(projectId, name) {
    try {
      return await this.get(
        'SELECT * FROM repositories WHERE project_id = ? AND name = ? AND is_active = 1',
        [projectId, name]
      );
    } catch (error) {
      logger.error('根据项目ID和名称查找仓库失败:', error);
      throw error;
    }
  }

  /**
   * 创建新仓库
   */
  async createRepository(repositoryData) {
    //logger.info(`createRepository:${JSON.stringify(repositoryData)}`)
    try {
      const data = {
        ...repositoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      logger.info(`createRepository:${JSON.stringify(data)}`)
      const result = await this.create(data);
      return result;
    } catch (error) {
      logger.error('创建仓库失败:', error);
      throw error;
    }
  }

  /**
   * 更新仓库信息
   */
  async updateRepository(repositoryId, updateData) {
    try {
      const data = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.update(repositoryId, data);
      return result;
    } catch (error) {
      logger.error('更新仓库失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目下的镜像列表
   */
  async getProjectRepositories(projectId, { page = 1, limit = 20, search = '' } = {}) {
    try {
      let query = `
        SELECT r.*, COUNT(t.id) as tag_count
        FROM repositories r
        LEFT JOIN image_tags t ON r.id = t.repository_id
        WHERE r.project_id = ? AND r.is_active = 1
      `;
      let params = [projectId];

      if (search) {
        query += ' AND (r.name LIKE ? OR r.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' GROUP BY r.id ORDER BY r.name';

      const result = await this.paginate(query, params, page, limit);
      return result;
    } catch (error) {
      logger.error('获取项目仓库列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除仓库（软删除）
   */
  async deleteRepository(repositoryId) {
    try {
      const result = await this.update(repositoryId, { 
        is_active: 0,
        updated_at: new Date().toISOString() 
      });
      
      // 同时删除相关的镜像标签
      const db = await this.getDb();
      await db.run('DELETE FROM image_tags WHERE repository_id = ?', [repositoryId]);
      
      return result;
    } catch (error) {
      logger.error('删除仓库失败:', error);
      throw error;
    }
  }

  /**
   * 获取仓库统计信息
   */
  async getRepositoryStats(projectId = null) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_repositories,
          SUM((SELECT COUNT(*) FROM image_tags t WHERE t.repository_id = r.id)) as total_tags
        FROM repositories r
        WHERE r.is_active = 1
      `;
      const params = [];

      if (projectId) {
        query += ' AND r.project_id = ?';
        params.push(projectId);
      }

      const result = await this.get(query, params);
      return {
        totalRepositories: result.total_repositories || 0,
        totalTags: result.total_tags || 0
      };
    } catch (error) {
      logger.error('获取仓库统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取仓库详细信息（包含项目信息）
   */
  async getRepositoryWithProject(repositoryId) {
    try {
      if (!repositoryId) {
        return null;
      }

      const repository = await this.get(
        `SELECT r.id, r.name, r.description, r.is_public,
                p.id as project_id, p.name as project_name, p.namespace
         FROM repositories r
         JOIN projects p ON r.project_id = p.id
         WHERE r.id = ? AND r.is_active = 1 AND p.is_active = 1`,
        [repositoryId]
      );

      return repository;
    } catch (error) {
      logger.error('获取仓库详细信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取仓库基本信息（包含项目信息）
   */
  async getRepositoryBasicInfo(repositoryId) {
    try {
      if (!repositoryId) {
        return null;
      }

      const repository = await this.get(
        `SELECT r.id, r.name, r.project_id, p.name as project_name
         FROM repositories r
         JOIN projects p ON r.project_id = p.id
         WHERE r.id = ? AND r.is_active = 1 AND p.is_active = 1`,
        [repositoryId]
      );

      return repository;
    } catch (error) {
      logger.error('获取仓库基本信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据项目ID和仓库名称查找仓库ID
   */
  async findRepositoryId(projectId, name) {
    try {
      if (!projectId || !name) {
        return null;
      }

      const repository = await this.get(
        'SELECT id FROM repositories WHERE project_id = ? AND name = ? AND is_active = 1',
        [projectId, name]
      );

      return repository ? repository.id : null;
    } catch (error) {
      logger.error('查找仓库ID失败:', error);
      throw error;
    }
  }

  /**
   * 简单创建仓库（用于同步功能）
   */
  async createSimpleRepository(projectId, name, description, isPublic = 0) {
    try {
      if (!projectId || !name) {
        throw new Error('项目ID和仓库名称不能为空');
      }

      const result = await this.run(
        'INSERT INTO repositories (name, project_id, description, is_public, is_active) VALUES (?, ?, ?, ?, 1)',
        [name, projectId, description || '', isPublic]
      );

      return { id: result.lastID };
    } catch (error) {
      logger.error('创建仓库失败:', error);
      throw error;
    }
  }

  /**
   * 根据仓库名称查找（用于权限检查）
   */
  async findByRepositoryName(repositoryName, projectId) {
    try {
      if (!repositoryName || !projectId) {
        return null;
      }

      const repository = await this.get(
        'SELECT id, is_public, project_id FROM repositories WHERE name = ? AND project_id = ? AND is_active = 1',
        [repositoryName, projectId]
      );

      return repository;
    } catch (error) {
      logger.error('根据仓库名称查找失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃仓库数量
   */
  async getActiveRepositoryCount() {
    try {
      const result = await this.get('SELECT COUNT(*) as count FROM repositories WHERE is_active = 1');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('获取活跃仓库数量失败:', error);
      throw error;
    }
  }
}
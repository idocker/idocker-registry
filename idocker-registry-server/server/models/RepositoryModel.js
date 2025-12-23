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
    try {
      const data = {
        ...repositoryData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

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
   * 获取项目下的仓库列表
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
}
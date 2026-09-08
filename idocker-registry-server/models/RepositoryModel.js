/**
 * Repository data model class
 * Handles all database operations related to repositories
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class RepositoryModel extends BaseModel {
  constructor() {
    super('repositories');
  }

  /**
   * Find repository by project ID and repository name
   */
  async findByProjectIdAndName(projectId, name) {
    try {
      return await this.get(
        'SELECT * FROM repositories WHERE project_id = ? AND name = ? AND is_active = 1',
        [projectId, name]
      );
    } catch (error) {
      logger.error('Failed to find repository by project ID and name:', error);
      throw error;
    }
  }

  /**
   * Create new repository
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
      logger.error('Failed to create repository:', error);
      throw error;
    }
  }

  /**
   * Update repository information
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
      logger.error('Failed to update repository:', error);
      throw error;
    }
  }

  /**
   * Get repository list visible to a user (paginated)
   * - admin: all active repositories across projects
   * - other users: repositories where the user is a repository member
   */
  async getRepositoriesList(userId, userRole, { page = 1, limit = 20, search = '' } = {}) {
    try {
      const select = `
        SELECT r.id, r.name, r.project_id, r.description, r.is_public, r.is_active,
               p.name as project_name, p.namespace, r.created_at, r.updated_at,
               (SELECT COUNT(*) FROM image_tags t WHERE t.repository_id = r.id) as tag_count
        FROM repositories r
        JOIN projects p ON r.project_id = p.id
      `;
      let where = 'WHERE r.is_active = 1';
      const params = [];

      if (userRole !== 'admin') {
        where += ' AND r.id IN (SELECT repository_id FROM repository_members WHERE user_id = ?)';
        params.push(userId);
      }

      if (search) {
        where += ' AND (r.name LIKE ? OR p.name LIKE ? OR p.namespace LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const query = `${select} ${where} ORDER BY p.namespace, p.name, r.name`;
      return await this.paginate(query, params, page, limit);
    } catch (error) {
      logger.error('Failed to get user repository list:', error);
      throw error;
    }
  }

  /**
   * Get image list under project
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
      logger.error('Failed to get project repository list:', error);
      throw error;
    }
  }

  /**
   * Delete repository (soft delete)
   */
  async deleteRepository(repositoryId) {
    try {
      const result = await this.update(repositoryId, { 
        is_active: 0,
        updated_at: new Date().toISOString() 
      });
      
      // Also delete related image tags
      const db = await this.getDb();
      await db.run('DELETE FROM image_tags WHERE repository_id = ?', [repositoryId]);
      
      return result;
    } catch (error) {
      logger.error('Failed to delete repository:', error);
      throw error;
    }
  }

  /**
   * Get repository statistics
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
      logger.error('Failed to get repository statistics:', error);
      throw error;
    }
  }

  /**
   * Get repository details by ID (including project information)
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
      logger.error('Failed to get repository details:', error);
      throw error;
    }
  }

  /**
   * Get repository basic information by ID (including project information)
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
      logger.error('Failed to get repository basic information:', error);
      throw error;
    }
  }

  /**
   * Find repository ID by project ID and repository name
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
      logger.error('Failed to find repository ID:', error);
      throw error;
    }
  }

  /**
   * Simple repository creation (for sync functionality)
   */
  async createSimpleRepository(projectId, name, description, isPublic = 0) {
    try {
      if (!projectId || !name) {
        throw new Error('Project ID and repository name cannot be empty');
      }

      const result = await this.run(
        'INSERT INTO repositories (name, project_id, description, is_public, is_active) VALUES (?, ?, ?, ?, 1)',
        [name, projectId, description || '', isPublic]
      );

      return { id: result.lastID };
    } catch (error) {
      logger.error('Failed to create repository:', error);
      throw error;
    }
  }

  /**
   * Find repository by name (for permission checks)
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
      logger.error('Failed to find repository by name:', error);
      throw error;
    }
  }

  /**
   * Get active repository count
   */
  async getActiveRepositoryCount() {
    try {
      const result = await this.get('SELECT COUNT(*) as count FROM repositories WHERE is_active = 1');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to get active repository count:', error);
      throw error;
    }
  }

  /**
   * Get stored images with pagination
   * @param {number} projectId - Project ID (optional)
   * @param {string} search - Search keyword (optional)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Images with pagination info
   */
  async getStoredImages(projectId = null, search = '', page = 1, limit = 20) {
    try {
      let query = `
        SELECT 
          r.id as repo_id,
          r.name as repo_name,
          r.description as repo_description,
          p.name as project_name,
          p.namespace,
          t.id as tag_id,
          t.tag as tag_name,
          t.digest,
          t.size,
          t.architecture,
          t.os,
          t.created_at as tag_created_at
        FROM repositories r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN image_tags t ON r.id = t.repository_id
        WHERE p.is_active = 1
      `;
      
      const params = [];
      
      if (projectId) {
        query += ' AND r.project_id = ?';
        params.push(projectId);
      }
      
      if (search) {
        query += ' AND (r.name LIKE ? OR p.name LIKE ? OR p.namespace LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      // Tags newest-first by insert order (id DESC): latest pushed tag comes first,
      // which the UI shows as the "latest tag".
      query += ' ORDER BY r.name, t.id DESC';
      
      const result = await this.paginate(query, params, page, limit);
      return result;
    } catch (error) {
      logger.error('Failed to get stored images:', error);
      throw error;
    }
  }

  async addMember(repositoryId, userId, role = 'developer') {
    try {
      await this.run(
        'INSERT INTO repository_members (repository_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        [repositoryId, userId, role, new Date().toISOString()]
      );
    } catch (e) {
      logger.error('Failed to add repository member:', e);
      throw e;
    }
  }

  async removeMember(repositoryId, userId) {
    try {
      await this.run(
        'DELETE FROM repository_members WHERE repository_id = ? AND user_id = ?',
        [repositoryId, userId]
      );
    } catch (e) {
      logger.error('Failed to remove repository member:', e);
      throw e;
    }
  }

  async updateMemberRole(repositoryId, userId, role) {
    try {
      await this.run(
        'UPDATE repository_members SET role = ? WHERE repository_id = ? AND user_id = ?',
        [role, repositoryId, userId]
      );
    } catch (e) {
      logger.error('Failed to update repository member role:', e);
      throw e;
    }
  }

  async getMembers(repositoryId) {
    try {
      return await this.all(
        `SELECT rm.id, rm.user_id, rm.role, rm.created_at,
                u.username, u.email, u.full_name, u.role as user_role, u.is_active
         FROM repository_members rm
         JOIN users u ON rm.user_id = u.id
         WHERE rm.repository_id = ?
         ORDER BY rm.created_at DESC`,
        [repositoryId]
      );
    } catch (e) {
      logger.error('Failed to get repository members:', e);
      throw e;
    }
  }

  async getUserMembership(repositoryId, userId) {
    try {
      return await this.get(
        'SELECT * FROM repository_members WHERE repository_id = ? AND user_id = ?',
        [repositoryId, userId]
      );
    } catch (e) {
      logger.error('Failed to get user membership:', e);
      throw e;
    }
  }

  async memberExists(repositoryId, userId) {
    try {
      const result = await this.get(
        'SELECT COUNT(*) as count FROM repository_members WHERE repository_id = ? AND user_id = ?',
        [repositoryId, userId]
      );
      return result && result.count > 0;
    } catch (e) {
      logger.error('Failed to check member existence:', e);
      throw e;
    }
  }

  async getUserRepositories(userId, role) {
    try {
      const query = `
        SELECT DISTINCT r.id, r.name, r.project_id, r.description, r.is_public, r.is_active,
               p.name as project_name, p.namespace
        FROM repositories r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN repository_members rm ON r.id = rm.repository_id AND rm.user_id = ?
        WHERE r.is_active = 1
          AND (rm.user_id IS NOT NULL OR r.is_public = 1)
        ORDER BY p.namespace, p.name, r.name
      `;
      return await this.all(query, [userId]);
    } catch (e) {
      logger.error('Failed to get user repositories:', e);
      throw e;
    }
  }
}
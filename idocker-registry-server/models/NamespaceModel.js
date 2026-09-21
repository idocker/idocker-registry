/**
 * Namespace data model class
 * Handles all database operations related to namespaces
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class NamespaceModel extends BaseModel {
  constructor() {
    super('namespaces');
  }

  /**
   * Search by namespace name
   * @param {string} namespaceName 
   * @returns {Promise<Object|null>} Namespace object if found, null otherwise
   */
  async findByName(namespaceName) {
    try {
      // 回收站里的命名空间对调用方不可见：创建项目、Docker 权限判断等都依赖本方法
      return await this.get(
        'SELECT * FROM namespaces WHERE name = ? AND deleted_at IS NULL',
        [namespaceName]
      );
    } catch (error) {
      logger.error('Failed to find namespace by name:', error);
      throw error;
    }
  }

  /**
   * Get all namespaces list (for admin management)
   * @param {Object} options Query options
   * @param {number} options.page Page number (default: 1)
   * @param {number} options.limit Items per page (default: 20)
   * @param {string} options.search Search keyword
   * @param {boolean} options.isActive Filter by active status
   * @param {string} options.deleted '0' 未删除（默认）| '1' 回收站 | 'all' 全部
   * @returns {Promise<Object>} List of namespaces with pagination
   */
  async getNamespacesList(options = {}) {
    try {
      const { page = 1, limit = 20, search = '', isActive = true, deleted = '0' } = options;

      let query = `
        SELECT n.*,
               (SELECT COUNT(*) FROM projects p
                 WHERE p.namespace_id = n.id AND p.is_active = 1 AND p.deleted_at IS NULL) as project_count,
               u.username as deleted_by_username
        FROM namespaces n
        LEFT JOIN users u ON n.deleted_by = u.id
        WHERE 1 = 1
      `;
      const params = [];

      // deleted: '0' 只看未删除（默认）| '1' 只看回收站 | 'all' 都看
      if (deleted === '1') {
        query += ' AND n.deleted_at IS NOT NULL';
      } else if (deleted !== 'all') {
        query += ' AND n.deleted_at IS NULL';
      }

      if (typeof isActive === 'boolean') {
        query += ' AND n.is_active = ?';
        params.push(isActive ? 1 : 0);
      }

      if (search) {
        query += ' AND (n.name LIKE ? OR n.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY n.name';

      const result = await this.paginate(query, params, page, limit);
      return result;
    } catch (error) {
      logger.error('Failed to get namespaces list:', error);
      throw error;
    }
  }

  /**
   * Create new namespace
   * @param {Object} namespaceData Namespace data
   * @param {string} namespaceData.name Namespace name
   * @param {string} namespaceData.description Namespace description
   * @param {number} namespaceData.createdBy User ID who created the namespace
   * @returns {Promise<Object>} Created namespace information
   */
  async createNamespace(namespaceData) {
    try {
      if (!namespaceData.name) {
        throw new Error('Namespace name is required');
      }

      const data = {
        name: namespaceData.name,
        description: namespaceData.description || '',
        created_by: namespaceData.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await this.create(data);
      logger.info(`Created new namespace: ${data.name}`);
      return result;
    } catch (error) {
      logger.error('Failed to create namespace:', error);
      throw error;
    }
  }

  /**
   * Update namespace information
   * @param {number} namespaceId Namespace ID
   * @param {Object} updateData Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateNamespace(namespaceId, updateData) {
    try {
      if (!namespaceId) {
        throw new Error('Namespace ID is required');
      }

      const data = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const result = await this.update(namespaceId, data);
      logger.info(`Updated namespace with ID: ${namespaceId}`);
      return result;
    } catch (error) {
      logger.error('Failed to update namespace:', error);
      throw error;
    }
  }

  /**
   * Move namespace to the recycle bin (fake delete).
   * The row and its projects stay in place; only deleted_at/deleted_by are set.
   * @param {number} namespaceId Namespace ID
   * @param {number|null} deletedBy Acting user ID
   * @returns {Promise<Object>} Update result
   */
  async deleteNamespace(namespaceId, deletedBy = null) {
    try {
      if (!namespaceId) {
        throw new Error('Namespace ID is required');
      }

      // The built-in 'default' namespace hosts the shared base-image project
      // and must always remain available.
      const namespace = await this.get(
        'SELECT id, name, deleted_at FROM namespaces WHERE id = ?',
        [namespaceId]
      );
      if (!namespace) {
        throw new Error('Namespace not found');
      }
      if (namespace.deleted_at) {
        throw new Error('Namespace is already in the recycle bin');
      }
      if (namespace.name === 'default') {
        throw new Error('Cannot delete the default namespace');
      }

      // 只有未删除的活跃项目才算关联子项；回收站里的项目不阻塞删除
      const projectCount = await this.get(
        'SELECT COUNT(*) as count FROM projects WHERE namespace_id = ? AND is_active = 1 AND deleted_at IS NULL',
        [namespaceId]
      );

      if (projectCount.count > 0) {
        throw new Error('Cannot delete namespace with active projects');
      }

      const now = new Date().toISOString();
      const result = await this.update(namespaceId, {
        deleted_at: now,
        deleted_by: deletedBy,
        updated_at: now
      });

      logger.info(`Moved namespace to recycle bin, ID: ${namespaceId}`);
      return result;
    } catch (error) {
      logger.error('Failed to delete namespace:', error);
      throw error;
    }
  }

  /**
   * Check if namespace name is unique
   * @param {string} name Namespace name
   * @param {number} excludeId Exclude this ID from check (for updates)
   * @returns {Promise<boolean>} True if name is unique
   */
  async isNamespaceNameUnique(name, excludeId = null) {
    try {
      if (!name) {
        return false;
      }

      let query = 'SELECT COUNT(*) as count FROM namespaces WHERE name = ?';
      const params = [name];

      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await this.get(query, params);
      return result.count === 0;
    } catch (error) {
      logger.error('Failed to check namespace name uniqueness:', error);
      throw error;
    }
  }

  /**
   * Get namespace details by ID
   * @param {number} namespaceId Namespace ID
   * @returns {Promise<Object|null>} Namespace object if found, null otherwise
   */
  async getNamespaceById(namespaceId) {
    try {
      if (!namespaceId) {
        return null;
      }

      return await this.get(
        `SELECT n.*, 
                (SELECT COUNT(*) FROM projects p
                  WHERE p.namespace_id = n.id AND p.is_active = 1 AND p.deleted_at IS NULL) as project_count,
                u.username as created_by_username,
                du.username as deleted_by_username
         FROM namespaces n
         LEFT JOIN users u ON n.created_by = u.id
         LEFT JOIN users du ON n.deleted_by = du.id
         WHERE n.id = ?`,
        [namespaceId]
      );
    } catch (error) {
      logger.error('Failed to get namespace by ID:', error);
      throw error;
    }
  }

  /**
   * Get active namespace count
   * @returns {Promise<number>} Number of active namespaces
   */
  async getActiveNamespaceCount() {
    try {
      const result = await this.get('SELECT COUNT(*) as count FROM namespaces WHERE is_active = 1 AND deleted_at IS NULL');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to get active namespace count:', error);
      throw error;
    }
  }

  /**
   * Restore namespace from the recycle bin. Admin only at the route layer.
   * @param {number} namespaceId Namespace ID
   * @returns {Promise<Object>} Update result
   */
  async restoreNamespace(namespaceId) {
    try {
      if (!namespaceId) {
        throw new Error('Namespace ID is required');
      }

      const namespace = await this.get(
        'SELECT id, deleted_at FROM namespaces WHERE id = ?',
        [namespaceId]
      );
      if (!namespace) {
        throw new Error('Namespace not found');
      }
      if (!namespace.deleted_at) {
        throw new Error('Namespace is not in the recycle bin');
      }

      const result = await this.update(namespaceId, {
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString()
      });

      logger.info(`Restored namespace from recycle bin, ID: ${namespaceId}`);
      return result;
    } catch (error) {
      logger.error('Failed to restore namespace:', error);
      throw error;
    }
  }

  /**
   * Physically remove namespace from the database. Admin only, irreversible.
   *
   * projects has NO foreign key to namespaces, so nothing cascades here: any
   * project row left behind would become an orphan. Refuse while any project
   * (including one already in the recycle bin) still points at this namespace.
   * @param {number} namespaceId Namespace ID
   * @returns {Promise<boolean>} true when the row was removed
   */
  async purgeNamespace(namespaceId) {
    try {
      if (!namespaceId) {
        throw new Error('Namespace ID is required');
      }

      const namespace = await this.get(
        'SELECT id, name FROM namespaces WHERE id = ?',
        [namespaceId]
      );
      if (!namespace) {
        throw new Error('Namespace not found');
      }
      if (namespace.name === 'default') {
        throw new Error('Cannot delete the default namespace');
      }

      const projectCount = await this.get(
        'SELECT COUNT(*) as count FROM projects WHERE namespace_id = ?',
        [namespaceId]
      );
      if (projectCount.count > 0) {
        throw new Error('Cannot purge namespace with existing projects');
      }

      await this.delete(namespaceId);
      logger.info(`Purged namespace from database, ID: ${namespaceId}`);
      return true;
    } catch (error) {
      logger.error('Failed to purge namespace:', error);
      throw error;
    }
  }
}
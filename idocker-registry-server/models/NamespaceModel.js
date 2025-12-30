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
      return await this.get(
        'SELECT * FROM namespaces WHERE name = ?',
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
   * @returns {Promise<Object>} List of namespaces with pagination
   */
  async getNamespacesList(options = {}) {
    try {
      const { page = 1, limit = 20, search = '', isActive = true } = options;
      
      let query = `
        SELECT n.*, 
               (SELECT COUNT(*) FROM projects p WHERE p.namespace_id = n.id AND p.is_active = 1) as project_count
        FROM namespaces n 
        WHERE 1 = 1
      `;
      const params = [];

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
   * Delete namespace (soft delete)
   * @param {number} namespaceId Namespace ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteNamespace(namespaceId) {
    try {
      if (!namespaceId) {
        throw new Error('Namespace ID is required');
      }

      // Check if there are active projects in this namespace
      const projectCount = await this.get(
        'SELECT COUNT(*) as count FROM projects WHERE namespace_id = ? AND is_active = 1',
        [namespaceId]
      );

      if (projectCount.count > 0) {
        throw new Error('Cannot delete namespace with active projects');
      }

      const result = await this.update(namespaceId, {
        is_active: 0,
        updated_at: new Date().toISOString()
      });

      logger.info(`Deleted namespace with ID: ${namespaceId}`);
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
                (SELECT COUNT(*) FROM projects p WHERE p.namespace_id = n.id AND p.is_active = 1) as project_count,
                u.username as created_by_username
         FROM namespaces n
         LEFT JOIN users u ON n.created_by = u.id
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
      const result = await this.get('SELECT COUNT(*) as count FROM namespaces WHERE is_active = 1');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to get active namespace count:', error);
      throw error;
    }
  }

  /**
   * Reactivate namespace
   * @param {number} namespaceId Namespace ID
   * @returns {Promise<Object>} Reactivation result
   */
  async reactivateNamespace(namespaceId) {
    try {
      if (!namespaceId) {
        throw new Error('Namespace ID is required');
      }

      const result = await this.update(namespaceId, {
        is_active: 1,
        updated_at: new Date().toISOString()
      });

      logger.info(`Reactivated namespace with ID: ${namespaceId}`);
      return result;
    } catch (error) {
      logger.error('Failed to reactivate namespace:', error);
      throw error;
    }
  }
}
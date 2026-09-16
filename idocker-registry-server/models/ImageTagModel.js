/**
 * ImageTag data model class
 * Handles database operations related to image tags
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class ImageTagModel extends BaseModel {
  constructor() {
    super('image_tags');
  }

  /**
   * Get all tags by repository ID
   */
  async getTagsByRepositoryId(repositoryId) {
    try {
      if (!repositoryId) {
        return [];
      }

      const tags = await this.all(
        `SELECT t.id, t.tag, t.digest, t.size, t.architecture, t.os, t.created_at,
                t.pushed_by, u.username AS pushed_by_username, u.full_name AS pushed_by_name
           FROM image_tags t
           LEFT JOIN users u ON u.id = t.pushed_by
          WHERE t.repository_id = ?
          ORDER BY t.id DESC`,
        [repositoryId]
      );

      return tags || [];
    } catch (error) {
      logger.error('Failed to get repository tags:', error);
      throw error;
    }
  }

  /**
   * Get the newest tag of a repository (by insert order: id desc)
   */
  async getNewestTag(repositoryId) {
    try {
      if (!repositoryId) {
        return null;
      }

      const tag = await this.get(
        `SELECT id, tag, digest, size, architecture, os, created_at
         FROM image_tags
         WHERE repository_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [repositoryId]
      );

      return tag || null;
    } catch (error) {
      logger.error('Failed to get newest tag:', error);
      throw error;
    }
  }

  /**
   * Get a single tag by ID and repository ID
   */
  async getTagById(tagId, repositoryId) {
    try {
      if (!tagId || !repositoryId) {
        return null;
      }

      const tag = await this.get(
        `SELECT t.id, t.tag, t.digest, t.size, t.architecture, t.os, t.created_at,
                t.pushed_by, u.username AS pushed_by_username, u.full_name AS pushed_by_name
           FROM image_tags t
           LEFT JOIN users u ON u.id = t.pushed_by
          WHERE t.id = ? AND t.repository_id = ?`,
        [tagId, repositoryId]
      );

      return tag;
    } catch (error) {
      logger.error('Failed to get tag information:', error);
      throw error;
    }
  }

  /**
   * Check if tag exists (by repository name and tag name)
   */
  async tagExists(repositoryId, tagName) {
    try {
      if (!repositoryId || !tagName) {
        return false;
      }

      const existing = await this.get(
        'SELECT id FROM image_tags WHERE repository_id = ? AND tag = ?',
        [repositoryId, tagName]
      );

      return !!existing;
    } catch (error) {
      logger.error('Failed to check if tag exists:', error);
      throw error;
    }
  }

  /**
   * Create new tag
   */
  async createTag(tagData) {
    try {
      if (!tagData || !tagData.repository_id || !tagData.tag) {
        throw new Error('Tag data is incomplete');
      }

      const sql = `
        INSERT INTO image_tags (repository_id, tag, digest, size, architecture, os, created_at, pushed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        tagData.repository_id,
        tagData.tag,
        tagData.digest || '',
        tagData.size || 0,
        tagData.architecture || '',
        tagData.os || '',
        tagData.created_at ? new Date(tagData.created_at).toISOString() : new Date().toISOString(),
        tagData.pushed_by ?? null
      ];

      const result = await this.run(sql, params);
      return { id: result.lastID };
    } catch (error) {
      logger.error('Failed to create tag:', error);
      throw error;
    }
  }

  /**
   * Delete tag
   */
  async deleteTag(tagId, repositoryId) {
    try {
      if (!tagId || !repositoryId) {
        throw new Error('Tag ID and repository ID cannot be empty');
      }

      const result = await this.run(
        'DELETE FROM image_tags WHERE id = ? AND repository_id = ?',
        [tagId, repositoryId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to delete tag:', error);
      throw error;
    }
  }

  /**
   * Create multiple tags
   */
  async createTags(tagsArray) {
    try {
      if (!tagsArray || tagsArray.length === 0) {
        return [];
      }

      const results = [];
      for (const tagData of tagsArray) {
        const result = await this.createTag(tagData);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error('Failed to create multiple tags:', error);
      throw error;
    }
  }

  /**
   * Get tag count by repository ID
   */
  async getTagCountByRepositoryId(repositoryId) {
    try {
      if (!repositoryId) {
        return 0;
      }

      const result = await this.get(
        'SELECT COUNT(*) as count FROM image_tags WHERE repository_id = ?',
        [repositoryId]
      );

      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to get tag count:', error);
      throw error;
    }
  }

  /**
   * Update tag information
   */
  async updateTag(tagId, updateData) {
    try {
      if (!tagId || !updateData) {
        throw new Error('Tag ID and update data cannot be empty');
      }

      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      
      const sql = `UPDATE image_tags SET ${setClause} WHERE id = ?`;
      const result = await this.run(sql, [...values, tagId]);
      
      return { ...updateData, id: tagId, changes: result.changes };
    } catch (error) {
      logger.error('Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Get total tag count
   */
  async getTagCount() {
    try {
      const result = await this.get('SELECT COUNT(*) as count FROM image_tags');
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Failed to get total tag count:', error);
      throw error;
    }
  }
}

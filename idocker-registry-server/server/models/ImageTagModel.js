/**
 * ImageTag 数据模型类
 * 处理镜像标签相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class ImageTagModel extends BaseModel {
  constructor() {
    super('image_tags');
  }

  /**
   * 根据仓库ID获取所有标签
   */
  async getTagsByRepositoryId(repositoryId) {
    try {
      if (!repositoryId) {
        return [];
      }

      const tags = await this.all(
        `SELECT id, tag, digest, size, architecture, os, created_at
         FROM image_tags
         WHERE repository_id = ?
         ORDER BY created_at DESC`,
        [repositoryId]
      );

      return tags || [];
    } catch (error) {
      logger.error('获取仓库标签失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID和仓库ID获取单个标签
   */
  async getTagById(tagId, repositoryId) {
    try {
      if (!tagId || !repositoryId) {
        return null;
      }

      const tag = await this.get(
        `SELECT id, tag, digest, size, architecture, os, created_at
         FROM image_tags
         WHERE id = ? AND repository_id = ?`,
        [tagId, repositoryId]
      );

      return tag;
    } catch (error) {
      logger.error('获取标签信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查标签是否存在（根据仓库名和标签名）
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
      logger.error('检查标签是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 创建新标签
   */
  async createTag(tagData) {
    try {
      if (!tagData || !tagData.repository_id || !tagData.tag) {
        throw new Error('标签数据不完整');
      }

      const sql = `
        INSERT INTO image_tags (repository_id, tag, digest, size, architecture, os, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        tagData.repository_id,
        tagData.tag,
        tagData.digest || '',
        tagData.size || 0,
        tagData.architecture || '',
        tagData.os || '',
        tagData.created_at ? new Date(tagData.created_at).toISOString() : new Date().toISOString()
      ];

      const result = await this.run(sql, params);
      return { id: result.lastID };
    } catch (error) {
      logger.error('创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId, repositoryId) {
    try {
      if (!tagId || !repositoryId) {
        throw new Error('标签ID和仓库ID不能为空');
      }

      const result = await this.run(
        'DELETE FROM image_tags WHERE id = ? AND repository_id = ?',
        [tagId, repositoryId]
      );

      return result;
    } catch (error) {
      logger.error('删除标签失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建标签
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
      logger.error('批量创建标签失败:', error);
      throw error;
    }
  }

  /**
   * 根据仓库ID获取标签数量
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
      logger.error('获取标签数量失败:', error);
      throw error;
    }
  }
}

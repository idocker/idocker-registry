/**
 * RegistryConfig data model class
 * Handles database operations related to Registry configuration
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class RegistryConfigModel extends BaseModel {
  constructor() {
    super('registry_configs');
  }

  /**
   * Get default and active Registry configuration
   */
  async getDefaultActiveConfig() {
    try {
      const config = await this.get(
        'SELECT * FROM registry_configs WHERE is_default = 1 AND is_active = 1'
      );

      return config;
    } catch (error) {
      logger.error('Failed to get default Registry configuration:', error);
      throw error;
    }
  }

  /**
   * Get all Registry configurations (excluding sensitive information)
   */
  async getAllConfigs() {
    try {
      const configs = await this.all(
        `SELECT id, name, url, is_default, is_active, created_at, updated_at
         FROM registry_configs
         ORDER BY is_default DESC, name`
      );

      return configs || [];
    } catch (error) {
      logger.error('Failed to get Registry configuration list:', error);
      throw error;
    }
  }

  /**
   * Get Registry configuration by ID
   */
  async getConfigById(configId) {
    try {
      if (!configId) {
        return null;
      }

      const config = await this.findById(configId);
      return config;
    } catch (error) {
      logger.error('Failed to get Registry configuration:', error);
      throw error;
    }
  }

  /**
   * Create new Registry configuration
   */
  async createConfig(configData) {
    try {
      if (!configData || !configData.name || !configData.url) {
        throw new Error('Configuration name and URL cannot be empty');
      }

      const result = await this.run(
        `INSERT INTO registry_configs (name, url, username, password, is_default, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          configData.name,
          configData.url,
          configData.username || null,
          configData.password || null,
          configData.is_default ? 1 : 0,
          configData.is_active !== undefined ? configData.is_active : 1
        ]
      );

      return { id: result.lastID };
    } catch (error) {
      logger.error('Failed to create Registry configuration:', error);
      throw error;
    }
  }

  /**
   * Update Registry configuration
   */
  async updateConfig(configId, updateData) {
    try {
      if (!configId || !updateData) {
        throw new Error('Configuration ID and update data cannot be empty');
      }

      const result = await this.update(configId, updateData);
      return result;
    } catch (error) {
      logger.error('Failed to update Registry configuration:', error);
      throw error;
    }
  }

  /**
   * Delete Registry configuration
   */
  async deleteConfig(configId) {
    try {
      if (!configId) {
        throw new Error('Configuration ID cannot be empty');
      }

      const result = await this.delete(configId);
      return result;
    } catch (error) {
      logger.error('Failed to delete Registry configuration:', error);
      throw error;
    }
  }

  /**
   * Set default Registry configuration
   */
  async setDefaultConfig(configId) {
    try {
      if (!configId) {
        throw new Error('Configuration ID cannot be empty');
      }

      // First, cancel all default configurations
      await this.run('UPDATE registry_configs SET is_default = 0');

      // Set new default configuration
      const result = await this.run(
        'UPDATE registry_configs SET is_default = 1 WHERE id = ?',
        [configId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to set default Registry configuration:', error);
      throw error;
    }
  }

  /**
   * Check if configuration name is unique
   */
  async isNameUnique(name, excludeId) {
    try {
      if (!name) {
        return false;
      }

      let sql = 'SELECT id FROM registry_configs WHERE name = ?';
      let params = [name];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const existing = await this.get(sql, params);
      return !existing;
    } catch (error) {
      logger.error('Failed to check configuration name uniqueness:', error);
      throw error;
    }
  }

  /**
   * Activate or deactivate configuration
   */
  async toggleConfigActive(configId, isActive) {
    try {
      if (!configId) {
        throw new Error('Configuration ID cannot be empty');
      }

      const result = await this.run(
        'UPDATE registry_configs SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, configId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to toggle configuration status:', error);
      throw error;
    }
  }
}

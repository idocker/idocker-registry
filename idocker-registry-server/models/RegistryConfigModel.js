/**
 * RegistryConfig 数据模型类
 * 处理Registry配置相关的数据库操作
 */
import { BaseModel } from './BaseModel.js';
import { logger } from '../utils/logger.js';

export class RegistryConfigModel extends BaseModel {
  constructor() {
    super('registry_configs');
  }

  /**
   * 获取默认且活跃的Registry配置
   */
  async getDefaultActiveConfig() {
    try {
      const config = await this.get(
        'SELECT * FROM registry_configs WHERE is_default = 1 AND is_active = 1'
      );

      return config;
    } catch (error) {
      logger.error('获取默认Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有Registry配置（不包含敏感信息）
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
      logger.error('获取Registry配置列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取Registry配置
   */
  async getConfigById(configId) {
    try {
      if (!configId) {
        return null;
      }

      const config = await this.findById(configId);
      return config;
    } catch (error) {
      logger.error('获取Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 创建新的Registry配置
   */
  async createConfig(configData) {
    try {
      if (!configData || !configData.name || !configData.url) {
        throw new Error('配置名称和URL不能为空');
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
      logger.error('创建Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 更新Registry配置
   */
  async updateConfig(configId, updateData) {
    try {
      if (!configId || !updateData) {
        throw new Error('配置ID和更新数据不能为空');
      }

      const result = await this.update(configId, updateData);
      return result;
    } catch (error) {
      logger.error('更新Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 删除Registry配置
   */
  async deleteConfig(configId) {
    try {
      if (!configId) {
        throw new Error('配置ID不能为空');
      }

      const result = await this.delete(configId);
      return result;
    } catch (error) {
      logger.error('删除Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 设置默认Registry配置
   */
  async setDefaultConfig(configId) {
    try {
      if (!configId) {
        throw new Error('配置ID不能为空');
      }

      // 先取消所有默认配置
      await this.run('UPDATE registry_configs SET is_default = 0');

      // 设置新的默认配置
      const result = await this.run(
        'UPDATE registry_configs SET is_default = 1 WHERE id = ?',
        [configId]
      );

      return result;
    } catch (error) {
      logger.error('设置默认Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 检查配置名称是否唯一
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
      logger.error('检查配置名称唯一性失败:', error);
      throw error;
    }
  }

  /**
   * 激活或禁用配置
   */
  async toggleConfigActive(configId, isActive) {
    try {
      if (!configId) {
        throw new Error('配置ID不能为空');
      }

      const result = await this.run(
        'UPDATE registry_configs SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, configId]
      );

      return result;
    } catch (error) {
      logger.error('切换配置状态失败:', error);
      throw error;
    }
  }
}

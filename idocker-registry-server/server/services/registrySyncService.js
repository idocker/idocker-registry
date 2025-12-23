/**
 * Docker Registry 同步服务
 * 
 * 负责从Docker Registry同步仓库和镜像信息到数据库
 * 提供完整的数据同步和更新功能
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import dockerRegistryService from './dockerRegistryService.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { RepositoryModel } from '../models/RepositoryModel.js';
import { getDb } from '../config/database.js';

class RegistrySyncService {
  constructor() {
    this.projectModel = new ProjectModel();
    this.repositoryModel = new RepositoryModel();
  }

  /**
   * 获取默认的Registry配置
   */
  async getDefaultRegistryConfig() {
    try {
      const db = await getDb();
      const registryConfig = await db.get(
        'SELECT * FROM registry_configs WHERE is_default = 1 AND is_active = 1'
      );
      
      if (!registryConfig) {
        throw new AppError('未找到默认的Registry配置', 500, 'REGISTRY_CONFIG_NOT_FOUND');
      }
      
      return registryConfig;
    } catch (error) {
      logger.error('获取Registry配置失败:', error);
      throw error;
    }
  }

  /**
   * 同步所有仓库数据
   * @param {Object} options - 同步选项
   * @returns {Promise<Object>} 同步结果
   */
  async syncAllRepositories(options = {}) {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    
    try {
      const registryConfig = await this.getDefaultRegistryConfig();
      
      // 检查Registry连接
      const isConnected = await dockerRegistryService.checkConnection(registryConfig);
      if (!isConnected) {
        throw new AppError('无法连接到Docker Registry', 500, 'REGISTRY_CONNECTION_FAILED');
      }

      logger.info('开始同步Docker Registry数据...');
      
      // 获取所有仓库列表
      const repositoriesResult = await dockerRegistryService.getRepositories(registryConfig);
      const repositories = repositoriesResult.repositories || [];
      
      logger.info(`发现 ${repositories.length} 个仓库`);
      
      // 处理每个仓库
      for (const repo of repositories) {
        try {
          await this.processRepository(repo, registryConfig);
          processedCount++;
        } catch (error) {
          logger.error(`处理仓库 ${repo.name} 失败:`, error.message);
          errorCount++;
          
          if (options.stopOnError) {
            throw error;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info(`同步完成: 处理 ${processedCount} 个仓库, 错误 ${errorCount} 个, 耗时 ${duration}ms`);
      
      return {
        success: true,
        processedCount,
        errorCount,
        totalCount: repositories.length,
        duration
      };
      
    } catch (error) {
      logger.error('同步Docker Registry数据失败:', error);
      throw error;
    }
  }

  /**
   * 处理单个仓库
   * @param {Object} repo - 仓库信息
   * @param {Object} registryConfig - Registry配置
   */
  async processRepository(repo, registryConfig) {
    const db = await getDb();
    
    try {
      // 解析仓库名称，提取项目信息
      const repoParts = repo.name.split('/');
      let projectName = null;
      let imageName = repo.name;
      
      // 仓库名称格式: project/imagename 或 namespace/project/imagename
      if (repoParts.length >= 2) {
        projectName = repoParts[0];
        imageName = repoParts.slice(1).join('/');
      }
      
      // 查找或创建项目
      let project = null;
      if (projectName) {
        project = await this.projectModel.findByName(projectName);
        
        if (!project) {
          // 创建新项目
          project = await this.projectModel.createProject({
            name: projectName,
            namespace: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            description: `自动创建的项目 - ${projectName}`,
            is_active: 1
          });
          
          logger.info(`创建新项目: ${projectName}`);
        }
      }
      
      // 查找或创建仓库
      let repository = null;
      if (project) {
        repository = await this.repositoryModel.findByProjectIdAndName(project.id, imageName);
      }
      
      if (!repository) {
        // 创建新仓库
        repository = await this.repositoryModel.createRepository({
          name: imageName,
          description: `自动创建的仓库 - ${repo.name}`,
          project_id: project ? project.id : null,
          registry_url: registryConfig.url,
          is_active: 1
        });
        
        logger.info(`创建新仓库: ${repo.name}`);
      } else {
        // 更新仓库信息
        await this.repositoryModel.updateRepository(repository.id, {
          description: `自动更新的仓库 - ${repo.name}`,
          updated_at: new Date().toISOString()
        });
      }
      
      // 同步仓库的标签信息
      await this.syncRepositoryTags(repository, repo.name, registryConfig);
      
    } catch (error) {
      logger.error(`处理仓库 ${repo.name} 失败:`, error);
      throw error;
    }
  }

  /**
   * 同步仓库的标签信息
   * @param {Object} repository - 仓库对象
   * @param {string} repoName - 仓库名称
   * @param {Object} registryConfig - Registry配置
   */
  async syncRepositoryTags(repository, repoName, registryConfig) {
    const db = await getDb();
    
    try {
      // 获取仓库的所有标签
      const tagsResult = await dockerRegistryService.getTags(repoName, registryConfig);
      const tags = tagsResult.tags || [];
      
      logger.info(`仓库 ${repoName} 发现 ${tags.length} 个标签`);
      
      // 获取当前数据库中的标签
      const existingTags = await db.all(
        'SELECT * FROM image_tags WHERE repository_id = ?',
        [repository.id]
      );
      
      const existingTagsMap = new Map();
      existingTags.forEach(tag => {
        existingTagsMap.set(tag.tag, tag);
      });
      
      // 处理标签
      let addedCount = 0;
      let updatedCount = 0;
      
      for (const tagInfo of tags) {
        try {
          const existingTag = existingTagsMap.get(tagInfo.name);
          
          if (existingTag) {
            // 更新现有标签
            await db.run(`
              UPDATE image_tags SET 
                digest = ?, 
                size = ?, 
                architecture = ?, 
                os = ?, 
                created_at = ?, 
                updated_at = ?
              WHERE id = ?
            `, [
              tagInfo.digest || '',
              tagInfo.size || 0,
              tagInfo.architecture || 'unknown',
              tagInfo.os || 'unknown',
              tagInfo.created || new Date().toISOString(),
              new Date().toISOString(),
              existingTag.id
            ]);
            updatedCount++;
          } else {
            // 创建新标签
            await db.run(`
              INSERT INTO image_tags (repository_id, tag, digest, size, architecture, os, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              repository.id,
              tagInfo.name,
              tagInfo.digest || '',
              tagInfo.size || 0,
              tagInfo.architecture || 'unknown',
              tagInfo.os || 'unknown',
              tagInfo.created || new Date().toISOString()
            ]);
            addedCount++;
          }
        } catch (error) {
          logger.error(`处理标签 ${repoName}:${tagInfo.name} 失败:`, error);
        }
      }
      
      // 删除数据库中不存在的标签
      const currentTags = tags.map(t => t.name);
      const tagsToDelete = existingTags.filter(tag => !currentTags.includes(tag.tag));
      
      for (const tagToDelete of tagsToDelete) {
        await db.run('DELETE FROM image_tags WHERE id = ?', [tagToDelete.id]);
      }
      
      logger.info(`仓库 ${repoName} 同步完成: 新增 ${addedCount} 个标签, 更新 ${updatedCount} 个标签, 删除 ${tagsToDelete.length} 个标签`);
      
    } catch (error) {
      logger.error(`同步仓库标签 ${repoName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 同步指定项目的仓库数据
   * @param {number} projectId - 项目ID
   * @param {Object} options - 同步选项
   * @returns {Promise<Object>} 同步结果
   */
  async syncProjectRepositories(projectId, options = {}) {
    const startTime = Date.now();
    
    try {
      const registryConfig = await this.getDefaultRegistryConfig();
      
      // 检查Registry连接
      const isConnected = await dockerRegistryService.checkConnection(registryConfig);
      if (!isConnected) {
        throw new AppError('无法连接到Docker Registry', 500, 'REGISTRY_CONNECTION_FAILED');
      }

      // 获取项目信息
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
      }

      logger.info(`开始同步项目 ${project.name} 的仓库数据...`);
      
      // 获取所有仓库列表
      const repositoriesResult = await dockerRegistryService.getRepositories(registryConfig);
      const repositories = repositoriesResult.repositories || [];
      
      // 过滤出属于该项目的仓库
      const projectRepositories = repositories.filter(repo => {
        const repoParts = repo.name.split('/');
        return repoParts.length >= 2 && repoParts[0] === project.name;
      });
      
      logger.info(`发现 ${projectRepositories.length} 个属于项目 ${project.name} 的仓库`);
      
      let processedCount = 0;
      let errorCount = 0;
      
      // 处理每个仓库
      for (const repo of projectRepositories) {
        try {
          await this.processRepository(repo, registryConfig);
          processedCount++;
        } catch (error) {
          logger.error(`处理仓库 ${repo.name} 失败:`, error.message);
          errorCount++;
          
          if (options.stopOnError) {
            throw error;
          }
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info(`项目 ${project.name} 同步完成: 处理 ${processedCount} 个仓库, 错误 ${errorCount} 个, 耗时 ${duration}ms`);
      
      return {
        success: true,
        projectId,
        projectName: project.name,
        processedCount,
        errorCount,
        totalCount: projectRepositories.length,
        duration
      };
      
    } catch (error) {
      logger.error(`同步项目 ${projectId} 仓库数据失败:`, error);
      throw error;
    }
  }

  /**
   * 获取同步状态统计
   * @returns {Promise<Object>} 同步状态
   */
  async getSyncStatus() {
    try {
      const db = await getDb();
      
      // 获取项目数量
      const projectCount = await db.get('SELECT COUNT(*) as count FROM projects WHERE is_active = 1');
      
      // 获取仓库数量
      const repositoryCount = await db.get('SELECT COUNT(*) as count FROM repositories WHERE is_active = 1');
      
      // 获取镜像标签数量
      const tagCount = await db.get('SELECT COUNT(*) as count FROM image_tags');
      
      // 获取最后同步时间
      const lastSync = await db.get(
        'SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 1'
      );
      
      // 检查Registry连接状态
      const registryConfig = await this.getDefaultRegistryConfig();
      const isConnected = await dockerRegistryService.checkConnection(registryConfig);
      
      return {
        registryStatus: isConnected ? 'connected' : 'disconnected',
        registryUrl: registryConfig.url,
        projectCount: projectCount.count || 0,
        repositoryCount: repositoryCount.count || 0,
        tagCount: tagCount.count || 0,
        lastSync: lastSync ? {
          id: lastSync.id,
          type: lastSync.sync_type,
          status: lastSync.status,
          processedCount: lastSync.processed_count,
          errorCount: lastSync.error_count,
          duration: lastSync.duration,
          createdAt: lastSync.created_at
        } : null
      };
      
    } catch (error) {
      logger.error('获取同步状态失败:', error);
      throw error;
    }
  }

  /**
   * 记录同步日志
   * @param {Object} syncData - 同步数据
   */
  async logSync(syncData) {
    try {
      const db = await getDb();
      
      await db.run(`
        INSERT INTO sync_logs (
          sync_type, project_id, status, processed_count, 
          error_count, duration, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        syncData.type || 'full',
        syncData.projectId || null,
        syncData.status || 'completed',
        syncData.processedCount || 0,
        syncData.errorCount || 0,
        syncData.duration || 0,
        syncData.details ? JSON.stringify(syncData.details) : null,
        new Date().toISOString()
      ]);
      
    } catch (error) {
      logger.error('记录同步日志失败:', error);
    }
  }
}

export default new RegistrySyncService();

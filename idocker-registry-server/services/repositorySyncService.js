/**
 * Docker Repository Sync Service
 * 
 * Provides functionality to sync repository and image information from Docker Registry to database
 * 
 * @author IDocker Repository Team
 * @version 2.0.0
 */

import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import dockerRegistryService from './dockerRegistryService.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { RepositoryModel } from '../models/RepositoryModel.js';
import { ImageTagModel } from '../models/ImageTagModel.js';
import { SyncLogModel } from '../models/SyncLogModel.js';
import { getDb } from '../config/database.js';

class RepositorySyncService {
    constructor() {
        this.projectModel = new ProjectModel();
        this.repositoryModel = new RepositoryModel();
        this.imageTagModel = new ImageTagModel();
        this.syncLogModel = new SyncLogModel();
    }

    /**
     * Get default registry config
     */
    async getDefaultRegistryConfig() {
        try {
            // TODO: 使用 RegistryConfigModel 获取配置
            const db = await getDb();
            const config = await db.get(
                'SELECT * FROM registry_configs WHERE is_default = 1 AND is_active = 1'
            );

            if (!config) {
                throw new AppError('未找到默认的Registry配置', 500, 'REGISTRY_CONFIG_NOT_FOUND');
            }

            return config;
        } catch (error) {
            logger.error('获取Registry配置失败:', error);
            throw error;
        }
    }

    /**
     * Sync all repositories
     * @param {Object} options - Options object (optional)
     * @returns {Promise<Object>} Result object
     */
    async syncAllRepositories(options = {}) {
        const startTime = Date.now();
        let processedCount = 0;
        let errorCount = 0;

        try {
            const config = await this.getDefaultRegistryConfig();
            logger.info("config:", config);

            // 检查Repository连接
            const isConnected = await dockerRegistryService.checkConnection(config);
            if (!isConnected) {
                throw new AppError('无法连接到Docker Registry', 500, 'REGISTRY_CONNECTION_FAILED');
            }

            logger.info('开始同步Docker Repository数据...');

            // 获取所有仓库列表
            const repositoriesResult = await dockerRegistryService.getRepositories(config);
            const repositories = repositoriesResult.repositories || [];

            //logger.info(`getRepositories:${JSON.stringify(repositories)}`);
            logger.info(`发现 ${repositories.length} 个仓库`);

            // 处理每个仓库
            for (const repo of repositories) {
                try {
                    await this.processRepository(repo, config);
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
            logger.error('同步Docker Repository数据失败:', error);
            throw error;
        }
    }

    /**
     * Process a repository
     * @param {Object} repo - Repository Object
     * @param {Object} registryConfig - RegistryConfig
     */
    async processRepository(repo, registryConfig) {
        try {
            // 容错检查：确保 repo 对象存在且 name 属性是字符串
            if (!repo || !repo.name || typeof repo.name !== 'string') {
                logger.warn('跳过无效的仓库对象:', JSON.stringify(repo));
                return;
            }

            // 解析仓库名称，提取项目信息
            const repoParts = repo.name.split('/');
            let projectName = null;
            let imageName = repo.name;

            // 仓库名称格式: project/imagename 或 namespace/project/imagename
            if (repoParts.length >= 2) {
                projectName = repoParts[0];
                imageName = repoParts.slice(1).join('/');
            }
            //logger.info(`projectName:${projectName}, imageName:${imageName}`);
            // 查找或创建项目
            let project = null;
            if (projectName) {
                project = await this.projectModel.findByName(projectName);

                if (!project) {
                    // 创建新项目
                    await this.projectModel.createProject({
                        name: projectName,
                        namespace: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        description: `同步程序自动创建`,
                        is_active: 1
                    });
                    project = await this.projectModel.findByName(projectName);
                    logger.info(`创建新项目: ${projectName}`);
                }
            }
            //logger.info(`project:${JSON.stringify(project)}`);
            // 查找或创建仓库
            let repository = null;

            if (project) {
                repository = await this.repositoryModel.findByProjectIdAndName(project.id, imageName);
            }
            logger.info(`repository:${JSON.stringify(repository)}`);
            if (!repository) {
                // 创建新仓库
                await this.repositoryModel.createRepository({
                    name: imageName,
                    description: `同步程序自动创建`,
                    project_id: project ? project.id : null,
                    //repository_url: registryConfig.url,
                    is_active: 1
                });
                logger.info(`repository:${JSON.stringify(repository)}`);

                // 只有在有项目的情况下才查找仓库
                if (project && project.id) {
                    repository = await this.repositoryModel.findByProjectIdAndName(project.id, imageName);
                } else {
                    // 如果没有项目，尝试通过名称查找仓库
                    repository = await this.repositoryModel.findByName(imageName);
                }
                logger.info(`不存在，创建仓库: ${repo.name}`);
            } else {
                // 更新仓库信息
                if (repository && repository.id) {
                    await this.repositoryModel.updateRepository(repository.id, {
                        updated_at: new Date().toISOString()
                    });
                }
                logger.info(`已存在，进行更新: ${repo.name}`);
            }

            // 同步仓库的标签信息
            await this.syncRepositoryTags(repository, repo.name, registryConfig);

        } catch (error) {
            logger.error(`处理仓库 ${repo ? repo.name : 'unknown'} 失败:`, error);
            throw error;
        }
    }

    /**
     * Sync repository tags
     * @param {Object} repository - Repository Object
     * @param {string} repoName - Repository Name
     * @param {Object} repositoryConfig - RepositoryConfig Object
     */
    async syncRepositoryTags(repository, repoName, repositoryConfig) {
        try {
            // 容错检查：确保 repository 存在且有 id
            if (!repository || !repository.id) {
                logger.warn(`仓库信息无效，无法同步标签: ${repoName}`);
                return;
            }

            // 获取仓库的所有标签
            const tagsResult = await dockerRegistryService.getTags(repoName, repositoryConfig);
            const tags = Array.isArray(tagsResult?.tags) ? tagsResult.tags : [];

            logger.info(`仓库 ${repoName} 发现 ${tags.length} 个标签`);

            // 获取当前数据库中的标签
            const existingTags = await this.imageTagModel.getTagsByRepositoryId(repository.id);

            // 容错检查：确保 existingTags 是数组
            const existingTagsArray = Array.isArray(existingTags) ? existingTags : [];

            const existingTagsMap = new Map();
            if (existingTagsArray.length > 0) {
                logger.info(`仓库 ${repoName} 已存在 ${existingTagsArray.length} 个标签`);
                existingTagsArray.forEach(tag => {
                    if (tag && tag.tag) {
                        existingTagsMap.set(tag.tag, tag);
                    }
                });
            }


            // 处理标签
            let addedCount = 0;
            let updatedCount = 0;

            for (const tagInfo of tags) {
                try {
                    const existingTag = existingTagsMap.get(tagInfo.name);

                    if (existingTag) {
                        // 更新现有标签 - 需要在 ImageTagModel 中添加 updateTag 方法
                        // TODO: 在 ImageTagModel 中添加 updateTag 方法
                        await this.updateTag(existingTag.id, {
                            digest: tagInfo.digest || '',
                            size: tagInfo.size || 0,
                            architecture: tagInfo.architecture || 'unknown',
                            os: tagInfo.os || 'unknown',
                            created_at: tagInfo.created || new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                        updatedCount++;
                    } else {
                        // 创建新标签
                        await this.imageTagModel.createTag({
                            repository_id: repository.id,
                            tag: tagInfo.name,
                            digest: tagInfo.digest || '',
                            size: tagInfo.size || 0,
                            architecture: tagInfo.architecture || 'unknown',
                            os: tagInfo.os || 'unknown',
                            created_at: tagInfo.created || new Date().toISOString()
                        });
                        addedCount++;
                    }
                } catch (error) {
                    logger.error(`处理标签 ${repoName}:${tagInfo.name} 失败:`, error);
                }
            }

            // 删除数据库中不存在的标签
            const currentTags = tags.map(t => t && t.name ? t.name : '');
            const tagsToDelete = existingTagsArray.filter(tag => tag && tag.tag && !currentTags.includes(tag.tag));

            for (const tagToDelete of tagsToDelete) {
                await this.imageTagModel.deleteTag(tagToDelete.id, repository.id);
            }

            logger.info(`仓库 ${repoName} 同步完成: 新增 ${addedCount} 个标签, 更新 ${updatedCount} 个标签, 删除 ${tagsToDelete.length} 个标签`);

        } catch (error) {
            logger.error(`同步仓库标签 ${repoName} 失败:`, error);
            throw error;
        }
    }

    /**
     * Update a tag
     * @param {number} tagId - Tag ID
     * @param {Object} updateData - Data to update
     */
    async updateTag(tagId, updateData) {
        return await this.imageTagModel.updateTag(tagId, updateData);
    }

    /**
     * Sync one project's repositories
     * @param {number} projectId - Project ID
     * @param {Object} options - Options for sync
     * @returns {Promise<Object>} Result of sync
     */
    async syncProjectRepositories(projectId, options = {}) {
        const startTime = Date.now();

        try {
            const repositoryConfig = await this.getDefaultRegistryConfig();

            // 检查Repository连接
            const isConnected = await dockerRegistryService.checkConnection(repositoryConfig);
            if (!isConnected) {
                throw new AppError('无法连接到Docker Repository', 500, 'REPOSITORY_CONNECTION_FAILED');
            }

            // 获取项目信息
            const project = await this.projectModel.findById(projectId);
            if (!project) {
                throw new AppError('项目不存在', 404, 'PROJECT_NOT_FOUND');
            }

            logger.info(`开始同步项目 ${project.name} 的仓库数据...`);

            // 获取所有仓库列表
            const repositoriesResult = await dockerRegistryService.getRepositories(repositoryConfig);
            const repositories = repositoriesResult.repositories || [];

            // 过滤出属于该项目的仓库
            const projectRepositories = Array.isArray(repositories) ? repositories.filter(repo => {
                if (!repo || !repo.name) return false;
                const repoParts = repo.name.split('/');
                return repoParts.length >= 2 && repoParts[0] === project.name;
            }) : [];

            logger.info(`发现 ${projectRepositories.length} 个属于项目 ${project.name} 的仓库`);

            let processedCount = 0;
            let errorCount = 0;

            // 处理每个仓库
            for (const repo of projectRepositories) {
                try {
                    await this.processRepository(repo, repositoryConfig);
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
     * Get sync status
     * @returns {Promise<Object>} Statistics
     */
    async getSyncStatus() {
        try {
            // 使用模型层方法获取项目数量、仓库数量和标签数量
            const [projectCount, repositoryCount, tagCount, lastSync] = await Promise.all([
                this.getProjectCount(),
                this.getRepositoryCount(),
                this.getTagCount(),
                this.syncLogModel.getLastSync()
            ]);

            // 检查Repository连接状态
            const repositoryConfig = await this.getDefaultRegistryConfig();
            const isConnected = await dockerRegistryService.checkConnection(repositoryConfig);

            return {
                repositoryStatus: isConnected ? 'connected' : 'disconnected',
                repositoryUrl: repositoryConfig.url,
                projectCount: projectCount || 0,
                repositoryCount: repositoryCount || 0,
                tagCount: tagCount || 0,
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
     * Get active project count
     */
    async getProjectCount() {
        return await this.projectModel.getActiveProjectCount();
    }

    /**
     * Get active repository count
     */
    async getRepositoryCount() {
        return await this.repositoryModel.getActiveRepositoryCount();
    }

    /**
     * Get tag count
     */
    async getTagCount() {
        return await this.imageTagModel.getTagCount();
    }

    /**
     * Record sync log
     * @param {Object} syncData - Log data
     */
    async logSync(syncData) {
        try {
            await this.syncLogModel.createSyncLog(syncData);
        } catch (error) {
            logger.error('Failed to log sync:', error);
        }
    }
}

export default new RepositorySyncService();
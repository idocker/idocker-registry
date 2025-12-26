/**
 * 镜像仓库管理路由模块
 *
 * 提供镜像仓库的管理功能，包括镜像列表、标签管理、详细信息等
 *
 * @author IDocker Repository Team
 * @version 2.0.0
 */

import express from 'express';
import dockerRegistryService from '../services/dockerRegistryService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireProjectPermission, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { RepositoryModel } from '../models/RepositoryModel.js';
import { ImageTagModel } from '../models/ImageTagModel.js';
import { RegistryConfigModel } from '../models/RegistryConfigModel.js';
import { AuthModel } from '../models/AuthModel.js';
import { success, paginated } from '../utils/apiResponse.js';

const router = express.Router();
const projectModel = new ProjectModel();
const repositoryModel = new RepositoryModel();
const imageTagModel = new ImageTagModel();
const registryConfigModel = new RegistryConfigModel();
const authModel = new AuthModel();

router.get('/', asyncHandler(async (req, res) => {
  //获取用户的项目列表（不分页）
  const { id: userId, role: userRole } = req.user;
  const projects = await projectModel.getProjectsList(userId, userRole, { page: 1, limit: 1000, search: '' });  
  //循环项目列表，获取每个项目的镜像仓库列表（不分页）
  let allRepositories = [];
  for (const project of projects.data) {
    const repositories = await repositoryModel.getRepositoriesList(userId, userRole, { page: 1, limit: 1000, search: '' });
    allRepositories = allRepositories.concat(repositories.data);
  }

  res.status(200).json(success(allRepositories));

}));

/**
 * GET /api/repository/images
 * 获取镜像列表
 * 支持按项目过滤、搜索和分页
 */
router.get('/images', asyncHandler(async (req, res) => {
  const { projectId, search = '', page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    // 如果指定了项目ID，检查权限
    if (projectId) {
      const project = await projectModel.getProjectBasicInfo(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }

      // 检查权限（管理员或项目成员）
      if (req.user.role !== 'admin') {
        const membership = await projectModel.getMemberId(projectId, req.user.id);

        if (!membership) {
          return res.status(403).json({
            success: false,
            message: '无权访问该项目'
          });
        }
      }
    }

    const result = await dockerRegistryService.getStoredImages(
      projectId,
      search,
      pageNum,
      limitNum
    );

    res.status(200).json(success(result));
  } catch (error) {
    logger.error('获取镜像列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取镜像列表失败'
    });
  }
}));

/**
 * GET /api/repository/projects/:projectId/images
 * 获取特定项目的镜像列表
 */
router.get('/projects/:projectId/images', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { search = '', page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    // 检查项目是否存在
    const project = await projectModel.getProjectBasicInfo(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限
    if (req.user.role !== 'admin') {
      const membership = await projectModel.getMemberId(projectId, req.user.id);

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: '无权访问该项目'
        });
      }
    }

    const result = await dockerRegistryService.getStoredImages(
      projectId,
      search,
      pageNum,
      limitNum
    );

    // 使用统一的分页响应格式
    res.status(200).json(paginated(
      result.images,
      result.pagination
    ));
  } catch (error) {
    logger.error('获取项目镜像列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取项目镜像列表失败'
    });
  }
}));

/**
 * GET /api/repository/images/:imageId
 * 获取特定镜像的详细信息
 */
router.get('/images/:imageId', asyncHandler(async (req, res) => {
  const { imageId } = req.params;

  try {
    // 获取镜像仓库信息
    const repository = await repositoryModel.getRepositoryWithProject(imageId);

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: '镜像仓库不存在'
      });
    }

    // 检查权限
    if (req.user.role !== 'admin' && !repository.is_public) {
      const membership = await projectModel.getMemberId(repository.project_id, req.user.id);

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: '无权访问该镜像'
        });
      }
    }

    // 获取镜像标签列表
    const tags = await imageTagModel.getTagsByRepositoryId(imageId);

    // 为每个标签生成拉取和推送命令
    const repositoryConfig = await registryConfigModel.getDefaultActiveConfig();

    for (const tag of tags) {
      tag.pullCommand = dockerRegistryService.getPullCommand(
        repository.name,
        tag.tag,
        repositoryConfig
      );
      tag.pushCommand = dockerRegistryService.getPushCommand(
        repository.name,
        tag.tag,
        repositoryConfig
      );
    }

    res.status(200).json({
      success: true,
      data: {
        repository: {
          ...repository,
          fullName: `${repository.namespace ? repository.namespace + '/' : ''}${repository.project_name}/${repository.name}`
        },
        tags
      }
    });
  } catch (error) {
    logger.error('获取镜像详情时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取镜像详情失败'
    });
  }
}));

/**
 * GET /api/repository/images/:imageId/tags/:tagId
 * 获取特定镜像标签的详细信息
 */
router.get('/images/:imageId/tags/:tagId', asyncHandler(async (req, res) => {
  const { imageId, tagId } = req.params;

  try {
    // 获取镜像仓库信息
    const repository = await repositoryModel.getRepositoryWithProject(imageId);

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: '镜像仓库不存在'
      });
    }

    // 检查权限
    if (req.user.role !== 'admin' && !repository.is_public) {
      const membership = await projectModel.getMemberId(repository.project_id, req.user.id);

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: '无权访问该镜像'
        });
      }
    }

    // 获取标签信息
    const tag = await imageTagModel.getTagById(tagId, imageId);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '镜像标签不存在'
      });
    }

    // 获取构建历史
    let buildHistory = [];
    try {
      const repositoryConfig = await registryConfigModel.getDefaultActiveConfig();

      buildHistory = await dockerRegistryService.getBuildHistory(
        repository.name,
        tag.tag,
        repositoryConfig
      );
    } catch (error) {
      logger.warn(`获取构建历史失败: ${error.message}`);
      // 构建历史获取失败不影响主要功能
    }

    // 生成拉取和推送命令
    const repositoryConfig = await registryConfigModel.getDefaultActiveConfig();

    const pullCommand = dockerRegistryService.getPullCommand(
      repository.name,
      tag.tag,
      repositoryConfig
    );
    const pushCommand = dockerRegistryService.getPushCommand(
      repository.name,
      tag.tag,
      repositoryConfig
    );

    res.status(200).json({
      success: true,
      data: {
        repository: {
          ...repository,
          fullName: `${repository.namespace ? repository.namespace + '/' : ''}${repository.project_name}/${repository.name}`
        },
        tag: {
          ...tag,
          pullCommand,
          pushCommand
        },
        buildHistory
      }
    });
  } catch (error) {
    logger.error('获取镜像标签详情时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取镜像标签详情失败'
    });
  }
}));

/**
 * DELETE /api/repository/images/:imageId/tags/:tagId
 * 删除镜像标签
 */
router.delete('/images/:imageId/tags/:tagId', asyncHandler(async (req, res) => {
  const { imageId, tagId } = req.params;

  try {
    // 获取镜像仓库信息
    const repository = await repositoryModel.getRepositoryBasicInfo(imageId);

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: '镜像仓库不存在'
      });
    }

    // 检查权限（只有管理员或项目维护者可以删除标签）
    if (req.user.role !== 'admin') {
      const membership = await projectModel.getMemberRole(repository.project_id, req.user.id);

      if (!membership || !['owner', 'maintainer'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: '无权删除该镜像标签'
        });
      }
    }

    // 获取标签信息
    const tag = await imageTagModel.getTagById(tagId, imageId);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '镜像标签不存在'
      });
    }

    // 从Docker Repository删除标签
    const repositoryConfig = await registryConfigModel.getDefaultActiveConfig();

    const repositoryFullName = `${repository.project_name}/${repository.name}`;
    const deleteResult = await dockerRegistryService.deleteTag(
      repositoryFullName,
      tag.tag,
      repositoryConfig
    );

    if (!deleteResult) {
      return res.status(500).json({
        success: false,
        message: '删除镜像标签失败'
      });
    }

    // 从数据库删除标签记录
    await imageTagModel.deleteTag(tagId, imageId);

    // 记录操作日志
    await authModel.logAudit({
      user_id: req.user.id,
      action: 'DELETE_TAG',
      resource_type: 'image_tag',
      resource_id: `${imageId}:${tagId}`,
      details: { repository: repositoryFullName, tag: tag.tag },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: '镜像标签删除成功'
    });
  } catch (error) {
    logger.error('删除镜像标签时出错:', error);
    res.status(500).json({
      success: false,
      message: '删除镜像标签失败'
    });
  }
}));

/**
 * POST /api/repository/sync
 * 同步Docker Repository中的镜像信息到数据库
 * 这是一个长时间运行的操作，可能需要异步处理
 */
router.post('/sync', asyncHandler(async (req, res) => {
  // 只有管理员可以执行同步操作
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '只有管理员可以执行同步操作'
    });
  }

  try {
    // 获取默认的Repository配置
    const repositoryConfig = await registryConfigModel.getDefaultActiveConfig();

    if (!repositoryConfig) {
      return res.status(400).json({
        success: false,
        message: '未找到有效的Repository配置'
      });
    }

    // 获取所有仓库列表
    const repositories = await dockerRegistryService.getRepositories(repositoryConfig);

    let syncCount = 0;

    // 验证返回的数据格式
    if (!repositories || !Array.isArray(repositories.repositories)) {
      return res.status(400).json({
        success: false,
        message: '仓库列表数据格式错误'
      });
    }

    // 处理每个仓库
    for (const repoName of repositories.repositories) {
      // 容错检查：确保 repoName 是字符串
      if (!repoName || typeof repoName !== 'string') {
        logger.warn(`跳过无效的仓库名: ${repoName}`);
        continue;
      }

      // 解析仓库名称，提取项目信息
      const repoParts = repoName.split('/');
      let projectName = null;
      let imageRepoName = repoName;

      if (repoParts.length >= 2) {
        projectName = repoParts[0];
        imageRepoName = repoParts.slice(1).join('/');
      }

      // 如果没有项目信息，使用默认项目或跳过
      if (!projectName) {
        logger.warn(`跳过无项目信息的仓库: ${repoName}`);
        continue;
      }

      // 查找或创建项目
      let project = await projectModel.findActiveProjectByName(projectName);

      if (!project) {
        // 创建新项目
        project = await projectModel.createSimpleProject(
          projectName,
          `自动创建的项目: ${projectName}`,
          '',
          req.user.id
        );

        logger.info(`创建新项目: ${projectName} (ID: ${project.id})`);
      }

      // 查找或创建仓库
      let repositoryId = await repositoryModel.findRepositoryId(project.id, imageRepoName);

      if (!repositoryId) {
        // 创建新仓库
        const repoResult = await repositoryModel.createSimpleRepository(
          project.id,
          imageRepoName,
          `自动同步的仓库: ${repoName}`,
          0
        );
        repositoryId = repoResult.id;

        logger.info(`创建新仓库: ${repoName} (ID: ${repositoryId})`);
      }

      // 获取仓库标签
      const tagsData = await dockerRegistryService.getTags(repoName, repositoryConfig);

      // 容错检查：确保 tagsData.tags 是数组
      if (tagsData && Array.isArray(tagsData.tags)) {
        // 同步标签信息
        for (const tagInfo of tagsData.tags) {
          // 检查标签是否已存在
          const existingTag = await imageTagModel.tagExists(repositoryId, tagInfo.name);

          if (!existingTag) {
            // 创建新标签记录
            await imageTagModel.createTag({
              repository_id: repositoryId,
              tag: tagInfo.name,
              digest: tagInfo.digest || '',
              size: tagInfo.size || 0,
              architecture: tagInfo.architecture || '',
              os: tagInfo.os || '',
              created_at: tagInfo.created ? new Date(tagInfo.created).toISOString() : new Date().toISOString()
            });

            logger.info(`同步标签: ${repoName}:${tagInfo.name}`);
            syncCount++;
          }
        }
      } else {
        logger.warn(`仓库 ${repoName} 没有标签数据`);
      }
    }

    // 记录操作日志
    await authModel.logAudit({
      user_id: req.user.id,
      action: 'SYNC_REPOSITORY',
      resource_type: 'repository',
      resource_id: repositoryConfig.id.toString(),
      details: { syncedCount: syncCount },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: '镜像信息同步完成',
      data: {
        repositories: repositories.repositories.length,
        syncedTags: syncCount
      }
    });
  } catch (error) {
    logger.error('同步镜像信息时出错:', error);
    res.status(500).json({
      success: false,
      message: '同步镜像信息失败'
    });
  }
}));

/**
 * GET /api/repository/config
 * 获取Repository配置信息
 */
router.get('/config', asyncHandler(async (req, res) => {
  try {
    // 获取Repository配置（不包含密码）
    const repositoryConfigs = await registryConfigModel.getAllConfigs();

    res.status(200).json({
      success: true,
      data: {
        repositories: repositoryConfigs
      }
    });
  } catch (error) {
    logger.error('获取Repository配置时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取Repository配置失败'
    });
  }
}));

export default router;
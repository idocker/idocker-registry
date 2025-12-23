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
import { dbGet, dbAll, dbRun } from '../utils/dbHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireProjectPermission, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

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
      const db = await getDb();
      const project = await db.get(
        'SELECT id, name FROM projects WHERE id = ? AND is_active = 1',
        [projectId]
      );

      if (!project) {
        return res.status(404).json({
          success: false,
          message: '项目不存在'
        });
      }

      // 检查权限（管理员或项目成员）
      if (req.user.role !== 'admin') {
        const membership = await db.get(
          'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
          [projectId, req.user.id]
        );

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

    res.status(200).json({
      success: true,
      data: result
    });
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
    const db = await getDb();
    
    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ? AND is_active = 1',
      [projectId]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, req.user.id]
      );

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

    res.status(200).json({
      success: true,
      data: {
        ...result,
        project: {
          id: project.id,
          name: project.name
        }
      }
    });
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
    const db = await getDb();
    
    // 获取镜像仓库信息
    const repository = await db.get(
      `SELECT r.id, r.name, r.description, r.is_public, 
              p.id as project_id, p.name as project_name, p.namespace
       FROM repositories r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = ? AND r.is_active = 1 AND p.is_active = 1`,
      [imageId]
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: '镜像仓库不存在'
      });
    }

    // 检查权限
    if (req.user.role !== 'admin' && !repository.is_public) {
      const membership = await db.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [repository.project_id, req.user.id]
      );

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: '无权访问该镜像'
        });
      }
    }

    // 获取镜像标签列表
    const tags = await db.all(
      `SELECT id, tag, digest, size, architecture, os, created_at
       FROM image_tags
       WHERE repository_id = ?
       ORDER BY created_at DESC`,
      [imageId]
    );

    // 为每个标签生成拉取和推送命令
    const repositoryConfig = await db.get(
      'SELECT * FROM repository_configs WHERE is_default = 1 AND is_active = 1'
    );

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
    const db = await getDb();
    
    // 获取镜像仓库信息
    const repository = await db.get(
      `SELECT r.id, r.name, r.description, r.is_public,
              p.id as project_id, p.name as project_name, p.namespace
       FROM repositories r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = ? AND r.is_active = 1 AND p.is_active = 1`,
      [imageId]
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: '镜像仓库不存在'
      });
    }

    // 检查权限
    if (req.user.role !== 'admin' && !repository.is_public) {
      const membership = await db.get(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [repository.project_id, req.user.id]
      );

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: '无权访问该镜像'
        });
      }
    }

    // 获取标签信息
    const tag = await db.get(
      `SELECT id, tag, digest, size, architecture, os, created_at
       FROM image_tags
       WHERE id = ? AND repository_id = ?`,
      [tagId, imageId]
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '镜像标签不存在'
      });
    }

    // 获取构建历史
    let buildHistory = [];
    try {
      const repositoryConfig = await db.get(
        'SELECT * FROM repository_configs WHERE is_default = 1 AND is_active = 1'
      );
      
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
    const repositoryConfig = await db.get(
      'SELECT * FROM repository_configs WHERE is_default = 1 AND is_active = 1'
    );

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
    const db = await getDb();
    
    // 获取镜像仓库信息
    const repository = await db.get(
      `SELECT r.id, r.name, r.project_id, p.name as project_name
       FROM repositories r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = ? AND r.is_active = 1 AND p.is_active = 1`,
      [imageId]
    );

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: '镜像仓库不存在'
      });
    }

    // 检查权限（只有管理员或项目维护者可以删除标签）
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [repository.project_id, req.user.id]
      );

      if (!membership || !['owner', 'maintainer'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: '无权删除该镜像标签'
        });
      }
    }

    // 获取标签信息
    const tag = await db.get(
      'SELECT tag FROM image_tags WHERE id = ? AND repository_id = ?',
      [tagId, imageId]
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '镜像标签不存在'
      });
    }

    // 从Docker Repository删除标签
    const repositoryConfig = await db.get(
      'SELECT * FROM repository_configs WHERE is_default = 1 AND is_active = 1'
    );

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
    await db.run(
      'DELETE FROM image_tags WHERE id = ? AND repository_id = ?',
      [tagId, imageId]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE_TAG',
        'image_tag',
        `${imageId}:${tagId}`,
        JSON.stringify({ repository: repositoryFullName, tag: tag.tag }),
        req.ip,
        req.headers['user-agent']
      ]
    );

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
    const db = await getDb();
    
    // 获取默认的Repository配置
    const repositoryConfig = await db.get(
      'SELECT * FROM repository_configs WHERE is_default = 1 AND is_active = 1'
    );

    if (!repositoryConfig) {
      return res.status(400).json({
        success: false,
        message: '未找到有效的Repository配置'
      });
    }

    // 获取所有仓库列表
    const repositories = await dockerRegistryService.getRepositories(repositoryConfig);
    
    let syncCount = 0;
    
    // 开始事务
    await db.run('BEGIN TRANSACTION');
    
    try {
      // 处理每个仓库
      for (const repoName of repositories.repositories) {
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
        let project = await db.get(
          'SELECT id FROM projects WHERE name = ? AND is_active = 1',
          [projectName]
        );
        
        if (!project) {
          // 创建新项目
          const projectResult = await db.run(
            'INSERT INTO projects (name, description, namespace, created_by, is_active) VALUES (?, ?, ?, ?, 1)',
            [projectName, `自动创建的项目: ${projectName}`, '', req.user.id]
          );
          project = { id: projectResult.lastID };
          
          logger.info(`创建新项目: ${projectName} (ID: ${project.id})`);
        }
        
        // 查找或创建仓库
        let repository = await db.get(
          'SELECT id FROM repositories WHERE project_id = ? AND name = ? AND is_active = 1',
          [project.id, imageRepoName]
        );
        
        if (!repository) {
          // 创建新仓库
          const repoResult = await db.run(
            'INSERT INTO repositories (name, project_id, description, is_public, is_active) VALUES (?, ?, ?, ?, 1)',
            [imageRepoName, project.id, `自动同步的仓库: ${repoName}`, 0]
          );
          repository = { id: repoResult.lastID };
          
          logger.info(`创建新仓库: ${repoName} (ID: ${repository.id})`);
        }
        
        // 获取仓库标签
        const tagsData = await dockerRegistryService.getTags(repoName, repositoryConfig);
        
        // 同步标签信息
        for (const tagInfo of tagsData.tags) {
          // 检查标签是否已存在
          const existingTag = await db.get(
            'SELECT id FROM image_tags WHERE repository_id = ? AND tag = ?',
            [repository.id, tagInfo.name]
          );
          
          if (!existingTag) {
            // 创建新标签记录
            await db.run(
              `INSERT INTO image_tags (repository_id, tag, digest, size, architecture, os, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                repository.id,
                tagInfo.name,
                tagInfo.digest || '',
                tagInfo.size || 0,
                tagInfo.architecture || '',
                tagInfo.os || '',
                tagInfo.created ? new Date(tagInfo.created).toISOString() : new Date().toISOString()
              ]
            );
            
            logger.info(`同步标签: ${repoName}:${tagInfo.name}`);
            syncCount++;
          }
        }
      }
      
      // 提交事务
      await db.run('COMMIT');
      
      // 记录操作日志
      await db.run(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          'SYNC_REPOSITORY',
          'repository',
          repositoryConfig.id.toString(),
          JSON.stringify({ syncedCount: syncCount }),
          req.ip,
          req.headers['user-agent']
        ]
      );
      
      res.status(200).json({
        success: true,
        message: '镜像信息同步完成',
        data: {
          repositories: repositories.repositories.length,
          syncedTags: syncCount
        }
      });
    } catch (error) {
      // 回滚事务
      await db.run('ROLLBACK');
      throw error;
    }
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
    const db = await getDb();
    
    // 获取Repository配置（不包含密码）
    const repositoryConfigs = await db.all(
      `SELECT id, name, url, is_default, is_active, created_at, updated_at
       FROM repository_configs
       ORDER BY is_default DESC, name`
    );
    
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
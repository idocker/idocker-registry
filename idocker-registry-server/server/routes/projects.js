/**
 * 项目管理路由模块（重构版）
 * 
 * 提供项目的CRUD操作和成员管理
 * 支持项目权限控制和分页查询
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { UserModel } from '../models/UserModel.js';

const projectModel = new ProjectModel();
const userModel = new UserModel();
const router = express.Router();

/**
 * GET /api/projects
 * 获取项目列表
 * 支持分页和搜索，根据用户角色返回不同权限的项目
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const { id: userId, role: userRole } = req.user;

  try {
    const result = await projectModel.getProjectsList(userId, userRole, { page, limit, search });
console.log(result)
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('获取项目列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取项目列表失败'
    });
  }
}));

/**
 * GET /api/projects/:id
 * 获取特定项目详情
 * 检查用户是否有访问权限
 */
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有访问权限
    const hasPermission = await projectModel.checkProjectPermission(id, userId, userRole);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限访问此项目'
      });
    }

    // 获取项目详情
    const project = await projectModel.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 获取项目成员列表
    const members = await projectModel.getProjectMembers(id);
    
    // 获取项目仓库数量
    const repositoryCount = await projectModel.getProjectRepositoryCount(id);

    res.status(200).json({
      success: true,
      data: {
        ...project,
        members: members || [],
        repositoryCount: repositoryCount.count || 0
      }
    });
  } catch (error) {
    logger.error('获取项目详情时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取项目详情失败'
    });
  }
}));

/**
 * POST /api/projects
 * 创建新项目
 * 只有管理员可以创建项目
 */
router.post('/', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, namespace } = req.body;
  const { id: createdBy } = req.user;

  // 验证必填字段
  if (!name || !namespace) {
    return res.status(400).json({
      success: false,
      message: '项目名称和命名空间不能为空'
    });
  }

  // 验证命名空间格式
  if (!/^[a-z0-9-]+$/.test(namespace)) {
    return res.status(400).json({
      success: false,
      message: '命名空间只能包含小写字母、数字和连字符'
    });
  }

  try {
    // 检查项目名称是否唯一
    const isNameUnique = await projectModel.isProjectNameUnique(name);
    if (!isNameUnique) {
      return res.status(409).json({
        success: false,
        message: '项目名称已存在'
      });
    }

    // 检查命名空间是否唯一
    const existingNamespace = await projectModel.get(
      'SELECT id FROM projects WHERE namespace = ? AND is_active = 1',
      [namespace]
    );
    if (existingNamespace) {
      return res.status(409).json({
        success: false,
        message: '命名空间已存在'
      });
    }

    // 创建项目数据
    const projectData = {
      name,
      description: description || '',
      namespace,
      is_active: 1
    };

    const newProject = await projectModel.createProject(projectData, createdBy);

    // 将创建者添加为项目所有者
    await projectModel.addProjectMember(newProject.id, createdBy, 'owner');

    // 获取创建后的项目详情
    const projectDetails = await projectModel.findById(newProject.id);
    const members = await projectModel.getProjectMembers(newProject.id);

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: {
        ...projectDetails,
        members
      }
    });
  } catch (error) {
    logger.error('创建项目时出错:', error);
    res.status(500).json({
      success: false,
      message: '创建项目失败'
    });
  }
}));

/**
 * PUT /api/projects/:id
 * 更新项目信息
 * 需要项目所有者或管理员权限
 */
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;
  const { id: userId, role: userRole } = req.user;

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有修改权限（管理员或项目所有者）
    let hasPermission = false;
    if (userRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, userId);
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此项目'
      });
    }

    // 检查项目名称是否唯一（如果要更新名称）
    if (name) {
      const isNameUnique = await projectModel.isProjectNameUnique(name, id);
      if (!isNameUnique) {
        return res.status(409).json({
          success: false,
          message: '项目名称已存在'
        });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供任何要更新的字段'
      });
    }

    // 更新项目信息
    const result = await projectModel.updateProject(id, updateData);

    // 获取更新后的项目信息
    const updatedProject = await projectModel.findById(id);

    res.status(200).json({
      success: true,
      message: '项目信息更新成功',
      data: updatedProject
    });
  } catch (error) {
    logger.error('更新项目信息时出错:', error);
    res.status(500).json({
      success: false,
      message: '更新项目信息失败'
    });
  }
}));

/**
 * DELETE /api/projects/:id
 * 删除项目（软删除）
 * 需要管理员权限
 */
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 软删除项目
    await projectModel.deleteProject(id);

    res.status(200).json({
      success: true,
      message: '项目删除成功'
    });
  } catch (error) {
    logger.error('删除项目时出错:', error);
    res.status(500).json({
      success: false,
      message: '删除项目失败'
    });
  }
}));

/**
 * GET /api/projects/:id/members
 * 获取项目成员列表
 * 需要项目访问权限
 */
router.get('/:id/members', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有访问权限
    const hasPermission = await projectModel.checkProjectPermission(id, userId, userRole);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限访问此项目'
      });
    }

    // 获取项目成员列表
    const members = await projectModel.getProjectMembers(id);

    res.status(200).json({
      success: true,
      data: {
        project: { id },
        members: members || []
      }
    });
  } catch (error) {
    logger.error('获取项目成员列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取项目成员列表失败'
    });
  }
}));

/**
 * POST /api/projects/:id/members
 * 添加项目成员
 * 需要项目所有者或管理员权限
 */
router.post('/:id/members', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role = 'viewer' } = req.body;
  const { id: currentUserId, role: currentUserRole } = req.user;

  // 验证必填字段
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: '用户ID不能为空'
    });
  }

  // 验证角色
  if (!['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目角色'
    });
  }

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有修改权限（管理员或项目所有者）
    let hasPermission = false;
    if (currentUserRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, currentUserId);
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此项目成员'
      });
    }

    // 检查要添加的用户是否存在且活跃
    const user = await userModel.findById(userId);
    if (!user || user.is_active === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 检查用户是否已经是项目成员
    const memberExists = await projectModel.memberExists(id, userId);
    if (memberExists) {
      return res.status(409).json({
        success: false,
        message: '用户已经是项目成员'
      });
    }

    // 添加用户到项目
    await projectModel.addProjectMember(id, userId, role);

    res.status(201).json({
      success: true,
      message: '用户已添加到项目'
    });
  } catch (error) {
    logger.error('添加项目成员时出错:', error);
    res.status(500).json({
      success: false,
      message: '添加项目成员失败'
    });
  }
}));

/**
 * PUT /api/projects/:id/members/:userId
 * 更新项目成员角色
 * 需要项目所有者或管理员权限
 */
router.put('/:id/members/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { role } = req.body;
  const { id: currentUserId, role: currentUserRole } = req.user;

  // 验证角色
  if (!role || !['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目角色'
    });
  }

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有修改权限（管理员或项目所有者）
    let hasPermission = false;
    if (currentUserRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, currentUserId);
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此项目成员'
      });
    }

    // 检查成员是否存在
    const memberExists = await projectModel.memberExists(id, userId);
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: '用户不是项目成员'
      });
    }

    // 检查是否要修改最后一个所有者的角色
    if (role !== 'owner') {
      const ownerCount = await projectModel.getProjectOwnerCount(id);
      if (ownerCount <= 1) {
        const currentMemberRole = await projectModel.get(
          'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
          [id, userId]
        );
        
        if (currentMemberRole && currentMemberRole.role === 'owner') {
          return res.status(400).json({
            success: false,
            message: '不能修改最后一个项目所有者的角色'
          });
        }
      }
    }

    // 更新成员角色
    await projectModel.updateProjectMemberRole(id, userId, role);

    res.status(200).json({
      success: true,
      message: '项目成员角色更新成功'
    });
  } catch (error) {
    logger.error('更新项目成员角色时出错:', error);
    res.status(500).json({
      success: false,
      message: '更新项目成员角色失败'
    });
  }
}));

/**
 * DELETE /api/projects/:id/members/:userId
 * 从项目中移除成员
 * 需要项目所有者或管理员权限
 */
router.delete('/:id/members/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { id: currentUserId, role: currentUserRole } = req.user;

  try {
    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否有修改权限（管理员或项目所有者）
    let hasPermission = false;
    if (currentUserRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, currentUserId);
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此项目成员'
      });
    }

    // 检查成员是否存在
    const memberExists = await projectModel.memberExists(id, userId);
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: '用户不是项目成员'
      });
    }

    // 检查是否要移除最后一个所有者
    const currentMemberRole = await projectModel.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (currentMemberRole && currentMemberRole.role === 'owner') {
      const ownerCount = await projectModel.getProjectOwnerCount(id);
      if (ownerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能移除最后一个项目所有者'
        });
      }
    }

    // 从项目中移除用户
    await projectModel.removeProjectMember(id, userId);

    res.status(200).json({
      success: true,
      message: '用户已从项目中移除'
    });
  } catch (error) {
    logger.error('从项目移除成员时出错:', error);
    res.status(500).json({
      success: false,
      message: '从项目移除成员失败'
    });
  }
}));

export default router;
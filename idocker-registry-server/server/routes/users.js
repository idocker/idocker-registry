/**
 * 用户管理路由模块（重构版）
 * 
 * 提供用户的CRUD操作和权限管理
 * 只有管理员可以访问这些接口
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { UserModel } from '../models/UserModel.js';
import { ProjectModel } from '../models/ProjectModel.js';

const userModel = new UserModel();
const projectModel = new ProjectModel();
const router = express.Router();

// 所有用户管理接口都需要管理员权限
router.use(requireAdmin);

/**
 * GET /api/users
 * 获取用户列表
 * 支持分页和搜索
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '' } = req.query;

  try {
    const result = await userModel.getUsersList({ page, limit, search, role });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error('获取用户列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
}));

/**
 * GET /api/users/:id
 * 获取特定用户详情
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userModel.getUserDetails(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户所属项目和权限
    const projects = await userModel.getUserProjects(id);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        projects
      }
    });
  } catch (error) {
    logger.error('获取用户详情时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
}));

/**
 * POST /api/users
 * 创建新用户
 */
router.post('/', asyncHandler(async (req, res) => {
  const { username, password, email, fullName, role = 'user' } = req.body;

  // 验证必填字段
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名和密码不能为空'
    });
  }

  // 验证角色
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的用户角色'
    });
  }

  // 验证密码强度
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密码长度不能少于6个字符'
    });
  }

  try {
    // 检查用户名是否唯一
    const isUsernameUnique = await userModel.isUsernameUnique(username);
    if (!isUsernameUnique) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 检查邮箱是否唯一（如果提供了邮箱）
    if (email) {
      const isEmailUnique = await userModel.isEmailUnique(email);
      if (!isEmailUnique) {
        return res.status(409).json({
          success: false,
          message: '邮箱已存在'
        });
      }
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const userData = {
      username,
      password: hashedPassword,
      email: email || '',
      full_name: fullName || '',
      role,
      is_active: 1
    };

    const newUser = await userModel.createUser(userData);

    // 返回创建的用户信息（不包含密码）
    const userDetails = await userModel.getUserDetails(newUser.id);

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: userDetails
    });
  } catch (error) {
    logger.error('创建用户时出错:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败'
    });
  }
}));

/**
 * PUT /api/users/:id
 * 更新用户信息
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, fullName, role, isActive } = req.body;

  // 验证角色
  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的用户角色'
    });
  }

  try {
    // 检查用户是否存在
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户当前信息
    const currentUser = await userModel.findById(id);

    // 防止管理员修改自己的角色为普通用户（导致没有管理员）
    if (parseInt(id) === req.user.id && role === 'user') {
      return res.status(400).json({
        success: false,
        message: '不能将自己的角色修改为普通用户'
      });
    }

    // 检查邮箱是否唯一（如果要更新邮箱）
    if (email && email !== currentUser.email) {
      const isEmailUnique = await userModel.isEmailUnique(email, id);
      if (!isEmailUnique) {
        return res.status(409).json({
          success: false,
          message: '邮箱已存在'
        });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.full_name = fullName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供任何要更新的字段'
      });
    }

    // 更新用户信息
    const result = await userModel.updateUser(id, updateData);

    // 获取更新后的用户信息
    const updatedUser = await userModel.getUserDetails(id);

    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: updatedUser
    });
  } catch (error) {
    logger.error('更新用户信息时出错:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
}));

/**
 * PUT /api/users/:id/password
 * 重置用户密码
 */
router.put('/:id/password', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: '密码不能为空'
    });
  }

  // 验证密码强度
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密码长度不能少于6个字符'
    });
  }

  try {
    // 检查用户是否存在
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 更新密码
    await userModel.updatePassword(id, hashedPassword);

    res.status(200).json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    logger.error('重置密码时出错:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
}));

/**
 * DELETE /api/users/:id
 * 删除用户（软删除）
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 检查用户是否存在
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户当前信息
    const user = await userModel.findById(id);

    // 防止管理员删除自己
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    // 检查是否还有其他管理员（如果要删除的是管理员）
    if (user.role === 'admin') {
      const adminCount = await userModel.getAdminCount();
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能删除最后一个管理员账户'
        });
      }
    }

    // 软删除用户
    await userModel.deleteUser(id);

    res.status(200).json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    logger.error('删除用户时出错:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
}));

/**
 * GET /api/users/:id/projects
 * 获取用户所属的项目列表
 */
router.get('/:id/projects', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 检查用户是否存在
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户项目
    const projects = await userModel.getUserProjects(id);

    res.status(200).json({
      success: true,
      data: {
        user: { id },
        projects
      }
    });
  } catch (error) {
    logger.error('获取用户项目列表时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取用户项目列表失败'
    });
  }
}));

/**
 * POST /api/users/:id/projects/:projectId
 * 将用户添加到项目
 */
router.post('/:id/projects/:projectId', asyncHandler(async (req, res) => {
  const { id, projectId } = req.params;
  const { role = 'viewer' } = req.body;

  // 验证角色
  if (!['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目角色'
    });
  }

  try {
    // 检查用户是否存在且活跃
    const user = await userModel.findById(id);
    if (!user || user.is_active === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(projectId);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否已经是项目成员
    const memberExists = await projectModel.memberExists(projectId, id);
    if (memberExists) {
      return res.status(409).json({
        success: false,
        message: '用户已经是项目成员'
      });
    }

    // 添加用户到项目
    await projectModel.addProjectMember(projectId, id, role);

    res.status(201).json({
      success: true,
      message: '用户已添加到项目'
    });
  } catch (error) {
    logger.error('添加用户到项目时出错:', error);
    res.status(500).json({
      success: false,
      message: '添加用户到项目失败'
    });
  }
}));

/**
 * DELETE /api/users/:id/projects/:projectId
 * 从项目中移除用户
 */
router.delete('/:id/projects/:projectId', asyncHandler(async (req, res) => {
  const { id, projectId } = req.params;

  try {
    // 检查用户是否存在
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查项目是否存在
    const projectExists = await projectModel.projectExists(projectId);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否是项目成员
    const memberExists = await projectModel.memberExists(projectId, id);
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: '用户不是项目成员'
      });
    }

    // 从项目中移除用户
    await projectModel.removeProjectMember(projectId, id);

    res.status(200).json({
      success: true,
      message: '用户已从项目中移除'
    });
  } catch (error) {
    logger.error('从项目移除用户时出错:', error);
    res.status(500).json({
      success: false,
      message: '从项目移除用户失败'
    });
  }
}));

export default router;
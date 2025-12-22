/**
 * 用户管理路由模块
 * 
 * 提供用户的CRUD操作和权限管理
 * 只有管理员可以访问这些接口
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { dbGet, dbAll, dbRun, dbPaginate, dbExists } from '../utils/dbHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

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
    let query = `
      SELECT id, username, email, full_name, role, is_active, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    // 添加搜索条件
    if (search) {
      query += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 添加角色过滤
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    // 添加排序
    query += ' ORDER BY created_at DESC';

    const users = await db.all(query, params);

    // 使用dbPaginate进行分页查询
    const result = await dbPaginate(query, params, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users: result.items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
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
    const user = await dbGet(
      `SELECT id, username, email, full_name, role, is_active, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户所属项目和权限
    const projects = await db.all(`
      SELECT p.id, p.name, p.description, pm.role as member_role, pm.created_at as member_since
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ? AND p.is_active = 1
      ORDER BY p.name
    `, [id]);

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
    const db = await getDb();

    // 检查用户名是否已存在
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await db.run(
      `INSERT INTO users (username, password, email, full_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [username, hashedPassword, email, fullName, role]
    );

    const userId = result.lastID;

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE_USER',
        'user',
        userId.toString(),
        JSON.stringify({ username, email, role }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    // 返回创建的用户信息（不包含密码）
    const newUser = await db.get(
      `SELECT id, username, email, full_name, role, is_active, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: newUser
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
    const db = await getDb();
    
    // 检查用户是否存在
    const user = await db.get(
      'SELECT id, username, role FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 防止管理员修改自己的角色为普通用户（导致没有管理员）
    if (user.id === req.user.id && role === 'user') {
      return res.status(400).json({
        success: false,
        message: '不能将自己的角色修改为普通用户'
      });
    }

    // 构建更新语句
    const updates = [];
    const params = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(fullName);
    }

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供任何要更新的字段'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'UPDATE_USER',
        'user',
        id,
        JSON.stringify({ email, fullName, role, isActive }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    // 返回更新后的用户信息
    const updatedUser = await db.get(
      `SELECT id, username, email, full_name, role, is_active, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

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
    const db = await getDb();
    
    // 检查用户是否存在
    const user = await db.get(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 更新密码
    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'RESET_PASSWORD',
        'user',
        id,
        JSON.stringify({ targetUser: user.username }),
        req.ip,
        req.headers['user-agent']
      ]
    );

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
 * 删除用户
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    
    // 检查用户是否存在
    const user = await db.get(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 防止管理员删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    // 检查是否还有其他管理员
    if (user.role === 'admin') {
      const adminCount = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND is_active = 1'
      );

      if (adminCount.count <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能删除最后一个管理员账户'
        });
      }
    }

    // 删除用户（设置为非活跃状态，而不是物理删除）
    await db.run(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE_USER',
        'user',
        id,
        JSON.stringify({ targetUser: user.username }),
        req.ip,
        req.headers['user-agent']
      ]
    );

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
    const db = await getDb();
    
    // 检查用户是否存在
    const user = await db.get(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户项目
    const projects = await db.all(`
      SELECT p.id, p.name, p.description, p.namespace, pm.role as member_role, pm.created_at as member_since
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ? AND p.is_active = 1
      ORDER BY p.name
    `, [id]);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username
        },
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
    const db = await getDb();
    
    // 检查用户是否存在
    const user = await db.get(
      'SELECT id, username FROM users WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ? AND is_active = 1',
      [projectId]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或已被禁用'
      });
    }

    // 检查用户是否已经是项目成员
    const existingMembership = await db.get(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, id]
    );

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: '用户已经是项目成员'
      });
    }

    // 添加用户到项目
    await db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, id, role]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'ADD_TO_PROJECT',
        'project_member',
        `${projectId}:${id}`,
        JSON.stringify({ user: user.username, project: project.name, role }),
        req.ip,
        req.headers['user-agent']
      ]
    );

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
    const db = await getDb();
    
    // 检查用户是否存在
    const user = await db.get(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [projectId]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查用户是否是项目成员
    const membership = await db.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, id]
    );

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: '用户不是项目成员'
      });
    }

    // 从项目中移除用户
    await db.run(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, id]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'REMOVE_FROM_PROJECT',
        'project_member',
        `${projectId}:${id}`,
        JSON.stringify({ user: user.username, project: project.name }),
        req.ip,
        req.headers['user-agent']
      ]
    );

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
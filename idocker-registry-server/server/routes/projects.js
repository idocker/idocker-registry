/**
 * 项目管理路由模块
 * 
 * 提供项目的CRUD操作和成员管理
 * 支持基于项目的权限控制
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { dbGet, dbAll, dbRun, dbPaginate } from '../utils/dbHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireProjectPermission, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/projects
 * 获取项目列表
 * 支持分页和搜索，根据用户权限过滤
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const db = await getDb();
    
    // 管理员可以查看所有项目，普通用户只能查看有权限的项目
    let query;
    let params;
    
    if (req.user.role === 'admin') {
      query = `
        SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at, 
               u.username as created_by_username, u.full_name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
      params = [];
      
      if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.namespace LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    } else {
      query = `
        SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at,
               u.username as created_by_username, u.full_name as created_by_name,
               pm.role as member_role, pm.created_at as member_since
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ? AND p.is_active = 1
      `;
      params = [req.user.id];
      
      if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.namespace LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }

    query += ' ORDER BY p.name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const projects = await db.all(query, params);

    // 获取项目成员数量
    for (const project of projects) {
      const memberCount = await db.get(
        'SELECT COUNT(*) as count FROM project_members WHERE project_id = ?',
        [project.id]
      );
      project.memberCount = memberCount.count;
      
      // 获取仓库数量
      const repoCount = await db.get(
        'SELECT COUNT(*) as count FROM repositories WHERE project_id = ? AND is_active = 1',
        [project.id]
      );
      project.repositoryCount = repoCount.count;
    }

    // 获取总数
    let countQuery;
    let countParams;
    
    if (req.user.role === 'admin') {
      countQuery = 'SELECT COUNT(*) as total FROM projects WHERE 1=1';
      countParams = [];
      
      if (search) {
        countQuery += ' AND (name LIKE ? OR description LIKE ? OR namespace LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM project_members pm JOIN projects p ON pm.project_id = p.id WHERE pm.user_id = ? AND p.is_active = 1';
      countParams = [req.user.id];
      
      if (search) {
        countQuery += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.namespace LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }

    const { total } = await db.get(countQuery, countParams);

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
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
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    
    // 检查项目是否存在和权限
    let project;
    if (req.user.role === 'admin') {
      project = await db.get(
        `SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at,
                u.username as created_by_username, u.full_name as created_by_name
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`,
        [id]
      );
    } else {
      project = await db.get(
        `SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at,
                u.username as created_by_username, u.full_name as created_by_name,
                pm.role as member_role, pm.created_at as member_since
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         JOIN project_members pm ON p.id = pm.project_id
         WHERE p.id = ? AND pm.user_id = ?`,
        [id, req.user.id]
      );
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在或无权访问'
      });
    }

    // 获取项目成员
    const members = await db.all(`
      SELECT u.id, u.username, u.email, u.full_name, u.role as user_role, u.is_active,
             pm.role as member_role, pm.created_at as member_since
      FROM users u
      JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = ? AND u.is_active = 1
      ORDER BY pm.created_at
    `, [id]);

    // 获取项目仓库
    const repositories = await db.all(`
      SELECT id, name, description, is_public, created_at, updated_at
      FROM repositories
      WHERE project_id = ? AND is_active = 1
      ORDER BY name
    `, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...project,
        members,
        repositories
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
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, namespace } = req.body;

  // 验证必填字段
  if (!name) {
    return res.status(400).json({
      success: false,
      message: '项目名称不能为空'
    });
  }

  try {
    const db = await getDb();

    // 检查项目名称是否已存在
    const existingProject = await db.get(
      'SELECT id FROM projects WHERE name = ?',
      [name]
    );

    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: '项目名称已存在'
      });
    }

    // 创建项目
    const result = await db.run(
      `INSERT INTO projects (name, description, namespace, created_by, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [name, description, namespace, req.user.id]
    );

    const projectId = result.lastID;

    // 将创建者添加为项目所有者
    await db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, req.user.id, 'owner']
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE_PROJECT',
        'project',
        projectId.toString(),
        JSON.stringify({ name, description, namespace }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    // 返回创建的项目信息
    const newProject = await db.get(
      `SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at,
              u.username as created_by_username
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [projectId]
    );

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: newProject
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
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, namespace, isActive } = req.body;

  try {
    const db = await getDb();
    
    // 检查项目是否存在和权限
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限：只有管理员或项目所有者可以更新项目
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: '无权更新该项目'
        });
      }
    }

    // 检查项目名称是否已存在（如果要更新名称）
    if (name && name !== project.name) {
      const existingProject = await db.get(
        'SELECT id FROM projects WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existingProject) {
        return res.status(409).json({
          success: false,
          message: '项目名称已存在'
        });
      }
    }

    // 构建更新语句
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (namespace !== undefined) {
      updates.push('namespace = ?');
      params.push(namespace);
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
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'UPDATE_PROJECT',
        'project',
        id,
        JSON.stringify({ name, description, namespace, isActive }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    // 返回更新后的项目信息
    const updatedProject = await db.get(
      `SELECT p.id, p.name, p.description, p.namespace, p.is_active, p.created_at, p.updated_at,
              u.username as created_by_username
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = ?`,
      [id]
    );

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
 * 删除项目
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    
    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限：只有管理员或项目所有者可以删除项目
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: '无权删除该项目'
        });
      }
    }

    // 删除项目（设置为非活跃状态，而不是物理删除）
    await db.run(
      'UPDATE projects SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE_PROJECT',
        'project',
        id,
        JSON.stringify({ projectName: project.name }),
        req.ip,
        req.headers['user-agent']
      ]
    );

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
 */
router.get('/:id/members', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const db = await getDb();
    
    // 检查项目是否存在和权限
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [id]
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
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: '无权查看项目成员'
        });
      }
    }

    // 获取项目成员
    const members = await db.all(`
      SELECT u.id, u.username, u.email, u.full_name, u.role as user_role, u.is_active,
             pm.role as member_role, pm.created_at as member_since
      FROM users u
      JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = ? AND u.is_active = 1
      ORDER BY 
        CASE pm.role 
          WHEN 'owner' THEN 1
          WHEN 'maintainer' THEN 2
          WHEN 'viewer' THEN 3
        END,
        pm.created_at
    `, [id]);

    res.status(200).json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name
        },
        members
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
 * 添加成员到项目
 */
router.post('/:id/members', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role = 'viewer' } = req.body;

  // 验证角色
  if (!['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目角色'
    });
  }

  try {
    const db = await getDb();
    
    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限：只有管理员或项目所有者可以添加成员
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: '无权添加项目成员'
        });
      }
    }

    // 检查用户是否存在且活跃
    const user = await db.get(
      'SELECT id, username FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 检查用户是否已经是项目成员
    const existingMembership = await db.get(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
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
      [id, userId, role]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'ADD_MEMBER',
        'project_member',
        `${id}:${userId}`,
        JSON.stringify({ project: project.name, user: user.username, role }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    res.status(201).json({
      success: true,
      message: '成员添加成功'
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
 */
router.put('/:id/members/:userId', asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { role } = req.body;

  // 验证角色
  if (!['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目角色'
    });
  }

  try {
    const db = await getDb();
    
    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限：只有管理员或项目所有者可以更新成员角色
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: '无权更新成员角色'
        });
      }
    }

    // 检查成员是否存在
    const member = await db.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '用户不是项目成员'
      });
    }

    // 防止所有者修改自己的角色（可能导致项目没有所有者）
    if (parseInt(userId) === req.user.id && role !== 'owner') {
      return res.status(400).json({
        success: false,
        message: '不能修改自己的所有者角色'
      });
    }

    // 更新成员角色
    await db.run(
      'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?',
      [role, id, userId]
    );

    // 获取用户信息用于日志
    const user = await db.get(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'UPDATE_MEMBER_ROLE',
        'project_member',
        `${id}:${userId}`,
        JSON.stringify({ project: project.name, user: user?.username, role, previousRole: member.role }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    res.status(200).json({
      success: true,
      message: '成员角色更新成功'
    });
  } catch (error) {
    logger.error('更新项目成员角色时出错:', error);
    res.status(500).json({
      success: false,
      message: '更新成员角色失败'
    });
  }
}));

/**
 * DELETE /api/projects/:id/members/:userId
 * 从项目中移除成员
 */
router.delete('/:id/members/:userId', asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  try {
    const db = await getDb();
    
    // 检查项目是否存在
    const project = await db.get(
      'SELECT id, name FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    // 检查权限：只有管理员或项目所有者可以移除成员
    if (req.user.role !== 'admin') {
      const membership = await db.get(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, req.user.id]
      );

      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: '无权移除项目成员'
        });
      }
    }

    // 检查成员是否存在
    const member = await db.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: '用户不是项目成员'
      });
    }

    // 防止所有者移除自己
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能从项目中移除自己'
      });
    }

    // 检查是否是最后一个所有者
    if (member.role === 'owner') {
      const ownerCount = await db.get(
        'SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND role = "owner"',
        [id]
      );

      if (ownerCount.count <= 1) {
        return res.status(400).json({
          success: false,
          message: '不能移除最后一个项目所有者'
        });
      }
    }

    // 从项目中移除成员
    await db.run(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    // 获取用户信息用于日志
    const user = await db.get(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );

    // 记录操作日志
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'REMOVE_MEMBER',
        'project_member',
        `${id}:${userId}`,
        JSON.stringify({ project: project.name, user: user?.username, role: member.role }),
        req.ip,
        req.headers['user-agent']
      ]
    );

    res.status(200).json({
      success: true,
      message: '成员移除成功'
    });
  } catch (error) {
    logger.error('移除项目成员时出错:', error);
    res.status(500).json({
      success: false,
      message: '移除项目成员失败'
    });
  }
}));

export default router;
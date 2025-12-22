/**
 * 认证中间件
 * 
 * 负责JWT令牌验证、用户认证和权限检查
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import jwt from 'jsonwebtoken';
import { dbGet } from '../utils/dbHelper.js';
import { logger } from '../utils/logger.js';

/**
 * JWT认证中间件
 * 验证请求头中的JWT令牌，并将用户信息添加到请求对象
 */
export async function authMiddleware(req, res, next) {
  try {
    // 获取令牌
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: '认证令牌缺失，请重新登录' });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    
    // 从数据库获取用户信息
    const user = await dbGet(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ message: '用户不存在，请重新登录' });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: '用户账户已被禁用' });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '认证令牌已过期，请重新登录' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '无效的认证令牌' });
    } else {
      logger.error('认证中间件错误:', error);
      return res.status(500).json({ message: '服务器认证错误' });
    }
  }
}

/**
 * 角色权限检查中间件
 * @param {string|Array} allowedRoles - 允许的角色或角色数组
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '未认证，请先登录' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足，无法访问该资源' });
    }

    next();
  };
}

/**
 * 管理员权限检查中间件
 */
export const requireAdmin = requireRole('admin');

/**
 * Docker Registry API认证中间件
 * 用于处理Docker客户端的认证请求，支持Basic认证和令牌认证
 */
export async function dockerAuthMiddleware(req, res, next) {
  // Docker Registry API的特殊认证逻辑
  // 根据Docker Registry API规范处理认证
  
  // 如果是令牌服务请求
  if (req.path === '/token') {
    return handleTokenService(req, res);
  }
  
  // 其他Docker Registry API的认证处理
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      errors: [{ code: 'UNAUTHORIZED', message: '认证信息缺失', detail: null }]
    });
  }

  // Basic认证处理
  if (authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
        const [username, password] = credentials.split(':');
        
        // 验证用户凭据
        const user = await dbGet(
          'SELECT id, username, password, role, is_active FROM users WHERE username = ?',
          [username]
        );

      if (!user) {
        return res.status(401).json({
          errors: [{ code: 'UNAUTHORIZED', message: '用户名或密码错误', detail: null }]
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          errors: [{ code: 'UNAUTHORIZED', message: '账户已被禁用', detail: null }]
        });
      }

      // 验证密码
      const bcrypt = await import('bcryptjs');
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({
          errors: [{ code: 'UNAUTHORIZED', message: '用户名或密码错误', detail: null }]
        });
      }

      // 将用户信息添加到请求对象
      req.user = user;
      req.dockerAuth = { type: 'basic', user };
      
      return next();
    } catch (error) {
      logger.error('Docker Basic认证错误:', error);
      return res.status(401).json({
        errors: [{ code: 'UNAUTHORIZED', message: '认证处理失败', detail: null }]
      });
    }
  }
  
  // Bearer令牌认证处理
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
      
      const user = await dbGet(
        'SELECT id, username, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (!user || !user.is_active) {
        return res.status(401).json({
          errors: [{ code: 'UNAUTHORIZED', message: '无效的认证令牌', detail: null }]
        });
      }

      req.user = user;
      req.dockerAuth = { type: 'bearer', user };
      
      return next();
    } catch (error) {
      return res.status(401).json({
        errors: [{ code: 'UNAUTHORIZED', message: '无效的认证令牌', detail: null }]
      });
    }
  }

  // 不支持的认证方式
  return res.status(401).json({
    errors: [{ code: 'UNAUTHORIZED', message: '不支持的认证方式', detail: null }]
  });
}

/**
 * 处理Docker令牌服务请求
 */
async function handleTokenService(req, res) {
  try {
    // 根据Docker Registry API规范处理令牌请求
    const { service, scope } = req.query;
    
    if (!service) {
      return res.status(400).json({
        errors: [{ code: 'INVALID_REQUEST', message: '缺少service参数', detail: null }]
      });
    }

    // 这里应该解析scope并检查权限，简化实现
    
    // 从Basic认证或已有认证获取用户信息
    let user = req.user;
    if (!user && req.headers.authorization?.startsWith('Basic ')) {
      const credentials = Buffer.from(req.headers.authorization.slice(6), 'base64').toString();
      const [username] = credentials.split(':');
      user = await dbGet('SELECT id, username, role FROM users WHERE username = ?', [username]);
    }

    if (!user) {
      return res.status(401).json({
        errors: [{ code: 'UNAUTHORIZED', message: '用户认证失败', detail: null }]
      });
    }

    // 生成访问令牌
    const token = jwt.sign(
      { 
        sub: user.username,
        iss: 'idocker-registry',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1小时过期
        access: [{ type: 'registry', name: service, actions: ['*'] }] // 简化权限
      },
      process.env.JWT_SECRET || 'default_secret_key'
    );

    return res.status(200).json({
      token: token,
      expires_in: 3600,
      issued_at: Math.floor(Date.now() / 1000)
    });
  } catch (error) {
    logger.error('令牌服务错误:', error);
    return res.status(500).json({
      errors: [{ code: 'INTERNAL_ERROR', message: '令牌服务错误', detail: null }]
    });
  }
}

/**
 * 项目权限检查中间件
 * 检查用户是否有权限访问特定项目的资源
 */
export async function requireProjectPermission(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    
    if (!projectId) {
      return res.status(400).json({ message: '缺少项目ID参数' });
    }

    // 管理员可以访问所有项目
    if (req.user.role === 'admin') {
      return next();
    }

    const membership = await dbGet(
      `SELECT p.id, p.name, pm.role as member_role
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = ? AND pm.user_id = ? AND p.is_active = 1`,
      [projectId, req.user.id]
    );

    if (!membership) {
      return res.status(403).json({ message: '无权访问该项目' });
    }

    // 将项目信息添加到请求对象
    req.project = membership;
    next();
  } catch (error) {
    logger.error('项目权限检查错误:', error);
    return res.status(500).json({ message: '权限检查失败' });
  }
}
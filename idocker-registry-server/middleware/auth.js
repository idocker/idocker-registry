/**
 * Authentication Middleware
 *
 * Responsible for JWT token verification, user authentication and permission checks
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { logger } from '../utils/logger.js';
import { AuthService } from '../services/authService.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token from request header and adds user info to request object
 */
export async function authMiddleware(req, res, next) {
  try {
    // Get token
    const token = AuthService.extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing, please login again' });
    }

    // Validate token and get user
    const user = await AuthService.validateToken(token);

    if (!user) {
      return res.status(401).json({ message: 'Authentication failed, please login again' });
    }

    // Add user info to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({ message: 'Server authentication error' });
  }
}

/**
 * Role Permission Check Middleware
 * @param {string|Array} allowedRoles - Allowed role or role array
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated, please login' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permission to access this resource' });
    }

    next();
  };
}

/**
 * Admin Permission Check Middleware
 */
//export const requireAdmin = requireRole('admin');

/**
 * Docker Registry API Authentication Middleware
 * Handles Docker client authentication requests, supports Basic and Token authentication
 */
export async function dockerAuthMiddleware(req, res, next) {
  // Docker Registry API special authentication logic
  // Process authentication according to Docker Registry API specification

  logger.info(`Docker registry authentication request ${req.path} ${req.originalUrl}`);

  // If token service request
  if (req.path === '/token') {
    return handleTokenService(req, res);
  }

  // Other Docker Registry API authentication handling
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
    return res.status(401).json({
      errors: [{ code: 'UNAUTHORIZED', message: 'Authentication information missing', detail: null }]
    });
  }

  // Basic authentication handling
  const basicAuth = AuthService.extractBasicAuth(authHeader);
  if (basicAuth) {
    try {
      // Verify user credentials
      const user = await AuthService.verifyUser(basicAuth.username, basicAuth.password);

      if (!user) {
        res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
        return res.status(401).json({
          errors: [{ code: 'UNAUTHORIZED', message: 'Username or password incorrect', detail: null }]
        });
      }

      // Add user info to request object
      req.user = user;
      req.dockerAuth = { type: 'basic', user };

      return next();
    } catch (error) {
      logger.error('Docker Basic authentication error:', error);
      res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
      return res.status(401).json({
        errors: [{ code: 'UNAUTHORIZED', message: 'Authentication processing failed', detail: null }]
      });
    }
  }

  // Bearer token authentication handling
  const token = AuthService.extractBearerToken(authHeader);
  if (token) {
    try {
      const user = await AuthService.validateToken(token);

      if (!user) {
        res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
        return res.status(401).json({
          errors: [{ code: 'UNAUTHORIZED', message: 'Invalid authentication token', detail: null }]
        });
      }

      req.user = user;
      req.dockerAuth = { type: 'bearer', user };

      return next();
    } catch (error) {
      logger.error('Docker Bearer authentication error:', error);
      res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
      return res.status(401).json({
        errors: [{ code: 'UNAUTHORIZED', message: 'Invalid authentication token', detail: null }]
      });
    }
  }

  // Unsupported authentication method
  res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
  return res.status(401).json({
    errors: [{ code: 'UNAUTHORIZED', message: 'Unsupported authentication method', detail: null }]
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

    // 从Basic认证或已有认证获取用户信息
    let user = req.user;
    if (!user && req.headers.authorization) {
      const basicAuth = AuthService.extractBasicAuth(req.headers.authorization);
      if (basicAuth) {
        user = await AuthService.verifyUser(basicAuth.username, basicAuth.password);
      }
    }

    if (!user) {
      return res.status(401).json({
        errors: [{ code: 'UNAUTHORIZED', message: '用户认证失败', detail: null }]
      });
    }

    // 解析scope并检查权限 (简化实现)
    let scopes = [];
    if (scope) {
      // scope格式: repository:name:action1,action2
      // 这里简化处理，实际应用中需要解析并验证权限
      scopes = [{ type: 'repository', name: service, actions: ['push', 'pull'] }];
    }

    // 生成Docker Registry访问令牌
    const token = AuthService.generateDockerToken(user, service, scopes);

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
 * 管理员权限检查中间件
 * 检查用户是否为管理员
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '请先登录' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    next();
  } catch (error) {
    logger.error('管理员权限检查错误:', error);
    return res.status(500).json({ message: '权限检查失败' });
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
      `SELECT p.id, p.name
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
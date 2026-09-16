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

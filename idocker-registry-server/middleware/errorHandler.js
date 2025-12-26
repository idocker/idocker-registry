/**
 * 错误处理中间件
 * 
 * 统一处理应用程序中的错误，记录日志并返回适当的错误响应
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { logger } from '../utils/logger.js';

/**
 * 全局错误处理中间件
 * 捕获应用程序中的所有错误，记录日志并返回标准化的错误响应
 */
export function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('应用程序错误:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id
  });

  // 如果响应已经发送，则交给默认的错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 数据库错误
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: '数据已存在，违反唯一性约束',
      error: 'UNIQUE_VIOLATION'
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({
      success: false,
      message: '数据关联错误，可能存在依赖关系',
      error: 'FOREIGN_KEY_VIOLATION'
    });
  }

  // 数据验证错误
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌无效',
      error: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌已过期',
      error: 'TOKEN_EXPIRED'
    });
  }

  // 自定义应用错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.errorCode || 'APPLICATION_ERROR'
    });
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    error: 'INTERNAL_SERVER_ERROR'
  });
}

/**
 * 404错误处理中间件
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`,
    error: 'NOT_FOUND'
  });
}

/**
 * 异步错误捕获包装器
 * 用于包装异步路由处理函数，自动捕获Promise拒绝
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 自定义错误类
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'APPLICATION_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}
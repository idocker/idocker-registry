/**
 * 日志工具模块
 * 
 * 基于Winston实现的日志记录工具，支持不同级别的日志输出和文件存储
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');


const logsLevel = process.env.LOG_LEVEL || 'info';
const logsDir = process.env.LOG_DIR || path.join(projectRoot, '../logs');

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// 日志颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// 文件日志格式（不包含颜色）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// 创建传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: format,
    level: logsLevel
  }),
  
  // 错误日志文件
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // 组合日志文件
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// 创建日志器
export const logger = winston.createLogger({
  level: logsLevel,
  levels,
  format: winston.format.json(),
  defaultMeta: { service: 'idocker-registry' },
  transports,
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  // 处理未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

/**
 * 创建带有用户信息和操作类型的日志记录器
 * @param {Object} user - 用户对象
 * @param {string} operation - 操作类型
 * @param {Object} additional - 额外信息
 */
export function createAuditLogger(user, operation, additional = {}) {
  return {
    error: (message, meta = {}) => {
      logger.error(message, {
        user: user?.id || 'anonymous',
        username: user?.username || 'anonymous',
        operation,
        ...additional,
        ...meta
      });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, {
        user: user?.id || 'anonymous',
        username: user?.username || 'anonymous',
        operation,
        ...additional,
        ...meta
      });
    },
    info: (message, meta = {}) => {
      logger.info(message, {
        user: user?.id || 'anonymous',
        username: user?.username || 'anonymous',
        operation,
        ...additional,
        ...meta
      });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, {
        user: user?.id || 'anonymous',
        username: user?.username || 'anonymous',
        operation,
        ...additional,
        ...meta
      });
    }
  };
}

/**
 * 记录API请求日志
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {number} responseTime - 响应时间（毫秒）
 */
export function logApiRequest(req, res, responseTime) {
  const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
  logger[logLevel](`HTTP ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    username: req.user?.username
  });
}

/**
 * 记录Docker Registry API请求
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Object} registry - Registry配置
 */
export function logDockerApiRequest(req, res, registry) {
  const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
  logger[logLevel](`Docker API ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    registryName: registry.name,
    registryUrl: registry.url,
    statusCode: res.statusCode,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    username: req.user?.username,
    dockerAuthType: req.dockerAuth?.type
  });
}

export default logger;
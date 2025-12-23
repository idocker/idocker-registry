/**
 * IDocker Registry 服务端应用程序入口文件
 * 
 * 负责启动Express服务器，配置中间件，路由和错误处理
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

// 导入自定义模块
import { initDatabase } from './config/database.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// 导入路由
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import repositoryRoutes from './routes/repository.js';
import auditRoutes from './routes/audit.js';
import dockerRegistryRoutes from './routes/dockerRegistry.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8031;

// 配置请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: { message: '请求过于频繁，请稍后再试' }
});

// 配置中间件
app.use(helmet({
  contentSecurityPolicy: false, // 禁用CSP以兼容Docker Registry API
}));
app.use(cors({
  origin: process.env.UI_URL || 'http://localhost:8030',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/repository', authMiddleware, repositoryRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/v2', authMiddleware, dockerRegistryRoutes); // Docker Repository API兼容端点

// 静态文件服务（如果需要）
app.use(express.static('public'));

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    logger.info('数据库初始化完成');

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`IDocker Registry 服务器已启动，端口: ${PORT}`);
      logger.info(`API文档地址: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭服务器...');
  process.exit(0);
});

startServer();
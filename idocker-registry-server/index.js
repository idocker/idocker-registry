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
import path from 'path';

// 导入路由
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import repositoryRoutes from './routes/repository.js';
import auditRoutes from './routes/audit.js';
import syncRoutes from './routes/sync.js';
import dockerRegistryRoutes from './routes/dockerRegistry.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// 配置请求限制（排除 /v2 Docker Registry API 路径）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 提高限制以支持 Docker push 操作
  skip: (req) => req.path.startsWith('/v2'), // 跳过 Docker Registry API 的请求限制
  message: { message: '请求过于频繁，请稍后再试' }
});

// 配置中间件
app.use(helmet({
  contentSecurityPolicy: false, // 禁用CSP以兼容Docker Registry API
}));

// CORS 配置：生产环境（容器内）不需要跨域
if (process.env.NODE_ENV === 'production') {
  app.use(cors());
} else {
  app.use(cors({
    origin: process.env.UI_URL || 'http://localhost:8030',
    credentials: true
  }));
}

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
app.use('/api/sync', authMiddleware, syncRoutes);
app.use('/v2', dockerRegistryRoutes); // Docker Repository API兼容端点

// 静态文件服务（Vue UI 构建产物）
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

// 错误处理中间件
app.use(errorHandler);

// SPA fallback - 所有非 API 和 /v2 路由返回 index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/v2')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  } else {
    next();
  }
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
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
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
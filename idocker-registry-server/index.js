/**
 * IDocker Registry Server Initialization file
 * 
 * Starts the Express server and initializes the middleware&routes&errorHandler
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

// import database config and middleware
import { initDatabase } from './config/database.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';


// import routes module
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import repositoryRoutes from './routes/repository.js';
import auditRoutes from './routes/audit.js';
import syncRoutes from './routes/sync.js';
import dockerRegistryRoutes from './routes/dockerRegistry.js';
import * as constants from './config/constant.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || constants.PORT;

// Setting Limit for request (exclude /v2 Docker Registry API path)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  // 1000 requests per 15 minutes for support Docker push operation
  max: 1000, 
  // Ignore requests from Docker Registry API
  skip: (req) => req.path.startsWith('/v2'), 
  message: { message: 'Too many requests, please try again later.' }
});

// Security Settings
app.use(helmet({
  // Disable contentSecurityPolicy to allow Docker Registry API
  contentSecurityPolicy: false, 
}));

// CORS Setting 
if (process.env.NODE_ENV === 'production') {
  app.use(cors());
} else {
  app.use(cors({
    origin: process.env.IDOCKER_REGISTRY_UI_URL || constants.IDOCKER_REGISTRY_URL,
    credentials: true
  }));
}

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  if (res.statusCode !== 200){
    logger.error(`${req.method} ${req.path} - IP: ${req.ip}`);
  }
  next();
});

// Endpoint for health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create Docker Registry proxy
const dockerRegistryProxy = createProxyMiddleware({
  target: process.env.DOCKER_REGISTRY_URL || constants.DOCKER_REGISTRY_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/v2': '/v2', // Keep /v2 path
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log the proxy request
    logger.info(`Proxying Docker Registry request: ${req.method} ${req.path}`);
    
    // Add authentication for internal registry (if needed)
    // For internal registry, no authentication is needed
    
    // Store start time for logging
    req.startTime = Date.now();
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log the proxy response
    const responseTime = Date.now() - (req.startTime || Date.now());
    logger.info(`Docker Registry proxy response: ${req.method} ${req.path} - Status: ${proxyRes.statusCode} - Time: ${responseTime}ms`);
    
    // If we have user information and permission info, log the operation result
    if (req.user && req.dockerPermission) {
      // Extract action and repository from request
      const { repositoryName, action } = extractDockerOperationInfo(req);
      
      if (repositoryName && action) {
        // Log the operation result
        const status = proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 ? 'success' : 'error';
        
        // Import asynchronously but don't use await here
        import('./services/dockerLogService.js').then(({ DockerLogService }) => {
          DockerLogService.logOperation({
            userId: req.user.id,
            username: req.user.username,
            action,
            repository: repositoryName,
            status,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            additionalData: {
              responseTime,
              statusCode: proxyRes.statusCode
            }
          }).catch(error => {
            logger.error('Failed to log Docker operation result:', error);
          });
        }).catch(error => {
          logger.error('Failed to import DockerLogService:', error);
        });
      }
    }
  },
  onError: (err, req, res) => {
    logger.error(`Docker Registry proxy error for ${req.method} ${req.path}:`, err);
    
    // If we have user information and permission info, log the error
    if (req.user && req.dockerPermission) {
      const { repositoryName, action } = extractDockerOperationInfo(req);
      
      if (repositoryName && action) {
        // Import asynchronously but don't use await here
        import('./services/dockerLogService.js').then(({ DockerLogService }) => {
          DockerLogService.logOperation({
            userId: req.user.id,
            username: req.user.username,
            action,
            repository: repositoryName,
            status: 'error',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            errorMessage: err.message
          }).catch(error => {
            logger.error('Failed to log Docker operation error:', error);
          });
        }).catch(error => {
          logger.error('Failed to import DockerLogService:', error);
        });
      }
    }
    
    res.status(502).json({
      errors: [{ code: 'UNAVAILABLE', message: 'Docker Registry service unavailable', detail: null }]
    });
  }
});

// Extract Docker operation info from request
function extractDockerOperationInfo(req) {
  try {
    const pathParts = req.path.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 2 || pathParts[0] !== 'v2') {
      return { repositoryName: null, action: null };
    }
    
    // Find API segment to determine the end of repository name
    let nameEndIndex = 1;
    for (let i = 1; i < pathParts.length; i++) {
      if (['manifests', 'blobs', 'tags'].includes(pathParts[i])) {
        nameEndIndex = i;
        break;
      }
    }
    
    if (nameEndIndex > 1) {
      const repositoryName = pathParts.slice(1, nameEndIndex).join('/');
      
      // Determine action based on HTTP method and API segment
      const apiSegment = pathParts[nameEndIndex];
      let action = null;
      
      if (apiSegment === 'manifests') {
        if (req.method === 'GET') {
          action = 'pull';
        } else if (req.method === 'PUT') {
          action = 'push';
        } else if (req.method === 'DELETE') {
          action = 'delete';
        }
      } else if (apiSegment === 'blobs') {
        if (pathParts[nameEndIndex + 1] === 'uploads') {
          if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
            action = 'push';
          }
        } else {
          if (req.method === 'GET') {
            action = 'pull';
          }
        }
      } else if (apiSegment === 'tags') {
        if (req.method === 'GET') {
          action = 'pull';
        }
      }
      
      return { repositoryName, action };
    }
    
    return { repositoryName: null, action: null };
  } catch (error) {
    logger.error('Error extracting Docker operation info:', error);
    return { repositoryName: null, action: null };
  }
}

// First, specific routes that need custom handling
app.use('/v2', dockerRegistryRoutes); // Docker Repository API兼容端点 (for token service, etc.)

// Then Docker Registry proxy (will handle requests not handled by custom routes)
app.use('/v2', dockerRegistryProxy); // Docker Registry代理到内部Registry

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/repository', authMiddleware, repositoryRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/sync', authMiddleware, syncRoutes);


// Static file server for Vue UI build output
const publicPath = path.resolve(__dirname, 'public');
logger.info('IDocker Registry Server starting ...');
app.use(express.static(publicPath));

// Middleware to handle 404 errors
app.use(errorHandler);

// SPA fallback - Allow all non-API and /v2 routes to return index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/v2')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  } else {
    next();
  }
});

// Initialize server and start listening
async function startServer() {
  try {
    // Initialize database
    await initDatabase();

    // Start server
    app.listen(PORT, () => {
      logger.info(`IDocker Registry Server started on port: ${PORT}`);
      //logger.info(`Environment: ${process.env.NODE_ENV || constants.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

// Shut down server gracefully on SIGTERM signal
process.on('SIGTERM', () => {
  logger.info('Server received SIGTERM signal, shutting down ...');
  process.exit(0);
});


startServer();
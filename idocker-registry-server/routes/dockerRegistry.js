/**
 * Docker Registry API Routes
 *
 * Implements Docker Registry API v2 specification interfaces, compatible with Docker client operations
 * Provides complete API functionality for image repositories, including authentication, permission control, and operation logging
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logDockerApiRequest, logger } from '../utils/logger.js';
import { DockerAuthzService } from '../services/dockerAuthzService.js';
import { DockerLogService } from '../services/dockerLogService.js';
import dockerRegistryService from '../services/dockerRegistryService.js';
import { AuthService } from '../services/authService.js';
import { extractRepositoryAndAction, generateAuthChallenge, generateDockerError } from '../utils/dockerUtils.js';

const router = express.Router();

// Docker Registry API authentication middleware (with /v2/ public access exception)
router.use(async (req, res, next) => {
  // GET /v2/ is a public endpoint for API version check
  if (req.method === 'GET' && (req.path === '/' || req.path === '')) {
    return next();
  }
  
  // Handle token service request
  if (req.path === '/token') {
    return handleTokenService(req, res);
  }
  
  // For Docker client operations (push/pull), we need to authenticate
  // For simplicity and better Docker client compatibility, we'll use a middleware approach
  // that authenticates but then lets the proxy handle the actual request
  
  try {
    // Check if authentication is provided
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // For push/pull operations, return auth challenge
      return generateAuthChallenge(res, 'Authentication information missing');
    }
    
    // Handle Basic authentication
    if (authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
      const [username, password] = credentials.split(':');
      
      // Validate credentials against user database
      const { AuthService } = await import('../services/authService.js');
      const user = await AuthService.verifyUser(username, password);
      
      if (!user) {
        return generateAuthChallenge(res, 'Invalid username or password');
      }
      
      req.user = user;
      req.dockerAuth = { type: 'basic', user: req.user };
      
      // Continue with the request
      return next();
    }
    
    // Handle Bearer token authentication
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { AuthService } = await import('../services/authService.js');
      const user = await AuthService.validateToken(token);
      
      if (!user) {
        return generateAuthChallenge(res, 'Invalid authentication token');
      }
      
      req.user = user;
      req.dockerAuth = { type: 'bearer', user: req.user };
      
      // Continue with the request
      return next();
    }
    
    // For unsupported auth methods
    return generateAuthChallenge(res, 'Unsupported authentication method');
  } catch (error) {
    logger.error('Docker Registry authentication error:', error);
    return generateDockerError(res, 500, 'INTERNAL_ERROR', 'Authentication processing failed');
  }
});

// Docker Registry permission validation middleware
router.use(async (req, res, next) => {
  // Skip permission check for /v2/ endpoint
  if (req.path === '/' || req.path === '') {
    return next();
  }
  
  // Skip permission check for token service
  if (req.path === '/token') {
    return next();
  }
  
  try {
    // Extract repository name and action from the request
    const { repositoryName, action } = extractRepositoryAndAction(req);
    
    if (!repositoryName) {
      // If we can't extract a repository name, proceed without permission check
      // This might be the case for some API endpoints that don't involve repositories
      return next();
    }
    
    // Check if the user has permission for this action on this repository
    const authResult = await DockerAuthzService.checkRepositoryPermission(
      req.user,
      repositoryName,
      action
    );
    
    if (!authResult.allowed) {
      // Log the failed authorization attempt
      await DockerLogService.logOperation({
        userId: req.user.id,
        username: req.user.username,
        action,
        repository: repositoryName,
        status: 'unauthorized',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        errorMessage: authResult.reason
      });
      
      return generateDockerError(res, 403, 'DENIED', authResult.reason);
    }
    
    // Store permission info in the request for later use
    req.dockerPermission = authResult;
    
    // Log the successful authorization
    await DockerLogService.logOperation({
      userId: req.user.id,
      username: req.user.username,
      action,
      repository: repositoryName,
      status: 'authorized',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      additionalData: {
        projectId: authResult.projectId,
        projectName: authResult.projectName,
        isNewRepository: authResult.isNewRepository || false
      }
    });
    
    // Continue with the request
    next();
  } catch (error) {
    logger.error('Error checking Docker permissions:', error);
    return generateDockerError(res, 500, 'INTERNAL_ERROR', 'Permission check failed');
  }
});

// Extract repository name and action from Docker Registry request is now in utils/dockerUtils.js

// Response time logging middleware
router.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logDockerApiRequest(req, res, {});
  });
  next();
});

/**
 * GET /v2/
 * Docker Registry API root endpoint
 * Check API availability and version information
 */
router.get('/', asyncHandler(async (req, res) => {
  res.status(200).json({});
}));

/**
 * POST /v2/<name>/blobs/uploads/
 * Initiate blob upload
 * Create repository if it doesn't exist
 */
router.post('/:name/blobs/uploads/', asyncHandler(async (req, res, next) => {
  try {
    const repositoryName = req.params.name;
    
    // Check if this is a new repository creation
    if (req.dockerPermission && req.dockerPermission.isNewRepository) {
      // Create repository in database
      await dockerRegistryService.createRepositoryIfNotExists(repositoryName, req.user);
    }
    
    // Let the proxy handle the actual request
    // Pass control to the next middleware (proxy)
    next();
  } catch (error) {
    logger.error('Error initiating blob upload:', error);
    return generateDockerError(res, 500, 'INTERNAL_ERROR', 'Failed to initiate blob upload');
  }
}));

/**
 * PUT /v2/<name>/manifests/<reference>
 * Push manifest
 * Create repository if it doesn't exist
 */
router.put('/:name/manifests/:reference', asyncHandler(async (req, res, next) => {
  try {
    const repositoryName = req.params.name;
    
    // Check if this is a new repository creation
    if (req.dockerPermission && req.dockerPermission.isNewRepository) {
      // Create repository in database
      await dockerRegistryService.createRepositoryIfNotExists(repositoryName, req.user);
    }
    
    // Let the proxy handle the actual request
    next();
  } catch (error) {
    logger.error('Error pushing manifest:', error);
    return generateDockerError(res, 500, 'INTERNAL_ERROR', 'Failed to push manifest');
  }
}));

/**
 * Handle token service for authentication
 */
async function handleTokenService(req, res) {
  try {
    const { service, scope } = req.query;
    
    // Extract user from authentication
    let user = null;
    
    if (req.headers.authorization?.startsWith('Basic ')) {
      const basicAuth = AuthService.extractBasicAuth(req.headers.authorization);
      if (basicAuth) {
        user = await AuthService.verifyUser(basicAuth.username, basicAuth.password);
      }
    }
    
    if (!user) {
      return generateAuthChallenge(res, 'Authentication required');
    }
    
    // Parse scope if provided
    let requestedScopes = [];
    if (scope) {
      // Parse scope format: repository:name:action1,action2
      // Multiple scopes can be provided as comma-separated values
      const scopes = scope.split(',');
      
      for (const scopeStr of scopes) {
        const parts = scopeStr.trim().split(':');
        if (parts.length >= 3) {
          const scopeType = parts[0];
          const scopeName = parts.slice(1, -1).join(':');
          const actions = parts[parts.length - 1].split(',');
          
          if (scopeType === 'repository') {
            requestedScopes.push({
              type: 'repository',
              name: scopeName,
              actions: actions
            });
          }
        }
      }
    }
    
    // Validate scopes and generate token
    const token = await DockerAuthzService.generateDockerToken(user, service, requestedScopes);
    
    // Log token issuance
    await DockerLogService.logOperation({
      userId: user.id,
      username: user.username,
      action: 'token',
      repository: 'registry',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      additionalData: {
        service,
        scopes: requestedScopes
      }
    });

    return res.status(200).json({
      token: token,
      expires_in: 3600,
      issued_at: Math.floor(Date.now() / 1000)
    });
  } catch (error) {
    logger.error('Token service error:', error);
    return generateDockerError(res, 500, 'INTERNAL_ERROR', 'Token service error');
  }
}

export default router;
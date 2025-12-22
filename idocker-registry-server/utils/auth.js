import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Project from '../models/Project.js';

const JWT_SECRET = process.env.JWT_SECRET || 'idocker-registry-secret';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication server error' });
    }
  }
};

export const authorize = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admins have access to everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check user permissions for the specific resource and action
    try {
      // For now, we'll implement basic permission checks
      // This can be extended to use a more sophisticated RBAC system
      
      // Registry permissions
      if (resource === 'registry') {
        if (['read'].includes(action)) {
          // All authenticated users can read registry content
          return next();
        }
        
        if (['delete'].includes(action)) {
          // Only admins can delete registry content for now
          return res.status(403).json({ error: 'Insufficient permissions to delete registry content' });
        }
      }
      
      // Default deny
      return res.status(403).json({ error: 'Insufficient permissions' });
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

export const checkProjectPermission = (requiredPermission = 'read') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // 管理员有所有权限
      if (req.user.role === 'admin') {
        return next();
      }
      
      const projectId = req.params.id || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      // 检查用户是否有项目权限
      const hasPermission = await Project.checkPermission(
        projectId, 
        req.user.id, 
        requiredPermission
      );
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient project permissions' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};
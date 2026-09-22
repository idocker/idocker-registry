/**
 * Authentication Service
 *
 * Centralized authentication logic to reduce code duplication across middleware and routes
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthModel } from '../models/AuthModel.js';
import { logger } from '../utils/logger.js';
import * as env from '../config/env.js';
import { getJwtSecret } from '../config/jwtSecret.js';

export class AuthService {
  /**
   * Verify user credentials
   * @param {string} username - Username to verify
   * @param {string} password - Password to verify
   * @returns {Object|null} User object if valid, null otherwise
   */
  static async verifyUser(username, password) {
    try {
      // Get user from database using AuthModel
      const authModel = new AuthModel();
      const user = await authModel.getUserByUsernameForAuth(username, true);

      if (!user || !user.is_active) {
        return null;
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return null;
      }

      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('Error verifying user credentials:', error);
      return null;
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @param {string} expiresIn - Token expiration time (optional)
   * @returns {string} JWT token
   */
  static generateToken(user, expiresIn = null) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const options = {
      expiresIn: env.JWT_EXPIRES_IN
    };

    return jwt.sign(payload, getJwtSecret(), options);
  }

  /**
   * Generate Docker Registry token
   * @param {Object} user - User object
   * @param {string} service - Service name
   * @param {Array} scopes - Permission scopes (optional)
   * @returns {string} JWT token for Docker Registry
   */
  static generateDockerToken(user, service, scopes = null) {
    const payload = {
      sub: user.username,
      iss: 'idocker-registry',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      access: scopes || [{ type: 'registry', name: service, actions: ['*'] }]
    };

    return jwt.sign(payload, getJwtSecret());
  }

  /**
   * Validate JWT token and return user info
   * @param {string} token - JWT token to validate
   * @returns {Object|null} User object if valid, null otherwise
   */
  static async validateToken(token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      
      // Get user info from database using AuthModel
      const authModel = new AuthModel();
      const user = await authModel.getUserByIdForAuth(decoded.userId);

      if (!user || !user.is_active) {
        return null;
      }

      return user;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid token');
      } else {
        logger.error('Error validating token:', error);
      }
      return null;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @param {number} saltRounds - Number of salt rounds (optional)
   * @returns {string} Hashed password
   */
  static async hashPassword(password, saltRounds = 10) {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare plain password with hashed password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {boolean} True if passwords match
   */
  static async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Error comparing passwords:', error);
      return false;
    }
  }

  /**
   * Extract user info from Basic auth header
   * @param {string} authHeader - Authorization header value
   * @returns {Object|null} Object with username and password if valid, null otherwise
   */
  static extractBasicAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }

    try {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
      const [username, password] = credentials.split(':');
      
      if (!username || !password) {
        return null;
      }

      return { username, password };
    } catch (error) {
      logger.error('Error extracting Basic auth credentials:', error);
      return null;
    }
  }

  /**
   * Extract token from Bearer auth header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Token if valid, null otherwise
   */
  static extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.split(' ')[1];
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @param {boolean} includePassword - Whether to include password in result
   * @returns {Object|null} User object if found, null otherwise
   */
  static async getUserById(userId, includePassword = false) {
    try {
      const authModel = new AuthModel();
      return await authModel.getUserByIdForAuth(userId, includePassword);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @param {boolean} includePassword - Whether to include password in result
   * @returns {Object|null} User object if found, null otherwise
   */
  static async getUserByUsername(username, includePassword = false) {
    try {
      const authModel = new AuthModel();
      return await authModel.getUserByUsernameForAuth(username, includePassword);
    } catch (error) {
      logger.error('Error getting user by username:', error);
      return null;
    }
  }

  /**
   * Check if username exists
   * @param {string} username - Username to check
   * @returns {boolean} True if username exists
   */
  static async usernameExists(username) {
    try {
      const authModel = new AuthModel();
      return await authModel.usernameExists(username);
    } catch (error) {
      logger.error('Error checking if username exists:', error);
      return false;
    }
  }
}
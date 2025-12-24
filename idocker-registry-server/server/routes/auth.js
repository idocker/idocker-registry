/**
 * Authentication Routes Module
 *
 * Handles user login, logout, registration, and other authentication operations
 * Supports JWT token authentication and LDAP integration
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthModel } from '../models/AuthModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { success, error } from '../utils/apiResponse.js';

const router = express.Router();
const authModel = new AuthModel();
const auditModel = new AuditModel();

/**
 * POST /api/auth/login
 * User login
 * Validate user credentials and return JWT token
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json(error('Username and password cannot be empty', 400));
    }

    try {
        // Get user information from database
        const user = await authModel.findByUsernameWithPassword(username);

        if (!user) {
            return res.status(401).json(error('Invalid username or password', 401));
        }

        if (!user.is_active) {
            return res.status(401).json(error('User account has been disabled, please contact administrator', 401));
        }

        // Verify password
        const passwordMatch = bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json(error('Invalid username or password', 401));
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Log login
        await authModel.logAudit({
            user_id: user.id,
            action: 'LOGIN',
            resource_type: 'user',
            resource_id: user.id.toString(),
            details: { username },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        // Return user information and token
        res.status(200).json(success({
            token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role
                }
        }, 'Login successful'));
    } catch (error) {
        logger.error('Error during login:', error);
        res.status(500).json(error('Internal server error'));
    }
}));

/**
 * POST /api/auth/logout
 * User logout
 * Log logout event, actual token invalidation handled by client
 */
router.post('/logout', asyncHandler(async (req, res) => {
    // Get token from request header
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
            userId = decoded.userId;

            // Log logout
            await authModel.logAudit({
                user_id: userId,
                action: 'LOGOUT',
                resource_type: 'user',
                resource_id: userId?.toString(),
                details: {},
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            });
        } catch (error) {
            // Token invalid, ignore error
        }
    }

    res.status(200).json(success(null, 'Logout successful'));
}));

/**
 * POST /api/auth/register
 * User registration
 * Create new user account (if registration is allowed)
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { username, password, email, fullName } = req.body;

    // Check if registration is allowed
    if (process.env.ALLOW_USER_REGISTRATION !== 'true') {
        return res.status(403).json(error('Registration is disabled, please contact administrator to create account', 403));
    }

    // Validate required fields
    if (!username || !password) {
        return res.status(400).json(error('Username and password cannot be empty', 400));
    }

    // Validate password strength
    if (password.length < 6) {
        return res.status(400).json(error('Password must be at least 6 characters', 400));
    }

    try {
        // Check if username already exists
        const usernameExists = await authModel.isUsernameExists(username);

        if (usernameExists) {
            return res.status(409).json(error('Username already exists', 409, 'UNIQUE_VIOLATION'));
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await authModel.createUser({
            username,
            password: hashedPassword,
            email,
            full_name: fullName,
            role: 'user',
            is_active: 1
        });

        const userId = result.id;

        // Log registration
        await authModel.logAudit({
            user_id: userId,
            action: 'REGISTER',
            resource_type: 'user',
            resource_id: userId.toString(),
            details: { username, email },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.status(201).json(success(null, 'Registration successful, please login with your new account'));
    } catch (error) {
        logger.error('Error during registration:', error);
        res.status(500).json(error('Internal server error'));
    }
}));

/**
 * GET /api/auth/profile
 * Get current user information
 * Requires valid JWT token
 */
router.get('/profile', asyncHandler(async (req, res) => {
    // Get token from request header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(error('Authentication token missing', 401));
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        const user = await authModel.getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json(error('User not found', 401));
        }

        if (!user.is_active) {
            return res.status(401).json(error('User account has been disabled', 401));
        }

        res.status(200).json(success({
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at
        }));
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(error('Invalid authentication token', 401));
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json(error('Authentication token has expired', 401));
        } else {
            logger.error('Error getting user information:', error);
            res.status(500).json(error('Internal server error'));
        }
    }
}));

/**
 * PUT /api/auth/change-password
 * Change password
 * Requires current password and new password
 */
router.put('/change-password', asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
        return res.status(400).json(error('Current password and new password cannot be empty', 400));
    }

    // Validate new password strength
    if (newPassword.length < 6) {
        return res.status(400).json(error('New password must be at least 6 characters', 400));
    }

    // Get token from request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(error('Authentication token missing', 401));
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        const user = await authModel.getUserForPasswordUpdate(decoded.userId);

        if (!user) {
            return res.status(401).json(error('User not found', 401));
        }

        if (!user.is_active) {
            return res.status(401).json(error('User account has been disabled', 401));
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(401).json(error('Current password is incorrect', 401));
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await authModel.updatePassword(user.id, hashedNewPassword);

        // Log password change
        await authModel.logAudit({
            user_id: user.id,
            action: 'CHANGE_PASSWORD',
            resource_type: 'user',
            resource_id: user.id.toString(),
            details: {},
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.status(200).json(success(null, 'Password changed successfully'));
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(error('Invalid authentication token', 401));
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json(error('Authentication token has expired', 401));
        } else {
            logger.error('Error changing password:', error);
            res.status(500).json(error('Internal server error'));
        }
    }
}));

/**
 * GET /api/auth/refresh
 * Refresh token
 * Generate new token using currently valid token
 */
router.get('/refresh', asyncHandler(async (req, res) => {
    // Get token from request header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(error('Authentication token missing', 401));
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        // Check if user is still valid
        const user = await authModel.getUserBasicInfo(decoded.userId);

        if (!user) {
            return res.status(401).json(error('User not found', 401));
        }

        if (!user.is_active) {
            return res.status(401).json(error('User account has been disabled', 401));
        }

        // Generate new token
        const newToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(200).json(success({
            token: newToken
        }, 'Token refreshed successfully'));
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(error('Invalid authentication token', 401));
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json(error('Authentication token has expired, please login again', 401));
        } else {
            logger.error('Error refreshing token:', error);
            res.status(500).json(error('Internal server error'));
        }
    }
}));

export default router;
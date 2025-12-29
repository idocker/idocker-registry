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
import { AuthModel } from '../models/AuthModel.js';
import { AuthService } from '../services/authService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { success, error } from '../utils/apiResponse.js';

const router = express.Router();
const authModel = new AuthModel();

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
        // Verify user credentials
        const user = await AuthService.verifyUser(username, password);

        if (!user) {
            return res.status(401).json(error('Invalid username or password', 401));
        }

        // Generate JWT token
        const token = AuthService.generateToken(user);

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
    const token = AuthService.extractBearerToken(req.headers.authorization);
    let userId = null;

    if (token) {
        try {
            const user = await AuthService.validateToken(token);
            if (user) {
                userId = user.id;

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
            }
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
        const usernameExists = await AuthService.usernameExists(username);

        if (usernameExists) {
            return res.status(409).json(error('Username already exists', 409, 'UNIQUE_VIOLATION'));
        }

        // Hash password
        const hashedPassword = await AuthService.hashPassword(password);

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
    const token = AuthService.extractBearerToken(req.headers.authorization);

    if (!token) {
        return res.status(401).json(error('Authentication token missing', 401));
    }

    try {
        const user = await AuthService.validateToken(token);

        if (!user) {
            return res.status(401).json(error('Invalid authentication token', 401));
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
        logger.error('Error getting user information:', error);
        return res.status(401).json(error('Authentication failed', 401));
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
    const token = AuthService.extractBearerToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json(error('Authentication token missing', 401));
    }

    try {
        const user = await AuthService.validateToken(token);

        if (!user) {
            return res.status(401).json(error('Invalid authentication token', 401));
        }

        // Get user with password for verification
        const userWithPassword = await AuthService.getUserByUsername(user.username, true);
        if (!userWithPassword) {
            return res.status(401).json(error('User not found', 401));
        }

        // Verify current password
        const passwordMatch = await AuthService.comparePassword(currentPassword, userWithPassword.password);
        if (!passwordMatch) {
            return res.status(401).json(error('Current password is incorrect', 401));
        }

        // Hash new password
        const hashedNewPassword = await AuthService.hashPassword(newPassword);

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
        logger.error('Error changing password:', error);
        return res.status(500).json(error('Internal server error'));
    }
}));

/**
 * GET /api/auth/refresh
 * Refresh token
 * Generate new token using currently valid token
 */
router.get('/refresh', asyncHandler(async (req, res) => {
    // Get token from request header
    const token = AuthService.extractBearerToken(req.headers.authorization);

    if (!token) {
        return res.status(401).json(error('Authentication token missing', 401));
    }

    try {
        // Validate current token
        const user = await AuthService.validateToken(token);

        if (!user) {
            return res.status(401).json(error('Invalid authentication token', 401));
        }

        // Generate new token
        const newToken = AuthService.generateToken(user);

        res.status(200).json(success({
            token: newToken
        }, 'Token refreshed successfully'));
    } catch (error) {
        logger.error('Error refreshing token:', error);
        return res.status(401).json(error('Authentication failed', 401));
    }
}));

export default router;
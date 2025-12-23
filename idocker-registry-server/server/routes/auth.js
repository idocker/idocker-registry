/**
 * 认证路由模块
 * 
 * 处理用户登录、登出、注册等认证相关操作
 * 支持JWT令牌认证和LDAP集成
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbGet, dbRun } from '../utils/dbHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * 用户登录
 * 验证用户凭据并返回JWT令牌
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: '用户名和密码不能为空'
        });
    }

    try {
        // 从数据库获取用户信息
        //let user = undefined;
        //let self = this;
        await dbGet(
            'SELECT id, username, password, email, full_name, role, is_active FROM users WHERE username = ?',
            [username]
        ).then(user => {
            //self.user = _user;
            logger.info(user);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }
            logger.info(!user.is_active + "  " + user.is_active)
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: '用户账户已被禁用，请联系管理员'
                });
            }



            // 验证密码
            const passwordMatch = bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            // 生成JWT令牌
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'default_secret_key',
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // 记录登录日志
            dbRun(
                `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.id,
                    'LOGIN',
                    'user',
                    user.id.toString(),
                    JSON.stringify({ username }),
                    req.ip,
                    req.headers['user-agent']
                ]
            );

            // 返回用户信息和令牌
            res.status(200).json({
                success: true,
                message: '登录成功',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        fullName: user.full_name,
                        role: user.role
                    }
                }
            });
        });

    } catch (error) {
        logger.error('登录过程中出错:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
}));

/**
 * POST /api/auth/logout
 * 用户登出
 * 记录登出日志，实际令牌失效由客户端处理
 */
router.post('/logout', asyncHandler(async (req, res) => {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
            userId = decoded.userId;

            // 记录登出日志
            dbRun(
                `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    'LOGOUT',
                    'user',
                    userId?.toString(),
                    '{}',
                    req.ip,
                    req.headers['user-agent']
                ]
            );
        } catch (error) {
            // 令牌无效，忽略错误
        }
    }

    res.status(200).json({
        success: true,
        message: '登出成功'
    });
}));

/**
 * POST /api/auth/register
 * 用户注册
 * 创建新用户账户（如果允许注册）
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { username, password, email, fullName } = req.body;

    // 检查是否允许注册
    if (process.env.ALLOW_USER_REGISTRATION !== 'true') {
        return res.status(403).json({
            success: false,
            message: '注册功能已禁用，请联系管理员创建账户'
        });
    }

    // 验证必填字段
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: '用户名和密码不能为空'
        });
    }

    // 验证密码强度
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: '密码长度不能少于6个字符'
        });
    }

    try {
        // 检查用户名是否已存在
        const existingUser = dbGet(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const result = dbRun(
            `INSERT INTO users (username, password, email, full_name, role, is_active)
       VALUES (?, ?, ?, ?, 'user', 1)`,
            [username, hashedPassword, email, fullName]
        );

        const userId = result.lastInsertRowid;

        // 记录注册日志
        dbRun(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                'REGISTER',
                'user',
                userId.toString(),
                JSON.stringify({ username, email }),
                req.ip,
                req.headers['user-agent']
            ]
        );

        res.status(201).json({
            success: true,
            message: '用户注册成功，请使用新账户登录'
        });
    } catch (error) {
        logger.error('注册过程中出错:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
}));

/**
 * GET /api/auth/profile
 * 获取当前用户信息
 * 需要有效的JWT令牌
 */
router.get('/profile', asyncHandler(async (req, res) => {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: '缺少认证令牌'
        });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        const user = dbGet(
            `SELECT id, username, email, full_name, role, is_active, created_at
       FROM users WHERE id = ?`,
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: '用户账户已被禁用'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                isActive: user.is_active,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '认证令牌已过期'
            });
        } else {
            logger.error('获取用户信息时出错:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }
}));

/**
 * PUT /api/auth/change-password
 * 修改密码
 * 需要当前密码和新密码
 */
router.put('/change-password', asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // 验证必填字段
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: '当前密码和新密码不能为空'
        });
    }

    // 验证新密码强度
    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: '新密码长度不能少于6个字符'
        });
    }

    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: '缺少认证令牌'
        });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        const user = dbGet(
            'SELECT id, password, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: '用户账户已被禁用'
            });
        }

        // 验证当前密码
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: '当前密码不正确'
            });
        }

        // 哈希新密码
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 更新密码
        dbRun(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, user.id]
        );

        // 记录修改密码日志
        dbRun(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id,
                'CHANGE_PASSWORD',
                'user',
                user.id.toString(),
                '{}',
                req.ip,
                req.headers['user-agent']
            ]
        );

        res.status(200).json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '认证令牌已过期'
            });
        } else {
            logger.error('修改密码时出错:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }
}));

/**
 * GET /api/auth/refresh
 * 刷新令牌
 * 使用当前有效的令牌生成新令牌
 */
router.get('/refresh', asyncHandler(async (req, res) => {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: '缺少认证令牌'
        });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        // 检查用户是否仍然有效
        const user = dbGet(
            'SELECT id, username, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: '用户账户已被禁用'
            });
        }

        // 生成新令牌
        const newToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(200).json({
            success: true,
            message: '令牌刷新成功',
            data: {
                token: newToken
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '认证令牌已过期，请重新登录'
            });
        } else {
            logger.error('刷新令牌时出错:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误'
            });
        }
    }
}));

export default router;
/**
 * User Management Routes Module (Refactored)
 *
 * Provides CRUD operations and permission management for users
 * Only administrators can access these endpoints
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { UserModel } from '../models/UserModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { success, error } from '../utils/apiResponse.js';

const userModel = new UserModel();
const projectModel = new ProjectModel();
const router = express.Router();

// All user management endpoints require admin permission
router.use(requireAdmin);

/**
 * GET /api/users
 * Get user list
 * Supports pagination and search
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '' } = req.query;

  try {
    const result = await userModel.getUsersList({ page, limit, search, role });

    res.status(200).json(success(result.data));
  } catch (error) {
    logger.error('Error getting user list:', error);
    res.status(500).json(error('Failed to get user list'));
  }
}));

/**
 * GET /api/users/:id
 * Get specific user details
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const user = await userModel.getUserDetails(id);

    if (!user) {
      return res.status(404).json(error('用户不存在', 404));
    }

    // 获取用户所属项目和权限
    const projects = await userModel.getUserProjects(id);

    res.status(200).json(success({
      ...user,
      projects
    }));
  } catch (error) {
    logger.error('获取用户详情时出错:', error);
    res.status(500).json(error('获取用户详情失败'));
  }
}));

/**
 * POST /api/users
 * Create new user
 */
router.post('/', asyncHandler(async (req, res) => {
  const { username, password, email, fullName, role = 'user' } = req.body;

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json(error('Username and password cannot be empty', 400));
  }

  // Validate role
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json(error('Invalid user role', 400));
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json(error('Password must be at least 6 characters', 400));
  }

  try {
    // Check if username is unique
    const isUsernameUnique = await userModel.isUsernameUnique(username);
    if (!isUsernameUnique) {
      return res.status(409).json(error('Username already exists', 409, 'UNIQUE_VIOLATION'));
    }

    // Check if email is unique (if email provided)
    if (email) {
      const isEmailUnique = await userModel.isEmailUnique(email);
      if (!isEmailUnique) {
        return res.status(409).json(error('Email already exists', 409, 'UNIQUE_VIOLATION'));
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userData = {
      username,
      password: hashedPassword,
      email: email || '',
      full_name: fullName || '',
      role,
      is_active: 1
    };

    const newUser = await userModel.createUser(userData);

    // Return created user information (without password)
    const userDetails = await userModel.getUserDetails(newUser.id);

    res.status(201).json(success(userDetails, 'User created successfully'));
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json(error('Failed to create user'));
  }
}));

/**
 * PUT /api/users/:id
 * Update user information
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, fullName, role, isActive } = req.body;

  // Validate role
  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json(error('Invalid user role', 400));
  }

  try {
    // Check if user exists
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json(error('User not found', 404));
    }

    // Get current user information
    const currentUser = await userModel.findById(id);

    // Prevent admin from changing their own role to regular user (resulting in no admin)
    if (parseInt(id) === req.user.id && role === 'user') {
    return res.status(400).json(error('Cannot change your own role to regular user', 400));
    }

    // Check if email is unique (if updating email)
    if (email && email !== currentUser.email) {
      const isEmailUnique = await userModel.isEmailUnique(email, id);
      if (!isEmailUnique) {
        return res.status(409).json(error('Email already exists', 409, 'UNIQUE_VIOLATION'));
      }
    }

    // Build update data
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.full_name = fullName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(error('No fields provided for update', 400));
    }

    // Update user information
    const result = await userModel.updateUser(id, updateData);

    // Get updated user information
    const updatedUser = await userModel.getUserDetails(id);

    res.status(200).json(success(updatedUser, 'User information updated successfully'));
  } catch (error) {
    logger.error('Error updating user information:', error);
    res.status(500).json(error('Failed to update user information'));
  }
}
}));

/**
 * PUT /api/users/:id/password
 * Reset user password
 */
router.put('/:id/password', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json(error('Password cannot be empty', 400));
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json(error('Password must be at least 6 characters', 400));
  }

  try {
    // Check if user exists
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json(error('User not found', 404));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await userModel.updatePassword(id, hashedPassword);

    res.status(200).json(success(null, 'Password reset successfully'));
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json(error('Failed to reset password'));
  }
}
}));

/**
 * DELETE /api/users/:id
 * Delete user (soft delete)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json(error('User not found', 404));
    }

    // Get current user information
    const user = await userModel.findById(id);

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json(error('Cannot delete your own account', 400));
    }

    // Check if there are other admins (if deleting an admin)
    if (user.role === 'admin') {
      const adminCount = await userModel.getAdminCount();
      if (adminCount <= 1) {
        return res.status(400).json(error('Cannot delete the last admin account', 400));
      }
    }

    // Soft delete user
    await userModel.deleteUser(id);

    res.status(200).json(success(null, 'User deleted successfully'));
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json(error('Failed to delete user'));
  }
}));

/**
 * GET /api/users/:id/projects
 * Get project list for a user
 */
router.get('/:id/projects', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json(error('User not found', 404));
    }

    // Get user projects
    const projects = await userModel.getUserProjects(id);

    res.status(200).json(success({
      user: { id },
      projects
    }));
  } catch (error) {
    logger.error('Error getting user project list:', error);
    res.status(500).json(error('Failed to get user project list'));
  }
}));

/**
 * POST /api/users/:id/projects/:projectId
 * Add user to project
 */
router.post('/:id/projects/:projectId', asyncHandler(async (req, res) => {
  const { id, projectId } = req.params;
  const { role = 'viewer' } = req.body;

  // Validate role
  if (!['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json(error('Invalid project role', 400));
  }

  try {
    // Check if user exists and is active
    const user = await userModel.findById(id);
    if (!user || user.is_active === 0) {
      return res.status(404).json(error('User not found or has been disabled', 404));
    }

    // Check if project exists
    const projectExists = await projectModel.projectExists(projectId);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user is already a project member
    const memberExists = await projectModel.memberExists(projectId, id);
    if (memberExists) {
      return res.status(409).json(error('User is already a project member', 409, 'MEMBER_EXISTS'));
    }

    // Add user to project
    await projectModel.addProjectMember(projectId, id, role);

    res.status(201).json(success(null, 'User added to project'));
  } catch (error) {
    logger.error('Error adding user to project:', error);
    res.status(500).json(error('Failed to add user to project'));
  }
}));

/**
 * DELETE /api/users/:id/projects/:projectId
 * Remove user from project
 */
router.delete('/:id/projects/:projectId', asyncHandler(async (req, res) => {
  const { id, projectId } = req.params;

  try {
    // Check if user exists
    const userExists = await userModel.userExists(id);
    if (!userExists) {
      return res.status(404).json(error('User not found', 404));
    }

    // Check if project exists
    const projectExists = await projectModel.projectExists(projectId);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user is a project member
    const memberExists = await projectModel.memberExists(projectId, id);
    if (!memberExists) {
      return res.status(404).json(error('User is not a project member', 404));
    }

    // Remove user from project
    await projectModel.removeProjectMember(projectId, id);

    res.status(200).json(success(null, 'User removed from project'));
  } catch (error) {
    logger.error('Error removing user from project:', error);
    res.status(500).json(error('Failed to remove user from project'));
  }
}));

export default router;
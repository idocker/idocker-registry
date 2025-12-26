/**
 * Project Management Routes Module (Refactored)
 *
 * Provides CRUD operations and member management for projects
 * Supports project permission control and pagination queries
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { UserModel } from '../models/UserModel.js';
import { paginated, success, error } from '../utils/apiResponse.js';

const projectModel = new ProjectModel();
const userModel = new UserModel();
const router = express.Router();

/**
 * GET /api/projects
 * Get project list
 * Supports pagination and search, returns projects based on user role
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', isActive='all'} = req.query;
  const { id: userId, role: userRole } = req.user;
  //logger.info(`/api/projects isActive:${isActive}`);
  try {
    const result = await projectModel.getProjectsList(userId, userRole, isActive, { page, limit, search });
    //logger.info(`/api/projects result:${JSON.stringify(result)}`)
    // Use unified pagination response format
    res.status(200).json(paginated(
      result.data,
      result.pagination,
      'Project list retrieved successfully'
    ));
  } catch (error) {
    logger.error('Error getting project list:', error);
    res.status(500).json(error('Failed to get project list'));
  }
}));

/**
 * GET /api/projects/all
 * Get all project list
 * Supports pagination and search, returns all projects
 */
router.get('/all', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { isActive='all' ,page = 1, limit = 20, search = '' } = req.query;
  logger.info(`/api/projects/all isActive:${isActive}`);
  try {
    const result = await projectModel.getProjectsAllList(isActive,{ page, limit, search });
    //logger.info(`/api/projects/all result:${JSON.stringify(result)}`);
    res.status(200).json(paginated(
      result.data,
      result.pagination,
      'Project list retrieved successfully'
    ));
  } catch (error) {
    logger.error('Error getting project list:', error);
    res.status(500).json(error('Failed to get project list'));
  }
}));

/**
 * GET /api/projects/:id
 * Get specific project details
 * Check if user has access permission
 */
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user has access permission
    const hasPermission = await projectModel.checkProjectPermission(id, userId, userRole);
    if (!hasPermission) {
      return res.status(403).json(error('No permission to access this project', 403));
    }

    // Get project details
    const project = await projectModel.findById(id);
    if (!project) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Get project member list
    const members = await projectModel.getProjectMembers(id);
    
    // Get project repository count
    const repositoryCount = await projectModel.getProjectRepositoryCount(id);

    res.status(200).json(success({
      ...project,
      members: members || [],
      repositoryCount: repositoryCount.count || 0
    }));
  } catch (error) {
    logger.error('Error getting project details:', error);
    res.status(500).json(error('Failed to get project details'));
  }
}));

/**
 * POST /api/projects
 * Create new project
 * Only administrators can create projects
 */
router.post('/', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, namespace } = req.body;
  const { id: createdBy } = req.user;

  // Validate required fields
  if (!name || !namespace) {
    return res.status(400).json(error('Project name and namespace cannot be empty', 400));
  }

  // Validate namespace format
  if (!/^[a-z0-9-]+$/.test(namespace)) {
    return res.status(400).json(error('Namespace can only contain lowercase letters, numbers, and hyphens', 400));
  }

  try {
    // Check if project name is unique
    const isNameUnique = await projectModel.isProjectNameUnique(name);
    if (!isNameUnique) {
      return res.status(409).json(error('Project name already exists', 409, 'UNIQUE_VIOLATION'));
    }

    // Check if namespace is unique
    const existingNamespace = await projectModel.get(
      'SELECT id FROM projects WHERE namespace = ? AND is_active = 1',
      [namespace]
    );
    if (existingNamespace) {
      return res.status(409).json(error('Namespace already exists', 409, 'UNIQUE_VIOLATION'));
    }

    // Create project data
    const projectData = {
      name,
      description: description || '',
      namespace,
      is_active: 1
    };

    const newProject = await projectModel.createProject(projectData, createdBy);

    // Add creator as project owner
    await projectModel.addProjectMember(newProject.id, createdBy, 'owner');

    // Get project details after creation
    const projectDetails = await projectModel.findById(newProject.id);
    const members = await projectModel.getProjectMembers(newProject.id);

    res.status(201).json(success({
      ...projectDetails,
      members
    }, 'Project created successfully'));
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json(error('Failed to create project'));
  }
}));

/**
 * PUT /api/projects/:id
 * Update project information
 * Requires project owner or admin permission
 */
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;
  const { id: userId, role: userRole } = req.user;

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user has modify permission (admin or project owner)
    let hasPermission = false;
    if (userRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, userId);
    }

    if (!hasPermission) {
      return res.status(403).json(error('No permission to modify this project', 403));
    }

    // Check if project name is unique (if updating name)
    if (name) {
      const isNameUnique = await projectModel.isProjectNameUnique(name, id);
      if (!isNameUnique) {
        return res.status(409).json(error('Project name already exists', 409, 'UNIQUE_VIOLATION'));
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(error('No fields provided for update', 400));
    }

    // Update project information
    const result = await projectModel.updateProject(id, updateData);

    // Get updated project information
    const updatedProject = await projectModel.findById(id);

    res.status(200).json(success(updatedProject, 'Project information updated successfully'));
  } catch (error) {
    logger.error('Error updating project information:', error);
    res.status(500).json(error('Failed to update project information'));
  }
}));

/**
 * DELETE /api/projects/:id
 * Delete project (soft delete)
 * Requires admin permission
 */
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Soft delete project
    await projectModel.deleteProject(id);

    res.status(200).json(success(null, 'Project deleted successfully'));
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json(error('Failed to delete project'));
  }
}));

/**
 * GET /api/projects/:id/members
 * Get project member list
 * Requires project access permission
 */
router.get('/:id/members', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user has access permission
    const hasPermission = await projectModel.checkProjectPermission(id, userId, userRole);
    if (!hasPermission) {
      return res.status(403).json(error('No permission to access this project', 403));
    }

    // Get project member list
    const members = await projectModel.getProjectMembers(id);

    res.status(200).json(success({
      project: { id },
      members: members || []
    }));
  } catch (error) {
    logger.error('Error getting project member list:', error);
    res.status(500).json(error('Failed to get project member list'));
  }
}));

/**
 * POST /api/projects/:id/members
 * Add project member
 * Requires project owner or admin permission
 */
router.post('/:id/members', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role = 'viewer' } = req.body;
  const { id: currentUserId, role: currentUserRole } = req.user;

  // Validate required fields
  if (!userId) {
    return res.status(400).json(error('User ID cannot be empty', 400));
  }

  // Validate role
  if (!['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json(error('Invalid project role', 400));
  }

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user has modify permission (admin or project owner)
    let hasPermission = false;
    if (currentUserRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, currentUserId);
    }

    if (!hasPermission) {
      return res.status(403).json(error('No permission to modify project members', 403));
    }

    // Check if user to add exists and is active
    const user = await userModel.findById(userId);
    if (!user || user.is_active === 0) {
      return res.status(404).json(error('User not found or has been disabled', 404));
    }

    // Check if user is already a project member
    const memberExists = await projectModel.memberExists(id, userId);
    if (memberExists) {
      return res.status(409).json(error('User is already a project member', 409, 'MEMBER_EXISTS'));
    }

    // Add user to project
    await projectModel.addProjectMember(id, userId, role);

    res.status(201).json(success(null, 'User added to project'));
  } catch (error) {
    logger.error('Error adding project member:', error);
    res.status(500).json(error('Failed to add project member'));
  }
}));

/**
 * PUT /api/projects/:id/members/:userId
 * Update project member role
 * Requires project owner or admin permission
 */
router.put('/:id/members/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { role } = req.body;
  const { id: currentUserId, role: currentUserRole } = req.user;

  // Validate role
  if (!role || !['owner', 'maintainer', 'viewer'].includes(role)) {
    return res.status(400).json(error('Invalid project role', 400));
  }

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user has modify permission (admin or project owner)
    let hasPermission = false;
    if (currentUserRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, currentUserId);
    }

    if (!hasPermission) {
      return res.status(403).json(error('No permission to modify project members', 403));
    }

    // Check if member exists
    const memberExists = await projectModel.memberExists(id, userId);
    if (!memberExists) {
      return res.status(404).json(error('User is not a project member', 404));
    }

    // Check if trying to modify last owner's role
    if (role !== 'owner') {
      const ownerCount = await projectModel.getProjectOwnerCount(id);
      if (ownerCount <= 1) {
        const currentMemberRole = await projectModel.get(
          'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
          [id, userId]
        );
        
        if (currentMemberRole && currentMemberRole.role === 'owner') {
          return res.status(400).json(error('Cannot modify the last project owner\'s role', 400));
        }
      }
    }

    // Update member role
    await projectModel.updateProjectMemberRole(id, userId, role);

    res.status(200).json(success(null, 'Project member role updated successfully'));
  } catch (error) {
    logger.error('Error updating project member role:', error);
    res.status(500).json(error('Failed to update project member role'));
  }
}));

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove member from project
 * Requires project owner or admin permission
 */
router.delete('/:id/members/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { id: currentUserId, role: currentUserRole } = req.user;

  try {
    // Check if project exists
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    // Check if user has modify permission (admin or project owner)
    let hasPermission = false;
    if (currentUserRole === 'admin') {
      hasPermission = true;
    } else {
      hasPermission = await projectModel.isProjectOwner(id, currentUserId);
    }

    if (!hasPermission) {
      return res.status(403).json(error('No permission to modify project members', 403));
    }

    // Check if member exists
    const memberExists = await projectModel.memberExists(id, userId);
    if (!memberExists) {
      return res.status(404).json(error('User is not a project member', 404));
    }

    // Check if trying to remove last owner
    const currentMemberRole = await projectModel.get(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (currentMemberRole && currentMemberRole.role === 'owner') {
      const ownerCount = await projectModel.getProjectOwnerCount(id);
      if (ownerCount <= 1) {
        return res.status(400).json(error('Cannot remove the last project owner', 400));
      }
    }

    // Remove user from project
    await projectModel.removeProjectMember(id, userId);

    res.status(200).json(success(null, 'User removed from project'));
  } catch (error) {
    logger.error('Error removing member from project:', error);
    res.status(500).json(error('Failed to remove member from project'));
  }
}));

export default router;
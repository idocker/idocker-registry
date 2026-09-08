import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { UserModel } from '../models/UserModel.js';
import { paginated, success, error } from '../utils/apiResponse.js';

const projectModel = new ProjectModel();
const userModel = new UserModel();
const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', isActive='all'} = req.query;
  const { id: userId, role: userRole } = req.user;
  try {
    const result = await projectModel.getProjectsList(userId, userRole, isActive, { page, limit, search });
    res.status(200).json(paginated(result.data, result.pagination, 'Project list retrieved successfully'));
  } catch (e) {
    logger.error('Error getting project list:', e);
    res.status(500).json(error('Failed to get project list'));
  }
}));

router.get('/all', requireAdmin, asyncHandler(async (req, res) => {
  const { isActive='all', page = 1, limit = 20, search = '' } = req.query;
  try {
    const result = await projectModel.getProjectsAllList(isActive, { page, limit, search });
    res.status(200).json(paginated(result.data, result.pagination, 'Project list retrieved successfully'));
  } catch (e) {
    logger.error('Error getting project list:', e);
    res.status(500).json(error('Failed to get project list'));
  }
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId, role: userRole } = req.user;

  try {
    const project = await projectModel.findById(id);
    if (!project) {
      return res.status(404).json(error('Project not found', 404));
    }

    const hasPermission = await projectModel.checkProjectPermission(id, userId, userRole);
    if (!hasPermission) {
      return res.status(403).json(error('No permission to access this project', 403));
    }

    const repositoryCount = await projectModel.getProjectRepositoryCount(id);

    res.status(200).json(success({
      ...project,
      repositoryCount: repositoryCount.count || 0
    }));
  } catch (e) {
    logger.error('Error getting project details:', e);
    res.status(500).json(error('Failed to get project details'));
  }
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, namespace } = req.body;
  const { id: createdBy } = req.user;

  if (!name || !namespace) {
    return res.status(400).json(error('Project name and namespace cannot be empty', 400));
  }

  if (!/^[a-z0-9-]+$/.test(namespace)) {
    return res.status(400).json(error('Namespace can only contain lowercase letters, numbers, and hyphens', 400));
  }

  try {
    const isNameUnique = await projectModel.isProjectNameUnique(name);
    if (!isNameUnique) {
      return res.status(409).json(error('Project name already exists', 409, 'UNIQUE_VIOLATION'));
    }

    const existingNamespace = await projectModel.get(
      'SELECT id FROM projects WHERE namespace = ? AND is_active = 1', [namespace]
    );
    if (existingNamespace) {
      return res.status(409).json(error('Namespace already exists', 409, 'UNIQUE_VIOLATION'));
    }

    const projectData = { name, description: description || '', namespace, is_active: 1 };
    const newProject = await projectModel.createProject(projectData, createdBy);

    const projectDetails = await projectModel.findById(newProject.id);

    res.status(201).json(success(projectDetails, 'Project created successfully'));
  } catch (e) {
    logger.error('Error creating project:', e);
    res.status(500).json(error('Failed to create project'));
  }
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  try {
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    if (name) {
      const isNameUnique = await projectModel.isProjectNameUnique(name, id);
      if (!isNameUnique) {
        return res.status(409).json(error('Project name already exists', 409, 'UNIQUE_VIOLATION'));
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;

    if (Object.keys(updateData).length > 0) {
      await projectModel.updateProject(id, updateData);
    }

    const updatedProject = await projectModel.findById(id);

    res.status(200).json(success(updatedProject, 'Project information updated successfully'));
  } catch (e) {
    logger.error('Error updating project information:', e);
    res.status(500).json(error('Failed to update project information'));
  }
}));

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const projectExists = await projectModel.projectExists(id);
    if (!projectExists) {
      return res.status(404).json(error('Project not found', 404));
    }

    await projectModel.deleteProject(id);
    res.status(200).json(success(null, 'Project deleted successfully'));
  } catch (e) {
    logger.error('Error deleting project:', e);
    res.status(500).json(error('Failed to delete project'));
  }
}));

export default router;
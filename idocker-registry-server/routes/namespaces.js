/**
 * Namespace Management Routes Module
 *
 * Provides CRUD operations for namespace management
 * Supports permission control and pagination queries
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { NamespaceModel } from '../models/NamespaceModel.js';
import { paginated, success, error } from '../utils/apiResponse.js';

const namespaceModel = new NamespaceModel();
const router = express.Router();

/**
 * GET /api/namespaces
 * Get namespace list
 * Supports pagination and search
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', isActive = 'all' } = req.query;

  try {
    const result = await namespaceModel.getNamespacesList({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActive ? 1 : 0
    });

    res.status(200).json(paginated(
      result.data,
      result.pagination,
      'Namespace list retrieved successfully'
    ));
  } catch (err) {
    logger.error('Error getting namespace list:', err);
    res.status(500).json(error('Failed to get namespace list'));
  }
}));

/**
 * GET /api/namespaces/:id
 * Get namespace details by ID
 */
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const namespace = await namespaceModel.getNamespaceById(parseInt(id));

    if (!namespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    res.status(200).json(success(namespace, 'Namespace details retrieved successfully'));
  } catch (err) {
    logger.error('Error getting namespace details:', err);
    res.status(500).json(error('Failed to get namespace details'));
  }
}));

/**
 * POST /api/namespaces
 * Create new namespace (admin only)
 */
router.post('/', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { id: userId } = req.user;

  try {
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json(error('Namespace name is required'));
    }

    // Check if namespace name is unique
    const isUnique = await namespaceModel.isNamespaceNameUnique(name.trim());
    if (!isUnique) {
      return res.status(409).json(error('Namespace name already exists'));
    }

    // Create namespace
    const result = await namespaceModel.createNamespace({
      name: name.trim(),
      description: description || '',
      createdBy: userId
    });

    res.status(201).json(
      success(
        { id: result.lastID, name: name.trim(), description: description || '' },
        'Namespace created successfully'
      )
    );
  } catch (err) {
    logger.error('Error creating namespace:', err);
    res.status(500).json(error('Failed to create namespace'));
  }
}));

/**
 * PUT /api/namespaces/:id
 * Update namespace (admin only)
 */
router.put('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  try {
    const namespaceId = parseInt(id);

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json(error('Namespace name is required'));
    }

    // Check if namespace exists
    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    // Check if namespace name is unique (excluding current namespace)
    const isUnique = await namespaceModel.isNamespaceNameUnique(name.trim(), namespaceId);
    if (!isUnique) {
      return res.status(409).json(error('Namespace name already exists'));
    }

    // Update namespace
    const updateData = {
      name: name.trim(),
      description: description || ''
    };

    // Only update active status if explicitly provided
    if (isActive !== undefined) {
      updateData.is_active = isActive ? 1 : 0;
    }

    await namespaceModel.updateNamespace(namespaceId, updateData);

    res.status(200).json(
      success(
        { id: namespaceId, name: name.trim(), description: description || '', isActive },
        'Namespace updated successfully'
      )
    );
  } catch (err) {
    logger.error('Error updating namespace:', err);
    res.status(500).json(error('Failed to update namespace'));
  }
}));

/**
 * DELETE /api/namespaces/:id
 * Delete namespace (admin only)
 */
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const namespaceId = parseInt(id);

    // Check if namespace exists
    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    // Delete namespace (soft delete)
    await namespaceModel.deleteNamespace(namespaceId);

    res.status(200).json(success(null, 'Namespace deleted successfully'));
  } catch (err) {
    logger.error('Error deleting namespace:', err);

    // Handle specific errors
    if (err.message.includes('Cannot delete namespace with active projects')) {
      return res.status(409).json(error(err.message));
    }

    res.status(500).json(error('Failed to delete namespace'));
  }
}));

/**
 * POST /api/namespaces/:id/reactivate
 * Reactivate namespace (admin only)
 */
router.post('/:id/reactivate', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const namespaceId = parseInt(id);

    // Check if namespace exists
    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    // Reactivate namespace
    await namespaceModel.reactivateNamespace(namespaceId);

    res.status(200).json(success(null, 'Namespace reactivated successfully'));
  } catch (err) {
    logger.error('Error reactivating namespace:', err);
    res.status(500).json(error('Failed to reactivate namespace'));
  }
}));

export default router;
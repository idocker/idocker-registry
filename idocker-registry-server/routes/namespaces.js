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
import { requireAdmin } from '../middleware/auth.js';
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
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', isActive = 'all', deleted = '0' } = req.query;

  try {
    // isActive: 'all'/未传 → 不过滤；'true'/'1' → 仅启用；'false'/'0' → 仅停用。
    // 这里曾直接传数字，而模型只在拿到 boolean 时才拼过滤条件，导致该参数从未生效。
    let isActiveFilter;
    if (isActive === 'true' || isActive === '1') {
      isActiveFilter = true;
    } else if (isActive === 'false' || isActive === '0') {
      isActiveFilter = false;
    }

    const result = await namespaceModel.getNamespacesList({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActiveFilter,
      deleted
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
router.get('/:id', asyncHandler(async (req, res) => {
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
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
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
 * Update namespace description (admin only)
 *
 * The description is the only mutable field. A namespace name is the first
 * path segment of every repository underneath it, so renaming would orphan
 * the images; a rename attempt is rejected rather than silently ignored (this
 * also covers the built-in 'default' namespace, whose literal name is relied
 * upon by path parsing and findByName('default')). The active flag is handled
 * by a dedicated status endpoint: sending it here is rejected with 400 rather
 * than silently ignored, so a caller never gets a false success.
 */
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  try {
    const namespaceId = parseInt(id);

    // Check if namespace exists
    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    // 本接口只改描述。启用/停用有独立入口，这里显式拒绝而不是静默忽略——
    // 静默忽略会让调用方误以为停用已经生效。
    if (isActive !== undefined) {
      return res.status(400).json(error(
        'Namespace active state is not editable through this endpoint',
        400,
        'NAMESPACE_STATUS_NOT_SUPPORTED'
      ));
    }

    if (name !== undefined && String(name).trim() !== existingNamespace.name) {
      return res.status(409).json(error(
        'Namespace name cannot be changed',
        409,
        'NAMESPACE_NAME_IMMUTABLE'
      ));
    }

    const nextDescription = typeof description === 'string'
      ? description
      : (existingNamespace.description || '');

    await namespaceModel.updateNamespace(namespaceId, {
      description: nextDescription
    });

    res.status(200).json(
      success(
        { id: namespaceId, name: existingNamespace.name, description: nextDescription },
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
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const namespaceId = parseInt(id);

    // Check if namespace exists
    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    // Delete namespace (into the recycle bin — the row is kept)
    await namespaceModel.deleteNamespace(namespaceId, req.user.id);

    res.status(200).json(success(null, 'Namespace moved to recycle bin successfully'));
  } catch (err) {
    logger.error('Error deleting namespace:', err);

    // Handle specific errors
    if (err.message.includes('Cannot delete namespace with active projects')) {
      return res.status(409).json(error(err.message, 409, 'NAMESPACE_HAS_PROJECTS'));
    }

    if (err.message.includes('already in the recycle bin')) {
      return res.status(409).json(error(err.message, 409, 'ALREADY_DELETED'));
    }

    // The built-in 'default' namespace is protected
    if (err.message.includes('Cannot delete the default namespace')) {
      return res.status(409).json(error(err.message, 409, 'PROTECTED_RESOURCE'));
    }

    res.status(500).json(error('Failed to delete namespace'));
  }
}));

/**
 * POST /api/namespaces/:id/restore
 * Restore a namespace from the recycle bin (admin only)
 */
router.post('/:id/restore', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const namespaceId = parseInt(id);

    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    await namespaceModel.restoreNamespace(namespaceId);

    res.status(200).json(success(null, 'Namespace restored successfully'));
  } catch (err) {
    logger.error('Error restoring namespace:', err);

    if (err.message.includes('not in the recycle bin')) {
      return res.status(409).json(error(err.message, 409, 'NOT_DELETED'));
    }

    res.status(500).json(error('Failed to restore namespace'));
  }
}));

/**
 * DELETE /api/namespaces/:id/purge
 * Physically remove a namespace (admin only, irreversible)
 */
router.delete('/:id/purge', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const namespaceId = parseInt(id);

    const existingNamespace = await namespaceModel.getNamespaceById(namespaceId);
    if (!existingNamespace) {
      return res.status(404).json(error('Namespace not found'));
    }

    await namespaceModel.purgeNamespace(namespaceId);

    res.status(200).json(success(null, 'Namespace permanently deleted'));
  } catch (err) {
    logger.error('Error purging namespace:', err);

    // projects has no FK to namespaces, so the model refuses while any project
    // (even one in the recycle bin) still points here
    if (err.message.includes('Cannot purge namespace with existing projects')) {
      return res.status(409).json(error(err.message, 409, 'NAMESPACE_HAS_PROJECTS'));
    }

    if (err.message.includes('Cannot delete the default namespace')) {
      return res.status(409).json(error(err.message, 409, 'PROTECTED_RESOURCE'));
    }

    res.status(500).json(error('Failed to purge namespace'));
  }
}));

export default router;
import express from 'express';
import registryProxyController from '../controllers/registryProxyController.js';
import { authenticate, authorize } from '../server/middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Registry API proxy routes
// Get catalog (repositories list)
router.get('/catalog', authorize('registry', 'read'), registryProxyController.getCatalog);

// Get tags for a specific repository
router.get('/tags/:repository', authorize('registry', 'read'), registryProxyController.getTags);

// Get manifest for a specific repository tag
router.get('/manifest/:repository/:tag', authorize('registry', 'read'), registryProxyController.getManifest);

// Get blob for a specific repository
router.get('/blobs/:repository/:digest', authorize('registry', 'read'), registryProxyController.getBlob);

// Delete a tag from repository
router.delete('/tags/:repository/:tag', authorize('registry', 'delete'), registryProxyController.deleteTag);

export default router;
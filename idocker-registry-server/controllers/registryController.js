import Registry from '../models/Registry.js';
import Project from '../models/Project.js';
import AuditLog from '../models/AuditLog.js';

class RegistryController {
  async createRegistry(req, res) {
    try {
      const { name, url, type = 'docker', projectId, authConfig } = req.body;
      
      if (!name || !url || !projectId) {
        return res.status(400).json({ 
          error: 'Registry name, URL, and project ID are required' 
        });
      }
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const registry = await Registry.create({
        name,
        url,
        type,
        projectId,
        authConfig
      });
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'create',
        resourceType: 'registry',
        resourceId: registry.id,
        details: { name, url, type, projectId },
        projectId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(201).json({
        message: 'Registry created successfully',
        registry
      });
    } catch (error) {
      console.error('Create registry error:', error);
      return res.status(500).json({ error: 'Failed to create registry' });
    }
  }

  async getRegistries(req, res) {
    try {
      const { projectId, limit = 50, offset = 0 } = req.query;
      
      let registries;
      if (projectId) {
        const hasPermission = await Project.checkPermission(projectId, req.user.id, 'read');
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        registries = await Registry.getProjectRegistries(projectId);
      } else {
        registries = await Registry.getAll(parseInt(limit), parseInt(offset));
      }
      
      return res.json({ registries });
    } catch (error) {
      console.error('Get registries error:', error);
      return res.status(500).json({ error: 'Failed to get registries' });
    }
  }

  async getRegistry(req, res) {
    try {
      const { id } = req.params;
      
      const registry = await Registry.findById(id);
      if (!registry) {
        return res.status(404).json({ error: 'Registry not found' });
      }
      
      const hasPermission = await Project.checkPermission(
        registry.project_id, 
        req.user.id, 
        'read'
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.json({ registry });
    } catch (error) {
      console.error('Get registry error:', error);
      return res.status(500).json({ error: 'Failed to get registry' });
    }
  }

  async updateRegistry(req, res) {
    try {
      const { id } = req.params;
      const { name, url, type, authConfig } = req.body;
      
      const registry = await Registry.findById(id);
      if (!registry) {
        return res.status(404).json({ error: 'Registry not found' });
      }
      
      const hasPermission = await Project.checkPermission(
        registry.project_id, 
        req.user.id, 
        'write'
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updatedRegistry = await Registry.update(id, { name, url, type, authConfig });
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'registry',
        resourceId: id,
        details: { name, url, type },
        projectId: registry.project_id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({
        message: 'Registry updated successfully',
        registry: updatedRegistry
      });
    } catch (error) {
      console.error('Update registry error:', error);
      return res.status(500).json({ error: 'Failed to update registry' });
    }
  }

  async deleteRegistry(req, res) {
    try {
      const { id } = req.params;
      
      const registry = await Registry.findById(id);
      if (!registry) {
        return res.status(404).json({ error: 'Registry not found' });
      }
      
      const hasPermission = await Project.checkPermission(
        registry.project_id, 
        req.user.id, 
        'delete'
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await Registry.delete(id);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'delete',
        resourceType: 'registry',
        resourceId: id,
        details: { name: registry.name },
        projectId: registry.project_id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({ message: 'Registry deleted successfully' });
    } catch (error) {
      console.error('Delete registry error:', error);
      return res.status(500).json({ error: 'Failed to delete registry' });
    }
  }

  async createReplicationPolicy(req, res) {
    try {
      const { 
        name, 
        sourceRegistryId, 
        targetRegistryId, 
        filters = {}, 
        schedule = 'manual',
        projectId 
      } = req.body;
      
      if (!name || !sourceRegistryId || !targetRegistryId || !projectId) {
        return res.status(400).json({ 
          error: 'Policy name, source registry, target registry, and project ID are required' 
        });
      }

      const hasPermission = await Project.checkPermission(projectId, req.user.id, 'write');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const policy = await Registry.createReplicationPolicy({
        name,
        sourceRegistryId,
        targetRegistryId,
        filters,
        schedule,
        projectId
      });
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'create_replication_policy',
        resourceType: 'replication_policy',
        resourceId: policy.id,
        details: { name, sourceRegistryId, targetRegistryId, schedule },
        projectId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(201).json({
        message: 'Replication policy created successfully',
        policy
      });
    } catch (error) {
      console.error('Create replication policy error:', error);
      return res.status(500).json({ error: 'Failed to create replication policy' });
    }
  }

  async getReplicationPolicies(req, res) {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const hasPermission = await Project.checkPermission(projectId, req.user.id, 'read');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const policies = await Registry.getProjectReplicationPolicies(projectId);
      
      return res.json({ policies });
    } catch (error) {
      console.error('Get replication policies error:', error);
      return res.status(500).json({ error: 'Failed to get replication policies' });
    }
  }

  async updateReplicationPolicy(req, res) {
    try {
      const { id } = req.params;
      const { name, filters, schedule, enabled } = req.body;
      
      const policy = await Registry.getReplicationPolicy(id);
      if (!policy) {
        return res.status(404).json({ error: 'Replication policy not found' });
      }
      
      const hasPermission = await Project.checkPermission(
        policy.project_id, 
        req.user.id, 
        'write'
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updatedPolicy = await Registry.updateReplicationPolicy(id, { 
        name, 
        filters, 
        schedule, 
        enabled 
      });
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'update_replication_policy',
        resourceType: 'replication_policy',
        resourceId: id,
        details: { name, schedule, enabled },
        projectId: policy.project_id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({
        message: 'Replication policy updated successfully',
        policy: updatedPolicy
      });
    } catch (error) {
      console.error('Update replication policy error:', error);
      return res.status(500).json({ error: 'Failed to update replication policy' });
    }
  }

  async deleteReplicationPolicy(req, res) {
    try {
      const { id } = req.params;
      
      const policy = await Registry.getReplicationPolicy(id);
      if (!policy) {
        return res.status(404).json({ error: 'Replication policy not found' });
      }
      
      const hasPermission = await Project.checkPermission(
        policy.project_id, 
        req.user.id, 
        'delete'
      );
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await Registry.deleteReplicationPolicy(id);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'delete_replication_policy',
        resourceType: 'replication_policy',
        resourceId: id,
        details: { name: policy.name },
        projectId: policy.project_id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({ message: 'Replication policy deleted successfully' });
    } catch (error) {
      console.error('Delete replication policy error:', error);
      return res.status(500).json({ error: 'Failed to delete replication policy' });
    }
  }
}

export default new RegistryController();
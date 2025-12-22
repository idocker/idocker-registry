import Project from '../models/Project.js';
import AuditLog from '../models/AuditLog.js';

class ProjectController {
  async createProject(req, res) {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const existingProject = await Project.getByName(name);
      if (existingProject) {
        return res.status(409).json({ error: 'Project with this name already exists' });
      }

      const project = await Project.create({
        name,
        description,
        createdBy: req.user.id
      });
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'create',
        resourceType: 'project',
        resourceId: project.id,
        details: { name, description },
        projectId: project.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(201).json({
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      console.error('Create project error:', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async getProjects(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const projects = await Project.getAll(req.user.id, parseInt(limit), parseInt(offset));
      
      return res.json({ projects });
    } catch (error) {
      console.error('Get projects error:', error);
      return res.status(500).json({ error: 'Failed to get projects' });
    }
  }

  async getProject(req, res) {
    try {
      const { id } = req.params;
      
      const hasPermission = await Project.checkPermission(id, req.user.id, 'read');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.json({ project });
    } catch (error) {
      console.error('Get project error:', error);
      return res.status(500).json({ error: 'Failed to get project' });
    }
  }

  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      const hasPermission = await Project.checkPermission(id, req.user.id, 'write');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const updatedProject = await Project.update(id, { name, description });
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'update',
        resourceType: 'project',
        resourceId: id,
        details: { name, description },
        projectId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({
        message: 'Project updated successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Update project error:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }

  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      
      const hasPermission = await Project.checkPermission(id, req.user.id, 'delete');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await Project.delete(id);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'delete',
        resourceType: 'project',
        resourceId: id,
        details: { name: project.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  async addMember(req, res) {
    try {
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;
      
      const hasPermission = await Project.checkPermission(id, req.user.id, 'admin');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const memberId = await Project.addMember(id, userId, role);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'add_member',
        resourceType: 'project',
        resourceId: id,
        details: { userId, role },
        projectId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(201).json({
        message: 'Member added successfully',
        memberId
      });
    } catch (error) {
      console.error('Add member error:', error);
      return res.status(500).json({ error: 'Failed to add member' });
    }
  }

  async removeMember(req, res) {
    try {
      const { id, userId } = req.params;
      
      const hasPermission = await Project.checkPermission(id, req.user.id, 'admin');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const success = await Project.removeMember(id, userId);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'remove_member',
        resourceType: 'project',
        resourceId: id,
        details: { userId },
        projectId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({
        message: success ? 'Member removed successfully' : 'Member not found'
      });
    } catch (error) {
      console.error('Remove member error:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  async updateMemberRole(req, res) {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      
      const hasPermission = await Project.checkPermission(id, req.user.id, 'admin');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const success = await Project.updateMemberRole(id, userId, role);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'update_member_role',
        resourceType: 'project',
        resourceId: id,
        details: { userId, role },
        projectId: id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({
        message: success ? 'Member role updated successfully' : 'Member not found'
      });
    } catch (error) {
      console.error('Update member role error:', error);
      return res.status(500).json({ error: 'Failed to update member role' });
    }
  }
}

export default new ProjectController();
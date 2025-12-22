import Database from '../config/database.js';

class Project {
  static async create(projectData) {
    const { name, description, createdBy } = projectData;
    
    try {
      const result = await Database.run(
        `INSERT INTO projects (name, description, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        [name, description, createdBy]
      );
      
      return await Project.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating project: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const project = await Database.get('SELECT * FROM projects WHERE id = ?', [id]);
      if (project) {
        project.members = await Project.getMembers(id);
      }
      return project;
    } catch (error) {
      throw new Error(`Error finding project by ID: ${error.message}`);
    }
  }

  static async getByName(name) {
    try {
      const project = await Database.get('SELECT * FROM projects WHERE name = ?', [name]);
      return project;
    } catch (error) {
      throw new Error(`Error finding project by name: ${error.message}`);
    }
  }

  static async getAll(userId = null, limit = 50, offset = 0) {
    try {
      let projects;
      if (userId) {
        projects = await Database.all(
          `SELECT p.* FROM projects p 
           LEFT JOIN project_members pm ON p.id = pm.project_id 
           WHERE p.created_by = ? OR pm.user_id = ? 
           GROUP BY p.id 
           ORDER BY p.created_at DESC 
           LIMIT ? OFFSET ?`,
          [userId, userId, limit, offset]
        );
      } else {
        projects = await Database.all(
          'SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [limit, offset]
        );
      }
      
      for (const project of projects) {
        project.members = await Project.getMembers(project.id);
      }
      
      return projects;
    } catch (error) {
      throw new Error(`Error getting all projects: ${error.message}`);
    }
  }

  static async addMember(projectId, userId, role = 'member') {
    try {
      const result = await Database.run(
        `INSERT INTO project_members (project_id, user_id, role, created_at) 
         VALUES (?, ?, ?, datetime('now'))`,
        [projectId, userId, role]
      );
      return result.lastID;
    } catch (error) {
      throw new Error(`Error adding project member: ${error.message}`);
    }
  }

  static async getMembers(projectId) {
    try {
      const members = await Database.all(
        `SELECT pm.*, u.username, u.email FROM project_members pm 
         JOIN users u ON pm.user_id = u.id 
         WHERE pm.project_id = ?`,
        [projectId]
      );
      return members;
    } catch (error) {
      throw new Error(`Error getting project members: ${error.message}`);
    }
  }

  static async removeMember(projectId, userId) {
    try {
      const result = await Database.run(
        'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error removing project member: ${error.message}`);
    }
  }

  static async updateMemberRole(projectId, userId, role) {
    try {
      const result = await Database.run(
        'UPDATE project_members SET role = ?, updated_at = datetime("now") WHERE project_id = ? AND user_id = ?',
        [role, projectId, userId]
      );
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating member role: ${error.message}`);
    }
  }

  static async checkPermission(projectId, userId, requiredPermission = 'read') {
    try {
      const project = await Database.get(
        `SELECT p.created_by FROM projects p WHERE p.id = ?`,
        [projectId]
      );
      
      if (!project) return false;
      
      if (project.created_by === userId) return true;
      
      const membership = await Database.get(
        `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
        [projectId, userId]
      );
      
      if (!membership) return false;
      
      const roleHierarchy = {
        'owner': ['read', 'write', 'delete', 'admin'],
        'maintainer': ['read', 'write', 'delete'],
        'member': ['read'],
        'guest': ['read']
      };
      
      return roleHierarchy[membership.role]?.includes(requiredPermission) || false;
    } catch (error) {
      throw new Error(`Error checking project permission: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    const { name, description } = updateData;
    
    try {
      const result = await Database.run(
        `UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        [name, description, id]
      );
      
      return result.changes > 0 ? await Project.findById(id) : null;
    } catch (error) {
      throw new Error(`Error updating project: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      await Database.run('DELETE FROM project_members WHERE project_id = ?', [id]);
      const result = await Database.run('DELETE FROM projects WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting project: ${error.message}`);
    }
  }
}

export default Project;
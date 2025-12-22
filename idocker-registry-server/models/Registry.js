import Database from '../config/database.js';

class Registry {
  static async create(registryData) {
    const { name, url, type = 'docker', projectId, authConfig } = registryData;
    
    try {
      const result = await Database.run(
        `INSERT INTO registries (name, url, type, project_id, auth_config, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [name, url, type, projectId, JSON.stringify(authConfig || {})]
      );
      
      return await Registry.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating registry: ${error.message}`);
    }
  }

  static async getDefaultRegistry(){
    try {
      const registry = await Database.get('SELECT * FROM registries WHERE is_default = 1');
      if (registry && registry.auth_config) {
        registry.auth_config = JSON.parse(registry.auth_config);
      }
      return registry;
    } catch (error) {
      throw new Error(`Error finding registry by ID: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const registry = await Database.get('SELECT * FROM registries WHERE id = ?', [id]);
      if (registry && registry.auth_config) {
        registry.auth_config = JSON.parse(registry.auth_config);
      }
      return registry;
    } catch (error) {
      throw new Error(`Error finding registry by ID: ${error.message}`);
    }
  }

  static async getProjectRegistries(projectId) {
    try {
      const registries = await Database.all(
        'SELECT * FROM registries WHERE project_id = ? ORDER BY created_at DESC',
        [projectId]
      );
      
      for (const registry of registries) {
        if (registry.auth_config) {
          registry.auth_config = JSON.parse(registry.auth_config);
        }
      }
      
      return registries;
    } catch (error) {
      throw new Error(`Error getting project registries: ${error.message}`);
    }
  }

  static async getAll(limit = 50, offset = 0) {
    try {
      const registries = await Database.all(
        'SELECT * FROM registries ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      for (const registry of registries) {
        if (registry.auth_config) {
          registry.auth_config = JSON.parse(registry.auth_config);
        }
      }
      
      return registries;
    } catch (error) {
      throw new Error(`Error getting all registries: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    const { name, url, type, authConfig } = updateData;
    
    try {
      const result = await Database.run(
        `UPDATE registries SET name = ?, url = ?, type = ?, auth_config = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        [name, url, type, JSON.stringify(authConfig || {}), id]
      );
      
      return result.changes > 0 ? await Registry.findById(id) : null;
    } catch (error) {
      throw new Error(`Error updating registry: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await Database.run('DELETE FROM registries WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting registry: ${error.message}`);
    }
  }

  static async createReplicationPolicy(policyData) {
    const { name, sourceRegistryId, targetRegistryId, filters, schedule, projectId } = policyData;
    
    try {
      const result = await Database.run(
        `INSERT INTO replication_policies 
         (name, source_registry_id, target_registry_id, filters, schedule, project_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [name, sourceRegistryId, targetRegistryId, JSON.stringify(filters || {}), schedule, projectId]
      );
      
      return await Registry.getReplicationPolicy(result.id);
    } catch (error) {
      throw new Error(`Error creating replication policy: ${error.message}`);
    }
  }

  static async getReplicationPolicy(id) {
    try {
      const policy = await Database.get(
        `SELECT rp.*, 
                sr.name as source_registry_name, tr.name as target_registry_name 
         FROM replication_policies rp 
         LEFT JOIN registries sr ON rp.source_registry_id = sr.id 
         LEFT JOIN registries tr ON rp.target_registry_id = tr.id 
         WHERE rp.id = ?`,
        [id]
      );
      
      if (policy) {
        if (policy.filters) {
          policy.filters = JSON.parse(policy.filters);
        }
        // Convert integer to boolean
        policy.enabled = Boolean(policy.enabled);
      }
      
      return policy;
    } catch (error) {
      throw new Error(`Error getting replication policy: ${error.message}`);
    }
  }

  static async getProjectReplicationPolicies(projectId) {
    try {
      const policies = await Database.all(
        `SELECT rp.*, 
                sr.name as source_registry_name, tr.name as target_registry_name 
         FROM replication_policies rp 
         LEFT JOIN registries sr ON rp.source_registry_id = sr.id 
         LEFT JOIN registries tr ON rp.target_registry_id = tr.id 
         WHERE rp.project_id = ? 
         ORDER BY rp.created_at DESC`,
        [projectId]
      );
      
      // Convert integer to boolean for all policies
      return policies.map(policy => {
        if (policy.filters) {
          policy.filters = JSON.parse(policy.filters);
        }
        policy.enabled = Boolean(policy.enabled);
        return policy;
      });
    } catch (error) {
      throw new Error(`Error getting project replication policies: ${error.message}`);
    }
  }

  static async updateReplicationPolicy(id, updateData) {
    const { name, filters, schedule, enabled } = updateData;
    
    try {
      const result = await Database.run(
        `UPDATE replication_policies 
         SET name = ?, filters = ?, schedule = ?, enabled = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        [name, JSON.stringify(filters || {}), schedule, enabled ? 1 : 0, id]
      );
      
      return result.changes > 0 ? await Registry.getReplicationPolicy(id) : null;
    } catch (error) {
      throw new Error(`Error updating replication policy: ${error.message}`);
    }
  }

  static async deleteReplicationPolicy(id) {
    try {
      const result = await Database.run('DELETE FROM replication_policies WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting replication policy: ${error.message}`);
    }
  }
}

export default Registry;
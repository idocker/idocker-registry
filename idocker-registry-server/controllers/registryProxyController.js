import axios from 'axios';
import Registry from '../models/Registry.js';
import { authenticate } from '../server/middleware/auth.js';
import { logAuditEvent } from '../utils/audit.js';

class RegistryProxyController {
  // Get catalog (repositories list)
  async getCatalog(req, res) {
    try {
      // Get registry info from request or use default
      const registryId = req.headers['x-registry-id'];
      let registryConfig;
      
      if (registryId) {
        registryConfig = await Registry.findById(registryId);
        if (!registryConfig) {
          return res.status(404).json({ error: 'Registry not found' });
        }
      } else {
        // Use the first available registry as default
        registryConfig = await Registry.getDefaultRegistry();
        if (!registryConfig) {
          return res.status(404).json({ error: 'No registry configured' });
        }
      }

      // Create axios instance for registry API
      const registryClient = axios.create({
        baseURL: registryConfig.url,
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
        }
      });

      // Add authentication if configured
      if (registryConfig.authConfig) {
        if (registryConfig.authConfig.type === 'bearer' && registryConfig.authConfig.token) {
          registryClient.defaults.headers.Authorization = `Bearer ${registryConfig.authConfig.token}`;
        } else if (registryConfig.authConfig.type === 'basic') {
          registryClient.defaults.auth = {
            username: registryConfig.authConfig.username,
            password: registryConfig.authConfig.password
          };
        }
      }

      // Get catalog from registry
      const response = await registryClient.get('/v2/_catalog');
      
      // Log the access
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_catalog',
        details: { registryId: registryConfig.id },
        success: true
      });

      return res.json(response.data);
    } catch (error) {
      console.error('Registry getCatalog error:', error);
      
      // Log the error
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_catalog',
        details: { error: error.message },
        success: false
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Failed to fetch catalog from registry',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get tags for a specific repository
  async getTags(req, res) {
    try {
      const { repository } = req.params;
      
      if (!repository) {
        return res.status(400).json({ error: 'Repository name is required' });
      }

      // Get registry info from request or use default
      const registryId = req.headers['x-registry-id'];
      let registryConfig;
      
      if (registryId) {
        registryConfig = await Registry.findById(registryId);
        if (!registryConfig) {
          return res.status(404).json({ error: 'Registry not found' });
        }
      } else {
        // Use the first available registry as default
        registryConfig = await Registry.findOne();
        if (!registryConfig) {
          return res.status(404).json({ error: 'No registry configured' });
        }
      }

      // Create axios instance for registry API
      const registryClient = axios.create({
        baseURL: registryConfig.url,
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
        }
      });

      // Add authentication if configured
      if (registryConfig.authConfig) {
        if (registryConfig.authConfig.type === 'bearer' && registryConfig.authConfig.token) {
          registryClient.defaults.headers.Authorization = `Bearer ${registryConfig.authConfig.token}`;
        } else if (registryConfig.authConfig.type === 'basic') {
          registryClient.defaults.auth = {
            username: registryConfig.authConfig.username,
            password: registryConfig.authConfig.password
          };
        }
      }

      // Get tags from registry
      const response = await registryClient.get(`/v2/${encodeURIComponent(repository)}/tags/list`);
      
      // Log the access
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_tags',
        details: { repository, registryId: registryConfig.id },
        success: true
      });

      return res.json(response.data);
    } catch (error) {
      console.error('Registry getTags error:', error);
      
      // Log the error
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_tags',
        details: { repository, error: error.message },
        success: false
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Failed to fetch tags from registry',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get manifest for a specific repository tag
  async getManifest(req, res) {
    try {
      const { repository, tag } = req.params;
      
      if (!repository || !tag) {
        return res.status(400).json({ error: 'Repository name and tag are required' });
      }

      // Get registry info from request or use default
      const registryId = req.headers['x-registry-id'];
      let registryConfig;
      
      if (registryId) {
        registryConfig = await Registry.findById(registryId);
        if (!registryConfig) {
          return res.status(404).json({ error: 'Registry not found' });
        }
      } else {
        // Use the first available registry as default
        registryConfig = await Registry.findOne();
        if (!registryConfig) {
          return res.status(404).json({ error: 'No registry configured' });
        }
      }

      // Create axios instance for registry API
      const registryClient = axios.create({
        baseURL: registryConfig.url,
        timeout: 30000,
        headers: {
          'Accept': 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json',
        }
      });

      // Add authentication if configured
      if (registryConfig.authConfig) {
        if (registryConfig.authConfig.type === 'bearer' && registryConfig.authConfig.token) {
          registryClient.defaults.headers.Authorization = `Bearer ${registryConfig.authConfig.token}`;
        } else if (registryConfig.authConfig.type === 'basic') {
          registryClient.defaults.auth = {
            username: registryConfig.authConfig.username,
            password: registryConfig.authConfig.password
          };
        }
      }

      // Get manifest from registry
      const response = await registryClient.get(`/v2/${encodeURIComponent(repository)}/manifests/${encodeURIComponent(tag)}`);
      
      // Log the access
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_manifest',
        details: { repository, tag, registryId: registryConfig.id },
        success: true
      });

      return res.json(response.data);
    } catch (error) {
      console.error('Registry getManifest error:', error);
      
      // Log the error
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_manifest',
        details: { repository, tag, error: error.message },
        success: false
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Failed to fetch manifest from registry',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get blob for a specific repository
  async getBlob(req, res) {
    try {
      const { repository, digest } = req.params;
      
      if (!repository || !digest) {
        return res.status(400).json({ error: 'Repository name and digest are required' });
      }

      // Get registry info from request or use default
      const registryId = req.headers['x-registry-id'];
      let registryConfig;
      
      if (registryId) {
        registryConfig = await Registry.findById(registryId);
        if (!registryConfig) {
          return res.status(404).json({ error: 'Registry not found' });
        }
      } else {
        // Use the first available registry as default
        registryConfig = await Registry.findOne();
        if (!registryConfig) {
          return res.status(404).json({ error: 'No registry configured' });
        }
      }

      // Create axios instance for registry API
      const registryClient = axios.create({
        baseURL: registryConfig.url,
        timeout: 30000,
        responseType: 'arraybuffer', // Blobs are binary data
      });

      // Add authentication if configured
      if (registryConfig.authConfig) {
        if (registryConfig.authConfig.type === 'bearer' && registryConfig.authConfig.token) {
          registryClient.defaults.headers.Authorization = `Bearer ${registryConfig.authConfig.token}`;
        } else if (registryConfig.authConfig.type === 'basic') {
          registryClient.defaults.auth = {
            username: registryConfig.authConfig.username,
            password: registryConfig.authConfig.password
          };
        }
      }

      // Get blob from registry
      const response = await registryClient.get(`/v2/${encodeURIComponent(repository)}/blobs/${encodeURIComponent(digest)}`);
      
      // Log the access
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_blob',
        details: { repository, digest, registryId: registryConfig.id },
        success: true
      });

      // Return the blob with proper content type
      if (response.headers['content-type']) {
        res.set('Content-Type', response.headers['content-type']);
      }
      if (response.headers['content-length']) {
        res.set('Content-Length', response.headers['content-length']);
      }
      
      return res.send(response.data);
    } catch (error) {
      console.error('Registry getBlob error:', error);
      
      // Log the error
      await logAuditEvent(req, {
        action: 'access',
        resourceType: 'registry_blob',
        details: { repository, digest, error: error.message },
        success: false
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Failed to fetch blob from registry',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete a tag from repository
  async deleteTag(req, res) {
    try {
      const { repository, tag } = req.params;
      
      if (!repository || !tag) {
        return res.status(400).json({ error: 'Repository name and tag are required' });
      }

      // Get registry info from request or use default
      const registryId = req.headers['x-registry-id'];
      let registryConfig;
      
      if (registryId) {
        registryConfig = await Registry.findById(registryId);
        if (!registryConfig) {
          return res.status(404).json({ error: 'Registry not found' });
        }
      } else {
        // Use the first available registry as default
        registryConfig = await Registry.findOne();
        if (!registryConfig) {
          return res.status(404).json({ error: 'No registry configured' });
        }
      }

      // Create axios instance for registry API
      const registryClient = axios.create({
        baseURL: registryConfig.url,
        timeout: 30000
      });

      // Add authentication if configured
      if (registryConfig.authConfig) {
        if (registryConfig.authConfig.type === 'bearer' && registryConfig.authConfig.token) {
          registryClient.defaults.headers.Authorization = `Bearer ${registryConfig.authConfig.token}`;
        } else if (registryConfig.authConfig.type === 'basic') {
          registryClient.defaults.auth = {
            username: registryConfig.authConfig.username,
            password: registryConfig.authConfig.password
          };
        }
      }

      // First get the digest
      const manifestResponse = await registryClient.get(
        `/v2/${encodeURIComponent(repository)}/manifests/${encodeURIComponent(tag)}`, {
          headers: {
            'Accept': 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json'
          }
        }
      );
      
      const digest = manifestResponse.headers['docker-content-digest'];
      
      if (!digest) {
        return res.status(400).json({ error: 'Could not get manifest digest' });
      }

      // Delete the manifest
      await registryClient.delete(`/v2/${encodeURIComponent(repository)}/manifests/${digest}`);
      
      // Log the deletion
      await logAuditEvent(req, {
        action: 'delete',
        resourceType: 'registry_tag',
        details: { repository, tag, registryId: registryConfig.id },
        success: true
      });

      return res.json({ message: 'Tag deleted successfully' });
    } catch (error) {
      console.error('Registry deleteTag error:', error);
      
      // Log the error
      await logAuditEvent(req, {
        action: 'delete',
        resourceType: 'registry_tag',
        details: { repository, tag, error: error.message },
        success: false
      });

      if (error.response) {
        return res.status(error.response.status).json({
          error: 'Failed to delete tag from registry',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new RegistryProxyController();
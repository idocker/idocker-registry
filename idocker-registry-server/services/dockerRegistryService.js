/**
 * Docker Registry API Service
 * 
 * Provides methods to interact with a Docker Registry
 * Based on Docker Registry API v2
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { dbGet, dbAll, dbRun, dbPaginate } from '../utils/dbHelper.js';
import { AppError } from '../middleware/errorHandler.js';
import * as constants from '@/config/constant.js';
import { DockerAuthzService } from './dockerAuthzService.js';
import { DockerLogService } from './dockerLogService.js';

class DockerRegistryService {
  constructor() {
    this.baseURL = process.env.DOCKER_REGISTRY_URL || constants.DEFAULT_REGISTRY_URL;
    //this.username = process.env.DOCKER_REGISTRY_USERNAME || null;
    //this.password = process.env.DOCKER_REGISTRY_PASSWORD || null;
    this.timeout = parseInt(process.env.DOCKER_REGISTRY_TIMEOUT) || 30000;
  }

  /**
   * Get the authentication headers for the registry
   * @param {Object} registryConfig - Registry configuration object (optional)
   * @returns {Object} Object containing the authentication headers
   */
  getAuthHeaders(registryConfig = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json,application/json'
    };

    // In development environment, add authentication header (for external Registry)
    // Production environment, no authentication header is required
    if (process.env.NODE_ENV !== 'production') {
      if (registryConfig?.username && registryConfig?.password) {
        const credentials = Buffer.from(`${registryConfig.username}:${registryConfig.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (this.username && this.password) {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
    }

    return headers;
  }

  /**
   * Check the connection to the registry
   * @param {Object} registryConfig - Registry configuration object (optional)
   * @returns {Promise<boolean>} Connection status
   */
  async checkConnection(registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      logger.info(`Checking registry connection: ${registryUrl}`);
      const response = await axios.get(`${registryUrl}/v2/`, {
        headers: this.getAuthHeaders(registryConfig),
        timeout: 5000
      })

      return response.status === 200;
    } catch (error) {
      logger.error('Registry Connection Error:', error.message);
      return false;
    }
  }

  /**
   * Get All Repositories
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @param {string} last - Pagination Parameter, Last Repository Name
   * @param {number} limit - Pagination Parameter, Limit of Repositories per Page
   * @returns {Promise<Object>} Repository list and pagination information
   */
  async getRepositories(registryConfig = null, last = '', limit = 100) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const url = new URL(`${registryUrl}/v2/_catalog`);
      
      if (last) {
        url.searchParams.append('last', last);
      }
      
      if (limit) {
        url.searchParams.append('n', limit);
      }

      const response = await axios.get(url.toString(), {
        headers: this.getAuthHeaders(registryConfig),
        timeout: this.timeout
      });

      const result = {
        repositories: [],
        pagination: {
          nextUrl: response.headers.link ? this.extractNextUrl(response.headers.link) : null
        }
      };

      // get tags for each repository
      for (const repo of response.data.repositories) {
        try {
          const tagsResponse = await this.getTags(repo, registryConfig);
          result.repositories.push({
            name: repo,
            tags: tagsResponse.tags || []
          })
        } catch (error) {
          result.repositories.push({
            name: repo,
            tags: [],
            error: error.message
          })
        }
      }

      return result;
    } catch (error) {
      logger.error('Get Repositories Error:', error.message);
      throw new AppError(`Get Repositories Error: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * Get Tags for a Repository
   * @param {string} repository - repository name
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @param {string} last - Pagination parameter, last tag name
   * @param {number} limit - Limit of tags per page
   * @returns {Promise<Object>} Tags list and pagination information
   */
  async getTags(repository, registryConfig = null, last = '', limit = 100) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const url = new URL(`${registryUrl}/v2/${repository}/tags/list`);
      
      if (last) {
        url.searchParams.append('last', last);
      }
      
      if (limit) {
        url.searchParams.append('n', limit);
      }

      const response = await axios.get(url.toString(), {
        headers: this.getAuthHeaders(registryConfig),
        timeout: this.timeout
      });

      // Get details for each tag
      const tagsWithDetails = [];
      if (response.data.tags) {
        for (const tag of response.data.tags) {
          try {
            const manifest = await this.getManifest(repository, tag, registryConfig);
            tagsWithDetails.push({
              name: tag,
              digest: manifest.digest,
              size: manifest.size,
              architecture: manifest.architecture,
              manifest: manifest.manifest,
              os: manifest.os,
              created: manifest.created
            });
          } catch (error) {
            // Record error message if get manifest failed
            tagsWithDetails.push({
              name: tag,
              error: error.message
            });
          }
        }
      }

      return {
        name: repository,
        tags: tagsWithDetails,
        pagination: {
          nextUrl: response.headers.link ? this.extractNextUrl(response.headers.link) : null
        }
      };
    } catch (error) {
      logger.error(`Get repository ${repository} tags failed:`, error.message);
      throw new AppError(`Get repository ${repository} tags failed: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * Get Manifest for a Repository
   * @param {string} repository - Respository Name
   * @param {string} tag - Tag Name
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @returns {Promise<Object>} Manifest Object
   */
  async getManifest(repository, tag, registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const headers = this.getAuthHeaders(registryConfig);
      
      // Remove the Accept header to get the manifest in both v1 and v2 formats
      headers['Accept'] = 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.v1+json';

      const response = await axios.get(`${registryUrl}/v2/${repository}/manifests/${tag}`, {
        headers,
        timeout: this.timeout
      });

      const digest = response.headers['docker-content-digest'];

      let imageInfo = {
        digest: digest,
        manifest: response.data,
        size: 0,
        created: null,
        architecture: 'unknown',
        os: 'unknown'
      };


      if(response.data.layers) {
        imageInfo.size = response.data.layers.reduce((acc, layer) => acc + (layer.size || 0), 0);
      }

      // Get image config and get image info
      if (response.data.config) {
        try {
          const configResponse = await axios.get(
            `${registryUrl}/v2/${repository}/blobs/${response.data.config.digest}`,
            {
              headers: this.getAuthHeaders(registryConfig),
              timeout: this.timeout
            }
          );
          imageInfo.created = configResponse.data.created || null;
          imageInfo.architecture = configResponse.data.architecture || 'unknown';
          imageInfo.os = configResponse.data.os || 'unknown';
        } catch (error) {
          logger.warn(`Get image config failed: ${error.message}`);
        }
      }

      return imageInfo;
    } catch (error) {
      logger.error(`Get manifest for ${repository}:${tag}:`, error.message);
      throw new AppError(`Get manifest for ${repository}:${tag} ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * Get Build History for a Repository
   * @param {string} repository - repository name
   * @param {string} tag - Tag name
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @returns {Promise<Array>} List of build history
   */
  async getBuildHistory(repository, tag, registryConfig = null) {
    try {
      const manifest = await this.getManifest(repository, tag, registryConfig);
      
      if (!manifest.manifest.history) {
        return [];
      }

      // Get build history from manifest
      const history = manifest.manifest.history && Array.isArray(manifest.manifest.history) 
        ? manifest.manifest.history.map((item, index) => {
            let created = null;
            let createdBy = '';
            let emptyLayer = false;
            let comment = '';

            if (typeof item === 'object') {
              created = item.created;
              createdBy = item.created_by || '';
              emptyLayer = item.empty_layer || false;
              comment = item.comment || '';
            }

            return {
              id: index + 1,
              created,
              createdBy,
              emptyLayer,
              comment,
              size: emptyLayer ? 0 : manifest.manifest.layers?.[index]?.size || 0
            };
          }).reverse() 
        : [];

      return history;
    } catch (error) {
      logger.error(`Get build history failed ${repository}:${tag}:`, error.message);
      throw new AppError(`Get build history failed: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * Delete Tag
   * @param {string} repository - Repository Name
   * @param {string} tag - Tag Name
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @returns {Promise<boolean>} if delete success
   */
  async deleteTag(repository, tag, registryConfig = null) {
    try {
      // get digest
      const manifest = await this.getManifest(repository, tag, registryConfig);
      
      const registryUrl = registryConfig?.url || this.baseURL;
      const response = await axios.delete(`${registryUrl}/v2/${repository}/manifests/${manifest.digest}`, {
        headers: this.getAuthHeaders(registryConfig),
        timeout: this.timeout
      });
      // 202 means delete accepted
      return response.status === 202;
    } catch (error) {
      logger.error(`Delete tag failed ${repository}:${tag}:`, error.message);
      throw new AppError(`Delete tag failed: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * Get Blob Info
   * @param {string} repository - Repository Name
   * @param {string} digest - Blob Digest
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @returns {Promise<Object>} Blob Info
   */
  async getBlobInfo(repository, digest, registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const response = await axios.head(`${registryUrl}/v2/${repository}/blobs/${digest}`, {
        headers: this.getAuthHeaders(registryConfig),
        timeout: this.timeout
      });

      return {
        digest,
        size: parseInt(response.headers['content-length'] || '0'),
        contentType: response.headers['content-type']
      };
    } catch (error) {
      logger.error(`Get Blob Info failed ${repository}:${digest}:`, error.message);
      throw new AppError(`Get Blob Info failed: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * Get Next Page URL
   * @param {string} linkHeader - Link Header
   * @returns {string|null} Next Page URL
   */
  extractNextUrl(linkHeader) {
    const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
    if (nextLink) {
      return nextLink.match(/<(.+)>/)?.[1] || null;
    }
    return null;
  }

  /**
   * Get Docker pull command
   * @param {string} repository - Respository Name
   * @param {string} tag - Tag Name
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @returns {string} Docker pull command
   */
  getPullCommand(repository, tag, registryConfig = null) {
    const registryUrl = registryConfig?.url || this.baseURL;
    const registryHost = new URL(registryUrl).host;
    return `docker pull ${registryHost}/${repository}:${tag}`;
  }

  /**
   * 获取Docker push命令
   * @param {string} repository - Respository Name
   * @param {string} tag - Tag Name
   * @param {Object} registryConfig - RegistryConfig Object (Optional)
   * @returns {string} Docker push command
   */
  getPushCommand(repository, tag, registryConfig = null) {
    const registryUrl = registryConfig?.url || this.baseURL;
    const registryHost = new URL(registryUrl).host;
    return `docker push ${registryHost}/${repository}:${tag}`;
  }

  /**
   * Create repository if it doesn't exist
   * @param {string} repositoryName - Repository name
   * @param {Object} user - User object
   * @returns {Promise<Object>} Repository information
   */
  async createRepositoryIfNotExists(repositoryName, user) {
    try {
      // Parse repository name to extract project and repository name
      const repoParts = repositoryName.split('/');
      
      if (repoParts.length < 2) {
        throw new AppError('Invalid repository name format. Expected: project-name/repo-name or namespace/project-name/repo-name', 400, 'INVALID_REPOSITORY_NAME');
      }
      
      let projectName, repoName;
      
      if (repoParts.length === 2) {
        // Format: project-name/repo-name
        projectName = repoParts[0];
        repoName = repoParts[1];
      } else {
        // Format: namespace/project-name/repo-name
        projectName = repoParts[1];
        repoName = repoParts.slice(2).join('/');
      }
      
      // Find project by name
      const project = await dbGet(
        'SELECT id, name FROM projects WHERE name = ? AND is_active = 1',
        [projectName]
      );
      
      if (!project) {
        throw new AppError(`Project '${projectName}' not found or is inactive`, 404, 'PROJECT_NOT_FOUND');
      }
      
      // Check if repository already exists
      let repository = await dbGet(
        'SELECT id FROM repositories WHERE project_id = ? AND name = ? AND is_active = 1',
        [project.id, repoName]
      );
      
      // If repository doesn't exist, create it
      if (!repository) {
        const result = await dbRun(
          'INSERT INTO repositories (name, project_id, description, is_public, is_active, created_at, updated_at) VALUES (?, ?, ?, 0, 1, ?, ?)',
          [repoName, project.id, `Docker image repository for ${repoName}`, new Date().toISOString(), new Date().toISOString()]
        );
        
        repository = { id: result.lastID };
        
        logger.info(`Created new repository: ${repoName} in project ${projectName}`);
      }
      
      return repository;
    } catch (error) {
      logger.error('Failed to create repository:', error);
      throw error;
    }
  }

  /**
   * Get Stored Images
   * @param {string} projectId - Project ID
   * @param {string} search - Keyword
   * @param {number} page - Page Number
   * @param {number} limit - Limit 
   * @returns {Promise<Object>} List of Stored Images
   */
  async getStoredImages(projectId = null, search = '', page = 1, limit = 20) {
    try {
      let query = `
        SELECT 
          r.id as repo_id,
          r.name as repo_name,
          r.description as repo_description,
          p.name as project_name,
          p.namespace,
          t.id as tag_id,
          t.tag as tag_name,
          t.digest,
          t.size,
          t.architecture,
          t.os,
          t.created_at as tag_created_at
        FROM repositories r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN image_tags t ON r.id = t.repository_id
        WHERE p.is_active = 1
      `;
      
      const params = [];
      
      if (projectId) {
        query += ' AND r.project_id = ?';
        params.push(projectId);
      }
      
      if (search) {
        query += ' AND (r.name LIKE ? OR p.name LIKE ? OR p.namespace LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY r.name, t.tag';
      
      const imagesResult = await dbPaginate(query, params, page, limit);
      const images = imagesResult.items;
      
      // 获取分页信息
      const pagination = imagesResult.pagination;
      
      // 格式化结果
      const result = {};
      images.forEach(image => {
        if (!result[image.repo_id]) {
          result[image.repo_id] = {
            id: image.repo_id,
            name: image.repo_name,
            namespace: image.namespace,
            project: image.project_name,
            description: image.repo_description,
            tags: []
          };
        }
        
        if (image.tag_id) {
          result[image.repo_id].tags.push({
            id: image.tag_id,
            name: image.tag_name,
            digest: image.digest,
            size: image.size,
            architecture: image.architecture,
            os: image.os,
            createdAt: image.tag_created_at
          });
        }
      });
      
      return {
        images: Object.values(result),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          hasNextPage: pagination.hasNextPage,
          hasPrevPage: pagination.hasPrevPage
        }
      };
    } catch (error) {
      logger.error('获取存储的镜像信息失败:', error);
      throw new AppError('获取镜像信息失败', 500, 'DATABASE_ERROR');
    }
  }
}

export default new DockerRegistryService();
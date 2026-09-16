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
import { AppError } from '../middleware/errorHandler.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { RepositoryModel } from '../models/RepositoryModel.js';
import * as env from '../config/env.js';
import { parseRepositoryName } from '../utils/dockerUtils.js';

class DockerRegistryService {
  constructor() {
    this.baseURL = env.DOCKER_REGISTRY_URL;
    this.username = env.DOCKER_REGISTRY_USERNAME;
    this.password = env.DOCKER_REGISTRY_PASSWORD;
    this.timeout = parseInt(env.DOCKER_REGISTRY_TIMEOUT);
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
    if (env.NODE_ENV !== 'production') {
      if (registryConfig?.username && registryConfig?.password) {
        const credentials = Buffer.from(`${registryConfig.username}:${registryConfig.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (this.username && this.password) {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
    }

    logger.debug("headers:", JSON.stringify(headers));

    return headers;
  }

  /**
   * Get Registry Config
   * @returns {Object} Registry Config
  */
  getRegistryConfig() {
    const registryConfig = {
      url: env.DOCKER_REGISTRY_URL,
      username: env.DOCKER_REGISTRY_USERNAME || null,
      password: env.DOCKER_REGISTRY_PASSWORD || null
    };

    logger.debug(`Registry config: ${JSON.stringify(registryConfig)}`);

    return registryConfig;
  }

  /**
   * Check the connection to the registry
   * @param {Object} registryConfig - Registry configuration object (optional)
   * @returns {Promise<boolean>} Connection status
   */
  async checkConnection(registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const checkUrl = `${registryUrl}/v2/`;
      logger.info(`log level :${env.LOG_LEVEL}`);
      logger.info(`Checking registry connection: ${checkUrl}`);
      const response = await axios.get(checkUrl, {
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
   * Fetch the raw manifest content of a repository reference (tag or digest),
   * preserving the original body and Content-Type so it can be re-pushed
   * under a different tag.
   * @returns {Promise<{body: Object, contentType: string}>}
   */
  async getRawManifest(repository, reference, registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const headers = this.getAuthHeaders(registryConfig);
      headers['Accept'] = [
        'application/vnd.docker.distribution.manifest.v2+json',
        'application/vnd.docker.distribution.manifest.v1+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.oci.image.index.v1+json'
      ].join(',');
      const response = await axios.get(`${registryUrl}/v2/${repository}/manifests/${reference}`, {
        headers,
        timeout: this.timeout
      });
      const contentType = (response.headers['content-type'] || '').split(';')[0];
      return { body: response.data, contentType };
    } catch (error) {
      logger.error(`Failed to get raw manifest ${repository}:${reference}:`, error.message);
      throw error;
    }
  }

  /**
   * Push a raw manifest under a reference (used to mirror the newest tag as 'latest')
   * @returns {Promise<{status: number, digest: string}>}
   */
  async putManifest(repository, reference, body, contentType, registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const headers = this.getAuthHeaders(registryConfig);
      headers['Content-Type'] = contentType;
      const response = await axios.put(`${registryUrl}/v2/${repository}/manifests/${reference}`, body, {
        headers,
        timeout: this.timeout
      });
      return {
        status: response.status,
        digest: response.headers['docker-content-digest']
      };
    } catch (error) {
      logger.error(`Failed to put manifest ${repository}:${reference}:`, error.message);
      throw error;
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

      // Ask for both docker and OCI manifest formats so modern clients that push
      // OCI manifests (docker buildx / podman / newer node images) resolve too.
      headers['Accept'] = [
        'application/vnd.docker.distribution.manifest.v2+json',
        'application/vnd.docker.distribution.manifest.v1+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.oci.image.index.v1+json'
      ].join(',');

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
        os: 'unknown',
        history: [],
        layers: []
      };


      const data = response.data;

      if (Array.isArray(data.layers) && data.layers.length) {
        // Single-platform manifest (docker v2 / OCI image manifest)
        imageInfo.size = data.layers.reduce((acc, layer) => acc + (layer.size || 0), 0);
        imageInfo.layers = data.layers;
      } else if (Array.isArray(data.manifests) && data.manifests.length) {
        // OCI index / docker manifest list (multi-platform): aggregate child
        // platform manifests so size / created / arch / os are populated.
        let childCount = 0;
        for (const child of data.manifests) {
          try {
            const childInfo = await this.getManifest(repository, child.digest, registryConfig);
            imageInfo.size += childInfo.size || 0;
            if (childCount === 0) {
              imageInfo.created = childInfo.created || null;
              imageInfo.architecture = childInfo.architecture || 'unknown';
              imageInfo.os = childInfo.os || 'unknown';
              // An index carries neither a config blob nor a layer list of its
              // own: the build history only exists in the child platform
              // manifest. Inherit from the first child, otherwise the
              // build-history table renders empty for every multi-platform image.
              imageInfo.history = childInfo.history || [];
              imageInfo.layers = childInfo.layers || [];
            }
            childCount++;
          } catch (error) {
            logger.warn(`Get child manifest failed: ${error.message}`);
          }
        }
        if (childCount > 1) {
          imageInfo.architecture = 'multi';
        }
      }

      // Get image config and get image info
      if (data.config) {
        try {
          const configResponse = await axios.get(
            `${registryUrl}/v2/${repository}/blobs/${data.config.digest}`,
            {
              headers: this.getAuthHeaders(registryConfig),
              timeout: this.timeout
            }
          );
          imageInfo.created = configResponse.data.created || null;
          imageInfo.architecture = configResponse.data.architecture || 'unknown';
          imageInfo.os = configResponse.data.os || 'unknown';
          // Build history lives in the image config blob, NOT in the manifest.
          // Keep it here so getBuildHistory() does not need a second fetch.
          imageInfo.history = Array.isArray(configResponse.data.history) ? configResponse.data.history : [];
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

      // `history` is a field of the image config blob, not of the manifest.
      // The previous implementation read manifest.manifest.history, which is
      // never present, so this always returned an empty array and the build
      // history section never rendered.
      const historySource = Array.isArray(manifest.history) ? manifest.history : [];

      if (historySource.length === 0) {
        return [];
      }

      // `manifest.layers` is populated for a plain image manifest and, for an
      // OCI index, inherited from the first child platform (see getManifest).
      const layers = Array.isArray(manifest.layers) ? manifest.layers : [];

      // Entries flagged empty_layer do not consume a layer, so layer sizes must
      // be matched with a running counter rather than the history row index.
      let layerIndex = 0;

      return historySource.map((item, index) => {
        const isObject = item && typeof item === 'object';
        const createdBy = isObject ? (item.created_by || '') : '';
        const emptyLayer = isObject ? (item.empty_layer || false) : false;
        const comment = isObject ? (item.comment || '') : '';
        const size = emptyLayer ? 0 : (layers[layerIndex++]?.size || 0);

        return {
          id: index + 1,
          created: isObject ? (item.created || null) : null,
          createdBy,
          emptyLayer,
          comment,
          size
        };
      }).reverse();
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
    // Use the externally reachable registry URL for client-facing commands;
    // registryConfig.url points to the internal registry used by the backend.
    const registryUrl = env.IDOCKER_REGISTRY_URL || registryConfig?.url || this.baseURL;
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
    // Use the externally reachable registry URL for client-facing commands;
    // registryConfig.url points to the internal registry used by the backend.
    const registryUrl = env.IDOCKER_REGISTRY_URL || registryConfig?.url || this.baseURL;
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
      const { projectName, repoName } = parseRepositoryName(repositoryName);

      // Find project by name
      const projectModel = new ProjectModel();
      const project = await projectModel.findByName(projectName);

      if (!project || !project.is_active) {
        throw new AppError(`Project '${projectName}' not found or is inactive`, 404, 'PROJECT_NOT_FOUND');
      }

      // Check if repository already exists
      const repositoryModel = new RepositoryModel();
      let repository = await repositoryModel.findByProjectIdAndName(project.id, repoName);

      // If repository doesn't exist, create it
      if (!repository) {
        const repositoryData = {
          name: repoName,
          project_id: project.id,
          description: `Docker image repository for ${repoName}`,
          is_public: 0,
          is_active: 1
        };

        const result = await repositoryModel.createRepository(repositoryData);
        repository = { id: result.id };

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
      // Use RepositoryModel to get stored images
      const repositoryModel = new RepositoryModel();
      const imagesResult = await repositoryModel.getStoredImages(projectId, search, page, limit);
      const images = imagesResult.data;

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
      logger.error('Get Stored Images failed:', error);
      throw new AppError('Get Stored Images failed', 500, 'DATABASE_ERROR');
    }
  }
}

export default new DockerRegistryService();
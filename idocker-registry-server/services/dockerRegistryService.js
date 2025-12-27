/**
 * Docker Registry API 服务模块
 * 
 * 负责与Docker Registry API的交互，实现镜像仓库的完整操作
 * 遵循Docker Registry API v2规范
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { dbGet, dbAll, dbRun, dbPaginate } from '../utils/dbHelper.js';
import { AppError } from '../middleware/errorHandler.js';

class DockerRegistryService {
  constructor() {
    this.baseURL = process.env.REGISTRY_URL || 'http://localhost:5000';
    //this.username = process.env.REGISTRY_USERNAME || null;
    //this.password = process.env.REGISTRY_PASSWORD || null;
    this.timeout = parseInt(process.env.REGISTRY_TIMEOUT) || 30000;
  }

  /**
   * 获取认证头信息
   * @param {Object} registryConfig - Registry配置对象
   * @returns {Object} 包含认证头的对象
   */
  getAuthHeaders(registryConfig = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json,application/json'
    };

    // 生产环境中，Registry 是内部服务，不需要认证
    if (process.env.NODE_ENV !== 'production') {
      // 仅在开发环境添加认证头（连接外部 Registry）
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
   * 检查Registry连接状态
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {Promise<boolean>} 连接状态
   */
  async checkConnection(registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      logger.info(`检查Registry连接: ${registryUrl}`);
      const response = await axios.get(`${registryUrl}/v2/`, {
        headers: this.getAuthHeaders(registryConfig),
        timeout: 5000
      })

      return response.status === 200;
    } catch (error) {
      logger.error('Registry连接检查失败:', error.message);
      return false;
    }
  }

  /**
   * 获取所有仓库列表
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @param {string} last - 分页参数，最后一个仓库名
   * @param {number} limit - 每页数量限制
   * @returns {Promise<Object>} 仓库列表和分页信息
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
      //logger.info(`获取仓库列表======: ${JSON.stringify(result)}`);

      // 获取每个仓库的标签数量
      for (const repo of response.data.repositories) {
        try {
          const tagsResponse = await this.getTags(repo, registryConfig);
          //logger.info(`获取仓库 ${repo} 标签数量: ${JSON.stringify(tagsResponse)}`);
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
      logger.error('获取仓库列表失败:', error.message);
      throw new AppError(`获取仓库列表失败: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * 获取仓库的所有标签
   * @param {string} repository - 仓库名称
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @param {string} last - 分页参数，最后一个标签名
   * @param {number} limit - 每页数量限制
   * @returns {Promise<Object>} 标签列表和分页信息
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

      //logger.info(`获取仓库 URL ======: ${url.toString()}`);
      //logger.info(`获取仓库 ${repository} 标签======: ${JSON.stringify(response.data)}`);

      // 获取每个标签的详细信息
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
            // 如果获取某个标签的详细信息失败，只返回基本标签信息
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
      logger.error(`获取仓库 ${repository} 标签失败:`, error.message);
      throw new AppError(`获取仓库标签失败: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * 获取镜像清单信息
   * @param {string} repository - 仓库名称
   * @param {string} tag - 标签名称
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {Promise<Object>} 清单信息
   */
  async getManifest(repository, tag, registryConfig = null) {
    try {
      const registryUrl = registryConfig?.url || this.baseURL;
      const headers = this.getAuthHeaders(registryConfig);
      
      // 移除Accept中的清单列表类型，只获取特定平台的清单
      headers['Accept'] = 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.v1+json';

      const response = await axios.get(`${registryUrl}/v2/${repository}/manifests/${tag}`, {
        headers,
        timeout: this.timeout
      });

      const digest = response.headers['docker-content-digest'];
      //logger.info(`获取镜像manifests======: ${JSON.stringify(response.data)}`);

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
      //logger.info(`获取镜像size======: ${JSON.stringify(size)}`);

      // 获取配置信息以获取镜像大小和创建时间
      if (response.data.config) {
        try {
          const configResponse = await axios.get(
            `${registryUrl}/v2/${repository}/blobs/${response.data.config.digest}`,
            {
              headers: this.getAuthHeaders(registryConfig),
              timeout: this.timeout
            }
          );
          //logger.info(`获取镜像Blobs======: ${JSON.stringify(configResponse.data)}`);
          imageInfo.created = configResponse.data.created || null;
          imageInfo.architecture = configResponse.data.architecture || 'unknown';
          imageInfo.os = configResponse.data.os || 'unknown';
        } catch (error) {
          logger.warn(`获取镜像配置失败: ${error.message}`);
        }
      }

      return imageInfo;
    } catch (error) {
      logger.error(`获取镜像清单失败 ${repository}:${tag}:`, error.message);
      throw new AppError(`获取镜像清单失败: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * 获取镜像的构建历史
   * @param {string} repository - 仓库名称
   * @param {string} tag - 标签名称
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {Promise<Array>} 构建历史记录
   */
  async getBuildHistory(repository, tag, registryConfig = null) {
    try {
      const manifest = await this.getManifest(repository, tag, registryConfig);
      
      if (!manifest.manifest.history) {
        return [];
      }

      // 提取构建历史信息
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
          }).reverse() // 反转数组，使最新的构建在顶部
        : [];

      return history;
    } catch (error) {
      logger.error(`获取构建历史失败 ${repository}:${tag}:`, error.message);
      throw new AppError(`获取构建历史失败: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * 删除镜像标签
   * @param {string} repository - 仓库名称
   * @param {string} tag - 标签名称
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {Promise<boolean>} 删除结果
   */
  async deleteTag(repository, tag, registryConfig = null) {
    try {
      // 首先获取标签的digest
      const manifest = await this.getManifest(repository, tag, registryConfig);
      
      const registryUrl = registryConfig?.url || this.baseURL;
      const response = await axios.delete(`${registryUrl}/v2/${repository}/manifests/${manifest.digest}`, {
        headers: this.getAuthHeaders(registryConfig),
        timeout: this.timeout
      });

      return response.status === 202; // Docker Registry返回202表示删除接受
    } catch (error) {
      logger.error(`删除标签失败 ${repository}:${tag}:`, error.message);
      throw new AppError(`删除标签失败: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * 获取镜像层的Blob信息
   * @param {string} repository - 仓库名称
   * @param {string} digest - 摘要
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {Promise<Object>} Blob信息
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
      logger.error(`获取Blob信息失败 ${repository}:${digest}:`, error.message);
      throw new AppError(`获取Blob信息失败: ${error.message}`, 500, 'REGISTRY_API_ERROR');
    }
  }

  /**
   * 从响应头Link中提取下一个分页URL
   * @param {string} linkHeader - Link头信息
   * @returns {string|null} 下一个分页URL
   */
  extractNextUrl(linkHeader) {
    const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
    if (nextLink) {
      return nextLink.match(/<(.+)>/)?.[1] || null;
    }
    return null;
  }

  /**
   * 获取Docker pull命令
   * @param {string} repository - 仓库名称
   * @param {string} tag - 标签名称
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {string} Docker pull命令
   */
  getPullCommand(repository, tag, registryConfig = null) {
    const registryUrl = registryConfig?.url || this.baseURL;
    const registryHost = new URL(registryUrl).host;
    return `docker pull ${registryHost}/${repository}:${tag}`;
  }

  /**
   * 获取Docker push命令
   * @param {string} repository - 仓库名称
   * @param {string} tag - 标签名称
   * @param {Object} registryConfig - Registry配置对象（可选）
   * @returns {string} Docker push命令
   */
  getPushCommand(repository, tag, registryConfig = null) {
    const registryUrl = registryConfig?.url || this.baseURL;
    const registryHost = new URL(registryUrl).host;
    return `docker push ${registryHost}/${repository}:${tag}`;
  }

  /**
   * 从数据仓库中获取已存储的镜像信息
   * @param {string} projectId - 项目ID
   * @param {string} search - 搜索关键词
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise<Object>} 镜像列表和分页信息
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
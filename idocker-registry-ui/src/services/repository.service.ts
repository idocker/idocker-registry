/**
 * 镜像仓库服务
 * 处理镜像仓库相关的API调用
 */

import type { 
  ImageDetails, 
  ImageTagDetails, 
  PaginationParams,
  ImageRepositoryPaginatedResponse,
  Repository
} from '@/types'

import { http } from '@/utils/http'

class RepositoryService {
  /**
   * 参数验证辅助方法
   */
  private validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} 不能为空`);
    }
  }

  private validatePositiveNumber(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} 不能为空`);
    }
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new Error(`${fieldName} 必须为正数`);
    }
  }

  /**
   * 获取镜像列表
   */
  async getImages(params: PaginationParams & { projectId?: string }): Promise<ImageRepositoryPaginatedResponse> {
    const queryParams = new URLSearchParams();

    if (params.page) {
      this.validatePositiveNumber(params.page, '页码');
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      this.validatePositiveNumber(params.limit, '每页数量');
      queryParams.append('limit', params.limit.toString());
    }
    if (params.search) {
      queryParams.append('search', params.search);
    }
    if (params.projectId) {
      this.validateRequired(params.projectId, '项目ID');
      queryParams.append('projectId', params.projectId);
    }

    return http.get(`/api/repository/images?${queryParams.toString()}`);
  }

  /**
   * 获取特定项目的镜像列表
   */
  async getProjectImages(
    projectId: string,
    params: PaginationParams
  ): Promise<ImageRepositoryPaginatedResponse> {
    this.validateRequired(projectId, '项目ID');

    const queryParams = new URLSearchParams();

    if (params.page) {
      this.validatePositiveNumber(params.page, '页码');
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      this.validatePositiveNumber(params.limit, '每页数量');
      queryParams.append('limit', params.limit.toString());
    }
    if (params.search) {
      queryParams.append('search', params.search);
    }

    return http.get(`/api/repository/projects/${projectId}/images?${queryParams.toString()}`);
  }

  /**
   * 获取镜像详情
   */
  async getImageDetails(imageId: string): Promise<{ success: boolean; data: ImageDetails }> {
    this.validateRequired(imageId, '镜像ID');
    return http.get(`/api/repository/images/${imageId}`);
  }

  /**
   * 获取镜像标签详情
   */
  async getImageTagDetails(imageId: string, tagId: string): Promise<{ success: boolean; data: ImageTagDetails }> {
    this.validateRequired(imageId, '镜像ID');
    this.validateRequired(tagId, '标签ID');
    return http.get(`/api/repository/images/${imageId}/tags/${tagId}`);
  }

  /**
   * 删除镜像标签
   */
  async deleteImageTag(imageId: string, tagId: string): Promise<{ success: boolean; message: string }> {
    this.validateRequired(imageId, '镜像ID');
    this.validateRequired(tagId, '标签ID');
    return http.delete(`/api/repository/images/${imageId}/tags/${tagId}`);
  }

  /**
   * 创建仓库
   */
  async createRepository(data: { projectId: number; name: string; description?: string }): Promise<{ success: boolean; message: string; data: Repository }> {
    return http.post('/api/repository/create', data);
  }

  /**
   * 同步镜像信息
   */
  async syncRepositories(): Promise<{ success: boolean; message: string; data: { repositories: number; syncedTags: number } }> {
    return http.post('/api/repository/sync');
  }

  /**
   * 获取Repository配置
   */
  async getRepositoryConfig(): Promise<{ success: boolean; data: { repositories: any[] } }> {
    return http.get('/api/repository/config');
  }

  /**
   * 从Docker Repository API获取原始数据
   */
  async getRepositories(repositoryUrl?: string): Promise<{ repositories: string[] }> {
    const baseUrl = repositoryUrl || '';
    return http.get(`${baseUrl}/v2/_catalog`);
  }

  /**
   * 从Docker Repository API获取仓库标签
   */
  async getRepositoryTags(repository: string, repositoryUrl?: string): Promise<{ name: string; tags: string[] }> {
    this.validateRequired(repository, '仓库名称');
    const baseUrl = repositoryUrl || '';
    return http.get(`${baseUrl}/v2/${repository}/tags/list`);
  }

  /**
   * 从Docker Repository API获取镜像清单
   */
  async getManifest(repository: string, reference: string, repositoryUrl?: string): Promise<any> {
    this.validateRequired(repository, '仓库名称');
    this.validateRequired(reference, '引用');
    const baseUrl = repositoryUrl || '';
    return http.get(`${baseUrl}/v2/${repository}/manifests/${reference}`);
  }
}

export default new RepositoryService()
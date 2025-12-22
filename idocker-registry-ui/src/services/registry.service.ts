/**
 * 镜像仓库服务
 * 处理镜像仓库相关的API调用
 */

import { http } from '@/utils/http'

export interface Image {
  id: number
  name: string
  namespace: string
  project: string
  description?: string
  tags: ImageTag[]
}

export interface ImageTag {
  id: number
  name: string
  digest: string
  size: number
  architecture?: string
  os?: string
  createdAt: string
  pullCommand?: string
  pushCommand?: string
}

export interface BuildHistory {
  id: number
  created: string
  createdBy: string
  emptyLayer: boolean
  comment: string
  size: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

export interface PaginatedResponse<T> {
  images: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ImageDetails {
  repository: {
    id: number
    name: string
    description?: string
    isPublic: boolean
    projectId: number
    projectName: string
    namespace: string
    fullName: string
  }
  tags: ImageTag[]
}

export interface ImageTagDetails {
  repository: {
    id: number
    name: string
    description?: string
    isPublic: boolean
    projectId: number
    projectName: string
    namespace: string
    fullName: string
  }
  tag: ImageTag
  buildHistory: BuildHistory[]
}

class RegistryService {
  /**
   * 获取镜像列表
   */
  async getImages(params: PaginationParams & { projectId?: string }): Promise<PaginatedResponse<Image>> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.projectId) queryParams.append('projectId', params.projectId)
    
    return http.get(`/api/registry/images?${queryParams.toString()}`)
  }

  /**
   * 获取特定项目的镜像列表
   */
  async getProjectImages(
    projectId: string,
    params: PaginationParams
  ): Promise<PaginatedResponse<Image>> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    
    return http.get(`/api/registry/projects/${projectId}/images?${queryParams.toString()}`)
  }

  /**
   * 获取镜像详情
   */
  async getImageDetails(imageId: string): Promise<{ success: boolean; data: ImageDetails }> {
    return http.get(`/api/registry/images/${imageId}`)
  }

  /**
   * 获取镜像标签详情
   */
  async getImageTagDetails(imageId: string, tagId: string): Promise<{ success: boolean; data: ImageTagDetails }> {
    return http.get(`/api/registry/images/${imageId}/tags/${tagId}`)
  }

  /**
   * 删除镜像标签
   */
  async deleteImageTag(imageId: string, tagId: string): Promise<{ success: boolean; message: string }> {
    return http.delete(`/api/registry/images/${imageId}/tags/${tagId}`)
  }

  /**
   * 同步镜像信息
   */
  async syncRegistry(): Promise<{ success: boolean; message: string; data: { repositories: number; syncedTags: number } }> {
    return http.post('/api/registry/sync')
  }

  /**
   * 获取Registry配置
   */
  async getRegistryConfig(): Promise<{ success: boolean; data: { registries: any[] } }> {
    return http.get('/api/registry/config')
  }

  /**
   * 从Docker Registry API获取原始数据
   */
  async getRepositories(registryUrl?: string): Promise<{ repositories: string[] }> {
    const baseUrl = registryUrl || ''
    return http.get(`${baseUrl}/v2/_catalog`)
  }

  /**
   * 从Docker Registry API获取仓库标签
   */
  async getRepositoryTags(repository: string, registryUrl?: string): Promise<{ name: string; tags: string[] }> {
    const baseUrl = registryUrl || ''
    return http.get(`${baseUrl}/v2/${repository}/tags/list`)
  }

  /**
   * 从Docker Registry API获取镜像清单
   */
  async getManifest(repository: string, reference: string, registryUrl?: string): Promise<any> {
    const baseUrl = registryUrl || ''
    return http.get(`${baseUrl}/v2/${repository}/manifests/${reference}`)
  }
}

export default new RegistryService()
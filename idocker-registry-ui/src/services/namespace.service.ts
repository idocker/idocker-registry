/**
 * 命名空间服务
 * 处理命名空间管理相关的API调用
 */

import { http } from '@/utils/http'
import type {
  PaginationParams,
  ApiResponse,
  Namespace,
  CreateNamespaceData,
  UpdateNamespaceData,
  NamespacePaginatedResponse
} from '@/types'

class NamespaceService {
  /**
   * 获取命名空间列表
   */
  async getNamespaces(params: PaginationParams & { isActive?: boolean }): Promise<NamespacePaginatedResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    
    return http.get(`/api/namespaces?${queryParams.toString()}`)
  }

  /**
   * 获取命名空间详情
   */
  async getNamespace(id: string): Promise<ApiResponse<Namespace>> {
    return http.get(`/api/namespaces/${id}`)
  }

  /**
   * 创建命名空间
   */
  async createNamespace(namespaceData: CreateNamespaceData): Promise<ApiResponse<Namespace>> {
    return http.post('/api/namespaces', namespaceData)
  }

  /**
   * 更新命名空间
   */
  async updateNamespace(id: string, namespaceData: UpdateNamespaceData): Promise<ApiResponse<Namespace>> {
    return http.put(`/api/namespaces/${id}`, namespaceData)
  }

  /**
   * 删除命名空间
   */
  async deleteNamespace(id: string): Promise<ApiResponse<void>> {
    return http.delete(`/api/namespaces/${id}`)
  }

  /**
   * 恢复命名空间
   */
  async reactivateNamespace(id: string): Promise<ApiResponse<void>> {
    return http.post(`/api/namespaces/${id}/reactivate`)
  }
}

export default new NamespaceService()
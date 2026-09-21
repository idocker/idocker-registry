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
  NamespacePaginatedResponse,
  DeletedFilter
} from '@/types'

class NamespaceService {
  /**
   * 获取命名空间列表
   * @param params.deleted 回收站过滤：'0' 仅未删除（默认）/ '1' 仅回收站 / 'all' 全部
   */
  async getNamespaces(params: PaginationParams & { isActive?: boolean; deleted?: DeletedFilter }): Promise<NamespacePaginatedResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params.deleted !== undefined) queryParams.append('deleted', params.deleted)
    
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
   * 更新命名空间（仅描述可改）
   */
  async updateNamespace(id: string, namespaceData: UpdateNamespaceData): Promise<ApiResponse<Namespace>> {
    return http.put(`/api/namespaces/${id}`, namespaceData)
  }

  /**
   * 删除命名空间（假删除，移入回收站；后端会拦截仍有项目的命名空间）
   */
  async deleteNamespace(id: string): Promise<ApiResponse<void>> {
    return http.delete(`/api/namespaces/${id}`)
  }

  /**
   * 从回收站恢复命名空间（仅管理员）
   */
  async restoreNamespace(id: string): Promise<ApiResponse<Namespace>> {
    return http.post(`/api/namespaces/${id}/restore`)
  }

  /**
   * 彻底删除命名空间（物理删除，仅管理员，不可恢复）
   */
  async purgeNamespace(id: string): Promise<ApiResponse<void>> {
    return http.delete(`/api/namespaces/${id}/purge`)
  }
}

export default new NamespaceService()
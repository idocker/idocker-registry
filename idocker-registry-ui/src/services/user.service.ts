/**
 * 用户管理服务
 * 处理用户管理相关的API调用
 */

import { http } from '@/utils/http'
import type {
  User,
  UserDetail,
  CreateUser,
  UpdateUser,
  ChangePassword,
  UserPaginatedResponse
} from '@/types'

// 扩展PaginationParams接口，添加role属性
interface UserPaginationParams {
  page?: number
  limit?: number
  search?: string
  role?: string
}

class UserService {
  /**
   * 获取用户列表
   */
  async getUsers(params: UserPaginationParams): Promise<UserPaginatedResponse> {
    const queryParams = new URLSearchParams()
    
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.role) queryParams.append('role', params.role)
    
    return http.get(`/api/users?${queryParams.toString()}`)
  }

  /**
   * 获取用户详情
   */
  async getUser(id: string): Promise<{ success: boolean; data: UserDetail }> {
    return http.get(`/api/users/${id}`)
  }

  /**
   * 创建用户
   */
  async createUser(userData: CreateUser): Promise<{ success: boolean; message: string; data: User }> {
    return http.post('/api/users', userData)
  }

  /**
   * 更新用户
   */
  async updateUser(id: string, userData: UpdateUser): Promise<{ success: boolean; message: string; data: User }> {
    return http.put(`/api/users/${id}`, userData)
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return http.delete(`/api/users/${id}`)
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(id: string, passwordData: ChangePassword): Promise<{ success: boolean; message: string }> {
    return http.put(`/api/users/${id}/password`, passwordData)
  }

  /**
   * 获取用户项目列表
   */
  async getUserProjects(id: string): Promise<{ success: boolean; data: { user: { id: number; username: string }; projects: any[] } }> {
    return http.get(`/api/users/${id}/projects`)
  }

  /**
   * 将用户添加到项目
   */
  async addUserToProject(id: string, projectId: string, role: 'owner' | 'maintainer' | 'viewer' = 'viewer'): Promise<{ success: boolean; message: string }> {
    return http.post(`/api/users/${id}/projects/${projectId}`, { role })
  }

  /**
   * 从项目中移除用户
   */
  async removeUserFromProject(id: string, projectId: string): Promise<{ success: boolean; message: string }> {
    return http.delete(`/api/users/${id}/projects/${projectId}`)
  }

  /**
   * 上传用户头像
   */
  async uploadAvatar(file: File): Promise<{ success: boolean; data: { avatarUrl: string } }> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    // 直接使用 XMLHttpRequest 上传文件
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.open('POST', '/api/users/avatar')
      
      // 设置请求头
      if (localStorage.getItem('auth_token')) {
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('auth_token')}`)
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (e) {
            reject(new Error('Failed to parse response'))
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
      
      xhr.onerror = () => {
        reject(new Error('Network error during upload'))
      }
      
      xhr.send(formData)
    })
  }
}

export default new UserService()
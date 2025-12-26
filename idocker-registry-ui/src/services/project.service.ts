/**
 * 项目服务
 * 处理项目管理相关的API调用
 */

import { http } from '@/utils/http'

export interface Project {
  id: number
  name: string
  description?: string
  namespace?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUsername?: string
  createdByName?: string
  memberRole?: 'owner' | 'maintainer' | 'viewer'
  memberSince?: string
  memberCount?: number
  repositoryCount?: number
}

export interface ProjectMember {
  id: number
  username: string
  email?: string
  fullName?: string
  userRole: 'admin' | 'user'
  isActive: boolean
  memberRole: 'owner' | 'maintainer' | 'viewer'
  memberSince: string
}

export interface ProjectDetails extends Project {
  members: ProjectMember[]
  repositories: Array<{
    id: number
    name: string
    description?: string
    isPublic: boolean
    createdAt: string
    updatedAt: string
  }>
}

export interface CreateProjectData {
  name: string
  description?: string
  namespace?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  namespace?: string
  isActive?: boolean
}

export interface AddMemberData {
  userId: number
  role: 'owner' | 'maintainer' | 'viewer'
}

export interface UpdateMemberRoleData {
  role: 'owner' | 'maintainer' | 'viewer'
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

// 使用统一的API响应类型
export interface PaginatedResponse extends ApiResponse<{ projects: Project[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  // 保持向后兼容
  projects?: Project[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

class ProjectService {
  /**
   * 获取项目列表
   */
  async getProjects(isActive:string ,params: PaginationParams): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams()
    //console.log('isActive', isActive)
    if (isActive) queryParams.append('isActive', isActive.toString())
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.search) queryParams.append('search', params.search)
    
    return http.get(`/api/projects?${queryParams.toString()}`)
  }

  /**
   * 获取所有项目列表（包括未激活，管理员专用）
   */
  async getAllProjects(isActive: string): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams()
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString())
    return http.get(`/api/projects/all?${queryParams.toString()}`)
  }


  /**
   * 获取项目详情
   */
  async getProject(id: string): Promise<{ success: boolean; data: ProjectDetails }> {
    return http.get(`/api/projects/${id}`)
  }

  /**
   * 创建项目
   */
  async createProject(projectData: CreateProjectData): Promise<{ success: boolean; message: string; data: Project }> {
    return http.post('/api/projects', projectData)
  }

  /**
   * 更新项目
   */
  async updateProject(id: string, projectData: UpdateProjectData): Promise<{ success: boolean; message: string; data: Project }> {
    return http.put(`/api/projects/${id}`, projectData)
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    return http.delete(`/api/projects/${id}`)
  }

  /**
   * 获取项目成员列表
   */
  async getProjectMembers(id: string): Promise<{ success: boolean; data: { project: { id: number; name: string }; members: ProjectMember[] } }> {
    return http.get(`/api/projects/${id}/members`)
  }

  /**
   * 添加成员到项目
   */
  async addMember(id: string, memberData: AddMemberData): Promise<{ success: boolean; message: string }> {
    return http.post(`/api/projects/${id}/members`, memberData)
  }

  /**
   * 更新项目成员角色
   */
  async updateMemberRole(id: string, userId: string, roleData: UpdateMemberRoleData): Promise<{ success: boolean; message: string }> {
    return http.put(`/api/projects/${id}/members/${userId}`, roleData)
  }

  /**
   * 从项目中移除成员
   */
  async removeMember(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    return http.delete(`/api/projects/${id}/members/${userId}`)
  }
}

export default new ProjectService()
/**
 * 项目服务
 * 处理项目管理相关的API调用
 */

import { http } from '@/utils/http'
import type {
  Project,
  ProjectMember,
  ProjectDetails,
  CreateProjectData,
  UpdateProjectData,
  AddMemberData,
  UpdateMemberRoleData,
  PaginationParams,
  ProjectRepositoryPaginatedResponse,
  ProjectPaginatedResponse
} from '@/types'
class ProjectService {
  /**
   * 获取项目列表
   */
  async getProjects(isActive:string ,params: PaginationParams): Promise<ProjectPaginatedResponse> {
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
  async getAllProjects(isActive: string): Promise<ProjectRepositoryPaginatedResponse> {
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
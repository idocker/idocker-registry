/**
 * 仪表板服务
 * 处理仪表板相关的API调用
 */

import { http } from '@/utils/http'

export interface DashboardStats {
  projectsCount: number
  repositoriesCount: number
  usersCount: number
  replicationPoliciesCount: number
}

export interface RecentProject {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface RecentRepository {
  id: number
  name: string
  url: string
  createdAt: string
  updatedAt: string
}

class DashboardService {
  /**
   * 获取仪表板统计数据
   */
  async getStats(): Promise<{ success: boolean; data: DashboardStats }> {
    return http.get('/api/dashboard/stats')
  }

  /**
   * 获取最近的项目列表
   */
  async getRecentProjects(limit: number = 5): Promise<{ success: boolean; data: RecentProject[] }> {
    return http.get(`/api/projects?limit=${limit}`)
  }

  /**
   * 获取最近的仓库列表
   */
  async getRecentRepositories(limit: number = 5): Promise<{ success: boolean; data: RecentRepository[] }> {
    return http.get(`/api/repository?limit=${limit}`)
  }

  /**
   * 获取仪表板所有数据
   */
  async getDashboardData(limit: number = 5): Promise<{
    recentProjects: RecentProject[]
    recentRepositories: RecentRepository[]
  }> {
    const [projectsResponse, repositoriesResponse] = await Promise.all([
      this.getRecentProjects(limit),
      this.getRecentRepositories(limit)
    ])

    return {
      recentProjects: projectsResponse.data || [],
      recentRepositories: repositoriesResponse.data || []
    }
  }
}

export default new DashboardService()
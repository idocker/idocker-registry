/**
 * 仪表板服务
 * 处理仪表板相关的API调用
 */

import { http } from '@/utils/http'
import type {
  DashboardStats,
  RecentProject,
  RecentRepository
} from '@/types'

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
    return http.get(`/api/dashboard/recent-projects?limit=${limit}`)
  }

  /**
   * 获取最近的仓库列表
   */
  async getRecentRepositories(limit: number = 5): Promise<{ success: boolean; data: RecentRepository[] }> {
    return http.get(`/api/dashboard/recent-repositories?limit=${limit}`)
  }

  /**
   * 获取用户活动摘要
   */
  async getUserActivitySummary(): Promise<{ 
    success: boolean; 
    data: {
      totalUsers: number;
      activeUsers: number;
      newUsersThisMonth: number;
      userGrowthRate: number;
    }
  }> {
    return http.get('/api/dashboard/user-activity')
  }

  /**
   * 获取资源使用统计
   */
  async getResourceUsage(): Promise<{ 
    success: boolean; 
    data: {
      totalStorage: number;
      usedStorage: number;
      availableStorage: number;
      storageUtilization: number;
      totalRepositories: number;
      totalTags: number;
    }
  }> {
    return http.get('/api/dashboard/resource-usage')
  }
}

export default new DashboardService()
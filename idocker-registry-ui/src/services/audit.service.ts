/**
 * 审计日志服务
 * 处理审计日志相关的API调用
 */

import { http } from '@/utils/http'

export interface AuditLog {
  id: number
  action: string
  resourceType: string
  resourceId: string
  details: any
  ipAddress: string
  userAgent: string
  createdAt: string
  username?: string
  fullName?: string
  email?: string
}

export interface AuditLogDetail extends AuditLog {
  details: any
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface PaginatedResponse<T> {
  logs: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AuditStatistics {
  summary: {
    totalOperations: number
    daysRange: number
  }
  byAction: Array<{ action: string; count: number }>
  byResourceType: Array<{ resource_type: string; count: number }>
  byUser: Array<{ username: string; fullName: string; count: number }>
  dailyStats: Array<{ date: string; count: number }>
  activeOperations: Array<{ action: string; count: number }>
}

export interface ExportFilters {
  action?: string
  resourceType?: string
  userId?: string
  startDate?: string
  endDate?: string
  format?: 'json' | 'csv'
}

class AuditService {
  /**
   * 获取审计日志列表
   */
  async getAuditLogs(filters: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const queryParams = new URLSearchParams()
    
    if (filters.page) queryParams.append('page', filters.page.toString())
    if (filters.limit) queryParams.append('limit', filters.limit.toString())
    if (filters.search) queryParams.append('search', filters.search)
    if (filters.action) queryParams.append('action', filters.action)
    if (filters.resourceType) queryParams.append('resourceType', filters.resourceType)
    if (filters.userId) queryParams.append('userId', filters.userId)
    if (filters.startDate) queryParams.append('startDate', filters.startDate)
    if (filters.endDate) queryParams.append('endDate', filters.endDate)
    
    return http.get(`/api/audit/logs?${queryParams.toString()}`)
  }

  /**
   * 获取审计日志详情
   */
  async getAuditLogDetail(id: string): Promise<{ success: boolean; data: AuditLogDetail }> {
    return http.get(`/api/audit/logs/${id}`)
  }

  /**
   * 获取审计统计信息
   */
  async getAuditStatistics(days: number = 30): Promise<{ success: boolean; data: AuditStatistics }> {
    return http.get(`/api/audit/statistics?days=${days}`)
  }

  /**
   * 清理旧审计日志
   */
  async cleanupAuditLogs(days: number = 90): Promise<{ success: boolean; message: string; data: { deletedCount: number; cutoffDate: string } }> {
    return http.delete(`/api/audit/logs/cleanup?days=${days}`)
  }

  /**
   * 获取所有操作类型
   */
  async getActionTypes(): Promise<{ success: boolean; data: string[] }> {
    return http.get('/api/audit/actions')
  }

  /**
   * 获取所有资源类型
   */
  async getResourceTypes(): Promise<{ success: boolean; data: string[] }> {
    return http.get('/api/audit/resource-types')
  }

  /**
   * 导出审计日志
   */
  async exportAuditLogs(filters: ExportFilters): Promise<any> {
    return http.post('/api/audit/export', filters, { responseType: 'blob' })
  }
}

export default new AuditService()
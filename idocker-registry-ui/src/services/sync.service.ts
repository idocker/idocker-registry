/**
 * 同步服务
 * 处理同步相关的API调用
 */

import { http } from '@/utils/http'

export interface SyncStatus {
  repositoryStatus: 'connected' | 'disconnected'
  repositoryUrl: string
  projectCount: number
  repositoryCount: number
  tagCount: number
  lastSync: {
    id: number
    type: string
    status: string
    processedCount: number
    errorCount: number
    duration: number
    createdAt: string
  } | null
}

export interface SyncLog {
  id: number
  sync_type: string
  status: string
  processed_count: number
  error_count: number
  duration: number
  created_at: string
}

export interface SyncResult {
  success: boolean
  processedCount?: number
  errorCount?: number
  totalCount?: number
  duration?: number
  message?: string
}

class SyncService {
  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<{ success: boolean; data: SyncStatus }> {
    return http.get('/api/sync/status')
  }

  /**
   * 获取同步日志
   */
  async getSyncLogs(page: number = 1, limit: number = 20): Promise<{ success: boolean; data: SyncLog[]; pagination?: any }> {
    return http.get(`/api/sync/logs?page=${page}&limit=${limit}`)
  }

  /**
   * 开始完整同步
   */
  async startFullSync(): Promise<SyncResult> {
    return http.post('/api/sync/all')
  }

  /**
   * 开始项目同步
   */
  async startProjectSync(projectId: string): Promise<SyncResult> {
    return http.post(`/api/sync/project/${projectId}`)
  }
}

export default new SyncService()
/**
 * 同步服务
 * 处理同步相关的API调用
 */

import { http } from '@/utils/http'
import type {
  SyncStatus,
  SyncLog,
  SyncResult
} from '@/types'

class SyncService {
  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<{ success: boolean; data: SyncStatus }> {
    return http.get('/api/sync/status');
  }

  /**
   * 获取同步日志列表
   */
  async getSyncLogs(params: {
    page?: number;
    limit?: number;
  }): Promise<{ 
    success: boolean; 
    data: {
      logs: SyncLog[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    return http.get(`/api/sync/logs?${queryParams.toString()}`);
  }

  /**
   * 手动触发同步
   */
  async triggerSync(syncType: 'full' | 'incremental' = 'incremental'): Promise<{ success: boolean; message: string }> {
    return http.post('/api/sync/all', { type: syncType });
  }

  /**
   * 获取同步结果
   */
  async getSyncResult(syncId: string): Promise<{ success: boolean; data: SyncResult }> {
    return http.get(`/api/sync/result/${syncId}`);
  }

  /**
   * 取消正在进行的同步
   */
  async cancelSync(syncId: string): Promise<{ success: boolean; message: string }> {
    return http.post(`/api/sync/cancel/${syncId}`);
  }

  /**
   * 配置同步设置
   */
  async configureSync(settings: {
    autoSync: boolean;
    syncInterval: number;  // 间隔分钟数
    syncType: 'full' | 'incremental';
    repositoryUrl?: string;
  }): Promise<{ success: boolean; message: string }> {
    return http.post('/api/sync/configure', settings);
  }

  /**
   * 获取同步配置
   */
  async getSyncConfig(): Promise<{ 
    success: boolean; 
    data: {
      autoSync: boolean;
      syncInterval: number;
      syncType: string;
      repositoryUrl?: string;
    }
  }> {
    return http.get('/api/sync/config');
  }
}

export default new SyncService()
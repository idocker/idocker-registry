/**
 * 审计日志服务
 * 处理审计日志相关的API调用
 */

import { http } from '@/utils/http'
import type {
  AuditLogDetail,
  AuditLogFilters,
  AuditStatistics,
  ExportFilters,
  AuditLogPaginatedResponse
} from '@/types'

class AuditService {
  /**
   * 获取审计日志列表
   */
  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLogPaginatedResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters.page) {
      queryParams.append('page', filters.page.toString());
    }
    if (filters.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    if (filters.search) {
      queryParams.append('search', filters.search);
    }
    if (filters.action) {
      queryParams.append('action', filters.action);
    }
    if (filters.resourceType) {
      queryParams.append('resourceType', filters.resourceType);
    }
    if (filters.userId) {
      queryParams.append('userId', filters.userId);
    }
    if (filters.startDate) {
      queryParams.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      queryParams.append('endDate', filters.endDate);
    }
    
    return http.get(`/api/audit/logs?${queryParams.toString()}`);
  }

  /**
   * 获取审计日志详情
   */
  async getAuditLogDetail(id: string): Promise<{ success: boolean; data: AuditLogDetail }> {
    return http.get(`/api/audit/logs/${id}`);
  }

  /**
   * 获取审计统计信息
   */
  async getAuditStatistics(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: AuditStatistics }> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    
    return http.get(`/api/audit/statistics?${queryParams.toString()}`);
  }

  /**
   * 导出审计日志
   */
  async exportAuditLogs(filters: ExportFilters): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    if (filters.action) {
      queryParams.append('action', filters.action);
    }
    if (filters.resourceType) {
      queryParams.append('resourceType', filters.resourceType);
    }
    if (filters.userId) {
      queryParams.append('userId', filters.userId);
    }
    if (filters.startDate) {
      queryParams.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      queryParams.append('endDate', filters.endDate);
    }
    if (filters.format) {
      queryParams.append('format', filters.format);
    } else {
      queryParams.append('format', 'json');
    }
    
    return http.get(`/api/audit/export?${queryParams.toString()}`, {
      responseType: 'blob'
    });
  }
}

export default new AuditService()
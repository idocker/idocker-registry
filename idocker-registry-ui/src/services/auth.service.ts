/**
 * 认证服务
 * 处理用户认证相关的API调用和令牌管理
 */

import { http } from '@/utils/http'
import type {
  LoginCredentials,
  RegisterData,
  UserProfile,
  ChangePasswordData,
  LoginResponse
} from '@/types'

class AuthService {
  /**
   * 参数验证辅助方法
   */
  private validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} 不能为空`);
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    this.validateRequired(credentials, '登录凭据');
    this.validateRequired(credentials.username, '用户名');
    this.validateRequired(credentials.password, '密码');
    
    return http.post('/api/auth/login', credentials);
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterData): Promise<{ success: boolean; message: string; data: UserProfile }> {
    this.validateRequired(userData, '用户数据');
    this.validateRequired(userData.username, '用户名');
    this.validateRequired(userData.password, '密码');
    
    return http.post('/api/auth/register', userData);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<{ success: boolean; data: UserProfile }> {
    return http.get('/api/auth/me');
  }

  /**
   * 更新用户信息
   */
  async updateProfile(userData: Partial<UserProfile>): Promise<{ success: boolean; message: string; data: UserProfile }> {
    return http.put('/api/auth/profile', userData);
  }

  /**
   * 修改密码
   */
  async changePassword(passwordData: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    this.validateRequired(passwordData, '密码数据');
    this.validateRequired(passwordData.currentPassword, '当前密码');
    this.validateRequired(passwordData.newPassword, '新密码');
    
    return http.put('/api/auth/change-password', passwordData);
  }

  /**
   * 登出
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    return http.post('/api/auth/logout');
  }

  /**
   * 刷新令牌
   */
  async refreshToken(): Promise<{ success: boolean; data: { token: string } }> {
    return http.post('/api/auth/refresh');
  }

  /**
   * 获取存储的令牌
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * 保存令牌
   */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * 移除令牌
   */
  removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService()
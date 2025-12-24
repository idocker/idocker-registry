/**
 * 认证服务
 * 处理用户认证相关的API调用和令牌管理
 */

import { http } from '@/utils/http'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  password: string
  email?: string
  fullName?: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  fullName: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: UserProfile
  }
}

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
   * 用户登出
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    return http.post('/api/auth/logout');
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterData): Promise<{ success: boolean; message: string }> {
    this.validateRequired(userData, '用户数据');
    this.validateRequired(userData.username, '用户名');
    this.validateRequired(userData.password, '密码');

    // 验证密码长度
    if (userData.password.length < 6) {
      throw new Error('密码长度不能少于6个字符');
    }

    return http.post('/api/auth/register', userData);
  }

  /**
   * 获取当前用户信息
   */
  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    return http.get('/api/auth/profile');
  }

  /**
   * 修改密码
   */
  async changePassword(passwordData: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    this.validateRequired(passwordData, '密码数据');
    this.validateRequired(passwordData.currentPassword, '当前密码');
    this.validateRequired(passwordData.newPassword, '新密码');

    // 验证新密码长度
    if (passwordData.newPassword.length < 6) {
      throw new Error('新密码长度不能少于6个字符');
    }

    return http.put('/api/auth/change-password', passwordData);
  }

  /**
   * 刷新令牌
   */
  async refreshToken(): Promise<{ success: boolean; data: { token: string } }> {
    return http.get('/api/auth/refresh');
  }

  /**
   * 从本地存储获取令牌
   */
  getToken(): string | null {
    try {
      return localStorage.getItem('idocker_token');
    } catch (error) {
      console.error('获取令牌失败:', error);
      return null;
    }
  }

  /**
   * 保存令牌到本地存储
   */
  setToken(token: string): void {
    try {
      if (!token) {
        throw new Error('令牌不能为空');
      }
      localStorage.setItem('idocker_token', token);
    } catch (error) {
      console.error('保存令牌失败:', error);
      throw new Error('无法保存令牌到本地存储');
    }
  }

  /**
   * 从本地存储移除令牌
   */
  removeToken(): void {
    try {
      localStorage.removeItem('idocker_token');
    } catch (error) {
      console.error('移除令牌失败:', error);
    }
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    try {
      const token = this.getToken();
      return !!token && token.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService()
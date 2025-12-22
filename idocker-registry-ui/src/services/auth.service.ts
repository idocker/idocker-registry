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
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return http.post('/api/auth/login', credentials)
  }

  /**
   * 用户登出
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    return http.post('/api/auth/logout')
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterData): Promise<{ success: boolean; message: string }> {
    return http.post('/api/auth/register', userData)
  }

  /**
   * 获取当前用户信息
   */
  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    return http.get('/api/auth/profile')
  }

  /**
   * 修改密码
   */
  async changePassword(passwordData: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    return http.put('/api/auth/change-password', passwordData)
  }

  /**
   * 刷新令牌
   */
  async refreshToken(): Promise<{ success: boolean; data: { token: string } }> {
    return http.get('/api/auth/refresh')
  }

  /**
   * 从本地存储获取令牌
   */
  getToken(): string | null {
    return localStorage.getItem('idocker_token')
  }

  /**
   * 保存令牌到本地存储
   */
  setToken(token: string): void {
    localStorage.setItem('idocker_token', token)
  }

  /**
   * 从本地存储移除令牌
   */
  removeToken(): void {
    localStorage.removeItem('idocker_token')
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export default new AuthService()
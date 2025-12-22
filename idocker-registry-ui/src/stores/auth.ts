import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || '',
    user: JSON.parse(localStorage.getItem('user_data') || 'null'),
    isLoading: false,
    error: null as string | null,
    // 用于显示登录提示
    showLoginPrompt: false,
    // 登录后重定向的路径
    loginRedirectPath: ''
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    currentUser: (state) => state.user
  },
  
  actions: {
    async login(loginData: { username: string, password: string, ldapAuth: boolean }) {
      try {
        this.isLoading = true
        this.error = null
        
        const response = await axios.post('/api/auth/login', loginData)
        
        const { token, user } = response.data
        
        this.token = token
        this.user = user
        
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_data', JSON.stringify(user))
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        return { success: true }
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Login failed'
        throw new Error(this.error)
      } finally {
        this.isLoading = false
      }
    },
    
    async logout() {
      try {
        if (this.token) {
          await axios.post('/api/auth/logout')
        }
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.token = ''
        this.user = null
        
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
        
        delete axios.defaults.headers.common['Authorization']
      }
    },
    
    async fetchProfile() {
      try {
        this.isLoading = true
        
        const response = await axios.get('/api/auth/profile')
        this.user = response.data.user
        
        localStorage.setItem('user_data', JSON.stringify(this.user))
        
        return this.user
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to fetch profile'
        throw new Error(this.error)
      } finally {
        this.isLoading = false
      }
    },
    
    async register(userData: { username: string, email: string, password: string, role?: string }) {
      try {
        this.isLoading = true
        this.error = null
        
        const response = await axios.post('/api/auth/register', userData)
        
        return { 
          success: true, 
          message: response.data.message,
          user: response.data.user
        }
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Registration failed'
        throw new Error(this.error)
      } finally {
        this.isLoading = false
      }
    },
    
    async changePassword(passwords: { currentPassword: string, newPassword: string }) {
      try {
        this.isLoading = true
        this.error = null
        
        const response = await axios.put('/api/auth/password', passwords)
        
        return { 
          success: true, 
          message: response.data.message
        }
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Password change failed'
        throw new Error(this.error)
      } finally {
        this.isLoading = false
      }
    },
    
    clearError() {
      this.error = null
    },
    
    clearLoginPrompt() {
      this.showLoginPrompt = false
      this.loginRedirectPath = ''
    },
    
    // 初始化认证状态
    initAuth() {
      if (this.token && !axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      }
    }
  }
})
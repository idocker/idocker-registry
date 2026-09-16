import { defineStore } from 'pinia'
import axios from 'axios'

/**
 * 从 localStorage 读取缓存的用户信息。
 *
 * 历史 bug 会把 `JSON.stringify(undefined)` 的结果（字符串 "undefined"）写进去，
 * 而 JSON.parse("undefined") 会抛 SyntaxError。由于它发生在 store 的 state 工厂里，
 * 异常会让整个 store 初始化失败、进而白屏，且用户自己无法恢复。
 * 这里兜住并顺手清掉脏数据。
 */
function readStoredUser(): any {
  const raw = localStorage.getItem('user_data')
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('user_data')
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('idocker_token') || '',
    user: readStoredUser(),
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
        
        const { token, user } = response.data.data

        console.log(token, user )
        
        this.token = token
        this.user = user
        
        localStorage.setItem('idocker_token', token)
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
        
        localStorage.removeItem('idocker_token')
        localStorage.removeItem('user_data')
        
        delete axios.defaults.headers.common['Authorization']
      }
    },
    
    async fetchProfile() {
      try {
        this.isLoading = true
        
        const response = await axios.get('/api/auth/profile')
        // 后端统一返回 { success, data: {...} }。这里原先是 response.data.user，
        // 恒为 undefined，会把用户信息清空并把 "undefined" 写进 localStorage，
        // 下次启动 JSON.parse 报错导致白屏。
        this.user = response.data?.data ?? null

        if (this.user) {
          localStorage.setItem('user_data', JSON.stringify(this.user))
        } else {
          localStorage.removeItem('user_data')
        }
        
        return this.user
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to fetch profile'
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
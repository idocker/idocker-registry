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

/**
 * 会话失效标记的存储键。
 *
 * 为什么不用纯内存字段：`utils/http.ts` 的 401 分支用 `window.location.href` 硬跳转，
 * 整页重载会把 Pinia 状态清空。所以标记必须落到 sessionStorage 才能在登录页读到。
 * 用 sessionStorage 而不是 localStorage：关掉标签页就该忘掉，不该在下次打开站点时
 * 还报“登录已过期”。
 */
const SESSION_EXPIRED_KEY = 'idocker_session_expired'

function readSessionExpiredFlag(): boolean {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
  } catch {
    // 隐私模式 / 禁用存储：退化为“没有过期标记”，最多是少一条提示，不影响登录
    return false
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('idocker_token') || '',
    user: readStoredUser(),
    isLoading: false,
    error: null as string | null,
    // 会话是否因过期 / 401 / 其他标签页登出而失效。
    // 语义是“你刚才的登录状态没了”，而不是“你没登录”——
    // 首次访问受保护页（包括直接打开站点）由路由守卫跳转，但**不**置此标记，
    // 所以那种情况下登录页不会有提示。
    sessionExpired: readSessionExpiredFlag(),
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

    /**
     * 标记会话已失效。redirectPath 会在登录成功后用于回跳。
     * 注意：这里不清空 loginRedirectPath，它是回跳依据；只负责打标记。
     */
    markSessionExpired(redirectPath?: string) {
      this.sessionExpired = true
      if (redirectPath) {
        this.loginRedirectPath = redirectPath
      }
      try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
      } catch {
        // 存不进去也不影响本次提示（内存标记已置）；只是刷新后会丢
      }
    },

    /**
     * 清除“已过期”标记，但**保留** loginRedirectPath。
     * 登录页在展示过一次提示后调用，这样用户刷新登录页不会再被重复提示。
     */
    clearSessionExpired() {
      this.sessionExpired = false
      try {
        sessionStorage.removeItem(SESSION_EXPIRED_KEY)
      } catch {
        // 忽略：删不掉时内存标记已清，刷新后最多再提示一次
      }
    },
    
    // 初始化认证状态
    initAuth() {
      if (this.token && !axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      }
    }
  }
})
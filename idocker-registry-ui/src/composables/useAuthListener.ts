import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

/**
 * 全局认证状态监听器
 * 用于检测令牌过期和未登录状态
 */
export function useAuthListener() {
  const authStore = useAuthStore()
  const router = useRouter()
  
  const isChecking = ref(false)
  
  // 检查令牌是否过期
  const checkTokenExpiry = async (): Promise<boolean> => {
    if (!authStore.token) {
      return false
    }
    
    try {
      // 简单的令牌解析来检查过期时间
      const tokenPayload = JSON.parse(atob(authStore.token.split('.')[1]))
      const expiryTime = tokenPayload.exp * 1000 // 转换为毫秒
      
      // 如果令牌将在5分钟内过期，视为即将过期
      const isExpired = Date.now() >= expiryTime
      const isNearExpiry = Date.now() >= (expiryTime - 5 * 60 * 1000)
      
      if (isExpired) {
        // 令牌已过期，清除认证状态
        await authStore.logout()
        authStore.markSessionExpired(router.currentRoute.value.fullPath)
        
        // 重定向到登录页面
        if (router.currentRoute.value.path !== '/admin/login') {
          router.push({
            path: '/admin/login',
            query: { redirect: router.currentRoute.value.fullPath }
          })
        }
        
        return true
      }
      
      if (isNearExpiry) {
        // 令牌即将过期，尝试刷新
        await refreshToken()
      }
      
      return false
    } catch (error) {
      console.error('Token expiry check failed:', error)
      return false
    }
  }
  
  // 刷新令牌
  const refreshToken = async (): Promise<boolean> => {
    if (isChecking.value) return false
    
    isChecking.value = true
    
    try {
      // 这里应该调用后端的令牌刷新接口
      // 暂时使用简单的逻辑：如果令牌存在，认为有效
      if (authStore.token) {
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      
      // 刷新失败，清除认证状态
      await authStore.logout()
      authStore.markSessionExpired(router.currentRoute.value.fullPath)
      
      if (router.currentRoute.value.path !== '/admin/login') {
        router.push({
          path: '/admin/login',
          query: { redirect: router.currentRoute.value.fullPath }
        })
      }
      
      return false
    } finally {
      isChecking.value = false
    }
  }
  
  // 定期检查令牌状态
  let checkInterval: number | null = null
  
  const startPeriodicCheck = () => {
    // 每分钟检查一次令牌状态
    checkInterval = window.setInterval(() => {
      if (authStore.isAuthenticated) {
        checkTokenExpiry()
      }
    }, 60 * 1000) // 每分钟检查一次
  }
  
  const stopPeriodicCheck = () => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
  }
  
  // 监听路由变化，检查认证状态
  const setupRouteGuard = () => {
    router.beforeEach((to, from, next) => {
      // 检查是否需要认证
      const requiresAuth = to.meta?.requiresAuth || 
                          ['taglist', 'taghistory'].includes(to.name as string)
      
      if (requiresAuth && !authStore.isAuthenticated) {
        // 仅未登录就访问受保护页（包括首次打开站点）：只跳转，不标记为“过期”，
        // 这样登录页不会弹提示。真正的会话失效由 401 / 令牌过期 / 其他标签页登出设置。
        authStore.loginRedirectPath = to.fullPath
        
        // 重定向到登录页面
        next({
          path: '/admin/login',
          query: { redirect: to.fullPath }
        })
      } else {
        next()
      }
    })
  }
  
  // 初始化认证监听器
  const init = () => {
    // 初始化认证状态
    authStore.initAuth()
    
    // 设置路由守卫
    setupRouteGuard()
    
    // 启动定期检查
    startPeriodicCheck()
    
    // 监听页面可见性变化（用户切换标签页返回时检查认证状态）
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 监听存储变化（其他标签页登出时同步状态）
    window.addEventListener('storage', handleStorageChange)
  }
  
  const destroy = () => {
    stopPeriodicCheck()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('storage', handleStorageChange)
  }
  
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && authStore.isAuthenticated) {
      // 页面变为可见时检查令牌状态
      checkTokenExpiry()
    }
  }
  
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'idocker_token' && event.newValue === null && authStore.isAuthenticated) {
      // 其他标签页清除了令牌，同步登出
      const redirectPath = router.currentRoute.value.fullPath
      authStore.logout()
      authStore.markSessionExpired(redirectPath)

      if (router.currentRoute.value.path !== '/admin/login') {
        router.push({ path: '/admin/login', query: { redirect: redirectPath } })
      }
    }
  }
  
  return {
    isChecking,
    checkTokenExpiry,
    refreshToken,
    init,
    destroy
  }
}
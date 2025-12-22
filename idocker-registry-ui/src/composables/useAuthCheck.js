import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useAuthCheck() {
  const authStore = useAuthStore()
  
  // 检查是否已认证
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  
  // 检查是否需要登录
  const requiresLogin = computed(() => {
    // 如果已经认证，不需要登录
    if (authStore.isAuthenticated) {
      return false
    }
    
    // 如果已经显示了登录提示，说明需要登录
    return authStore.showLoginPrompt && !!authStore.loginRedirectPath
  })
  
  // 显示登录提示的方法
  const showLoginPrompt = (redirectPath) => {
    authStore.showLoginPrompt = true
    authStore.loginRedirectPath = redirectPath
  }
  
  // 清除登录提示
  const clearLoginPrompt = () => {
    authStore.clearLoginPrompt()
  }
  
  return {
    isAuthenticated,
    requiresLogin,
    showLoginPrompt,
    clearLoginPrompt
  }
}
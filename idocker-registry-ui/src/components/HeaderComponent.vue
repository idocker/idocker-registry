<template>
  <header class="app-header">
    <div class="header-title">
      <router-link to="/" class="logo">
        <img :src="logo" alt="iDocker Registry" />
        <!-- <span class="material-icons">docker</span>
        <span>iDocker Registry</span> -->
      </router-link>
      <VersionNotification />
    </div>

    <div class="header-menu">
      <SearchBar @search="handleSearch" />

      <!-- 如果已登录，显示用户头像菜单 -->
      <div v-if="isLoggedIn" class="user-menu-container">
        <button class="btn btn-ghost user-avatar-btn" @click="showUserMenu = !showUserMenu" title="User Menu">
          <!-- <img v-if="userAvatarUrl" :src="userAvatarUrl" alt="User Avatar" class="user-avatar" />
          <img v-else :src="idocker" alt="Default Avatar" class="user-avatar" /> -->
          <img :src="idocker" alt="User Avatar" class="user-avatar" />
        </button>

        <UserMenu v-show="showUserMenu" :user="authStore.user" :showMenu="showUserMenu" @close="showUserMenu = false"
          @action="handleUserMenuAction" />
      </div>

      <!-- 未登录时显示登录按钮 -->
      <router-link v-else to="/admin/login" class="btn btn-ghost btn-icon" title="Management Console">
        <span class="material-icons">admin_panel_settings</span>
      </router-link>

      <template v-if="!registryStore.singleRegistry">
        <button class="btn btn-ghost btn-icon" @click="showRegistryMenu = !showRegistryMenu" title="Registry Settings">
          <span class="material-icons">settings</span>
        </button>

        <RegistryMenu v-show="showRegistryMenu" @close="showRegistryMenu = false"
          @registry-changed="handleRegistryChanged" @notify="handleNotification" />
      </template>

      <div>
        <LanguageSwitcher />
      </div>

      <button class="btn btn-ghost btn-icon" @click="toggleTheme" :title="getThemeButtonTitle()">
        <span class="material-icons">
          {{ getThemeButtonIcon() }}
        </span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import { useAuthStore } from '@/stores/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import SearchBar from '@/components/SearchBar.vue'
import VersionNotification from '@/components/VersionNotification.vue'
import RegistryMenu from '@/components/dialogs/RegistryMenu.vue'
import UserMenu from '@/components/dialogs/UserMenu.vue'
import type { SnackbarMessage } from '@/types'
import logo from '@/assets/logo.png'
import idocker from '@/assets/idocker.png'

const router = useRouter()
const registryStore = useRegistryStore()
const authStore = useAuthStore()
const showRegistryMenu = ref(false)
const showUserMenu = ref(false)

// 计算属性，获取用户头像URL
const userAvatarUrl = computed(() => {
  if (authStore.user?.avatar) {
    return authStore.user.avatar
  }
  // 使用Gravatar或其他默认头像服务
  if (authStore.user?.email) {
    return `https://www.gravatar.com/avatar/${encodeURIComponent(authStore.user.email)}?d=identicon&s=40`
  }
  return null
})

// 检查是否已登录
const isLoggedIn = computed(() => authStore.isAuthenticated)

// 处理用户菜单项点击
const handleUserMenuAction = (action: string) => {
  showUserMenu.value = false

  switch (action) {
    case 'profile':
      router.push('/admin/profile')
      break
    case 'projects':
      router.push('/admin/projects')
      break
    case 'users':
      // 用户管理和日志导航已在UserMenu组件中处理
      break
    case 'logs':
      // 用户管理和日志导航已在UserMenu组件中处理
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 处理登出
const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/admin/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// 在组件挂载时，如果有token但无用户信息，则获取用户信息
onMounted(async () => {
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchProfile()
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // 如果获取用户信息失败，清除token并跳转到登录页
      authStore.logout()
      router.push('/admin/login')
    }
  }
})

const handleSearch = (query: string) => {
  registryStore.setFilter(query)
}

const handleRegistryChanged = (url: string) => {
  registryStore.setRegistryUrl(url)
  showRegistryMenu.value = false
}

const handleNotification = (message: string | SnackbarMessage) => {
  registryStore.showSnackbar(message)
}

const toggleTheme = () => {
  registryStore.toggleTheme()
}

const getThemeButtonTitle = () => {
  const { theme, isDarkTheme } = registryStore
  if (theme === 'auto') {
    return isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'
  } else if (theme === 'dark') {
    return 'Switch to light theme'
  } else {
    return 'Switch to dark theme'
  }
}

const getThemeButtonIcon = () => {
  const { theme, isDarkTheme } = registryStore
  if (theme === 'auto') {
    return isDarkTheme ? 'wb_sunny' : 'brightness_2'
  } else if (theme === 'dark') {
    return 'wb_sunny'
  } else {
    return 'brightness_2'
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-title {
    display: flex;
    align-items: center;

    .logo {
      display: flex;
      align-items: center;
      color: var(--header-text);
      font-weight: 500;
      font-size: 1.25rem;
      text-decoration: none;

      .material-icons {
        margin-right: 8px;
        font-size: 28px;
      }

      img {
        //width: 28px;
        height: 56px;
        margin-right: 8px;
      }

      &:hover {
        color: var(--header-accent-text);
      }
    }
  }

  .header-menu {
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;

    .user-menu-container {
      position: relative;

      .user-avatar-btn {
        padding: 8px;
        border-radius: 50%;
        overflow: hidden;

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-avatar-placeholder {
          font-size: 24px;
        }
      }
    }
  }
}

// Mobile responsive styles
@media (max-width: 768px) {
  .app-header {
    .header-title {
      .logo {
        span:not(.material-icons) {
          display: none;
        }

        .material-icons {
          margin-right: 0;
        }
      }
    }

    .header-menu {
      gap: 8px;
    }
  }
}
</style>
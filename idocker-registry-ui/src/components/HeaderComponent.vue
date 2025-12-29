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
      <!-- <SearchBar @search="handleSearch" /> -->

      <div>
        <LanguageSwitcher />
      </div>

      <button class="btn btn-ghost btn-icon" @click="toggleTheme" :title="getThemeButtonTitle()">
        <span class="material-icons">
          {{ getThemeButtonIcon() }}
        </span>
      </button>

            <!-- If logged in, show user avatar menu -->
      <div v-if="isLoggedIn" class="user-menu-container">
        <button class="btn btn-ghost user-avatar-btn" @click="showUserMenu = !showUserMenu" :title="t('components.userMenu')">
          <!-- <img v-if="userAvatarUrl" :src="userAvatarUrl" alt="User Avatar" class="user-avatar" />
          <img v-else :src="idocker" alt="Default Avatar" class="user-avatar" /> -->
          <img :src="idocker" alt="User Avatar" class="user-avatar" />
        </button>

        <UserMenu v-show="showUserMenu" :user="authStore.user" :showMenu="showUserMenu" @close="showUserMenu = false"
          @action="handleUserMenuAction" />
      </div>

      <!-- If not logged in, show login button -->
      <router-link v-else to="/admin/login" class="btn btn-ghost btn-icon" :title="t('components.managementConsole')">
        <span class="material-icons">admin_panel_settings</span>
      </router-link>

      <template v-if="!registryStore.singleRegistry">
        <button class="btn btn-ghost btn-icon" @click="showRegistryMenu = !showRegistryMenu" :title="t('components.registrySettings')">
          <span class="material-icons">settings</span>
        </button>

        <RegistryMenu v-show="showRegistryMenu" @close="showRegistryMenu = false"
          @registry-changed="handleRegistryChanged" @notify="handleNotification" />
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
const registryStore = useRegistryStore()
const authStore = useAuthStore()
const showRegistryMenu = ref(false)
const showUserMenu = ref(false)

// Computed: get user avatar URL
const userAvatarUrl = computed(() => {
  if (authStore.user?.avatar) {
    return authStore.user.avatar
  }
  // Use Gravatar or other default avatar service
  if (authStore.user?.email) {
    return `https://www.gravatar.com/avatar/${encodeURIComponent(authStore.user.email)}?d=identicon&s=40`
  }
  return null
})

// Check if logged in
const isLoggedIn = computed(() => authStore.isAuthenticated)

// Handle user menu item click
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
      // User management and logs navigation are handled in UserMenu component
      break
    case 'logs':
      // User management and logs navigation are handled in UserMenu component
      break
    case 'logout':
      handleLogout()
      break
  }
}

// Handle logout
const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/admin/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// When component mounts, fetch user info if token exists but no user info
onMounted(async () => {
  if (authStore.token && !authStore.user) {
    try {
      await authStore.fetchProfile()
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // If failed to fetch user info, clear token and redirect to login page
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
    return isDarkTheme ? t('components.switchToLightTheme') : t('components.switchToDarkTheme')
  } else if (theme === 'dark') {
    return t('components.switchToLightTheme')
  } else {
    return t('components.switchToDarkTheme')
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
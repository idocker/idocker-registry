<template>
  <div class="nav-sidebar">
    <div class="nav-header">
      <h3>{{ $t('managementLayout.managementCenter') }}</h3>
    </div>
    
    <div class="nav-menu">
      <div class="nav-section">
        <div class="nav-section-title">{{ $t('managementLayout.personalSettings') }}</div>
        <!-- <router-link to="/admin/dashboard" class="nav-item" :class="{ active: isActive('/admin/dashboard') }">
          <span class="material-icons">dashboard</span>
          <span>{{ $t('nav.dashboard') }}</span>
        </router-link> -->
        <router-link to="/admin/profile" class="nav-item" :class="{ active: isActive('/admin/profile') }">
          <span class="material-icons">person</span>
          <span>{{ $t('managementLayout.basicInfo') }}</span>
        </router-link>
        <router-link to="/admin/password" class="nav-item" :class="{ active: isActive('/admin/password') }">
          <span class="material-icons">lock</span>
          <span>{{ $t('managementLayout.changePassword') }}</span>
        </router-link>
      </div>
      
      <div class="nav-section">
        <div class="nav-section-title">{{ $t('managementLayout.systemManagement') }}</div>
        <router-link to="/admin/projects" class="nav-item" :class="{ active: isActive('/admin/projects') }">
          <span class="material-icons">folder</span>
          <span>{{ $t('managementLayout.projectManagement') }}</span>
        </router-link>
        <router-link v-if="user && user.role === 'admin'" to="/admin/users" class="nav-item" :class="{ active: isActive('/admin/users') }">
          <span class="material-icons">people</span>
          <span>{{ $t('managementLayout.userManagement') }}</span>
        </router-link>
        <router-link v-if="user && user.role === 'admin'" to="/admin/audit" class="nav-item" :class="{ active: isActive('/admin/audit') }">
          <span class="material-icons">history</span>
          <span>{{ $t('nav.audit') }}</span>
        </router-link>
        <router-link v-if="user && user.role === 'admin'" to="/admin/sync" class="nav-item" :class="{ active: isActive('/admin/sync') }">
          <span class="material-icons">sync</span>
          <span>{{ $t('managementLayout.warehouseSync') }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

const user = computed(() => authStore.user)

// 检查当前路由是否匹配给定的路径
const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.nav-sidebar {
  width: 250px;
  //background-color: var(--sidebar-bg, var(--card-bg));
  border-right: 1px solid var(--border-color);
  min-height: calc(100vh - 117px - 2rem);
  position: sticky;
  top: 64px;
  overflow-y: auto;
  transition: transform 0.3s ease;
}

.nav-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text);
  }
}

.nav-menu {
  padding: 16px 0;
}

.nav-section {
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.nav-section-title {
  padding: 0 16px 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  margin: 2px 8px;
  border-radius: 6px;
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: var(--hover-bg);
  }
  
  &.active {
    background-color: var(--primary-color-light);
    color: var(--primary-color);
    font-weight: 500;
  }
  
  .material-icons {
    font-size: 20px;
  }
}

// 响应式设计
@media (max-width: 768px) {


  .content-header {
    padding-left: 0;
  }

  .nav-sidebar {
    position: fixed;
    left: 0;
    top: 64px;
    z-index: 999;
    transform: translateX(-100%);
    background-color: var(--background);
    backdrop-filter: blur(4px);
    width: 100%;
    min-height: calc(100vh - 125px - 2rem);
    
    &.open {
      transform: translateX(0);
    }
  }
}
</style>
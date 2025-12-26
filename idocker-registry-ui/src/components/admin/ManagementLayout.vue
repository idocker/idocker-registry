<template>
  <div class="management-layout">
    <NavigationSidebar ref="sidebarRef" />
    
    <div class="management-content">
      <div class="content-header">
        <button class="sidebar-toggle" @click="toggleSidebar" :title="$t('managementLayout.toggleSidebar')">
          <span class="material-icons">menu</span>
        </button>
        
        <div class="page-title">
          <h1>{{ pageTitle }}</h1>
          <p v-if="pageSubtitle" class="page-subtitle">{{ pageSubtitle }}</p>
        </div>
      </div>
      
      <div class="content-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import NavigationSidebar from '@/components/admin/NavigationSidebar.vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const sidebarRef = ref(null)
const isMobile = ref(false)
const { t } = useI18n()

// 页面标题
const pageTitle = ref('')
const pageSubtitle = ref('')

// 设置页面标题
const setPageTitle = () => {
  switch (route.path) {
    case '/admin/profile':
      pageTitle.value = t('pageTitles.basicInfo')
      pageSubtitle.value = t('pageTitles.basicInfoSubtitle')
      break
    case '/admin/password':
      pageTitle.value = t('pageTitles.changePassword')
      pageSubtitle.value = t('pageTitles.changePasswordSubtitle')
      break
    case '/admin/dashboard':
      pageTitle.value = t('pageTitles.dashboard')
      pageSubtitle.value = t('pageTitles.dashboardSubtitle')
      break
    case '/admin/projects':
      pageTitle.value = t('pageTitles.projectManagement')
      pageSubtitle.value = t('pageTitles.projectManagementSubtitle')
      break
    case '/admin/users':
      pageTitle.value = t('pageTitles.userManagement')
      pageSubtitle.value = t('pageTitles.userManagementSubtitle')
      break
    case '/admin/audit':
      pageTitle.value = t('pageTitles.auditLog')
      pageSubtitle.value = t('pageTitles.auditLogSubtitle')
      break
    case '/admin/sync':
      pageTitle.value = t('pageTitles.warehouseSync')
      pageSubtitle.value = t('pageTitles.warehouseSyncSubtitle')
      break
    default:
      // 如果是项目详情页
      if (route.path.startsWith('/admin/projects/')) {
        pageTitle.value = t('pageTitles.projectDetail')
        pageSubtitle.value = t('pageTitles.projectDetailSubtitle')
      } else {
        pageTitle.value = t('pageTitles.managementCenter')
        pageSubtitle.value = ''
      }
  }
}

// 检测是否是移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 切换侧边栏
const toggleSidebar = () => {
  if (sidebarRef.value && sidebarRef.value.$el && isMobile.value) {
    sidebarRef.value.$el.classList.toggle('open')
  }
}

// 处理窗口大小变化
const handleResize = () => {
  checkMobile()
}

onMounted(() => {
  setPageTitle()
  checkMobile()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.management-layout {
  display: flex;
  min-height: calc(100vh - 117px - 2rem);
}

.management-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
}

.content-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  //border-bottom: 1px solid var(--border-color);
  //background-color: var(--card-bg);
  
  .sidebar-toggle {
    display: none;
    background: none;
    border: none;
    padding: 8px;
    border-radius: 4px;
    margin-right: 16px;
    color: var(--text);
    cursor: pointer;
    
    &:hover {
      background-color: var(--hover-bg);
    }
    
    .material-icons {
      font-size: 24px;
    }
  }
  
  .page-title {
    h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--primary-text);
    }
    
    .page-subtitle {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
    }
  }
}

.content-body {
  flex: 1;
  padding: 24px;
  background-color: var(--background);
  overflow-y: auto;
}

// 响应式设计
@media (max-width: 768px) {
  .management-layout[data-v-5b26ef54] {
    display: flex;
    min-height: calc(100vh - 145px - 2rem);
}

  .management-content {
    width: 100%;
    min-height: calc(100vh - 145px - 2rem);
  }
    
  .app-content {
    min-height: calc(100vh - 145px - 2rem);
  }

  .content-header {
    padding: 0px;
    .sidebar-toggle {
      display: block;
    }
  }
  
  .content-body {
    padding: 16px;
  }
}
</style>
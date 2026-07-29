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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavigationSidebar from '@/components/admin/NavigationSidebar.vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const sidebarRef = ref(null)
const isMobile = ref(false)
const { t } = useI18n()

// Page title
const pageTitle = ref('')
const pageSubtitle = ref('')

// Set page title
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
    case '/admin/namespaces':
      pageTitle.value = t('namespaces.namespaceManagement')
      pageSubtitle.value = t('namespaces.namespaceManagementDesc')
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
    case '/admin/repositories':
      pageTitle.value = t('managementLayout.repositoryManagement')
      pageSubtitle.value = t('managementLayout.repositoryManagementDesc')
      break
    case '/admin/user-guide':
      pageTitle.value = t('nav.userGuide')
      pageSubtitle.value = ''
      break
    default:
      // If it's a project detail page
      if (route.path.startsWith('/admin/projects/')) {
        pageTitle.value = t('projectDetail.projectRepo')
        const ns = route.query.namespace as string
        const nm = route.query.name as string
        if (ns && nm) {
          pageSubtitle.value = `${decodeURIComponent(ns)} / ${decodeURIComponent(nm)}`
        } else {
          pageSubtitle.value = ''
        }
      } else {
        pageTitle.value = t('pageTitles.managementCenter')
        pageSubtitle.value = ''
      }
  }
}

// Check if it's a mobile device
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Toggle sidebar
const toggleSidebar = () => {
  if (sidebarRef.value && sidebarRef.value.$el && isMobile.value) {
    sidebarRef.value.$el.classList.toggle('open')
  }
}

// Handle window resize
const handleResize = () => {
  checkMobile()
}

onMounted(() => {
  setPageTitle()
  checkMobile()
  window.addEventListener('resize', handleResize)
})

watch(() => route.fullPath, () => {
  setPageTitle()
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
    color: var(--primary-text);
    cursor: pointer;
    
    &:hover {
      background-color: var(--hover-background);
    }
    
    .material-icons {
      font-size: 24px;
    }
  }
  
  .page-title {
    flex: 1;
    h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--primary-text);
    }
    
    .page-subtitle {
      margin: 0;
      font-size: 14px;
      color: var(--neutral-text);
    }
  }

}

.content-body {
  flex: 1;
  padding: 24px;
  background-color: var(--background);
  overflow-y: auto;
}

// Responsive design
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
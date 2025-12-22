<template>
  <div class="management-layout">
    <NavigationSidebar ref="sidebarRef" />
    
    <div class="management-content">
      <div class="content-header">
        <button class="sidebar-toggle" @click="toggleSidebar" title="Toggle Sidebar">
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

const route = useRoute()
const sidebarRef = ref(null)
const isMobile = ref(false)

// 页面标题
const pageTitle = ref('')
const pageSubtitle = ref('')

// 设置页面标题
const setPageTitle = () => {
  switch (route.path) {
    case '/admin/profile':
      pageTitle.value = '基本信息'
      pageSubtitle.value = '管理您的个人信息和偏好设置'
      break
    case '/admin/password':
      pageTitle.value = '修改密码'
      pageSubtitle.value = '为了您的账户安全，请定期更新密码'
      break
    case '/admin/dashboard':
      pageTitle.value = '仪表盘'
      pageSubtitle.value = '系统概览和统计信息'
      break
    case '/admin/projects':
      pageTitle.value = '项目管理'
      pageSubtitle.value = '管理系统中的所有项目和权限'
      break
    case '/admin/users':
      pageTitle.value = '用户管理'
      pageSubtitle.value = '管理系统中的所有用户和角色'
      break
    case '/admin/audit':
      pageTitle.value = '审计日志'
      pageSubtitle.value = '查看系统操作记录和审计信息'
      break
    default:
      // 如果是项目详情页
      if (route.path.startsWith('/admin/projects/')) {
        pageTitle.value = '项目详情'
        pageSubtitle.value = '查看和管理项目详情'
      } else {
        pageTitle.value = '管理中心'
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
  if (sidebarRef.value && isMobile.value) {
    sidebarRef.value.classList.toggle('open')
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
  border-bottom: 1px solid var(--border-color);
  background-color: var(--card-bg);
  
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
      color: var(--text);
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
  .management-content {
    width: 100%;
  }
  
  .content-header {
    .sidebar-toggle {
      display: block;
    }
  }
  
  .content-body {
    padding: 16px;
  }
}
</style>
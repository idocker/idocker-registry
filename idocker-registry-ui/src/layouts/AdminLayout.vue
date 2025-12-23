<!--
  管理后台布局组件
  提供管理界面的布局结构，包括侧边栏和内容区域
-->
<template>
  <div class="admin-layout">
    <!-- 顶部导航栏 -->
    <HeaderComponent />
    
    <!-- 管理内容区域 -->
    <div class="admin-content">
      <!-- 侧边导航 -->
      <NavigationSidebar class="sidebar" />
      
      <!-- 主内容区域 -->
      <main class="main-content">
        <RouterView />
      </main>
    </div>
    
    <!-- 全局组件 -->
    <SnackbarComponent />
    <ErrorComponent />
  </div>
</template>

<script setup lang="ts">
import HeaderComponent from '@/components/common/HeaderComponent.vue'
import NavigationSidebar from '@/components/admin/NavigationSidebar.vue'
import SnackbarComponent from '@/components/common/SnackbarComponent.vue'
import ErrorComponent from '@/components/common/ErrorComponent.vue'
</script>

<style scoped lang="scss">
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-content {
  flex: 1;
  display: flex;
}

.sidebar {
  width: 250px;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .admin-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    background-color: var(--bg-color);
  }
  
  .main-content {
    padding: 1rem;
  }
}
</style>
<!--
  基础布局组件
  提供应用的整体布局结构，包括头部、内容和底部
-->
<template>
  <div class="base-layout">
    <!-- 顶部导航栏 -->
    <HeaderComponent />
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="container">
        <RouterView />
      </div>
    </main>
    
    <!-- 底部组件 -->
    <FooterComponent />
    
    <!-- 全局组件 -->
    <SnackbarComponent />
    <ErrorComponent />
  </div>
</template>

<script setup lang="ts">
import HeaderComponent from '@/components/common/HeaderComponent.vue'
import FooterComponent from '@/components/common/FooterComponent.vue'
import SnackbarComponent from '@/components/common/SnackbarComponent.vue'
import ErrorComponent from '@/components/common/ErrorComponent.vue'
</script>

<style scoped lang="scss">
.base-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 2rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>
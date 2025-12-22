<template>
  <div class="user-menu" @click.self="$emit('close')">
    <div class="user-menu-content">
      <div class="user-info">
        <img v-if="user.avatar" :src="user.avatar" alt="User Avatar" class="user-avatar" />
        <div v-else class="user-avatar-placeholder">
          <span class="material-icons">account_circle</span>
        </div>
        
        <div class="user-details">
          <div class="user-name">{{ user.username }}</div>
          <div class="user-email">{{ user.email }}</div>
          <div class="user-role">{{ getRoleDisplay(user.role) }}</div>
        </div>
      </div>
      
      <div class="menu-divider"></div>
      
      <div class="menu-items">
        <button class="menu-item" @click="$emit('action', 'profile')">
          <span class="material-icons">person</span>
          <span>基本信息</span>
        </button>
        
        <button class="menu-item" @click="navigateToPassword">
          <span class="material-icons">lock</span>
          <span>修改密码</span>
        </button>
        
        <button class="menu-item" @click="$emit('action', 'projects')">
          <span class="material-icons">folder</span>
          <span>项目管理</span>
        </button>
        
        <button v-if="user.role === 'admin'" class="menu-item" @click="navigateToUsers">
          <span class="material-icons">people</span>
          <span>用户管理</span>
        </button>
        
        <button v-if="user.role === 'admin'" class="menu-item" @click="navigateToLogs">
          <span class="material-icons">history</span>
          <span>审计日志</span>
        </button>
        
        <div class="menu-divider"></div>
        
        <button class="menu-item logout" @click="$emit('action', 'logout')">
          <span class="material-icons">logout</span>
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'action'])

// 导航到用户管理页面
const navigateToUsers = () => {
  emit('close')
  router.push('/admin/users')
}

// 导航到密码修改页面
const navigateToPassword = () => {
  emit('close')
  router.push('/admin/password')
}

// 导航到日志页面
const navigateToLogs = () => {
  emit('close')
  router.push('/admin/audit')
}

const getRoleDisplay = (role: string) => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'maintainer':
      return '维护者'
    case 'member':
      return '成员'
    default:
      return '用户'
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 250px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
}

.user-menu-content {
  padding: 16px 0;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 0 16px 16px;
  gap: 12px;
  
  .user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--primary-color);
  }
  
  .user-avatar-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--primary-color-light);
    display: flex;
    align-items: center;
    justify-content: center;
    
    .material-icons {
      color: var(--primary-color);
      font-size: 28px;
    }
  }
  
  .user-details {
    flex: 1;
    min-width: 0;
    
    .user-name {
      font-weight: 600;
      font-size: 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .user-email {
      font-size: 14px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .user-role {
      font-size: 12px;
      color: var(--primary-color);
      margin-top: 4px;
    }
  }
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}

.menu-items {
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background-color: transparent;
    color: var(--text);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    text-align: left;
    font-weight: 500;
    
    .material-icons {
      font-size: 20px;
      opacity: 0.8;
    }
    
    &:hover {
      background-color: var(--hover-bg);
      
      .material-icons {
        opacity: 1;
      }
    }
    
    &:active {
      transform: scale(0.98);
    }
    
    &.logout {
      color: var(--danger-color);
      font-weight: 600;
      
      .material-icons {
        opacity: 0.9;
      }
      
      &:hover {
        background-color: rgba(var(--danger-color-rgb), 0.1);
        
        .material-icons {
          opacity: 1;
        }
      }
    }
  }
}
</style>
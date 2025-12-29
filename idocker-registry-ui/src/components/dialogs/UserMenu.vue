<template>
  <div class="user-menu" @click.self="$emit('close')" ref="menuRef">
    <div class="user-menu-content">
      <div class="user-info">
        <img v-if="user.avatar" :src="user.avatar" :alt="$t('users.username')" class="user-avatar" />
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

        <!-- <button class="menu-item" @click="navigateToDashboard">
          <span class="material-icons">dashboard</span>
          <span>{{ $t('nav.dashboard') }}</span>
        </button> -->

        <button class="menu-item" @click="$emit('action', 'profile')">
          <span class="material-icons">person</span>
          <span>{{ $t('nav.profile') }}</span>
        </button>
        
        <button class="menu-item" @click="navigateToPassword">
          <span class="material-icons">lock</span>
          <span>{{ $t('nav.password') }}</span>
        </button>
        
        <div class="menu-divider"></div>

        <button class="menu-item" @click="$emit('action', 'projects')">
          <span class="material-icons">folder</span>
          <span>{{ $t('projects.title') }}</span>
        </button>
        
        <button v-if="user.role === 'admin'" class="menu-item" @click="navigateToUsers">
          <span class="material-icons">people</span>
          <span>{{ $t('users.title') }}</span>
        </button>
        
        <button v-if="user.role === 'admin'" class="menu-item" @click="navigateToLogs">
          <span class="material-icons">history</span>
          <span>{{ $t('audit.title') }}</span>
        </button>

        <button v-if="user.role === 'admin'" class="menu-item" @click="navigateToSync">
          <span class="material-icons">sync</span>
          <span>{{ $t('managementLayout.warehouseSync') }}</span>
        </button>
        
        <div class="menu-divider"></div>
        
        <button class="menu-item logout" @click="$emit('action', 'logout')">
          <span class="material-icons">logout</span>
          <span>{{ $t('nav.logout') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const menuRef = ref<HTMLElement | null>(null)

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  showMenu: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'action'])

// Click outside to close menu
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

// Add delayed event listener to avoid immediate trigger
const addClickOutsideListener = () => {
  // Use setTimeout to delay adding listener to avoid immediate trigger when menu appears
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
}

// Remove event listener
const removeClickOutsideListener = () => {
  document.removeEventListener('click', handleClickOutside)
}

// Watch menu display state changes
watch(() => props.showMenu, (newVal) => {
  if (newVal) {
    // Add listener when menu shows
    addClickOutsideListener()
  } else {
    // Remove listener when menu hides
    removeClickOutsideListener()
  }
})

onMounted(() => {
  // Add listener if initial state is shown
  if (props.showMenu) {
    addClickOutsideListener()
  }
})

onUnmounted(() => {
  // Remove event listener
  removeClickOutsideListener()
})

// Navigate to user management page
const navigateToUsers = () => {
  emit('close')
  router.push('/admin/users')
}

// Navigate to project management page
const navigateToDashboard = () => {
  emit('close')
  router.push('/admin/dashboard')
}

// Navigate to warehouse sync page
const navigateToSync = () => {
  emit('close')
  router.push('/admin/sync')
}

// Navigate to password change page
const navigateToPassword = () => {
  emit('close')
  router.push('/admin/password')
}

// Navigate to logs page
const navigateToLogs = () => {
  emit('close')
  router.push('/admin/audit')
}

const getRoleDisplay = (role: string) => {
  switch (role) {
    case 'admin':
      return t('users.roleAdmin')
    case 'maintainer':
      return t('projects.roleMaintainer')
    case 'member':
      return t('projects.roleViewer')
    default:
      return t('users.roleUser')
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
  color: var(--primary-text);
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
    border: 1px solid var(--primary-color);
  }
  
  .user-avatar-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    
    .material-icons {
      color: var(--bg-color);
      font-size: 48px;
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
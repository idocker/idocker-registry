<template>
  <div class="auth-prompt-overlay" v-if="show">
    <div class="auth-prompt-modal">
      <div class="auth-prompt-content">
        <div class="auth-prompt-icon">
          <span class="material-icons">lock</span>
        </div>
        
        <h2>{{ $t('loginPage.loginPrompt') }}</h2>
        
        <p>{{ $t('loginPage.loginPrompt') }}</p>
        
        <div class="auth-prompt-actions">
          <button class="btn btn-primary" @click="redirectToLogin">
            {{ $t('auth.loginNow') }}
          </button>
          <button class="btn btn-ghost" @click="cancel">
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const authStore = useAuthStore()

const redirectToLogin = () => {
  // Set redirect path
  authStore.loginRedirectPath = router.currentRoute.value.fullPath
  
  // Close prompt
  emit('close')
  
  // Navigate to login page
  router.push({
    path: '/admin/login',
    query: { redirect: router.currentRoute.value.fullPath }
  })
}

const cancel = () => {
  emit('close')
  // Go back
  router.back()
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.auth-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.auth-prompt-modal {
  background-color: var(--card-background);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-3);
  max-width: 400px;
  width: 90%;
  overflow: hidden;
}

.auth-prompt-content {
  padding: 24px;
  text-align: center;
}

.auth-prompt-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  
  .material-icons {
    font-size: 48px;
    color: var(--accent-text);
  }
}

h2 {
  margin: 0 0 16px;
  color: var(--primary-text);
}

p {
  margin: 0 0 24px;
  color: var(--secondary-text);
}

.auth-prompt-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  
  .btn {
    padding: 10px 20px;
    border-radius: var(--border-radius);
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--transition-fast);
    
    &.btn-primary {
      background-color: var(--primary-color);
      color: white;
      
      &:hover {
        background-color: var(--primary-color-dark);
      }
    }
    
    &.btn-ghost {
      background-color: transparent;
      color: var(--primary-color);
      border: 1px solid var(--primary-color);
      
      &:hover {
        background-color: var(--primary-color-light);
      }
    }
  }
}
</style>
<template>
  <div id="app" class="app-container">
    <HeaderComponent />
    
    <main class="app-content">
      <ErrorComponent v-if="registryStore.pageError" :error="registryStore.pageError" />
      <RouterView v-else />
    </main>
    
    <FooterComponent />
    
    <!-- Session expired dialog -->
    <div v-if="authStore.showLoginPrompt" class="login-prompt-overlay">
      <div class="login-prompt-modal">
        <div class="login-prompt-content">
          <h3>{{ $t('auth.sessionExpired') }}</h3>
          <p>{{ $t('auth.sessionExpiredMessage') }}</p>
          <div class="login-prompt-actions">
            <button @click="redirectToLogin" class="btn-primary">{{ $t('auth.loginNow') }}</button>
            <button @click="clearPrompt" class="btn-secondary">{{ $t('auth.loginLater') }}</button>
          </div>
        </div>
      </div>
    </div>
    
    <SnackbarComponent
      v-if="registryStore.snackbarMessage"
      :message="typeof registryStore.snackbarMessage === 'string' 
        ? registryStore.snackbarMessage 
        : registryStore.snackbarMessage.message"
      :is-error="typeof registryStore.snackbarMessage !== 'string' 
        ? registryStore.snackbarMessage.isError 
        : false"
      :duration="typeof registryStore.snackbarMessage !== 'string' 
        ? registryStore.snackbarMessage.duration 
        : undefined"
      @close="registryStore.clearSnackbar()"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import { useAuthStore } from '@/stores/auth'
import { useAuthListener } from '@/composables/useAuthListener'
import { useI18n } from 'vue-i18n'
import HeaderComponent from '@/components/HeaderComponent.vue'
import FooterComponent from '@/components/FooterComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import SnackbarComponent from '@/components/SnackbarComponent.vue'

const { t } = useI18n()
const registryStore = useRegistryStore()
const authStore = useAuthStore()
const router = useRouter()
const authListener = useAuthListener()

// Initialize the store
onMounted(() => {
  registryStore.initialize()
  
  // Initialize authentication listener
  authListener.init()
  
  // Watch for system theme changes when using auto theme
  if (registryStore.theme === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = (e: MediaQueryListEvent) => {
      registryStore.isDarkTheme = e.matches
    }
    
    mediaQuery.addEventListener('change', handleThemeChange)
    
    // Clean up on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
      authListener.destroy()
    }
  }
})

// Redirect to login page
const redirectToLogin = () => {
  const redirectPath = authStore.loginRedirectPath || router.currentRoute.value.fullPath
  router.push({
    path: '/admin/login',
    query: { redirect: redirectPath }
  })
  authStore.clearLoginPrompt()
}

// Clear login prompt
const clearPrompt = () => {
  authStore.clearLoginPrompt()
}

// Apply theme changes to the document
watch(
  () => registryStore.currentTheme,
  (theme) => {
    document.body.className = theme === 'dark' ? 'dark-theme' : ''
  },
  { immediate: true }
)
</script>

<style lang="scss">
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

// Login prompt dialog styles
.login-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.login-prompt-modal {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
}

.login-prompt-content {
  text-align: center;
  
  h3 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  p {
    margin-bottom: 1.5rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
}

.login-prompt-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  
  button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.btn-primary {
      background: var(--primary-color);
      color: white;
      
      &:hover {
        background: var(--primary-dark);
      }
    }
    
    &.btn-secondary {
      background: var(--secondary-bg);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      
      &:hover {
        background: var(--hover-bg);
      }
    }
  }
}

// Responsive design
@media (max-width: 480px) {
  .login-prompt-modal {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .login-prompt-actions {
    flex-direction: column;
    
    button {
      width: 100%;
    }
  }
}

</style>
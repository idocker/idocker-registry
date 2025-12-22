<template>
  <div id="app" class="app-container">
    <HeaderComponent />
    
    <main class="app-content">
      <ErrorComponent v-if="registryStore.pageError" :error="registryStore.pageError" />
      <RouterView v-else />
    </main>
    
    <FooterComponent />
    
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
import { RouterView } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import HeaderComponent from '@/components/HeaderComponent.vue'
import FooterComponent from '@/components/FooterComponent.vue'
import ErrorComponent from '@/components/ErrorComponent.vue'
import SnackbarComponent from '@/components/SnackbarComponent.vue'

const registryStore = useRegistryStore()

// Initialize the store
onMounted(() => {
  registryStore.initialize()
  
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
    }
  }
})

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

</style>
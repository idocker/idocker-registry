<template>
  <div v-if="showNotification" class="version-notification">
    <span class="material-icons">info</span>
    <span class="notification-text">
      A new version ({{ latestVersion }}) is available!
    </span>
    <button class="btn btn-ghost btn-icon" @click="dismiss">
      <span class="material-icons">close</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getFromStorage, setToStorage } from '@/utils/helpers'

const currentVersion = ref('0.1.0') // Default version
const latestVersion = ref('')
const showNotification = ref(false)

onMounted(async () => {
  //await checkversion();
})

const checkversion = async () => {
  try {
    // Try to get version information
    const response = await fetch('/.version.json')
    if (response.ok) {
      const versionData = await response.json()
      currentVersion.value = versionData.version || '0.1.0'
      latestVersion.value = versionData.latest || '0.1.0'
      
      // Check if user has dismissed this version notification
      const dismissed = getFromStorage(`dismissed-version-${latestVersion.value}`)
      
      // Show notification if there's a newer version that hasn't been dismissed
      if (latestVersion.value && latestVersion.value !== currentVersion.value && !dismissed) {
        showNotification.value = true
      }
    }
  } catch (error) {
    console.warn('Could not check for new version:', error)
  }

}

const dismiss = () => {
  if (latestVersion.value) {
    setToStorage(`dismissed-version-${latestVersion.value}`, 'true')
  }
  showNotification.value = false
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.version-notification {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 4px 8px;
  background-color: rgba(255, 152, 0, 0.1);
  border-radius: var(--border-radius);
  color: var(--warning-color);
  font-size: 12px;
  
  .material-icons {
    font-size: 14px;
  }
  
  .notification-text {
    flex: 1;
  }
  
  .btn {
    margin-left: 4px;
    color: var(--warning-color);
    
    &:hover {
      background-color: rgba(255, 152, 0, 0.2);
    }
  }
}
</style>
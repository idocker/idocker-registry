<template>
  <div class="error-container">
    <div class="card error-card">
      <div class="error-icon">
        <span class="material-icons">error</span>
      </div>
      
      <div class="error-content">
        <h2>{{ errorTitle }}</h2>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div v-if="errorDetails" class="error-details">
          <h3>{{ $t('error.errorPage.details') }}</h3>
          <pre>{{ errorDetails }}</pre>
        </div>
        
        <div class="error-actions">
          <button class="btn btn-primary" @click="retry">
            <span class="material-icons">refresh</span>
            {{ $t('error.errorPage.retry') }}
          </button>
          <button class="btn btn-ghost" @click="goHome">
            <span class="material-icons">home</span>
            {{ $t('error.errorPage.goHome') }}
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
import type { RegistryError } from '@/types'

interface Props {
  error: RegistryError
}

const props = defineProps<Props>()

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()
const { t } = useI18n()

// Extract error information
const errorTitle = computed(() => {
  switch (props.error.code) {
    case 'NETWORK_ERROR':
      return t('error.errorPage.networkError')
    case 'MIXED_CONTENT':
      return t('error.errorPage.mixedContent')
    case 'INCORRECT_URL':
      return t('error.errorPage.invalidUrl')
    case 'CATALOG_NOT_FOUND':
      return t('error.errorPage.catalogNotFound')
    case 'HTTP_ERROR':
      return `${t('error.errorPage.httpError')} ${props.error.status || 'Unknown'}`
    default:
      return t('error.errorPage.unknownError')
  }
})

const errorMessage = computed(() => {
  return props.error.message || t('error.errorPage.unknownErrorOccurred')
})

const errorDetails = computed(() => {
  return props.error.detail
})

const retry = () => {
  emit('retry')
}

const goHome = () => {
  router.push({ name: 'catalog' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.error-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 16px;
  
  .error-card {
    display: flex;
    align-items: flex-start;
    padding: 24px;
    box-shadow: var(--shadow-2);
    
    .error-icon {
      margin-right: 16px;
      
      .material-icons {
        font-size: 48px;
        color: var(--error-color);
      }
    }
    
    .error-content {
      flex: 1;
      
      h2 {
        margin: 0 0 8px 0;
        color: var(--primary-text);
      }
      
      .error-message {
        margin: 0 0 16px 0;
        color: var(--neutral-text);
        line-height: 1.5;
      }
      
      .error-details {
        margin-bottom: 24px;
        
        h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: var(--primary-text);
        }
        
        pre {
          background-color: var(--hover-background);
          padding: 12px;
          border-radius: var(--border-radius);
          font-size: 14px;
          color: var(--primary-text);
          overflow: auto;
          max-height: 200px;
        }
      }
      
      .error-actions {
        display: flex;
        gap: 12px;
        
        .btn {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
  }
}
</style>
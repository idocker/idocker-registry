<template>
  <div class="catalog-view">
    <AuthPrompt 
      v-if="showAuthPrompt" 
      @close="hideAuthPrompt" 
    />
    <div class="card header-card">
      <h2>
        Repositories of {{ registryStore.registryName }}
        <div class="item-count" v-if="catalogStore.loadend">
          {{ catalogStore.nImages }} images in {{ catalogStore.nRepositories }} repositories
        </div>
      </h2>
    </div>

    <div v-if="!catalogStore.loadend" class="loading-container">
      <div class="spinner large"></div>
    </div>

    <div v-else-if="catalogStore.repositories.length === 0" class="empty-state">
      <span class="material-icons">inbox</span>
      <h3>No repositories found</h3>
      <p>This registry doesn't contain any repositories yet.</p>
    </div>

    <div v-else class="catalog-list">
      <CatalogElement
        v-for="repo in catalogStore.repositories"
        :key="repo.name"
        :repository="repo"
        :filter="registryStore.filter"
        @notify="handleNotification"
        @error="handleError"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { useRegistryStore } from '@/stores/registry'
import { useCatalogStore } from '@/stores/catalog'
import { useAuthStore } from '@/stores/auth'
import CatalogElement from '@/components/catalog/CatalogElement.vue'
import AuthPrompt from '@/components/common/AuthPrompt.vue'
import type { RegistryError } from '@/types'

const registryStore = useRegistryStore()
const catalogStore = useCatalogStore()
const authStore = useAuthStore()

// 计算属性：是否显示授权提示
const showAuthPrompt = computed(() => {
  return authStore.showLoginPrompt && authStore.loginRedirectPath
})

// 隐藏授权提示
const hideAuthPrompt = () => {
  authStore.clearLoginPrompt()
}

// Load catalog data when component mounts
onMounted(() => {
  loadCatalog()
})

// Note: No need to watch for registry URL changes anymore since we're using backend API

// Watch for filter changes
watch(
  () => registryStore.filter,
  () => {
    catalogStore.applyFilter(registryStore.filter)
  }
)

onUnmounted(() => {
  catalogStore.cleanup()
})

const loadCatalog = async () => {
  catalogStore.clearError()
  await catalogStore.fetchCatalog({
    elementsLimit: registryStore.catalogElementsLimit,
    showNbTags: registryStore.showCatalogNbTags,
    catalogMinBranches: registryStore.catalogMinBranches,
    catalogMaxBranches: registryStore.catalogMaxBranches,
    defaultExpanded: registryStore.catalogDefaultExpanded,
    isRegistrySecured: registryStore.isRegistrySecured
  })
}

const handleNotification = (message: string) => {
  registryStore.showSnackbar(message)
}

const handleError = (error: RegistryError) => {
  registryStore.showError(error)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.catalog-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  
  .header-card {
    margin-bottom: 16px;
    
    h2 {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .item-count {
        font-size: 14px;
        color: var(--neutral-text);
        font-weight: 400;
      }
    }
  }
  
  .loading-container {
    display: flex;
    justify-content: center;
    padding: 32px 0;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    text-align: center;
    
    .material-icons {
      font-size: 64px;
      color: var(--neutral-text);
      margin-bottom: 16px;
    }
    
    h3 {
      margin: 0 0 8px;
      color: var(--primary-text);
    }
    
    p {
      margin: 0;
      color: var(--neutral-text);
    }
  }
  
  .catalog-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
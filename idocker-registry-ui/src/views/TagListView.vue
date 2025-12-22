<template>
  <div class="taglist-view">
    <AuthPrompt 
      v-if="showAuthPrompt" 
      @close="hideAuthPrompt" 
    />
    <div class="card header-card">
      <div class="header-content">
        <button class="btn btn-ghost btn-icon" @click="goBack" title="Back to catalog">
          <span class="material-icons">arrow_back</span>
        </button>
        <div class="header-info">
          <h2>Tags of {{ imageName }}</h2>
          <div class="source-hint">Sourced from {{ registryStore.registryName }}/{{ imageName }}</div>
          <div class="item-count" v-if="tagListStore.loadend">{{ tagListStore.tags.length }} tags</div>
        </div>
      </div>
    </div>

    <div v-if="!tagListStore.loadend" class="loading-container">
      <div class="spinner large"></div>
    </div>

    <div v-else-if="tagListStore.tags.length === 0" class="empty-state">
      <span class="material-icons">local_offer</span>
      <h3>No tags found</h3>
      <p>This image doesn't contain any tags yet.</p>
    </div>

    <template v-else>
      <!-- Pagination controls -->
      <PaginationComponent
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-changed="handlePageChange"
      />

      <!-- Sort controls -->
      <div class="controls-container">
        <button class="btn btn-ghost" @click="toggleSortOrder">
          <span class="material-icons">{{ sortOrderAsc ? 'arrow_downward' : 'arrow_upward' }}</span>
          Sort {{ sortOrderAsc ? 'Ascending' : 'Descending' }}
        </button>
        
        <div class="search-bar">
          <span class="material-icons search-icon">search</span>
          <input
            type="text"
            class="search-input"
            v-model="tagFilter"
            placeholder="Filter tags..."
          />
        </div>
      </div>

      <!-- Tags table -->
      <TagTable
        :tags="paginatedTags"
        :show-content-digest="registryStore.showContentDigest"
        :show-tag-history="registryStore.showTagHistory"
        :is-image-remove-activated="registryStore.deleteImages"
        :registry-url="registryStore.registryUrl"
        :pull-url="registryStore.pullUrl"
        :filter="tagFilter"
        @notify="handleNotification"
        @error="handleError"
        @tag-deleted="handleTagDeleted"
      />

      <!-- Pagination controls -->
      <PaginationComponent
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-changed="handlePageChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import { useTagListStore } from '@/stores/taglist'
import { useAuthStore } from '@/stores/auth'
import { getTagComparator, taglistOrderParser } from '@/utils/helpers'
import PaginationComponent from '@/components/tag-list/PaginationComponent.vue'
import TagTable from '@/components/tag-list/TagTable.vue'
import AuthPrompt from '@/components/common/AuthPrompt.vue'

const router = useRouter()
const route = useRoute()
const registryStore = useRegistryStore()
const tagListStore = useTagListStore()
const authStore = useAuthStore()

// 计算属性：是否显示授权提示
const showAuthPrompt = computed(() => {
  return authStore.showLoginPrompt && authStore.loginRedirectPath
})

// 隐藏授权提示
const hideAuthPrompt = () => {
  authStore.clearLoginPrompt()
}

// Image name from route params
const imageName = computed(() => route.params.image as string)

// Pagination and sorting
const currentPage = ref(1)
const tagFilter = ref('')
const sortOrderAsc = ref(true)
const tagComparator = getTagComparator(taglistOrderParser(registryStore.taglistOrder))

// Computed properties
const filteredTags = computed(() => {
  if (!tagFilter.value) {
    return tagListStore.tags
  }
  
  return tagListStore.tags.filter(tag =>
    tag.toLowerCase().includes(tagFilter.value.toLowerCase())
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredTags.value.length / registryStore.tagsPerPage)
})

const paginatedTags = computed(() => {
  const start = (currentPage.value - 1) * registryStore.tagsPerPage
  const end = start + registryStore.tagsPerPage
  return filteredTags.value.slice(start, end)
})

// Initialize component
onMounted(() => {
  // Get page from query params
  const pageParam = route.query.page as string
  if (pageParam) {
    currentPage.value = parseInt(pageParam, 10)
  }
  
  loadTags()
})

// Watch for route changes
watch(
  () => imageName.value,
  () => {
    loadTags()
  }
)

// Watch for filter changes
watch(
  tagFilter,
  () => {
    // Reset to page 1 when filter changes
    currentPage.value = 1
    updateQueryParams()
  }
)

onUnmounted(() => {
  tagListStore.cleanup()
})

// Methods
const loadTags = async () => {
  try {
    await tagListStore.fetchTags(imageName.value, {
      useControlCacheHeader: registryStore.useControlCacheHeader,
      isRegistrySecured: registryStore.isRegistrySecured,
      comparator: tagComparator
    })
  } catch (error) {
    registryStore.showError(error as any)
  }
}

const toggleSortOrder = () => {
  sortOrderAsc.value = !sortOrderAsc.value
  
  // Sort the tags
  if (sortOrderAsc.value) {
    tagListStore.tags.sort(tagComparator)
  } else {
    tagListStore.tags.sort((a, b) => -tagComparator(a, b))
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  updateQueryParams()
}

const updateQueryParams = () => {
  const query: Record<string, string> = {}
  
  if (currentPage.value > 1) {
    query.page = currentPage.value.toString()
  }
  
  router.replace({ query })
}

const goBack = () => {
  router.push({ name: 'catalog' })
}

const handleNotification = (message: string) => {
  registryStore.showSnackbar(message)
}

const handleError = (error: any) => {
  registryStore.showError(error)
}

const handleTagDeleted = () => {
  // Reload tags after deletion
  setTimeout(loadTags, 1000)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.taglist-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  
  .header-card {
    margin-bottom: 16px;
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .header-info {
        flex: 1;
        
        h2 {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 0;
          
          .source-hint {
            font-size: 14px;
            color: var(--neutral-text);
            font-weight: 400;
          }
          
          .item-count {
            font-size: 14px;
            color: var(--neutral-text);
            font-weight: 400;
          }
        }
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
  
  .controls-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background-color: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-1);
    
    .search-bar {
      position: relative;
      width: 300px;
      
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--neutral-text);
      }
      
      .search-input {
        width: 100%;
        padding: 8px 12px 8px 40px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background-color: var(--background);
        color: var(--primary-text);
        
        &:focus {
          outline: none;
          border-color: var(--accent-text);
        }
      }
    }
  }
}
</style>
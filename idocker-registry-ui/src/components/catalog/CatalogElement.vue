<template>
  <div class="catalog-element">
    <div 
      class="element-header" 
      @click="toggleExpanded"
      :class="{ 'expanded': isExpanded }"
    >
      <span class="material-icons">
        {{ isExpanded ? 'folder_open' : 'folder' }}
      </span>
      <span class="repository-name">{{ repository.name }}</span>
      <span v-if="repository.tagCount !== undefined" class="tag-count">
        {{ repository.tagCount }} tags
      </span>
      <div class="expand-indicator">
        <span class="material-icons">
          {{ isExpanded ? 'expand_less' : 'expand_more' }}
        </span>
      </div>
    </div>
    
    <transition name="expand">
      <div v-if="isExpanded && repository.children" class="element-children">
        <CatalogElement
          v-for="child in repository.children"
          :key="child.name"
          :repository="child"
          :filter="filter"
          :depth="depth + 1"
          @notify="handleNotify"
          @error="handleError"
        />
      </div>
    </transition>
    
    <transition name="expand">
      <div v-if="isExpanded && localTags.length > 0" class="tags-list">
        <div 
          v-for="tag in filteredTags" 
          :key="tag"
          class="tag-item"
          @click="navigateToTagList(repository.name, tag)"
        >
          <span class="material-icons">local_offer</span>
          <span class="tag-name">{{ tag }}</span>
          <div class="tag-actions">
            <button 
              v-if="showTagHistory"
              class="btn btn-ghost btn-icon"
              @click.stop="navigateToTagHistory(repository.name, tag)"
              title="View tag history"
            >
              <span class="material-icons">history</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import type { Repository } from '@/types'
import getHttpService from '@/utils/http'

interface Props {
  repository: Repository & { 
    children?: Repository[], 
    tagCount?: number, 
    tags?: string[] 
  }
  filter?: string
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  filter: '',
  depth: 0
})

const emit = defineEmits<{
  notify: [message: string]
  error: [error: any]
}>()

const router = useRouter()
const registryStore = useRegistryStore()

const isExpanded = ref(false)
const showTagHistory = computed(() => registryStore.showTagHistory)

// Create a reactive copy of tags
const localTags = ref<string[]>(props.repository.tags || [])

// Determine if this element should be expanded by default
onMounted(() => {
  // Expand if defaultExpanded is true or if it's top-level repository
  if (registryStore.catalogDefaultExpanded || props.depth === 0) {
    isExpanded.value = true
  }
})

// Filter tags based on the filter prop
const filteredTags = computed(() => {
  if (!localTags.value || !props.filter) {
    return localTags.value || []
  }
  
  return localTags.value.filter(tag => 
    tag.toLowerCase().includes(props.filter!.toLowerCase())
  )
})

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  
  // If this is a repository (not a namespace) and it doesn't have tags yet, fetch them
  if (isExpanded.value && !props.children && !props.tags) {
    fetchRepositoryTags()
  }
}

const fetchRepositoryTags = async () => {
  try {
    const httpService = getHttpService()
    const response = await httpService.getTags(props.repository.name)
    console.log('fetchRepositoryTags', response)
    
    // Update the repository with tag information
    localTags.value = [...response.tags]
    props.repository.tagCount = response.tags.length
    
    // Sort tags alphabetically
    if (localTags.value) {
      localTags.value.sort()
    }
  } catch (error) {
    emit('error', error)
  }
}

const navigateToTagList = (repo: string, tag: string) => {
  router.push({ name: 'taglist', params: { image: repo } })
}

const navigateToTagHistory = (repo: string, tag: string) => {
  router.push({ name: 'taghistory', params: { image: repo, tag } })
}

const handleNotify = (message: string) => {
  emit('notify', message)
}

const handleError = (error: any) => {
  emit('error', error)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.catalog-element {
  width: 100%;
  margin-left: calc(16px * v-bind(depth));
  
  .element-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--card-background);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: background-color var(--transition-fast);
    box-shadow: var(--shadow-1);
    
    &:hover {
      background-color: var(--hover-background);
    }
    
    &.expanded {
      background-color: var(--hover-background);
      box-shadow: var(--shadow-2);
    }
    
    .material-icons {
      margin-right: 8px;
      color: var(--accent-text);
    }
    
    .repository-name {
      flex: 1;
      font-weight: 500;
      color: var(--primary-text);
    }
    
    .tag-count {
      font-size: 12px;
      color: var(--neutral-text);
      margin-right: 8px;
    }
    
    .expand-indicator {
      .material-icons {
        color: var(--neutral-text);
        margin-right: 0;
      }
    }
  }
  
  .element-children {
    margin-top: 8px;
  }
  
  .tags-list {
    margin-top: 8px;
    background-color: var(--card-background);
    border-radius: var(--border-radius);
    overflow: hidden;
    box-shadow: var(--shadow-1);
    
    .tag-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color var(--transition-fast);
      border-bottom: 1px solid var(--border-color);
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover {
        background-color: var(--hover-background);
        
        .tag-actions {
          opacity: 1;
        }
      }
      
      .material-icons {
        margin-right: 8px;
        color: var(--accent-text);
        font-size: 18px;
      }
      
      .tag-name {
        flex: 1;
        color: var(--primary-text);
      }
      
      .tag-actions {
        display: flex;
        gap: 4px;
        opacity: 0.5;
        transition: opacity var(--transition-fast);
      }
    }
  }
}

// Expand transition
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}
</style>
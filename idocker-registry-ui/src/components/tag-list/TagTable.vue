<template>
  <div class="tag-table-container">
    <table class="data-table">
      <thead>
        <tr>
          <th class="checkbox-cell" v-if="isImageRemoveActivated">
            <input
              type="checkbox"
              :checked="areAllSelected"
              :indeterminate="isIndeterminate"
              @change="toggleSelectAll"
            />
          </th>
          <th>Tag</th>
          <th>Size</th>
          <th>Date</th>
          <th v-if="showContentDigest">Digest</th>
          <th class="actions-cell">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tag in displayTags" :key="tag" :class="{ 'selected': selectedTags.includes(tag) }">
          <td class="checkbox-cell" v-if="isImageRemoveActivated">
            <input
              type="checkbox"
              :checked="selectedTags.includes(tag)"
              @change="toggleTagSelection(tag)"
            />
          </td>
          <td class="tag-cell">
            <div class="tag-name">{{ tag }}</div>
          </td>
          <td class="size-cell">
            <div v-if="tagSizes[tag]" class="tag-size">
              {{ formatBytes(tagSizes[tag]) }}
            </div>
            <div v-else class="loading-placeholder">
              <div class="spinner small"></div>
            </div>
          </td>
          <td class="date-cell">
            <div v-if="tagDates[tag]" class="tag-date">
              {{ formatDate(tagDates[tag]) }}
            </div>
            <div v-else class="loading-placeholder">
              <div class="spinner small"></div>
            </div>
          </td>
          <td v-if="showContentDigest" class="digest-cell">
            <div v-if="tagDigests[tag]" class="tag-digest" :title="tagDigests[tag]">
              {{ truncateDigest(tagDigests[tag]) }}
            </div>
            <div v-else class="loading-placeholder">
              <div class="spinner small"></div>
            </div>
          </td>
          <td class="actions-cell">
            <div class="tag-actions">
              <CopyToClipboardButton
                :text="`docker pull ${pullUrl || registryUrl}/${imageName}:${tag}`"
                @notify="handleNotification"
              />
              
              <button
                v-if="showTagHistory"
                class="btn btn-ghost btn-icon"
                @click="navigateToTagHistory(tag)"
                title="View tag history"
              >
                <span class="material-icons">history</span>
              </button>
              
              <button
                v-if="isImageRemoveActivated"
                class="btn btn-ghost btn-icon delete-button"
                @click="confirmDeleteTag(tag)"
                title="Delete tag"
              >
                <span class="material-icons">delete</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div v-if="selectedTags.length > 0" class="bulk-actions">
      <div class="selection-info">
        {{ selectedTags.length }} tag{{ selectedTags.length > 1 ? 's' : '' }} selected
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary" @click="confirmDeleteSelected">
          Delete Selected
        </button>
        <button class="btn btn-ghost" @click="clearSelection">
          Clear Selection
        </button>
      </div>
    </div>
    
    <!-- Delete confirmation dialog -->
    <ConfirmationDialog
      v-if="showDeleteDialog"
      title="Confirm Deletion"
      :message="deleteDialogMessage"
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import httpService from '@/utils/http'
import { formatBytes, formatDate } from '@/utils/helpers'
import CopyToClipboardButton from '@/components/tag-list/CopyToClipboardButton.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'

interface Props {
  tags: string[]
  showContentDigest?: boolean
  showTagHistory?: boolean
  isImageRemoveActivated?: boolean
  registryUrl: string
  pullUrl?: string
  filter?: string
}

const props = withDefaults(defineProps<Props>(), {
  showContentDigest: false,
  showTagHistory: false,
  isImageRemoveActivated: false,
  filter: ''
})

const emit = defineEmits<{
  notify: [message: string]
  error: [error: any]
  tagDeleted: []
}>()

const router = useRouter()

// Selection state
const selectedTags = ref<string[]>([])

// Data state
const tagSizes = ref<Record<string, number>>({})
const tagDates = ref<Record<string, string>>({})
const tagDigests = ref<Record<string, string>>({})

// Dialog state
const showDeleteDialog = ref(false)
const deleteTarget = ref<{ type: 'single' | 'multiple'; tag?: string; tags?: string[] }>({
  type: 'single'
})

// Computed properties
const displayTags = computed(() => {
  if (!props.filter) return props.tags
  
  return props.tags.filter(tag =>
    tag.toLowerCase().includes(props.filter!.toLowerCase())
  )
})

const areAllSelected = computed(() => {
  return displayTags.value.length > 0 && 
    displayTags.value.every(tag => selectedTags.value.includes(tag))
})

const isIndeterminate = computed(() => {
  return displayTags.value.some(tag => selectedTags.value.includes(tag)) &&
    !areAllSelected.value
})

const deleteDialogMessage = computed(() => {
  if (deleteTarget.value.type === 'single' && deleteTarget.value.tag) {
    return `Are you sure you want to delete tag "${deleteTarget.value.tag}"?`
  } else if (deleteTarget.value.type === 'multiple' && deleteTarget.value.tags) {
    return `Are you sure you want to delete ${deleteTarget.value.tags.length} selected tags?`
  }
  return ''
})

// Get image name from route
const imageName = computed(() => {
  const route = router.currentRoute.value
  return route.params.image as string
})

// Watch for tag changes
watch(
  () => props.tags,
  (newTags) => {
    // Clear data for tags that are no longer in the list
    Object.keys(tagSizes.value).forEach(tag => {
      if (!newTags.includes(tag)) {
        delete tagSizes.value[tag]
        delete tagDates.value[tag]
        delete tagDigests.value[tag]
      }
    })
    
    // Load data for new tags
    loadTagData()
  },
  { deep: true }
)

// Initialize
onMounted(() => {
  loadTagData()
})

// Methods
const loadTagData = async () => {
  for (const tag of props.tags) {
    if (!tagSizes.value[tag]) {
      loadSingleTagData(tag)
    }
  }
}

const loadSingleTagData = async (tag: string) => {
  try {
    const manifest = await httpService.getManifest(imageName.value, tag)
    
    // Get config details for date
    if (manifest.config) {
      const config = await httpService.getBlob(imageName.value, manifest.config.digest)
      
      if (config.created) {
        tagDates.value[tag] = config.created
      }
    }
    
    // Calculate total size
    let size = 0
    
    if (manifest.layers) {
      size = manifest.layers.reduce((total, layer) => total + layer.size, 0)
    } else if (manifest.manifests) {
      // For manifest lists, use the first manifest's size
      if (manifest.manifests.length > 0) {
        const firstManifest = await httpService.getManifest(
          imageName.value, 
          manifest.manifests[0].digest.split(':')[1]
        )
        
        if (firstManifest.layers) {
          size = firstManifest.layers.reduce((total, layer) => total + layer.size, 0)
        }
      }
    }
    
    tagSizes.value[tag] = size
    
    // Get digest
    const digest = manifest.config?.digest || ''
    tagDigests.value[tag] = digest
  } catch (error) {
    console.warn(`Could not load data for tag ${tag}:`, error)
  }
}

const truncateDigest = (digest: string) => {
  if (!digest) return ''
  return digest.length > 15 ? `...${digest.slice(-15)}` : digest
}

const toggleSelectAll = () => {
  if (areAllSelected.value) {
    selectedTags.value = []
  } else {
    selectedTags.value = [...displayTags.value]
  }
}

const toggleTagSelection = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

const clearSelection = () => {
  selectedTags.value = []
}

const confirmDeleteTag = (tag: string) => {
  deleteTarget.value = { type: 'single', tag }
  showDeleteDialog.value = true
}

const confirmDeleteSelected = () => {
  deleteTarget.value = { type: 'multiple', tags: [...selectedTags.value] }
  showDeleteDialog.value = true
}

const handleDeleteConfirm = async () => {
  showDeleteDialog.value = false
  
  try {
    if (deleteTarget.value.type === 'single' && deleteTarget.value.tag) {
      await deleteSingleTag(deleteTarget.value.tag)
    } else if (deleteTarget.value.type === 'multiple' && deleteTarget.value.tags) {
      await deleteMultipleTags(deleteTarget.value.tags)
    }
  } catch (error) {
    emit('error', error)
  }
}

const deleteSingleTag = async (tag: string) => {
  try {
    // Get the manifest digest for the tag
    const manifest = await httpService.getManifest(imageName.value, tag)
    const digest = manifest.config?.digest || ''
    
    if (digest) {
      await httpService.deleteManifest(imageName.value, digest)
      emit('notify', `Tag "${tag}" deleted successfully`)
      emit('tagDeleted')
    }
  } catch (error) {
    emit('error', error)
  }
}

const deleteMultipleTags = async (tags: string[]) => {
  const promises = tags.map(tag => deleteSingleTag(tag))
  
  try {
    await Promise.all(promises)
    emit('notify', `${tags.length} tags deleted successfully`)
    emit('tagDeleted')
    clearSelection()
  } catch (error) {
    emit('error', error)
  }
}

const navigateToTagHistory = (tag: string) => {
  router.push({ name: 'taghistory', params: { image: imageName.value, tag } })
}

const handleNotification = (message: string) => {
  emit('notify', message)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.tag-table-container {
  .data-table {
    width: 100%;
    border-radius: var(--border-radius);
    overflow: hidden;
    box-shadow: var(--shadow-1);
    
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      
      &:last-child {
        border-right: none;
      }
    }
    
    th {
      background-color: var(--hover-background);
      font-weight: 500;
      color: var(--primary-text);
      position: sticky;
      top: 64px;
      z-index: 10;
      
      &.checkbox-cell {
        width: 40px;
      }
      
      &.actions-cell {
        width: 150px;
        text-align: right;
      }
    }
    
    td {
      vertical-align: middle;
      
      &.checkbox-cell {
        width: 40px;
      }
      
      &.tag-cell {
        .tag-name {
          font-weight: 500;
          color: var(--primary-text);
        }
      }
      
      &.digest-cell {
        .tag-digest {
          font-family: monospace;
          font-size: 14px;
          color: var(--neutral-text);
        }
      }
      
      &.actions-cell {
        text-align: right;
      }
      
      .loading-placeholder {
        display: flex;
        justify-content: center;
      }
    }
    
    tbody tr {
      &:hover {
        background-color: var(--hover-background);
      }
      
      &.selected {
        background-color: var(--hover-background);
        border-left: 3px solid var(--accent-text);
      }
    }
  }
  
  .bulk-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding: 16px;
    background-color: var(--hover-background);
    border-radius: var(--border-radius);
    
    .selection-info {
      font-weight: 500;
      color: var(--primary-text);
    }
    
    .action-buttons {
      display: flex;
      gap: 8px;
    }
  }
  
  .tag-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
    
    .delete-button {
      color: var(--error-color);
      
      &:hover {
        background-color: rgba(244, 67, 54, 0.1);
      }
    }
  }
}
</style>
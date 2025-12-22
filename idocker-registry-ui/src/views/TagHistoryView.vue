<template>
  <div class="tag-history-view">
    <AuthPrompt 
      v-if="showAuthPrompt" 
      @close="hideAuthPrompt" 
    />
    <div class="card header-card">
      <div class="header-content">
        <button class="btn btn-ghost btn-icon" @click="goBack" title="Back to tags">
          <span class="material-icons">arrow_back</span>
        </button>
        <div class="header-info">
          <h2>History for {{ imageName }}:{{ tagName }}</h2>
          <div class="source-hint">Sourced from {{ registryStore.registryName }}/{{ imageName }}</div>
        </div>
      </div>
    </div>

    <div v-if="!tagHistoryStore.loadend" class="loading-container">
      <div class="spinner large"></div>
    </div>

    <div v-else-if="tagHistoryStore.history.length === 0" class="empty-state">
      <span class="material-icons">history</span>
      <h3>No history found</h3>
      <p>Could not retrieve history for this tag.</p>
    </div>

    <div v-else class="history-container">
      <div class="card history-card">
        <div class="history-header">
          <h3>Tag History</h3>
        </div>
        
        <div class="timeline">
          <div
            v-for="(item, index) in tagHistoryStore.history"
            :key="item.digest"
            class="timeline-item"
            :class="{ 'current': index === 0 }"
          >
            <div class="timeline-dot">
              <div class="dot-outer" :class="{ 'current': index === 0 }">
                <div class="dot-inner"></div>
              </div>
              <div v-if="index < tagHistoryStore.history.length - 1" class="timeline-line"></div>
            </div>
            
            <div class="timeline-content">
              <div class="timeline-header">
                <div class="digest">
                  <strong>Digest:</strong> 
                  <code>{{ item.digest }}</code>
                  <CopyToClipboardButton :text="item.digest" @notify="handleNotification" />
                </div>
                
                <div class="date">{{ formatDate(item.created) }}</div>
              </div>
              
              <div class="timeline-details">
                <div class="detail-row">
                  <span class="label">Size:</span>
                  <span>{{ formatBytes(item.size) }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="label">Architecture:</span>
                  <span>{{ item.architecture || 'Unknown' }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="label">OS:</span>
                  <span>{{ item.os || 'Unknown' }}</span>
                </div>
                
                <div v-if="item.dockerVersion" class="detail-row">
                  <span class="label">Docker Version:</span>
                  <span>{{ item.dockerVersion }}</span>
                </div>
              </div>
              
              <div v-if="item.labels && Object.keys(item.labels).length > 0" class="labels-section">
                <h4>Labels</h4>
                <div class="labels-grid">
                  <div
                    v-for="(value, key) in item.labels"
                    :key="key"
                    class="label-item"
                  >
                    <span class="label-key">{{ key }}:</span>
                    <span class="label-value">{{ value }}</span>
                  </div>
                </div>
              </div>
              
              <div class="timeline-actions">
                <button
                  class="btn btn-ghost"
                  @click="showDockerfile(item)"
                >
                  <span class="material-icons">description</span>
                  View Dockerfile
                </button>
                
                <button
                  v-if="registryStore.deleteImages && index > 0"
                  class="btn btn-danger"
                  @click="confirmDelete(item)"
                >
                  <span class="material-icons">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Multi-arch support -->
      <div v-if="tagHistoryStore.architectures.length > 1" class="card architectures-card">
        <div class="card-title">Available Architectures</div>
        <div class="architecture-list">
          <div
            v-for="arch in tagHistoryStore.architectures"
            :key="`${arch.architecture}-${arch.os}`"
            class="architecture-item"
          >
            <span class="material-icons">computer</span>
            <span class="arch-name">
              {{ arch.architecture }} / {{ arch.os }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Dockerfile dialog -->
    <DockerfileDialog
      v-if="showDockerfileDialog"
      :layers="selectedHistoryItem?.layers || []"
      @close="showDockerfileDialog = false"
    />
    
    <!-- Delete confirmation dialog -->
    <ConfirmationDialog
      v-if="showDeleteDialog"
      title="Confirm Deletion"
      message="Are you sure you want to delete this history entry? This cannot be undone."
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRegistryStore } from '@/stores/registry'
import { useTagHistoryStore } from '@/stores/taghistory'
import { useAuthStore } from '@/stores/auth'
import { formatBytes, formatDate } from '@/utils/helpers'
import CopyToClipboardButton from '@/components/tag-list/CopyToClipboardButton.vue'
import DockerfileDialog from '@/components/dialogs/DockerfileDialog.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import AuthPrompt from '@/components/common/AuthPrompt.vue'
import type { TagHistoryItem } from '@/types'

const router = useRouter()
const route = useRoute()
const registryStore = useRegistryStore()
const tagHistoryStore = useTagHistoryStore()
const authStore = useAuthStore()

// 计算属性：是否显示授权提示
const showAuthPrompt = computed(() => {
  return authStore.showLoginPrompt && authStore.loginRedirectPath
})

// 隐藏授权提示
const hideAuthPrompt = () => {
  authStore.clearLoginPrompt()
}

// Image name and tag from route params
const imageName = computed(() => route.params.image as string)
const tagName = computed(() => route.params.tag as string)

// Dialog state
const showDockerfileDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedHistoryItem = ref<TagHistoryItem | null>(null)

// Initialize component
onMounted(() => {
  loadHistory()
})

onUnmounted(() => {
  tagHistoryStore.cleanup()
})

// Methods
const loadHistory = async () => {
  try {
    await tagHistoryStore.fetchHistory(
      imageName.value,
      tagName.value,
      {
        customLabels: registryStore.historyCustomLabels,
        useControlCacheHeader: registryStore.useControlCacheHeader,
        isRegistrySecured: registryStore.isRegistrySecured
      }
    )
  } catch (error) {
    registryStore.showError(error as any)
  }
}

const goBack = () => {
  router.push({ name: 'taglist', params: { image: imageName.value } })
}

const showDockerfile = (item: TagHistoryItem) => {
  selectedHistoryItem.value = item
  showDockerfileDialog.value = true
}

const confirmDelete = (item: TagHistoryItem) => {
  selectedHistoryItem.value = item
  showDeleteDialog.value = true
}

const handleDeleteConfirm = async () => {
  showDeleteDialog.value = false
  
  if (!selectedHistoryItem.value) return
  
  try {
    await tagHistoryStore.deleteHistoryEntry(
      imageName.value,
      selectedHistoryItem.value.digest
    )
    
    registryStore.showSnackbar('History entry deleted successfully')
    await loadHistory()
  } catch (error) {
    registryStore.showError(error as any)
  }
}

const handleNotification = (message: string) => {
  registryStore.showSnackbar(message)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.tag-history-view {
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
          margin: 0 0 4px 0;
          
          .source-hint {
            font-size: 14px;
            color: var(--neutral-text);
            font-weight: 400;
            margin-top: 4px;
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
  
  .history-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    .history-card {
      .history-header {
        margin-bottom: 24px;
        
        h3 {
          margin: 0;
          color: var(--primary-text);
        }
      }
      
      .timeline {
        position: relative;
        
        .timeline-item {
          display: flex;
          margin-bottom: 32px;
          
          &.current {
            .timeline-dot .dot-outer {
              border-color: var(--accent-text);
              background-color: var(--accent-text);
            }
            
            .timeline-content {
              border: 1px solid var(--accent-text);
            }
          }
          
          .timeline-dot {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-right: 16px;
            position: relative;
            z-index: 1;
            
            .dot-outer {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 2px solid var(--neutral-text);
              background-color: var(--card-background);
              display: flex;
              align-items: center;
              justify-content: center;
              
              .dot-inner {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: var(--neutral-text);
              }
            }
            
            .timeline-line {
              width: 2px;
              height: calc(100% + 32px);
              background-color: var(--neutral-text);
              margin-top: 8px;
            }
          }
          
          .timeline-content {
            flex: 1;
            background-color: var(--card-background);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: 16px;
            box-shadow: var(--shadow-1);
            
            .timeline-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
              
              .digest {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                font-size: 14px;
                
                code {
                  background-color: var(--hover-background);
                  padding: 2px 4px;
                  border-radius: 3px;
                  font-family: monospace;
                  font-size: 12px;
                }
              }
              
              .date {
                font-size: 14px;
                color: var(--neutral-text);
                white-space: nowrap;
              }
            }
            
            .timeline-details {
              display: flex;
              flex-wrap: wrap;
              gap: 16px;
              margin-bottom: 16px;
              
              .detail-row {
                display: flex;
                
                .label {
                  font-weight: 500;
                  margin-right: 4px;
                }
              }
            }
            
            .labels-section {
              margin-bottom: 16px;
              
              h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: var(--primary-text);
              }
              
              .labels-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 8px;
                
                .label-item {
                  display: flex;
                  font-size: 14px;
                  
                  .label-key {
                    font-weight: 500;
                    margin-right: 4px;
                    word-break: break-all;
                  }
                  
                  .label-value {
                    word-break: break-all;
                  }
                }
              }
            }
            
            .timeline-actions {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
            }
          }
        }
      }
    }
    
    .architectures-card {
      .architecture-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
        
        .architecture-item {
          display: flex;
          align-items: center;
          padding: 8px;
          background-color: var(--hover-background);
          border-radius: var(--border-radius);
          
          .material-icons {
            margin-right: 8px;
            color: var(--accent-text);
            font-size: 18px;
          }
          
          .arch-name {
            font-size: 14px;
          }
        }
      }
    }
  }
}
</style>
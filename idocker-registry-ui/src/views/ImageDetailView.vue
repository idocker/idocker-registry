<!--
  Image Detail View
  Display all tags of an image with tag details and delete tag functionality
-->
<template>
  <div class="image-detail-view">
    <!-- Page Header and Navigation -->
    <div class="page-header">

      <div class="header-content">
        <h1 v-if="image">{{ image.repository?.name || $t('imageDetail.title') }}</h1>
        <p v-if="image">{{ image.repository?.description || $t('images.noDescription') }}</p>
      </div>
      <div class="spacer"></div>
      <!-- <button class="btn btn-primary" @click="refreshImageDetails" :disabled="isLoading">
        <span v-if="isLoading" class="material-icons rotating">refresh</span>
        <span v-else class="material-icons">refresh</span>
        刷新
      </button> -->
      <button class="btn btn-ghost" @click="goBack">
        <span class="material-icons">arrow_back</span>
        {{ $t('imageDetail.back') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !image" class="loading-card">
      <div class="loading-container">
        <span class="material-icons rotating">refresh</span>
        <span>{{ $t('imageDetail.loading') }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-card">
      <div class="error-container">
        <span class="material-icons">error</span>
        <h3>{{ $t('imageDetail.loadingFailed') }}</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="refreshImageDetails">{{ $t('imageDetail.retry') }}</button>
      </div>
    </div>

    <!-- Image Details -->
    <div v-else-if="image" class="image-detail">
      <div class="info-card">
        <h2>{{ $t('imageDetail.imageInfo') }}</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">{{ $t('imageDetail.imageName') }}</div>
            <div class="info-value">{{ image.repository?.name || 'N/A' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('imageDetail.fullName') }}</div>
            <div class="info-value">{{ image.repository?.fullName || 'N/A' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('imageDetail.project') }}</div>
            <div class="info-value">{{ image.repository?.project_name || image.repository?.projectName || 'N/A' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">{{ $t('imageDetail.namespace') }}</div>
            <div class="info-value">{{ image.repository?.namespace || 'N/A' }}</div>
          </div>
        </div>
      </div>

      <!-- Tags List -->
      <div class="tags-card">
        <div class="tags-header">
          <h2>{{ $t('imageDetail.tagsList') }}</h2>
          <span class="tag-count">{{ image.tags?.length || 0 }} {{ $t('imageDetail.tagCount') }}</span>
        </div>

        <div v-if="!image.tags || image.tags.length === 0" class="empty-tags">
          <div class="empty-state">
            <span class="material-icons">tag</span>
            <p>{{ $t('imageDetail.noTags') }}</p>
          </div>
        </div>

        <div v-else class="tags-table">
          <table class="tag-table">
            <thead>
              <tr>
                <th>{{ $t('imageDetail.tagName') }}</th>
                <th>{{ $t('imageDetail.pushedBy') }}</th>
                <th>{{ $t('imageDetail.size') }}</th>
                <th>{{ $t('imageDetail.archOs') }}</th>
                <th>{{ $t('imageDetail.createdAt') }}</th>
                <th>{{ $t('imageDetail.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tag in image.tags" :key="tag.id">
                <td>
                  <div class="tag-name-cell">
                    <div class="tag-name">{{ tag.tag }}</div>
                  </div>
                </td>
                <td>{{ tag.pushed_by_name || tag.pushed_by_username || '-' }}</td>
                <td>{{ formatFileSize(tag.size) }}</td>
                <td>
                  <div class="arch-os-cell">
                    <span v-if="tag.architecture" class="chip">{{ tag.architecture }}</span>
                    <span v-if="tag.os" class="chip">{{ tag.os }}</span>
                  </div>
                </td>
                <td>{{ formatDate(tag.createdAt || tag.created_at) }}</td>
                <td>
                  <div class="actions-cell">
                    <button
                      class="btn btn-ghost btn-small"
                      @click="viewTagDetails(tag)"
                    >
                      <span class="material-icons">info</span>
                      {{ $t('imageDetail.details') }}
                    </button>
                    <button
                      v-if="hasPermission"
                      class="btn btn-ghost btn-small btn-danger"
                      @click="confirmDeleteTag(tag)"
                    >
                      <span class="material-icons">delete</span>
                      {{ $t('imageDetail.delete') }}
                    </button>
                    <LinkPopover :pull="pullCommand(tag)" :push="pushCommand(tag)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tag Details Dialog -->
    <div v-if="showTagDetailDialog" class="modal-overlay" @click="showTagDetailDialog = false">
      <div class="modal tag-detail-modal" @click.stop>
        <div class="modal-header">
          <h2>{{ $t('imageDetail.tagDetail') }}</h2>
          <button class="btn btn-ghost btn-icon" @click="showTagDetailDialog = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-content">
          <div v-if="tagDetailLoading" class="loading-container">
            <span class="material-icons rotating">refresh</span>
            <span>{{ $t('imageDetail.tagLoading') }}</span>
          </div>

          <div v-else-if="tagDetailError" class="error-container">
            <span class="material-icons">error</span>
            <p>{{ tagDetailError }}</p>
          </div>

          <div v-else-if="tagDetails" class="tag-detail-content">
            <div class="tag-info">
              <div class="info-item">
                <div class="info-label">{{ $t('imageDetail.tagName') }}</div>
                <div class="info-value">{{ tagDetails.tag.name || tagDetails.tag.tag || 'N/A' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">{{ $t('imageDetail.imageName') }}</div>
                <div class="info-value">{{ tagDetails.repository?.fullName || tagDetails.repository?.name || 'N/A' }}</div>
              </div>
              <div class="info-item wide">
                <div class="info-label">{{ $t('imageDetail.digest') }}</div>
                <div class="info-value">
                  <code>{{ tagDetails.tag.digest }}</code>
                  <button
                    class="btn btn-ghost btn-icon"
                    @click="copyToClipboard(tagDetails.tag.digest)"
                  >
                    <span class="material-icons">content_copy</span>
                  </button>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">{{ $t('imageDetail.imageSize') }}</div>
                <div class="info-value">{{ formatFileSize(tagDetails.tag.size) }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">{{ $t('imageDetail.architecture') }}</div>
                <div class="info-value">{{ tagDetails.tag.architecture || 'N/A' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">{{ $t('imageDetail.os') }}</div>
                <div class="info-value">{{ tagDetails.tag.os || 'N/A' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">{{ $t('imageDetail.createdTime') }}</div>
                <div class="info-value">{{ formatDate(tagDetails.tag.createdAt || tagDetails.tag.created_at) }}</div>
              </div>
            </div>

            <div v-if="tagDetails.buildHistory && tagDetails.buildHistory.length > 0" class="build-history">
              <h3>{{ $t('imageDetail.buildHistory') }}</h3>
              <div class="history-table">
                <table class="build-table">
                  <thead>
                    <tr>
                      <th>{{ $t('imageDetail.index') }}</th>
                      <th>{{ $t('imageDetail.createdTime') }}</th>
                      <th>{{ $t('imageDetail.command') }}</th>
                      <th>{{ $t('imageDetail.size') }}</th>
                      <th>{{ $t('imageDetail.comment') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(layer, index) in tagDetails.buildHistory" :key="layer.id">
                      <td>{{ index + 1 }}</td>
                      <td>{{ layer.created ? formatDate(layer.created) : 'N/A' }}</td>
                      <td>
                        <code class="command-code" :title="layer.createdBy || layer.created_by || ''">{{ layer.createdBy || layer.created_by || 'N/A' }}</code>
                      </td>
                      <td>{{ formatFileSize(layer.size) }}</td>
                      <td>{{ layer.comment || 'N/A' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click="showDeleteDialog = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>{{ $t('imageDetail.confirmDelete') }}</h2>
        </div>
        <div class="modal-content">
          <p>{{ $t('imageDetail.confirmDeleteTag', { name: tagToDelete?.name || tagToDelete?.tag }) }}</p>
          <p class="warning">{{ $t('imageDetail.confirmDeleteWarning') }}</p>
          <div class="dialog-actions">
            <button class="btn btn-ghost" @click="showDeleteDialog = false">
              {{ $t('imageDetail.cancel') }}
            </button>
            <button class="btn btn-danger" @click="deleteTag" :disabled="isDeleting">
              <span v-if="isDeleting" class="material-icons rotating">refresh</span>
              {{ isDeleting ? $t('imageDetail.deleting') : $t('imageDetail.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '@/composables/useNotifications'
import { useRegistryStore } from '@/stores/registry'
import LinkPopover from '@/components/LinkPopover.vue'
import repositoryService from '@/services/repository.service'
import authService from '@/services/auth.service'
import { formatDateTime as fmtDT } from '@/utils/helpers'
import type { ImageTag, ImageTagDetails, ImageDetails } from '@/types'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { showSuccess, showError, showInfo } = useNotifications()
const registryStore = useRegistryStore()

// State management
const isLoading = ref(false)
const error = ref('')
const image = ref<ImageDetails | null>(null)

// Tag details related
const showTagDetailDialog = ref(false)
const tagDetailLoading = ref(false)
const tagDetailError = ref('')
const tagDetails = ref<ImageTagDetails | null>(null)

// Delete related
const showDeleteDialog = ref(false)
const tagToDelete = ref<ImageTag | null>(null)
const isDeleting = ref(false)

// Computed properties
const hasPermission = computed(() => {
  try {
    const token = authService.getToken()
    if (!token) return false
    
    // 尝试从本地存储获取用户信息
    const userData = localStorage.getItem('user_data')
    if (userData) {
      const user = JSON.parse(userData)
      return user?.role === 'admin'
    }
    
    return false
  } catch (error) {
    console.error('Failed to check permission:', error)
    return false
  }
})

// load image details
const loadImageDetails = async () => {
  try {
    isLoading.value = true
    error.value = ''
    const imageId = route.params.id as string
    const response = await repositoryService.getImageDetails(imageId)
    
    
    if (response && response.success && response.data) {
      image.value = response.data
      console.log('image.projectName', image.value.repository?.projectName)
      console.log('response.projectName', response.data.repository?.projectName)
      console.log('image.value', image.value)
    } else {
      error.value = t('error.loadFailed')
    }
  } catch (err: any) {
    console.error('Failed to load image details:', err)
    error.value = err.message || t('error.loadFailed')
  } finally {
    isLoading.value = false
  }
}

// Refresh image details
const refreshImageDetails = () => {
  loadImageDetails()
}

// View tag details
const viewTagDetails = async (tag: ImageTag) => {
  try {
    tagDetailLoading.value = true
    tagDetailError.value = ''
    showTagDetailDialog.value = true
    
    const imageId = route.params.id as string
    const response = await repositoryService.getImageTagDetails(imageId, tag.id.toString())
    
    if (response.success) {
      tagDetails.value = response.data
    } else {
      tagDetailError.value = t('error.loadFailed')
    }
  } catch (err: any) {
    console.error('Failed to load tag details:', err)
    tagDetailError.value = err.message || t('error.loadFailed')
  } finally {
    tagDetailLoading.value = false
  }
}

// Confirm delete tag
const confirmDeleteTag = (tag: ImageTag) => {
  tagToDelete.value = tag
  showDeleteDialog.value = true
}

// Delete tag
const deleteTag = async () => {
  if (!tagToDelete.value) return
  
  try {
    isDeleting.value = true
    
    const imageId = route.params.id as string
    const response = await repositoryService.deleteImageTag(imageId, tagToDelete.value.id.toString())
    
    if (response.success) {
      const tagName = tagToDelete.value.name || tagToDelete.value.tag
      showSuccess(`Tag ${tagName} deleted`)
      showDeleteDialog.value = false

      // Reload image details
      await loadImageDetails()
    } else {
      showError(response.message || t('error.deleteFailed'))
    }
  } catch (err: any) {
    console.error('Failed to delete tag:', err)
    showError(err.message || t('error.deleteFailed'))
  } finally {
    isDeleting.value = false
  }
}

// Copy to clipboard
// Docker pull/push commands shown in the tag list "link" popover
// Host follows the UI registry URL; the built-in 'default' project has no
// project path segment (docker pull idocker.vip/nginx), others keep <project>/<image>.
const registryHost = computed(() => registryStore.registryName || window.location.host)
const repositoryPath = computed(() => {
  const repo = image.value?.repository
  const project = repo?.project_name || repo?.projectName || repo?.project || ''
  const name = repo?.name || ''
  return project === 'default' ? name : [project, name].filter(Boolean).join('/')
})
const pullCommand = (tag: ImageTag) =>
  `docker pull ${registryHost.value}/${repositoryPath.value}:${tag.tag || tag.name || ''}`
const pushCommand = (tag: ImageTag) =>
  `docker push ${registryHost.value}/${repositoryPath.value}:${tag.tag || tag.name || ''}`

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showInfo(t('success.dataCopied'))
  } catch (err) {
    console.error('Failed to copy:', err)
    showError(t('error.loadFailed'))
  }
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string | undefined): string => fmtDT(dateString || '', locale.value)

// Go back
const goBack = () => {
  router.go(-1)
}

// Initialize
onMounted(() => {
  loadImageDetails()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.image-detail-view {
  padding: 1rem;
  color: var(--primary-text);
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  .header-content {
    flex: 1;

    h1 {
      margin-bottom: 0.25rem;
      color: var(--primary-text);
    }

    p {
      color: var(--neutral-text);
      margin: 0;
    }
  }
}

.loading-card, .error-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  margin-bottom: 2rem;

  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    color: var(--neutral-text);

    .material-icons {
      font-size: 48px;
      
      &.rotating {
        animation: spin 2s linear infinite;
      }
    }
  }

  .error-container {
    .material-icons {
      color: var(--error-color);
    }

    h3 {
      margin: 0;
      color: var(--primary-text);
    }
  }
}

.image-detail {
  .info-card, .tags-card {
    background-color: var(--card-bg);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: hidden;
    margin-bottom: 1.5rem;

    h2 {
      margin: 0;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      color: var(--primary-text);
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      padding: 1.5rem;

      .info-item {
        .info-label {
          font-size: 0.875rem;
          color: var(--neutral-text);
          margin-bottom: 0.25rem;
        }

        .info-value {
          font-weight: 500;
          color: var(--primary-text);
        }
      }
    }
  }

  .tags-card {
    .tags-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);

      h2 {
        margin: 0;
        padding: 0;
        border: none;
      }

      .tag-count {
        background-color: rgba(92, 136, 255, 0.1);
        color: var(--accent-text);
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
      }
    }

    .empty-tags {
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        gap: 1rem;
        color: var(--neutral-text);

        .material-icons {
          font-size: 48px;
        }
      }
    }

    .tags-table {
      overflow-x: auto;

      .tag-table {
        width: 100%;
        border-collapse: collapse;

        th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--primary-text);
          border-bottom: 1px solid var(--border-color);
          font-size: $font-size-sm;
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          // 同一行里混着 .chip（0.875rem）和小按钮，纯文本单元格若不设字号
          // 会继承 1rem，看起来比相邻列明显偏大。
          font-size: $font-size-sm;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover {
          background-color: var(--hover-background);
        }

        .tag-name-cell {
          display: flex;
          align-items: center;
          color: var(--primary-text);

          .tag-name {
            font-weight: 500;
            color: var(--accent-text);
          }

          .material-icons {
            color: var(--primary-text) !important;
            font-size: 20px !important;
          }
        }

        .arch-os-cell {
          display: flex;
          gap: 0.5rem;

          .chip {
            background-color: var(--hover-background);
            color: var(--primary-text);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
          }
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          // 按内容高度垂直居中，避免 stretch 与行内盒基线差异造成按钮错位
          align-items: center;
        }
      }
    }
  }
}

// Modal styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background-color: var(--card-bg);
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-3);
  border: 1px solid var(--border-color);

  // 标签详情弹窗按视口自适应并限制最小宽度；自身不滚动，改由
  // .modal-content 内部滚动，使标题栏保持固定。
  &.tag-detail-modal {
    width: min(900px, 92vw);
    min-width: 320px;
    max-height: min(85vh, 820px);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .modal-header {
      flex-shrink: 0;
    }

    .modal-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);

    h2 {
      margin: 0;
      color: var(--primary-text);
    }
  }

  .modal-content {
    padding: 1.5rem;
    color: var(--primary-text);

    .tag-detail-content {
      // 短字段两列以上并排，长字段（digest）用 .wide 独占一行，
      // 避免 6 个字段各占一行把弹窗撑高
      .tag-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem 1.5rem;
        // Separate the info block from the build history below it. A divider
        // rather than a tinted panel: --hover-background (#343a4b) and
        // --card-background (#333a44) are near-identical in dark theme, so a
        // background block would be invisible there.
        padding-bottom: 1.25rem;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 1.25rem;

        .info-item {
          display: flex;
          flex-direction: column;
          min-width: 0;

          .info-label {
            font-size: 0.875rem;
            color: var(--neutral-text);
            margin-bottom: 0.25rem;
          }

          .info-value {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            min-width: 0;

            code {
              font-family: monospace;
              background-color: var(--hover-background);
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.875rem;
              word-break: break-all;
            }
          }

          &.wide {
            grid-column: 1 / -1;
          }
        }
      }

      .build-history {
        h3 {
          font-size: $font-size-base;
          margin-bottom: 0.75rem;
        }

        .history-table {
          overflow-x: auto;
          // 构建历史条目可能很多，固定高度后内部滚动，避免把弹窗撑到全屏
          max-height: 280px;
          overflow-y: auto;

          .build-table {
            width: 100%;
            border-collapse: collapse;

            th, td {
              padding: 0.75rem;
              text-align: left;
              border-bottom: 1px solid var(--border-color);
              font-size: 14px;
            }

            th {
              font-weight: 600;
            }

            // 内部滚动时表头保持可见
            thead th {
              position: sticky;
              top: 0;
              background-color: var(--card-background);
              z-index: 1;
            }

            tr:last-child td {
              border-bottom: none;
            }

            .command-code {
              font-family: monospace;
              background-color: var(--hover-background);
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.875rem;
              max-width: 300px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              display: inline-block;
            }
          }
        }
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;

      .warning {
        color: var(--error-color);
      }
    }
  }
}

// Button styles live in the global sheet (@/styles/components.scss).
// This view used to shadow the entire .btn system locally, which made its
// buttons (14px) diverge from the rest of the app (16px) and — because scoped
// rules never reach child components — left LinkPopover's trigger unstyled.

.mr-2 {
  margin-right: 0.5rem;
}

.spacer {
  flex-grow: 1;
}

// Responsive design
@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;

    .header-content {
      text-align: center;
    }
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .actions-cell {
    flex-direction: column;
    align-items: flex-start;

    .btn {
      width: 100%;
      justify-content: flex-start;
    }
  }

  .modal {
    width: 95%;
    margin: 1rem;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
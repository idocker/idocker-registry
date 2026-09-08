<!--
  Image List View
  Display image repositories and tags by project hierarchy
-->
<template>
    <div class="image-view">
      <!-- Page Title -->
      <div class="page-header">
        <h1>{{ $t('images.title') }}</h1>
        <p>{{ $t('images.subtitle') }}</p>
      </div>

      <!-- Search and Refresh -->
      <div class="search-section" v-if="false">
        <div class="search-bar">
          <input
            v-model="searchTerm"
            type="text"
            :placeholder="$t('images.searchImages')"
            @input="handleSearch"
            class="search-input"
          />
        </div>

        <button
          class="btn btn-primary"
          :disabled="isRefreshing"
          @click="refreshAll"
        >
          <span v-if="isRefreshing" class="material-icons rotating">refresh</span>
          <span v-else class="material-icons">refresh</span>
          {{ $t('images.refresh') }}
        </button>
      </div>

      <!-- Project List -->
      <div class="project-list">
        <div v-if="isLoading" class="loading-card">
          <div class="loading-container">
            <span class="material-icons rotating">refresh</span>
            <span>{{ $t('images.loading') }}</span>
          </div>
        </div>

        <div v-else-if="projects.length === 0" class="empty-card">
          <div class="empty-state">
            <span class="material-icons">folder_open</span>
            <h3>{{ $t('images.noProjects') }}</h3>
            <p>{{ $t('images.noProjectPermission') }}</p>
          </div>
        </div>
        
        <template v-else>
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-item"
          >
            <!-- 项目标题栏 -->
            <div class="project-header" @click="toggleProject(project.id)">
              <div class="header-content">
                <span class="material-icons mr-2 project-icon">folder_outline</span>
                <div class="project-info">
                  <div class="project-name">{{ project.name }}</div>
                  <div class="project-description">{{ project.description || $t('images.noDescription') }}</div>
                </div>
                <div class="spacer"></div>
                <div class="project-stats">
                  <span class="stat-chip">
                    {{ project.repositoryCount || 0 }} {{ $t('images.imageCount') }}
                  </span>
                  <button
                    class="icon-btn"
                    @click.stop="toggleProject(project.id)"
                  >
                    <span class="material-icons">
                      {{ expandedProjects.has(project.id.toString()) ? 'expand_less' : 'expand_more' }}
                    </span>
                  </button>
                </div>
              </div>
                          <!-- 镜像列表 -->
            <div v-show="expandedProjects.has(project.id.toString())" class="image-list">
              <div v-if="projectImagesLoading[project.id]" class="loading-container">
                <span class="material-icons rotating">refresh</span>
                <span>{{ $t('images.loading') }}</span>
              </div>

              <div v-else-if="!projectImages[project.id] || projectImages[project.id].length === 0" class="empty-images">
                <div class="empty-state">
                  <span class="material-icons">inventory_2</span>
                  <p>{{ $t('images.noImagesInProject') }}</p>
                </div>
              </div>

              <div v-else class="images-table">
                <table class="image-table">
                  <thead>
                    <tr>
                      <th>{{ $t('images.imageName') }}</th>
                      <th>{{ $t('images.latestTag') }}</th>
                      <th>{{ $t('images.size') }}</th>
                      <th>{{ $t('images.lastUpdated') }}</th>
                      <th>{{ $t('images.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="image in projectImages[project.id]" :key="image.id">
                      <td>
                        <div class="image-name-cell">
                          <span class="material-icons mr-2">inventory_2</span>
                          <div @click.stop="viewImageDetails(image.id.toString())" style="cursor: pointer;">
                            <div class="image-name">{{ image.name }}</div>
                            <!-- <div v-if="image.namespace" class="image-namespace">{{ image.namespace }}</div> -->
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="tags-cell">
                          <div v-if="image.tags && image.tags.length > 0" class="tags-container">
                            <div class="tags">
                              <span
                                v-for="tag in image.tags.slice(0, 1)"
                                :key="tag.id"
                                class="tag-chip"
                                @click.stop="viewTagDetails(image.id.toString(), tag.id.toString())"
                              >
                                {{ tag.name || tag.tag }}
                              </span>
                              <span
                                v-if="image.tags.length > 3"
                                class="tag-chip more-tag"
                                @click.stop="viewImageDetails(image.id.toString())"
                              >
                                +{{ image.tags.length - 3 }}
                              </span>
                            </div>
                          </div>
                          <span v-else class="no-tags">{{ $t('images.noTags') }}</span>
                        </div>
                      </td>
                      <td>
                        <span v-if="image.tags && image.tags.length > 0">
                          {{ formatFileSize(image.tags.reduce((sum, tag) => sum + (tag.size || 0), 0)) }}
                        </span>
                        <span v-else class="no-data">-</span>
                      </td>
                      <td>
                        <span v-if="image.tags && image.tags.length > 0">
                          {{ formatDate(image.tags[0].createdAt) }}
                        </span>
                        <span v-else class="no-data">-</span>
                      </td>
                      <td>
                        <div class="actions-cell">
                          <LinkPopover :pull="buildPullCommand(image)" :push="buildPushCommand(image)" />
                          <button
                            v-if="hasPermission"
                            class="btn btn-ghost btn-small"
                            @click.stop="viewImageDetails(image.id.toString())"
                          >
                            <span class="material-icons">visibility</span>
                            {{ $t('common.details') }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            </div>


          </div>
        </template>
      </div>



      <!-- Tag Details Dialog -->
      <div v-if="showTagDetailDialog" class="modal-overlay" @click="showTagDetailDialog = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>{{ $t('images.tagDetailsTitle') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showTagDetailDialog = false">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-content">
            <p>{{ $t('images.imageIdLabel') }}: {{ selectedImageId }}</p>
            <p>{{ $t('images.tagIdLabel') }}: {{ selectedTagId }}</p>
            <p>{{ $t('images.tagDetailsInDevelopment') }}</p>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '@/composables/useNotifications'
import { useRegistryStore } from '@/stores/registry'
import LinkPopover from '@/components/LinkPopover.vue'
import repositoryService from '@/services/repository.service'
import projectService from '@/services/project.service'
import authService from '@/services/auth.service'

import { formatDateTime as fmtDT } from '@/utils/helpers'
import type { Image, Project } from '@/types'

const router = useRouter()
const { t, locale } = useI18n()
const { showSuccess, showError, showInfo } = useNotifications()
const registryStore = useRegistryStore()

// State management
const projects = ref<Project[]>([])
const projectImages = reactive<Record<string, Image[]>>({})
const expandedProjects = reactive(new Set<string>())
const projectImagesLoading = reactive<Record<string, boolean>>({})
const isLoading = ref(false)
const isRefreshing = ref(false)
const searchTerm = ref('')
const isActive = ref("1")

// Dialog state
const showTagDetailDialog = ref(false)
const selectedImageId = ref('')
const selectedTagId = ref('')

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
    console.error('Permission check error:', error)
    return false
  }
})

// Get project list (sorted by creation time descending)
const loadProjects = async () => {
  try {
    isLoading.value = true
    const result = await projectService.getProjects(isActive.value,{
      limit: 1000,
      search: searchTerm.value
    })

    // Adapt to different response formats
    let projectsData: Project[] = []

    if (result && result.success && result.data) {
      projectsData = result.data
    }

    if (projectsData && projectsData.length > 0) {
      // Sort by creation time descending
      projects.value = projectsData.sort((a: Project, b: Project) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Expand first project by default
      if (projects.value.length > 0 && expandedProjects.size === 0) {
        expandedProjects.add(projects.value[0].id.toString())
        await loadProjectImages(projects.value[0].id.toString())
      }
    } else {
      projects.value = []
    }
  } catch (error) {
    console.error('Failed to load projects:', error)
    showError(t('images.loadProjectsFailed'))
  } finally {
    isLoading.value = false
  }
}

// Load image list under project
const loadProjectImages = async (projectId: string) => {
  if (!expandedProjects.has(projectId)) return

  try {
    projectImagesLoading[projectId] = true
    const response = await repositoryService.getProjectImages(projectId, {
      limit: 1000,
      search: searchTerm.value
    })

    // Adapt to different response formats
    let imagesData: Image[] = []

    if (response && response.success && response.data) {
      // Format 1: { success: true, data: { images: Image[] } }
      if ('images' in response.data && Array.isArray((response.data as any).images)) {
        imagesData = (response.data as any).images
      }
      // Format 2: { success: true, data: { datas: Image[] } }
      else if ('datas' in response.data && Array.isArray((response.data as any).datas)) {
        imagesData = (response.data as any).datas
      }
      // Format 3: { success: true, data: Image[] }
      else if (Array.isArray(response.data)) {
        imagesData = response.data as Image[]
      }
    }

    if (imagesData && imagesData.length > 0) {
      // Adapt data format
      const adaptedImages = imagesData.map((img: any) => ({
        ...img,
        id: img.id || img.name || '',
        name: img.name || '',
        namespace: img.namespace || '',
        project: img.project || projectId,
        tags: (img.tags || []).map((tag: any) => ({
          ...tag,
          id: tag.id || tag.name || '',
          name: tag.tag || tag.name || '',
          digest: tag.digest || '',
          size: tag.size || 0,
          architecture: tag.architecture || '',
          os: tag.os || '',
          createdAt: tag.created_at || tag.createdAt || ''
        }))
      }))

      projectImages[projectId] = adaptedImages
    } else {
      projectImages[projectId] = []
    }
  } catch (error) {
    console.error(`Load project ${projectId} images failed:`, error)
    projectImages[projectId] = []
  } finally {
    projectImagesLoading[projectId] = false
  }
}

// Toggle project expansion state
const toggleProject = async (projectId: number) => {
  const pid = projectId.toString()
  if (expandedProjects.has(pid)) {
    expandedProjects.delete(pid)
  } else {
    expandedProjects.add(pid)
    if (!projectImages[projectId]) {
      await loadProjectImages(pid)
    }
  }
}

// Search handler
const handleSearch = () => {
  loadProjects()
}

// Refresh all data
const refreshAll = async () => {
  try {
    isRefreshing.value = true

    // Sync image information
    const syncResponse = await repositoryService.syncRepositories()
    if (syncResponse.success) {
      showSuccess(t('images.imageSyncSuccess'))
    }

    // Reload all expanded projects
    for (const projectId of expandedProjects) {
      await loadProjectImages(projectId)
    }

    showSuccess(t('images.dataRefreshed'))
  } catch (error: any) {
    showError(error.message || t('error.loadFailed'))
  } finally {
    isRefreshing.value = false
  }
}

// Build docker pull/push commands for an image row.
// Registry path is <project>/<image> (namespace is an internal grouping and is
// NOT part of the Docker repository name). Host follows the UI registry URL.
const buildPullCommand = (image: Image): string => {
  const registryHost = registryStore.registryName || window.location.host
  return `docker pull ${registryHost}/${image.project || ''}/${image.name || ''}:latest`
}
const buildPushCommand = (image: Image): string => {
  const registryHost = registryStore.registryName || window.location.host
  return `docker push ${registryHost}/${image.project || ''}/${image.name || ''}:latest`
}

// View image details
const viewImageDetails = (imageId: string) => {
  router.push(`/images/${imageId}`)
}

// View tag details
const viewTagDetails = (imageId: string, tagId: string) => {
  selectedImageId.value = imageId
  selectedTagId.value = tagId
  showTagDetailDialog.value = true
}



// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date
const formatDate = (dateString: string | undefined): string => fmtDT(dateString || '', locale.value)

// Watch search term changes
watch(searchTerm, () => {
  loadProjects()
})

// Initialize
onMounted(() => {
  loadProjects()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.image-view {
  padding: 1rem;
  color: var(--primary-text);
}

.page-header {
  margin-bottom: 2rem;

  h1 {
    margin-bottom: 0.5rem;
    color: var(--primary-text);
  }

  p {
    color: var(--neutral-text);
  }
}

.search-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;

  .search-bar {
    flex: 1;
    max-width: 400px;
  }
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 16px;
  background-color: var(--card-bg);
  color: var(--primary-text);
  
  &:focus {
    outline: none;
    border-color: var(--accent-text);
    box-shadow: 0 0 0 2px rgba(92, 136, 255, 0.2);
  }
}

.project-list {
  .project-item {
    margin-bottom: 1.5rem;
    color: var(--primary-text) !important;

    .material-icons {
      font-size: 1.5rem;
      color: var(--primary-text);
    }

    .project-header {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--border-color);
      background-color: var(--card-bg);
      border-radius: 8px;
      overflow: hidden;

      &:hover {
        box-shadow: var(--shadow-2);
      }

      .header-content {
        display: flex;
        align-items: center;
        padding: 1rem;

        .project-icon {
          width: 30px;
        }
      }

      .project-info {
        flex: 1;

        .project-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--accent-text);
        }

        .project-description {
          font-size: 0.8rem;
          color: var(--neutral-text);
          //margin-top: 0.25rem;
        }
      }

      .project-stats {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
    }

    .image-list {
      margin-top: 0.1rem;
      //padding-left: 1rem;
      //border-left: 2px solid var(--border-color);

      .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--neutral-text);
        gap: 0.5rem;

        .material-icons {
          &.rotating {
            animation: spin 2s linear infinite;
          }
        }
      }

      .empty-images {
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--neutral-text);

          .material-icons {
            font-size: 48px;
            margin-bottom: 1rem;
          }
        }
      }

      .images-table {
        width: 100%;
        background-color: var(--card-bg);
        //border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border-color);
      }

      .image-table {
        width: 100%;
        border-collapse: collapse;

        th {
          //background-color: var(--hover-background);
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: var(--primary-text);
          border-bottom: 1px solid var(--border-color);
        }

        td {
          padding: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover {
          background-color: var(--hover-background);
        }
      }

      .image-name-cell {
        display: flex;
        align-items: center;
        color: var(--primary-text);

        .image-name {
          font-weight: 500;
          color: var(--accent-text);
        }

        .image-namespace {
          font-size: 0.8rem;
          color: var(--neutral-text);
          margin-top: 0.1rem;
        }

        .material-icons {
          color: var(--primary-text) !important;
          font-size: 20px !important;
        }
      }

      .tags-cell {
        .tags-container {
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
          }

          .tag-chip {
            padding: 0.25rem 0.5rem;
            background-color: var(--accent-text);
            color: white;
            border-radius: 12px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              background-color: var(--primary-color);
            }
          }

          .more-tag {
            background-color: var(--neutral-text);
          }
        }
      }

      .no-tags, .no-data {
        color: var(--neutral-text);
        font-style: italic;
      }

      .actions-cell {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    }
  }
}

.loading-card, .empty-card {
  margin-bottom: 1rem;
  background-color: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;

  .loading-container, .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--neutral-text);

    .material-icons {
      margin-right: 0.5rem;
      
      &.rotating {
        animation: spin 2s linear infinite;
      }
    }
  }

  .empty-state {
    flex-direction: column;
    gap: 1rem;

    h3 {
      color: var(--primary-text);
      margin: 0;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
    }
  }
}

// Button styles
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;

  .material-icons {
    font-size: 18px;
    margin-right: 0.5rem;
  }

  &:last-child .material-icons {
    margin-right: 0;
  }

  &.btn-primary {
    background-color: var(--primary-color);

    &:hover:not(:disabled) {
      background-color: var(--primary-dark);
    }
  }

  &.btn-ghost {
    background-color: transparent;
    color: var(--primary-text);
    border: 1px solid transparent;

    &:hover {
      background-color: var(--hover-background);
      border-color: var(--border-color);
    }

    &.btn-danger {
      color: var(--error-color);

      &:hover {
        background-color: rgba(244, 67, 54, 0.1);
      }
    }

    &.btn-small {
      padding: 0.25rem 0.5rem;
      font-size: 12px;
      gap: 0.25rem;

      .material-icons {
        font-size: 16px;
        margin-right: 0.25rem;
      }

      &:last-child .material-icons {
        margin-right: 0;
      }
    }
  }

  &.btn-icon {
    padding: 0.5rem;
    width: 40px;
    height: 40px;

    .material-icons {
      margin: 0;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.icon-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 50%;
  color: var(--neutral-text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background-color: var(--hover-background);
    color: var(--primary-text);
  }

  .material-icons {
    font-size: 20px;
  }
}

.stat-chip {
  background-color: rgba(92, 136, 255, 0.1);
  color: var(--accent-text);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.spacer {
  flex-grow: 1;
}

.mr-2 {
  margin-right: 0.5rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.ml-2 {
  margin-left: 0.5rem;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-3);
  border: 1px solid var(--border-color);

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
  }
}

// Responsive design
@media (max-width: 960px) {
  .search-section {
    flex-direction: column;
    align-items: stretch;

    .search-bar {
      max-width: none;
    }
  }

  .actions-cell {
    flex-direction: column;
    align-items: flex-start;

    .btn {
      width: 100%;
      justify-content: flex-start;
    }
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
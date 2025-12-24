<template>
  <div class="image-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>{{ $t('images.title') }}</h1>
      <p>{{ $t('images.subtitle') }}</p>
    </div>

    <!-- 搜索和刷新 -->
    <div class="search-section">
      <div class="search-bar">
        <v-text-field
          v-model="searchTerm"
          :label="$t('images.searchImages')"
          prepend-icon="mdi-magnify"
          clearable
          @update:modelValue="handleSearch"
          variant="outlined"
          density="compact"
        ></v-text-field>
      </div>
      
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-refresh"
        :loading="isRefreshing"
        @click="refreshAll"
      >
        {{ $t('common.refresh') }}
      </v-btn>
    </div>

    <!-- 项目列表 -->
    <div class="project-list">
      <v-card v-if="isLoading" class="loading-card">
        <v-card-text class="d-flex justify-center align-center" style="height: 200px;">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </v-card-text>
      </v-card>
      
      <v-card v-else-if="projects.length === 0" class="empty-card">
        <v-card-text class="text-center pa-6">
          <v-icon size="64" color="grey-lighten-1">mdi-folder-open-outline</v-icon>
          <h3 class="mt-4">{{ $t('images.noProjects') }}</h3>
          <p class="text-grey-darken-1">{{ $t('images.noProjectPermission') }}</p>
        </v-card-text>
      </v-card>
      
      <template v-else>
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-item"
        >
          <!-- 项目标题栏 -->
          <v-card class="project-header" @click="toggleProject(project.id)">
            <div class="d-flex align-center pa-4">
              <v-icon class="mr-2">mdi-folder-outline</v-icon>
              <div class="project-info">
                <div class="project-name">{{ project.name }}</div>
                <div class="project-description">{{ project.description || $t('images.noDescription') }}</div>
              </div>
              <v-spacer></v-spacer>
              <div class="project-stats">
                <v-chip size="small" color="primary">
                  {{ project.repositoryCount || 0 }} {{ $t('images.imageCount') }}
                </v-chip>
                <v-btn
                  variant="text"
                  :icon="expandedProjects.has(project.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  @click.stop="toggleProject(project.id)"
                ></v-btn>
              </div>
            </div>
          </v-card>

          <!-- 镜像列表 -->
          <v-expand-transition>
            <div v-show="expandedProjects.has(project.id)" class="image-list">
              <div v-if="projectImagesLoading[project.id]" class="loading-container">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <span class="ml-2">{{ $t('common.loading') }}</span>
              </div>
              
              <div v-else-if="!projectImages[project.id] || projectImages[project.id].length === 0" class="empty-images">
                <v-card class="empty-image-card">
                  <v-card-text class="text-center pa-6">
                    <v-icon size="48" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
                    <p class="text-grey-darken-1 mt-2">{{ $t('images.noImagesInProject') }}</p>
                  </v-card-text>
                </v-card>
              </div>
              
              <v-data-table
                v-else
                :headers="imageHeaders"
                :items="projectImages[project.id]"
                :items-per-page="10"
                class="elevation-1 image-table"
                hide-default-footer
              >
                <template v-slot:item.name="{ item }">
                  <div class="image-name-cell">
                    
                    <div>
                      <div class="image-name">{{ item.name }}</div>
                      <!-- <div class="image-namespace" v-if="item.namespace">{{ item.namespace }}</div> -->
                    </div>
                  </div>
                </template>

                <template v-slot:item.tags="{ item }">
                  <div class="tags-cell">
                    <div v-if="item.tags && item.tags.length > 0" class="tags-container">
                      <div class="tags">
                        <v-chip
                          v-for="tag in item.tags.slice(0, 3)"
                          :key="tag.id"
                          size="medium"
                          class="mr-1 mb-1"
                          @click="viewTagDetails(item.id, tag.id)"
                        >
                          {{ tag.name || tag.tag }}
                          <v-tooltip activator="parent" location="top">
                            <div>
                              <div>{{ $t('images.size') }}: {{ formatFileSize(tag.size) }}</div>
                              <div>{{ $t('images.architecture') }}: {{ tag.architecture || $t('images.unknown') }}</div>
                              <div>{{ $t('images.createdAt') }}: {{ formatDate(tag.createdAt) }}</div>
                            </div>
                          </v-tooltip>
                        </v-chip>
                        <v-chip
                          v-if="item.tags.length > 3"
                          size="small"
                          variant="text"
                          @click="viewImageDetails(item.id)"
                        >
                          +{{ item.tags.length - 3 }} {{ $t('common.more') }}
                        </v-chip>
                      </div>
                    </div>
                    <span v-else class="text-grey-darken-1">{{ $t('images.noTags') }}</span>
                  </div>
                </template>

                <template v-slot:item.size="{ item }">
                  <span v-if="item.tags && item.tags.length > 0">
                    {{ formatFileSize(item.tags.reduce((sum, tag) => sum + (tag.size || 0), 0)) }}
                  </span>
                  <span v-else class="text-grey-darken-1">-</span>
                </template>

                <template v-slot:item.updatedAt="{ item }">
                  <span v-if="item.tags && item.tags.length > 0">
                    {{ formatDate(item.tags[0].createdAt) }}
                  </span>
                  <span v-else class="text-grey-darken-1">-</span>
                </template>

                <template v-slot:item.actions="{ item }">
                  <div class="actions-cell">
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-content-copy"
                      @click="copyPullLink(item)"
                    >
                      {{ $t('images.copyPull') }}
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="text"
                      prepend-icon="mdi-content-copy"
                      @click="copyPushLink(item)"
                    >
                      {{ $t('images.copyPush') }}
                    </v-btn>
                    <v-btn
                      v-if="hasPermission"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-eye"
                      @click="viewImageDetails(item.id)"
                    >
                      {{ $t('common.details') }}
                    </v-btn>
                    <v-btn
                      v-if="hasPermission"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-delete"
                      color="error"
                      @click="deleteImage(item)"
                    >
                      {{ $t('common.delete') }}
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </div>
          </v-expand-transition>
        </div>
      </template>
    </div>

    <!-- 镜像详情对话框 -->
    <ImageDetailDialog
      v-model="showImageDetailDialog"
      :image-id="selectedImageId"
      @tag-click="viewTagDetails"
    />

    <!-- 标签详情对话框 -->
    <TagDetailDialog
      v-model="showTagDetailDialog"
      :image-id="selectedImageId"
      :tag-id="selectedTagId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '@/composables/useNotifications'
import repositoryService from '@/services/repository.service'
import projectService from '@/services/project.service'
import authService from '@/services/auth.service'
import ImageDetailDialog from '@/components/registry/ImageDetailDialog.vue'
import TagDetailDialog from '@/components/registry/TagDetailDialog.vue'
import type { Image, Project, ApiResponse, ImagePaginatedResponse, ProjectPaginatedResponse } from '@/types'

const router = useRouter()
const { t } = useI18n()
const { showSuccess, showError, showInfo } = useNotifications()

// 状态管理
const projects = ref<Project[]>([])
const projectImages = reactive<Record<string, Image[]>>({})
const expandedProjects = reactive(new Set<string>())
const projectImagesLoading = reactive<Record<string, boolean>>({})
const isLoading = ref(false)
const isRefreshing = ref(false)
const searchTerm = ref('')

// 对话框状态
const showImageDetailDialog = ref(false)
const showTagDetailDialog = ref(false)
const selectedImageId = ref('')
const selectedTagId = ref('')

// 表格列定义
const imageHeaders = computed(() => [
  { title: t('images.imageName'), key: 'name', sortable: false },
  { title: t('images.tags'), key: 'tags', sortable: false },
  { title: t('images.size'), key: 'size', sortable: false },
  { title: t('images.lastUpdated'), key: 'updatedAt', sortable: false },
  { title: t('common.actions'), key: 'actions', sortable: false, width: '300px' }
])

// 计算属性
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
    console.error('权限检查失败:', error)
    return false
  }
})

// 获取项目列表（按创建时间降序）
const loadProjects = async () => {
  try {
    isLoading.value = true
    const result = await projectService.getProjects({
      limit: 1000,
      search: searchTerm.value
    }) as ProjectPaginatedResponse

    // 适配不同的返回格式（向后兼容）
    let projectsData: Project[] = []

    if (result && result.success && result.data && result.data.projects) {
      // 统一格式: { success: true, data: { projects: Project[], pagination: ... } }
      projectsData = result.data.projects
    } else if (result && result.projects) {
      // 旧格式（向后兼容）: { projects: Project[], pagination: ... }
      projectsData = result.projects
    } else if (result && Array.isArray(result)) {
      // 直接数组格式: Project[]
      projectsData = result
    }
    
    if (projectsData && projectsData.length > 0) {
      // 按创建时间降序排序
      projects.value = projectsData.sort((a: Project, b: Project) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      // 默认展开第一个项目
      if (projects.value.length > 0 && expandedProjects.size === 0) {
        expandedProjects.add(projects.value[0].id.toString())
        await loadProjectImages(projects.value[0].id.toString())
      }
    } else {
      projects.value = []
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
    showError(t('images.loadProjectsFailed'))
  } finally {
    isLoading.value = false
  }
}

// 加载项目下的镜像列表
const loadProjectImages = async (projectId: string) => {
  if (!expandedProjects.has(projectId)) return

  try {
    projectImagesLoading[projectId] = true
    const response = await repositoryService.getProjectImages(projectId, {
      limit: 1000,
      search: searchTerm.value
    }) as ImagePaginatedResponse

    // 适配不同的返回格式（向后兼容）
    let imagesData: Image[] = []

    if (response && response.success && response.data && response.data.images) {
      // 统一格式: { success: true, data: { images: Image[], pagination: ... } }
      imagesData = response.data.images || []
    } else if (response && response.images) {
      // 旧格式（向后兼容）: { images: Image[], pagination: ... }
      imagesData = response.images
    } else if (response && Array.isArray(response)) {
      // 直接数组格式: Image[]
      imagesData = response
    }
    
    if (imagesData && imagesData.length > 0) {
      // 适配数据格式
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
    console.error(`加载项目 ${projectId} 的镜像列表失败:`, error)
    projectImages[projectId] = []
  } finally {
    projectImagesLoading[projectId] = false
  }
}

// 切换项目展开状态
const toggleProject = async (projectId: string) => {
  if (expandedProjects.has(projectId)) {
    expandedProjects.delete(projectId)
  } else {
    expandedProjects.add(projectId)
    if (!projectImages[projectId]) {
      await loadProjectImages(projectId)
    }
  }
}

// 搜索处理
const handleSearch = () => {
  loadProjects()
}

// 刷新所有数据
const refreshAll = async () => {
  try {
    isRefreshing.value = true
    
    // 同步镜像信息
    const syncResponse = await repositoryService.syncRepositories()
    if (syncResponse.success) {
      showSuccess(t('images.imageSyncSuccess'))
    }
    
    // 重新加载所有展开的项目
    for (const projectId of expandedProjects) {
      await loadProjectImages(projectId)
    }
    
    showSuccess(t('images.dataRefreshed'))
  } catch (error: any) {
    showError(error.message || t('images.dataRefreshed'))
  } finally {
    isRefreshing.value = false
  }
}

// 复制拉取链接
const copyPullLink = async (image: Image) => {
  try {
    const projectName = image.project || ''
    const imageName = image.name || ''
    const namespace = image.namespace || ''
    
    if (!projectName || !imageName) {
      showError(t('images.imageInfoIncomplete') + ' ' + t('images.cannotGeneratePullLink'))
      return
    }
    
    const pullCommand = `docker pull ${namespace ? namespace + '/' : ''}${projectName}/${imageName}:latest`
    await navigator.clipboard.writeText(pullCommand)
    showInfo(t('images.pullLinkCopied'))
  } catch (error) {
    console.error('复制拉取链接失败:', error)
    showError(t('images.copyFailed'))
  }
}

// 复制推送链接
const copyPushLink = async (image: Image) => {
  try {
    const projectName = image.project || ''
    const imageName = image.name || ''
    const namespace = image.namespace || ''
    
    if (!projectName || !imageName) {
      showError(t('images.imageInfoIncomplete') + ' ' + t('images.cannotGeneratePushLink'))
      return
    }
    
    const pushCommand = `docker push ${namespace ? namespace + '/' : ''}${projectName}/${imageName}:latest`
    await navigator.clipboard.writeText(pushCommand)
    showInfo(t('images.pushLinkCopied'))
  } catch (error) {
    console.error('复制推送链接失败:', error)
    showError(t('images.copyFailed'))
  }
}

// 查看镜像详情
const viewImageDetails = (imageId: string) => {
  selectedImageId.value = imageId
  showImageDetailDialog.value = true
}

// 查看标签详情
const viewTagDetails = (imageId: string, tagId: string) => {
  selectedImageId.value = imageId
  selectedTagId.value = tagId
  showTagDetailDialog.value = true
}

// 删除镜像
const deleteImage = async (image: Image) => {
  if (!hasPermission.value) {
    showError(t('images.deletePermission'))
    return
  }
  
  if (confirm(t('images.deleteConfirm', { name: image.name }))) {
    try {
      // 这里需要调用删除镜像的API
      // 暂时显示提示信息
      showInfo(t('images.deleteFeatureInDevelopment'))
    } catch (error: any) {
      showError(error.message || t('error.deleteFailed'))
    }
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

// 监听搜索条件变化
watch(searchTerm, () => {
  loadProjects()
})

// 初始化
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

.project-list {
  .project-item {
    margin-bottom: 1.5rem;
    color: var(--primary-text);

    .project-header {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--border-color);
      background-color: var(--card-bg);

      &:hover {
        box-shadow: var(--shadow-2);
      }

      .project-info {
        .project-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--accent-text);
        }

        .project-description {
          font-size: 0.9rem;
          color: var(--neutral-text);
          margin-top: 0.25rem;
        }
      }

      .project-stats {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
    }

    .image-list {
      //margin-top: 0.5rem;
      //padding-left: 1rem;
      //border-left: 2px solid var(--border-color);
      background-color: var(--card-bg);
      color: var(--primary-text);

      .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--neutral-text);
      }

      .empty-images {
        .empty-image-card {
          border: 1px dashed var(--border-color);
          background-color: var(--card-bg);
        }
      }

      .image-table {
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background-color: var(--card-bg);
        overflow: hidden;
        color: var(--primary-text);

        .image-name-cell {
          display: flex;
          align-items: center;
          color: var(--primary-text);

          .image-name {
            font-weight: 500;
            color: var(--primary-text);
          }

          .image-namespace {
            font-size: 0.8rem;
            color: var(--primary-text);
            margin-top: 0.1rem;
          }
        }

        .tags-cell {
          .tags-container {
            .tags {
              display: flex;
              flex-wrap: wrap;
              gap: 0.25rem;

              .v-chip {
                cursor: pointer;
                transition: all 0.2s ease;

                &:hover {
                  transform: translateY(-1px);
                  box-shadow: var(--shadow-1);
                }
              }
            }
          }
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;

          .v-btn {
            min-width: auto;
            padding: 0 8px;
            font-size: 0.8rem;

            :deep(.v-btn__content) {
              gap: 4px;
            }
          }
        }
      }
    }
  }
}

.loading-card, .empty-card {
  margin-bottom: 1rem;
  background-color: var(--card-bg);
}

// 响应式设计
@media (max-width: 768px) {
  .search-section {
    flex-direction: column;
    align-items: stretch;

    .search-bar {
      max-width: none;
    }
  }

  .project-list .project-item .image-list .image-table .actions-cell {
    flex-direction: column;
    align-items: flex-start;

    .v-btn {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
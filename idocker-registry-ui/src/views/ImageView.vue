<!--
  镜像列表视图
  显示所有镜像仓库及其标签信息
-->
<template>
  <div class="image-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>镜像仓库</h1>
      <p>浏览和管理Docker镜像仓库</p>
    </div>

    <!-- 搜索和过滤 -->
    <div class="search-filter-section">
      <div class="search-bar">
        <v-text-field
          v-model="searchTerm"
          label="搜索镜像"
          prepend-icon="mdi-magnify"
          clearable
          @update:modelValue="handleSearch"
          variant="outlined"
          density="compact"
        ></v-text-field>
      </div>
      
      <div class="filter-controls">
        <v-select
          v-model="selectedProject"
          :items="projectOptions"
          label="项目"
          clearable
          item-title="text"
          item-value="value"
          @update:modelValue="handleFilterChange"
          variant="outlined"
          density="compact"
        ></v-select>
        
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-refresh"
          :loading="isRefreshing"
          @click="refreshImages"
        >
          刷新
        </v-btn>
      </div>
    </div>

    <!-- 镜像列表 -->
    <div class="image-list">
      <v-card v-if="isLoading" class="loading-card">
        <v-card-text class="d-flex justify-center align-center" style="height: 200px;">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </v-card-text>
      </v-card>
      
      <v-card v-else-if="images.length === 0" class="empty-card">
        <v-card-text class="text-center pa-6">
          <v-icon size="64" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
          <h3 class="mt-4">暂无镜像</h3>
          <p class="text-grey-darken-1">没有找到匹配的镜像仓库</p>
        </v-card-text>
      </v-card>
      
      <template v-else>
        <v-card
          v-for="image in images"
          :key="image.id"
          class="image-card mb-4"
          @click="viewImageDetails(image.id)"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-package-variant-closed</v-icon>
            <span class="image-name">{{ image.fullName || `${image.namespace ? image.namespace + '/' : ''}${image.project_name || image.project}/${image.name}` }}</span>
            <v-spacer></v-spacer>
            <v-chip
              v-if="image.tags && image.tags.length > 0"
              size="small"
              color="primary"
            >
              {{ image.tags.length }} 个标签
            </v-chip>
          </v-card-title>
          
          <v-card-subtitle v-if="image.description">
            {{ image.description }}
          </v-card-subtitle>
          
          <v-card-text>
            <div v-if="image.tags && image.tags.length > 0" class="tags-container">
              <div class="mb-2 text-caption text-grey-darken-1">最新标签:</div>
              <div class="tags">
                <v-chip
                  v-for="tag in image.tags.slice(0, 5)"
                  :key="tag.id"
                  size="small"
                  class="mr-2 mb-2"
                  @click.stop="viewTagDetails(image.id, tag.id)"
                >
                  {{ tag.name || tag.tag }}
                  <v-tooltip activator="parent" location="top">
                    <div>
                      <div>大小: {{ formatFileSize(tag.size) }}</div>
                      <div>架构: {{ tag.architecture || '未知' }}</div>
                      <div>创建时间: {{ formatDate(tag.createdAt || tag.created_at) }}</div>
                    </div>
                  </v-tooltip>
                </v-chip>
                <v-chip
                  v-if="image.tags.length > 5"
                  size="small"
                  variant="text"
                  @click.stop="viewImageDetails(image.id)"
                >
                  +{{ image.tags.length - 5 }} 更多
                </v-chip>
              </div>
            </div>
            
            <div v-else class="text-grey-darken-1">
              暂无标签
            </div>
          </v-card-text>
          
          <v-card-actions>
            <v-btn
              variant="text"
              prepend-icon="mdi-eye"
              @click.stop="viewImageDetails(image.id)"
            >
              查看详情
            </v-btn>
            
            <v-btn
              v-if="hasPermission"
              variant="text"
              prepend-icon="mdi-sync"
              @click.stop="syncImage(image)"
            >
              同步
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination-container">
      <v-pagination
        v-model="currentPage"
        :length="totalPages"
        :total-visible="7"
        @update:modelValue="handlePageChange"
      ></v-pagination>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, usePaginatedApi, useSearchAndFilter } from '@/composables/useApi'
import { useNotifications } from '@/composables/useNotifications'
import registryService from '@/services/registry.service'
import projectService from '@/services/project.service'
import authService from '@/services/auth.service'
import ImageDetailDialog from '@/components/registry/ImageDetailDialog.vue'
import TagDetailDialog from '@/components/registry/TagDetailDialog.vue'
import type { Image, Project } from '@/types'

const router = useRouter()
const { showSuccess, showError } = useNotifications()

// 分页和搜索状态
const { items: images, isLoading, pagination, currentPage, totalItems, totalPages, loadPage, refresh } = usePaginatedApi<Image>()
const { searchTerm, selectedProject, updateSearch, updateFilter, resetFilters, markApplied } = useSearchAndFilter('', {})

// 对话框状态
const showImageDetailDialog = ref(false)
const showTagDetailDialog = ref(false)
const selectedImageId = ref('')
const selectedTagId = ref('')

// 其他状态
const isRefreshing = ref(false)
const projectOptions = ref<Array<{ text: string; value: string }>>([])

// 计算属性
const hasPermission = computed(() => {
  const user = authService.getProfile()
  return user?.role === 'admin'
})

// 获取项目列表
const loadProjects = async () => {
  try {
    const result = await projectService.getProjects({ limit: 1000 })
    console.log('result', result)
    if (result.success && result.projects && result.projects.length > 0) {
      projectOptions.value = result.projects.map((project: Project) => ({
        text: project.name,
        value: project.id.toString()
      }))
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
  }
}

// 加载镜像列表
const loadImages = async (page: number = 1) => {
  const params: any = {
    page,
    limit: 20
  }

  if (searchTerm && searchTerm.value) {
    params.search = searchTerm.value
  }

  if (selectedProject && selectedProject.value) {
    params.projectId = selectedProject.value
  }

  await loadPage(page, params.limit, async (page, limit) => {
    const response = await registryService.getImages({ ...params, page, limit })
    if (response.success) {
      // 适配数据格式，确保组件可以正确使用
      const adaptedImages = response.data.images.map((img: any) => ({
        ...img,
        // 确保有完整的镜像名称
        fullName: img.fullName || `${img.namespace ? img.namespace + '/' : ''}${img.project_name || img.project}/${img.name}`,
        // 确保标签数据格式一致
        tags: (img.tags || []).map((tag: any) => ({
          ...tag,
          // 确保标签名称字段一致
          name: tag.tag || tag.name,
          // 确保创建时间字段一致
          createdAt: tag.created_at || tag.createdAt
        }))
      }))
      
      return {
        items: adaptedImages,
        pagination: response.data.pagination
      }
    }
    throw new Error('获取镜像列表失败')
  })

  markApplied()
}

// 搜索处理
const handleSearch = () => {
  loadImages(1)
}

// 过滤条件变化处理
const handleFilterChange = () => {
  loadImages(1)
}

// 分页变化处理
const handlePageChange = (page: number) => {
  loadImages(page)
}

// 刷新镜像列表
const refreshImages = async () => {
  // 重新加载当前页的镜像列表
  const params = {
    page: currentPage.value,
    limit: pagination.value.limit
  }

  if (searchTerm.value) {
    params.search = searchTerm.value
  }

  if (selectedProject.value) {
    params.projectId = selectedProject.value
  }

  await loadPage(currentPage.value, params.limit, async (page, limit) => {
    const response = await registryService.getImages({ ...params, page, limit })
    if (response.success) {
      // 适配数据格式，确保组件可以正确使用
      const adaptedImages = response.data.images.map((img: any) => ({
        ...img,
        // 确保有完整的镜像名称
        fullName: img.fullName || `${img.namespace ? img.namespace + '/' : ''}${img.project_name || img.project}/${img.name}`,
        // 确保标签数据格式一致
        tags: (img.tags || []).map((tag: any) => ({
          ...tag,
          // 确保标签名称字段一致
          name: tag.tag || tag.name,
          // 确保创建时间字段一致
          createdAt: tag.created_at || tag.createdAt
        }))
      }))
      
      return {
        items: adaptedImages,
        pagination: response.data.pagination
      }
    }
    throw new Error('获取镜像列表失败')
  })

  showSuccess('镜像列表已刷新')
}

// 同步镜像信息
const syncImage = async (image: Image) => {
  try {
    isRefreshing.value = true
    const response = await registryService.syncRegistry()
    if (response.success) {
      showSuccess('镜像信息同步成功')
      await loadImages(currentPage.value)
    }
  } catch (error: any) {
    showError(error.message || '同步失败')
  } finally {
    isRefreshing.value = false
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
watch([searchTerm, selectedProject], () => {
  loadImages(1)
})

// 初始化
onMounted(() => {
  loadProjects()
  loadImages()
})
</script>

<style scoped lang="scss">
.image-view {
  padding: 1rem;
}

.page-header {
  margin-bottom: 2rem;

  h1 {
    margin-bottom: 0.5rem;
  }

  p {
    color: rgba(0, 0, 0, 0.6);
  }
}

.search-filter-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 960px) {
    flex-direction: row;
    align-items: center;
  }

  .search-bar {
    flex: 1;
  }

  .filter-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
}

.image-list {
  .image-card {
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .image-name {
    font-weight: 500;
    word-break: break-all;
  }

  .tags-container {
    .tags {
      display: flex;
      flex-wrap: wrap;
    }
  }
}

.pagination-container {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

.loading-card, .empty-card {
  margin-bottom: 1rem;
}
</style>
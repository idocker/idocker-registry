<!--
  镜像列表视图
  按项目层级展示镜像仓库及其标签信息
-->
<template>
    <div class="image-view">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>镜像仓库</h1>
        <p>按项目浏览和管理Docker镜像仓库</p>
      </div>

      <!-- 搜索和刷新 -->
      <div class="search-section" v-if="false">
        <div class="search-bar">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="搜索镜像"
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
          刷新
        </button>
      </div>

      <!-- 项目列表 -->
      <div class="project-list">
        <div v-if="isLoading" class="loading-card">
          <div class="loading-container">
            <span class="material-icons rotating">refresh</span>
            <span>加载中...</span>
          </div>
        </div>
        
        <div v-else-if="projects.length === 0" class="empty-card">
          <div class="empty-state">
            <span class="material-icons">folder_open</span>
            <h3>暂无项目</h3>
            <p>您没有权限访问任何项目</p>
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
                  <div class="project-description">{{ project.description || '暂无描述' }}</div>
                </div>
                <div class="spacer"></div>
                <div class="project-stats">
                  <span class="stat-chip">
                    {{ project.repositoryCount || 0 }} 个镜像
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
                <span>加载中...</span>
              </div>
              
              <div v-else-if="!projectImages[project.id] || projectImages[project.id].length === 0" class="empty-images">
                <div class="empty-state">
                  <span class="material-icons">inventory_2</span>
                  <p>该项目暂无镜像</p>
                </div>
              </div>
              
              <div v-else class="images-table">
                <table class="image-table">
                  <thead>
                    <tr>
                      <th>镜像名称</th>
                      <th>最新标签</th>
                      <th>大小</th>
                      <th>更新时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="image in projectImages[project.id]" :key="image.id">
                      <td>
                        <div class="image-name-cell">
                          <span class="material-icons mr-2">inventory_2</span>
                          <div>
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
                                @click="viewTagDetails(image.id, tag.id)"
                              >
                                {{ tag.name || tag.tag }}
                              </span>
                              <span
                                v-if="image.tags.length > 3"
                                class="tag-chip more-tag"
                                @click="viewImageDetails(image.id)"
                              >
                                +{{ image.tags.length - 3 }}
                              </span>
                            </div>
                          </div>
                          <span v-else class="no-tags">暂无标签</span>
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
                          <button
                            class="btn btn-ghost btn-small"
                            @click="copyPullLink(image)"
                          >
                            <span class="material-icons">content_copy</span>
                            复制拉取
                          </button>
                          <button
                            class="btn btn-ghost btn-small"
                            @click="copyPushLink(image)"
                          >
                            <span class="material-icons">content_copy</span>
                            复制推送
                          </button>
                          <button
                            v-if="hasPermission"
                            class="btn btn-ghost btn-small"
                            @click="viewImageDetails(image.id)"
                          >
                            <span class="material-icons">visibility</span>
                            详情
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

      <!-- 镜像详情对话框 -->
      <div v-if="showImageDetailDialog" class="modal-overlay" @click="showImageDetailDialog = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>镜像详情</h2>
            <button class="btn btn-ghost btn-icon" @click="showImageDetailDialog = false">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-content">
            <p>镜像ID: {{ selectedImageId }}</p>
            <p>镜像详情功能开发中...</p>
          </div>
        </div>
      </div>

      <!-- 标签详情对话框 -->
      <div v-if="showTagDetailDialog" class="modal-overlay" @click="showTagDetailDialog = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>标签详情</h2>
            <button class="btn btn-ghost btn-icon" @click="showTagDetailDialog = false">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-content">
            <p>镜像ID: {{ selectedImageId }}</p>
            <p>标签ID: {{ selectedTagId }}</p>
            <p>标签详情功能开发中...</p>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifications } from '@/composables/useNotifications'
import repositoryService from '@/services/repository.service'
import projectService from '@/services/project.service'
import authService from '@/services/auth.service'

import type { Image, Project } from '@/types'

const router = useRouter()
const { showSuccess, showError, showInfo } = useNotifications()

// 状态管理
const projects = ref<Project[]>([])
const projectImages = reactive<Record<string, Image[]>>({})
const expandedProjects = reactive(new Set<string>())
const projectImagesLoading = reactive<Record<string, boolean>>({})
const isLoading = ref(false)
const isRefreshing = ref(false)
const searchTerm = ref('')
const isActive = ref("1")

// 对话框状态
const showImageDetailDialog = ref(false)
const showTagDetailDialog = ref(false)
const selectedImageId = ref('')
const selectedTagId = ref('')

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
    const result = await projectService.getProjects(isActive.value,{ 
      limit: 1000,
      search: searchTerm.value 
    })
    
    // 适配不同的返回格式
    let projectsData: Project[] = []
    
    if (result && result.success && result.data) {
      // 格式3: { success: true, data: Project[] }
      projectsData = result.data
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
    showError('加载项目列表失败')
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
    })
    
    // 适配不同的返回格式
    let imagesData: Image[] = []
    
    if (response && response.success && response.data) {
      // 格式1: { success: true, data: { images: Image[] } }
      imagesData = response.data || []
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
      showSuccess('镜像信息同步成功')
    }
    
    // 重新加载所有展开的项目
    for (const projectId of expandedProjects) {
      await loadProjectImages(projectId)
    }
    
    showSuccess('数据已刷新')
  } catch (error: any) {
    showError(error.message || '刷新失败')
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
      showError('镜像信息不完整，无法生成拉取链接')
      return
    }
    
    const pullCommand = `docker pull ${namespace ? namespace + '/' : ''}${projectName}/${imageName}:latest`
    await navigator.clipboard.writeText(pullCommand)
    showInfo('拉取链接已复制到剪贴板')
  } catch (error) {
    console.error('复制拉取链接失败:', error)
    showError('复制失败')
  }
}

// 复制推送链接
const copyPushLink = async (image: Image) => {
  try {
    const projectName = image.project || ''
    const imageName = image.name || ''
    const namespace = image.namespace || ''
    
    if (!projectName || !imageName) {
      showError('镜像信息不完整，无法生成推送链接')
      return
    }
    
    const pushCommand = `docker push ${namespace ? namespace + '/' : ''}${projectName}/${imageName}:latest`
    await navigator.clipboard.writeText(pushCommand)
    showInfo('推送链接已复制到剪贴板')
  } catch (error) {
    console.error('复制推送链接失败:', error)
    showError('复制失败')
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
    showError('您没有删除权限')
    return
  }
  
  if (confirm(`确定要删除镜像 ${image.name} 吗？此操作不可逆。`)) {
    try {
      // 这里需要调用删除镜像的API
      // 暂时显示提示信息
      showInfo('删除功能开发中')
    } catch (error: any) {
      showError(error.message || '删除失败')
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

// 按钮样式
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

// 模态框样式
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

// 响应式设计
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
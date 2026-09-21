<template>
  <ManagementLayout>
    <div class="projects-container">
      <div class="page-header">
      </div>

      <div class="projects-table-container">
        <div class="table-controls">
          <input type="text" :placeholder="$t('projectList.searchProjects')" v-model="searchQuery"
            class="search-input" />
          <div class="table-actions">
            <label v-if="isAdmin" class="recycle-toggle" :title="$t('recycleBin.toggleHint')">
              <input type="checkbox" v-model="showRecycleBin" />
              <span>{{ $t('recycleBin.toggle') }}</span>
            </label>
            <button class="btn btn-primary" @click="showCreateModal = true">
              <span class="material-icons">add</span>
              {{ $t('projectList.createProject') }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="projects-table">
            <thead>
              <tr v-if="filteredProjects.length > 0">
                <th>{{ $t('projects.projectName') }}</th>
                <th>{{ $t('projects.namespace') }}</th>
                <th>{{ $t('projects.description') }}</th>
                <th>{{ $t('projects.repositoryCount') }}</th>
                <th>{{ $t('projects.createdAt') }}</th>
                <th>{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="6" class="loading-cell">
                  <div class="loading-indicator">
                    <span class="material-icons">refresh</span>
                    {{ $t('projectList.loadingProjects') }}
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredProjects.length === 0 && showRecycleBin">
                <td colspan="6" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-icons">delete_outline</span>
                    <h3>{{ $t('recycleBin.emptyRecycleBin') }}</h3>
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredProjects.length === 0 && searchQuery === ''">
                <td colspan="6" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-icons">folder_open</span>
                    <h3>{{ $t('projectList.noProjectsYet') }}</h3>
                    <p>{{ $t('projectList.startManagingRegistries') }}</p>
                    <button class="btn btn-primary" @click="showCreateModal = true">
                      <span class="material-icons">add</span>
                      {{ $t('projectList.createFirstProject') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-for="project in paginatedProjects" :key="project.id">
                <td>
                  <div class="entity-name-cell">
                    <span>{{ project.name }}</span>
                    <span v-if="project.deleted_at" class="status-badge recycled">
                      {{ $t('recycleBin.badge') }}
                    </span>
                  </div>
                  <div v-if="project.deleted_at" class="recycle-meta">
                    <span>{{ $t('recycleBin.deletedAt') }}: {{ formatDate(project.deleted_at) }}</span>
                    <span>{{ $t('recycleBin.deletedBy') }}: {{ project.deleted_by_username || $t('recycleBin.unknownUser') }}</span>
                  </div>
                </td>
                <td>{{ project.namespace }}</td>
                <td>{{ project.description || '-' }}</td>
                <td>{{ project.repositoryCount || 0 }}</td>
                <td>{{ formatDate(project.created_at) }}</td>
                <td class="action-buttons">
                  <template v-if="project.deleted_at">
                    <template v-if="isAdmin">
                      <button class="btn btn-icon btn-ghost" @click="requestRestoreProject(project)"
                        :title="$t('recycleBin.restore')">
                        <span class="material-icons">settings_backup_restore</span>
                      </button>
                      <button class="btn btn-icon btn-ghost btn-danger-ghost" @click="requestPurgeProject(project)"
                        :title="$t('recycleBin.purge')">
                        <span class="material-icons">delete_forever</span>
                      </button>
                    </template>
                  </template>
                  <template v-else>
                    <router-link :to="`/admin/projects/${project.id}?namespace=${encodeURIComponent(project.namespace)}&name=${encodeURIComponent(project.name)}`" class="btn btn-icon btn-ghost"
                      :title="$t('projectDetail.repositories')">
                      <span class="material-icons">storage</span>
                    </router-link>
                    <button class="btn btn-icon btn-ghost" @click="editProject(project)"
                      :title="$t('projectList.editProject')">
                      <span class="material-icons">edit</span>
                    </button>
                    <button v-if="project.name !== 'default'" class="btn btn-icon btn-ghost" @click="requestDeleteProject(project)" :title="$t('common.delete')">
                      <span class="material-icons">delete</span>
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="totalPages > 1">
          <button class="btn btn-ghost" @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1">
            {{ $t('common.previousPage') }}
          </button>
          <span class="page-info">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button class="btn btn-ghost" @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages">
            {{ $t('common.nextPage') }}
          </button>
          <select v-model="pageSize" class="page-size-select" @change="currentPage = 1">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingProject ? $t('projectList.editProject') : $t('projectList.createNewProject') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showCreateModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form @submit.prevent="saveProject" class="modal-content">
            <div class="form-group">
              <label for="name">{{ $t('projects.projectName') }} *</label>
              <input id="name" type="text" v-model="projectForm.name" :placeholder="$t('projectList.projectName')"
                required />
            </div>

            <div class="form-group">
              <label for="namespace">{{ $t('projects.namespace') }} *</label>
              <select id="namespace" v-model="projectForm.namespace" required>
                <option value="" disabled>{{ $t('projectList.namespacePlaceholder') }}</option>
                <option v-for="ns in namespaces" :key="ns.id" :value="ns.name">{{ ns.name }}</option>
              </select>
              <small class="form-help">{{ $t('projectList.namespaceHelp') }}</small>
            </div>

            <div class="form-group">
              <label for="description">{{ $t('projects.description') }}</label>
              <textarea id="description" v-model="projectForm.description"
                :placeholder="$t('projectList.descriptionPlaceholder')" rows="3"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="showCreateModal = false">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? $t('projectList.saving') + '...' : (editingProject ? $t('projectList.updateProject')
                  : $t('projectList.createProject')) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <DeleteConfirmDialog
      v-if="showDeleteModal && projectToDelete"
      :title="$t('projectList.deleteProject')"
      :entity-label="$t('recycleBin.projectLabel')"
      :entity-name="projectToDelete.name"
      :blockers="deleteBlockers"
      :loading="isDeleting"
      @confirm="confirmDeleteProject"
      @cancel="showDeleteModal = false"
    />

    <!-- 回收站：恢复确认 -->
    <ConfirmationDialog
      v-if="showRestoreModal && projectToRestore"
      :title="$t('recycleBin.restoreConfirmTitle')"
      :message="$t('recycleBin.restoreConfirm', { name: projectToRestore.name })"
      @confirm="confirmRestoreProject"
      @cancel="showRestoreModal = false"
    />

    <!-- 回收站：彻底删除确认（需逐字输入名称） -->
    <DeleteConfirmDialog
      v-if="showPurgeModal && projectToPurge"
      :title="$t('recycleBin.purgeConfirmTitle')"
      :entity-label="$t('recycleBin.projectLabel')"
      :entity-name="projectToPurge.name"
      :warning="$t('recycleBin.purgeWarning')"
      :loading="isPurging"
      @confirm="confirmPurgeProject"
      @cancel="showPurgeModal = false"
    />
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import DeleteConfirmDialog from '@/components/dialogs/DeleteConfirmDialog.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import projectService from '@/services/project.service'
import namespaceService from '@/services/namespace.service'
import userService from '@/services/user.service'
import { useNotifications } from '@/composables/useNotifications'
import { formatDate as fmtDate } from '@/utils/helpers'
import type { Project, CreateProjectData, UpdateProjectData, ProjectPaginatedResponse, Namespace, User } from '@/types'

const { t, locale } = useI18n()
const authStore = useAuthStore()
// 回收站视图 / 恢复 / 彻底删除仅管理员可见（后端仍会兜底校验）
const isAdmin = computed(() => authStore.user?.role === 'admin')
const { showError, showSuccess } = useNotifications()

const projects = ref<Project[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const showCreateModal = ref(false)
const editingProject = ref<Project | null>(null)
const isActive = ref("all")
const searchQuery = ref('')
// 回收站（假删除）视图开关
const showRecycleBin = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const namespaces = ref<Namespace[]>([])
const availableUsers = ref<User[]>([])

const projectForm = reactive({
  name: '',
  namespace: '',
  description: ''
})

const fetchNamespaces = async () => {
  try {
    const response = await namespaceService.getNamespaces({ page: 1, limit: 100, isActive: true })
    if (response.success && response.data) {
      namespaces.value = response.data
    }
  } catch (error) {
    console.error('Error fetching namespaces:', error)
  }
}

const fetchProjects = async () => {
  try {
    isLoading.value = true
    console.log(isActive.value)
    const response = await projectService.getProjects(isActive.value, {
      page: currentPage.value,
      limit: pageSize.value,
      // 开启回收站只拉已删除（deleted=1），否则只看未删除（deleted=0）
      deleted: showRecycleBin.value ? '1' : '0'
    })
    if (response.success && response.data) {
      //console.log(response.data )
      projects.value = response.data;
    } else {
      projects.value = []
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    projects.value = []
  } finally {
    isLoading.value = false
  }
}

const saveProject = async () => {
  try {
    isSubmitting.value = true

    let response: any
    if (editingProject.value) {
      response = await projectService.updateProject(editingProject.value.id.toString(), {
        name: projectForm.name,
        namespace: projectForm.namespace,
        description: projectForm.description
      })
    } else {
      response = await projectService.createProject({
        name: projectForm.name,
        namespace: projectForm.namespace,
        description: projectForm.description
      })
    }

    if (response.success) {
      await fetchProjects()
      showCreateModal.value = false
      resetForm()
    } else {
      throw new Error(response.message || 'Failed to save project')
    }
  } catch (error: any) {
    console.error('Error saving project:', error)
    showError(t('error.loadFailed'), error.message)
  } finally {
    isSubmitting.value = false
  }
}

const editProject = (project: Project) => {
  editingProject.value = project
  projectForm.name = project.name
  projectForm.namespace = project.namespace || ''
  projectForm.description = project.description || ''
  showCreateModal.value = true
}

const projectToDelete = ref<Project | null>(null)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

const requestDeleteProject = (project: Project) => {
  projectToDelete.value = project
  showDeleteModal.value = true
}

// 删除前拦截：项目下仍有仓库时不允许删除
const deleteBlockers = computed(() => {
  const project = projectToDelete.value
  if (!project) return []
  const repositoryCount = project.repositoryCount || 0
  return repositoryCount > 0
    ? [t('projectList.deleteWithRepositoriesWarning', { count: repositoryCount })]
    : []
})

const confirmDeleteProject = async () => {
  if (!projectToDelete.value || isDeleting.value) return

  isDeleting.value = true
  try {
    const response = await projectService.deleteProject(projectToDelete.value.id.toString())
    if (response.success) {
      showDeleteModal.value = false
      const deletedName = projectToDelete.value.name
      projectToDelete.value = null
      await fetchProjects()
      // 假删除：资源进入回收站，可由管理员恢复
      showSuccess(t('recycleBin.deleteSuccess', { name: deletedName }))
    } else {
      throw new Error(response.message || t('projectList.deleteProjectFailed'))
    }
  } catch (error: any) {
    console.error('Error deleting project:', error)
    // 后端同样拦截有关联仓库的项目，这里把后端的说明透出
    showError(t('error.deleteFailed'), error.message)
  } finally {
    isDeleting.value = false
  }
}

// ===== 回收站操作（仅管理员） =====
const projectToRestore = ref<Project | null>(null)
const showRestoreModal = ref(false)
const isRestoring = ref(false)
const projectToPurge = ref<Project | null>(null)
const showPurgeModal = ref(false)
const isPurging = ref(false)

const requestRestoreProject = (project: Project) => {
  projectToRestore.value = project
  showRestoreModal.value = true
}

const confirmRestoreProject = async () => {
  if (!projectToRestore.value || isRestoring.value) return
  isRestoring.value = true
  const name = projectToRestore.value.name
  try {
    const response = await projectService.restoreProject(projectToRestore.value.id.toString())
    if (response.success === false) {
      throw new Error(response.message || t('recycleBin.operationFailed'))
    }
    showRestoreModal.value = false
    projectToRestore.value = null
    await fetchProjects()
    showSuccess(t('recycleBin.restoreSuccess', { name }))
  } catch (error: any) {
    console.error('Error restoring project:', error)
    showError(t('recycleBin.operationFailed'), error.message)
  } finally {
    isRestoring.value = false
  }
}

const requestPurgeProject = (project: Project) => {
  projectToPurge.value = project
  showPurgeModal.value = true
}

const confirmPurgeProject = async () => {
  if (!projectToPurge.value || isPurging.value) return
  isPurging.value = true
  const name = projectToPurge.value.name
  try {
    const response = await projectService.purgeProject(projectToPurge.value.id.toString())
    if (response.success === false) {
      throw new Error(response.message || t('recycleBin.operationFailed'))
    }
    showPurgeModal.value = false
    projectToPurge.value = null
    await fetchProjects()
    showSuccess(t('recycleBin.purgeSuccess', { name }))
  } catch (error: any) {
    console.error('Error purging project:', error)
    showError(t('error.deleteFailed'), error.message)
  } finally {
    isPurging.value = false
  }
}

const fetchUsers = async () => {
  try {
    const response = await userService.getUsers({})
    if (response.success && response.data) {
      availableUsers.value = response.data
    }
  } catch (error) {
    console.error('Error fetching users:', error)
  }
}

const resetForm = () => {
  editingProject.value = null
  projectForm.name = ''
  projectForm.namespace = ''
  projectForm.description = ''
}

// Refresh project list
const refreshProjects = () => {
  fetchProjects()
}

const formatDate = (dateString: string) => fmtDate(dateString, locale.value)
// Computed properties
const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter((project: Project) =>
    project.name.toLowerCase().includes(query) ||
    project.description?.toLowerCase().includes(query)
  )
})

const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredProjects.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredProjects.value.length / pageSize.value)
})

onMounted(() => {
  fetchProjects()
  fetchNamespaces()
  fetchUsers()
})

// 切换回收站视图时回到第一页重新拉取
watch(showRecycleBin, () => {
  currentPage.value = 1
  fetchProjects()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.projects-container {
  max-width: 1200px;
  margin: 0 auto;
}

.projects-table-container {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);

  .search-input {
    width: 300px;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }

  .table-actions {
    display: flex;
    gap: 8px;
  }
}

.table-container {
  overflow-x: auto;
}

.projects-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    font-weight: 600;
    color: var(--neutral-text);
    background-color: var(--hover-background);
  }

  tr:hover {
    background-color: var(--hover-background);
  }

  .loading-cell,
  .empty-cell {
    text-align: center;
    padding: 40px 12px;
    color: var(--neutral-text);
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    .material-icons {
      animation: spin 1s linear infinite;
    }
  }

  .action-buttons {
    display: flex;
    gap: 8px;

    a.btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
  }

  .project-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .project-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: rgba(var(--primary-color-rgb), 0.1);

      .material-icons {
        color: var(--primary-color);
        font-size: 16px;
      }
    }
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--neutral-text);

    .material-icons {
      font-size: 16px;
    }
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;

    .material-icons {
      font-size: 64px;
      color: var(--neutral-text);
      margin-bottom: 16px;
    }

    h3 {
      font-size: 20px;
      margin-bottom: 8px;
    }

    p {
      color: var(--neutral-text);
      margin-bottom: 24px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;

  .page-info {
    color: var(--neutral-text);
  }
}

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

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-color);

    h2 {
      font-size: 20px;
      font-weight: 600;
    }
  }

  .modal-content {
    padding: 20px;

    .form-group {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }

      input,
      textarea,
      select {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background-color: var(--background);
        color: var(--primary-text);
        font-family: inherit;
        font-size: inherit;

        &:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
        }
      }

      select {
        cursor: pointer;
      }

      .form-help {
        display: block;
        margin-top: 5px;
        font-size: 0.8rem;
        color: var(--neutral-text);
        font-style: italic;
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid var(--border-color);
  }
}

// 回收站（假删除）
.recycle-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--neutral-text);
  cursor: pointer;
  user-select: none;

  input {
    cursor: pointer;
  }
}

.entity-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recycle-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--neutral-text);
}

.status-badge.recycled {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: var(--error-color, #f44336);
  color: #fff;
}

.btn-danger-ghost {
  color: var(--error-color, #f44336);
}

// Animation
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

// Responsive design
@media (max-width: 768px) {
  .projects-container {
    padding: 16px;
  }

  .table-controls {
    flex-direction: column;
    gap: 12px;

    .search-input {
      width: 100%;
    }
  }

  .modal {
    width: 95%;
  }
}
</style>
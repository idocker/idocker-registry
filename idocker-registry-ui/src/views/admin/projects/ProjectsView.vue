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
            <button class="btn btn-primary" @click="showCreateModal = true">
              <span class="material-icons">add</span>
              {{ $t('projectList.createProject') }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="projects-table">
            <thead>
              <tr>
                <th>{{ $t('projects.projectName') }}</th>
                <th>{{ $t('projects.namespace') }}</th>
                <th>{{ $t('projects.description') }}</th>
                <th>{{ $t('projects.repositoryCount') }}</th>
                <th>{{ $t('projects.members') }}</th>
                <th>{{ $t('projects.createdAt') }}</th>
                <th>{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="7" class="loading-cell">
                  <div class="loading-indicator">
                    <span class="material-icons">refresh</span>
                    {{ $t('projectList.loadingProjects') }}
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredProjects.length === 0 && searchQuery === ''">
                <td colspan="7" class="empty-cell">
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
                <td>{{ project.name }}</td>
                <td>{{ project.namespace }}</td>
                <td>{{ project.description || '-' }}</td>
                <td>{{ project.repositoryCount || 0 }}</td>
                <td>{{ project.members?.length || 0 }}</td>
                <td>{{ formatDate(project.created_at) }}</td>
                <td class="action-buttons">
                  <router-link :to="`/admin/projects/${project.id}`" class="btn-icon btn-ghost"
                    :title="$t('projectList.viewDetails')">
                    <span class="material-icons">visibility</span>
                  </router-link>
                  <button class="btn-icon btn-ghost" @click="editProject(project)"
                    :title="$t('projectList.editProject')">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-icon btn-ghost" @click="deleteProject(project)" :title="$t('common.delete')">
                    <span class="material-icons">delete</span>
                  </button>
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
              <input id="namespace" type="text" v-model="projectForm.namespace"
                :placeholder="$t('projectList.namespacePlaceholder')" required />
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
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import projectService from '@/services/project.service'
import type { Project, CreateProjectData } from '@/services/project.service'

const { t } = useI18n()
const authStore = useAuthStore()

const projects = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const showCreateModal = ref(false)
const editingProject = ref<Project>(null)
const isActive = ref("all")
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(8)

const projectForm = reactive({
  name: '',
  namespace: '',
  description: ''
})

const fetchProjects = async () => {
  try {
    isLoading.value = true
    console.log(isActive.value)
    const response = await projectService.getProjects(isActive.value, {
      page: currentPage.value,
      limit: pageSize.value
    })
    if (response.success && response.data) {
      projects.value = response.data || []
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

    let response
    if (editingProject.value) {
      response = await projectService.updateProject(editingProject.value.id.toString(), projectForm)
    } else {
      response = await projectService.createProject(projectForm as CreateProjectData)
    }

    if (response.success) {
      await fetchProjects()
      showCreateModal.value = false
      resetForm()
    } else {
      throw new Error(response.message || 'Failed to save project')
    }
  } catch (error) {
    console.error('Error saving project:', error)
    alert(`${t('error.loadFailed')}: ${error.message}`)
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

const deleteProject = async (project: Project) => {
  if (confirm(t('projectList.confirmDeleteProject', { name: project.name }))) {
    try {
      const response = await projectService.deleteProject(project.id.toString())
      if (response.success) {
        await fetchProjects()
      } else {
        throw new Error(response.message || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`${t('error.loadFailed')}: ${error.message}`)
    }
  }
}

const resetForm = () => {
  editingProject.value = null
  projectForm.name = ''
  projectForm.namespace = ''
  projectForm.description = ''
}

// 刷新项目列表
const refreshProjects = () => {
  fetchProjects()
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
// 计算属性
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
    color: var(--text-secondary);
    background-color: var(--hover-bg);
  }

  tr:hover {
    background-color: var(--hover-bg);
  }

  .loading-cell,
  .empty-cell {
    text-align: center;
    padding: 40px 12px;
    color: var(--text-muted);
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
    color: var(--text-secondary);

    .material-icons {
      font-size: 16px;
    }
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;

    .material-icons {
      font-size: 64px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    h3 {
      font-size: 20px;
      margin-bottom: 8px;
    }

    p {
      color: var(--text-muted);
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
    color: var(--text-secondary);
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
      textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background-color: var(--background);
        color: var(--primary-text);

        &:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
        }
      }

      .form-help {
        display: block;
        margin-top: 5px;
        font-size: 0.8rem;
        color: var(--text-muted);
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

// 动画
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

// 响应式设计
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
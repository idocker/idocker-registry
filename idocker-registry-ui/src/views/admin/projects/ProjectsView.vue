<template>
  <ManagementLayout>
    <div class="projects-container">
      <div class="page-header">
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="material-icons">add</span>
          Create Project
        </button>
      </div>

      <div class="projects-list">
        <div v-if="isLoading" class="loading">
          <span class="material-icons">refresh</span>
          <p>Loading projects...</p>
        </div>

        <div v-else-if="projects.length === 0" class="empty-state">
          <span class="material-icons">folder_open</span>
          <h3>No projects yet</h3>
          <p>Create your first project to get started with managing Docker registries</p>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <span class="material-icons">add</span>
            Create Your First Project
          </button>
        </div>

        <div v-else class="projects-grid">
          <div v-for="project in projects" :key="project.id" class="project-card">
            <div class="project-header">
              <div class="project-icon">
                <span class="material-icons">folder</span>
              </div>
              <div class="project-title">
                <h3>{{ project.name }}</h3>
                <p>{{ project.description }}</p>
              </div>
              <div class="project-actions">
                <button class="btn btn-ghost btn-icon" @click="editProject(project)">
                  <span class="material-icons">edit</span>
                </button>
                <button class="btn btn-ghost btn-icon" @click="deleteProject(project)">
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>

            <div class="project-stats">
              <div class="stat">
                <span class="material-icons">storage</span>
                <span>{{ project.repositoryCount || 0 }} Repositories</span>
              </div>
              <div class="stat">
                <span class="material-icons">people</span>
                <span>{{ project.members?.length || 0 }} Members</span>
              </div>
            </div>

            <router-link :to="`/admin/projects/${project.id}`" class="project-link">
              View Details
              <span class="material-icons">arrow_forward</span>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Create Project Modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingProject ? 'Edit Project' : 'Create New Project' }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showCreateModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form @submit.prevent="saveProject" class="modal-content">
            <div class="form-group">
              <label for="name">Project Name *</label>
              <input id="name" type="text" v-model="projectForm.name" placeholder="Enter project name" required />
            </div>

            <div class="form-group">
              <label for="namespace">Namespace *</label>
              <input id="namespace" type="text" v-model="projectForm.namespace" placeholder="Enter namespace (lowercase letters, numbers, hyphens)" required />
              <small class="form-help">Namespace can only contain lowercase letters, numbers, and hyphens</small>
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" v-model="projectForm.description" placeholder="Enter project description"
                rows="3"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="showCreateModal = false">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? 'Saving...' : (editingProject ? 'Update Project' : 'Create Project') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'

const authStore = useAuthStore()

const projects = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const showCreateModal = ref(false)
const editingProject = ref(null)

const projectForm = reactive({
  name: '',
  namespace: '',
  description: ''
})

const fetchProjects = async () => {
  try {
    isLoading.value = true

    const response = await fetch('/api/projects', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      projects.value = data.data || []
    } else {
      throw new Error('Failed to fetch projects')
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
  } finally {
    isLoading.value = false
  }
}

const saveProject = async () => {
  try {
    isSubmitting.value = true

    const url = editingProject.value
      ? `/api/projects/${editingProject.value.id}`
      : '/api/projects'

    const method = editingProject.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(projectForm)
    })

    if (response.ok) {
      await fetchProjects()
      showCreateModal.value = false
      resetForm()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save project')
    }
  } catch (error) {
    console.error('Error saving project:', error)
    alert(`Error: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const editProject = (project) => {
  editingProject.value = project
  projectForm.name = project.name
  projectForm.namespace = project.namespace || ''
  projectForm.description = project.description || ''
  showCreateModal.value = true
}

const deleteProject = async (project) => {
  if (confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        await fetchProjects()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Error: ${error.message}`)
    }
  }
}

const resetForm = () => {
  editingProject.value = null
  projectForm.name = ''
  projectForm.namespace = ''
  projectForm.description = ''
}

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped lang="scss">
.projects-container {
  // 样式由ManagementLayout管理
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    font-size: 28px;
    font-weight: 600;
    //color: #2c3e50;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 8px;

    .material-icons {
      font-size: 20px;
    }
  }
}

.projects-list {
  .loading {
    text-align: center;
    padding: 40px 0;
    //color: #7f8c8d;

    .material-icons {
      font-size: 48px;
      margin-bottom: 10px;
      animation: spin 2s linear infinite;
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 0;

    .material-icons {
      font-size: 72px;
      color: #bdc3c7;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 24px;
      //color: #2c3e50;
      margin-bottom: 10px;
    }

    p {
      color: #7f8c8d;
      margin-bottom: 30px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.project-card {
  //background: white;
  border-radius: 8px;
  border: 1px solid #525254;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.project-header {
  display: flex;
  align-items: flex-start;
  padding: 20px;

  .project-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(52, 152, 219, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;

    .material-icons {
      color: #3498db;
      font-size: 24px;
    }
  }

  .project-title {
    flex: 1;

    h3 {
      font-size: 18px;
      font-weight: 600;
      //color: #2c3e50;
      margin-bottom: 5px;
    }

    p {
      color: #7f8c8d;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .project-actions {
    display: flex;
    gap: 5px;
  }
}

.project-stats {
  display: flex;
  padding: 0 20px 15px;

  .stat {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #7f8c8d;
    font-size: 14px;

    &:not(:last-child) {
      margin-right: 20px;
    }

    .material-icons {
      font-size: 16px;
    }
  }
}

.project-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  background: rgba(52, 152, 219, 0.05);
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
  gap: 5px;

  .material-icons {
    font-size: 18px;
  }

  &:hover {
    background: rgba(52, 152, 219, 0.1);
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
}

.modal {
  background: white;
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
    border-bottom: 1px solid #f1f2f6;

    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
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
        color: #34495e;
      }

      input,
      textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;

        &:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
      }

      .form-help {
        display: block;
        margin-top: 5px;
        font-size: 0.8rem;
        color: #7f8c8d;
        font-style: italic;
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #f1f2f6;
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

// Button styles
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-primary {
    background-color: #3498db;
    color: white;

    &:hover:not(:disabled) {
      background-color: #2980b9;
    }
  }

  &.btn-ghost {
    background: transparent;
    color: #7f8c8d;

    &:hover {
      background: rgba(127, 140, 141, 0.1);
    }
  }

  &.btn-icon {
    padding: 8px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;

    .material-icons {
      font-size: 18px;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
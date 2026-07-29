<template>
  <ManagementLayout>
    <div class="repos-container">
      <div class="repos-table-container">
        <div class="table-controls">
          <input type="text" :placeholder="$t('projectDetail.searchRepos')" v-model="searchQuery" class="search-input" />
          <div class="table-actions">
            <button class="btn btn-primary" @click="showAddModal = true">
              <span class="material-icons">add</span>
              {{ $t('projectDetail.createRegistry') }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="repos-table">
            <thead>
              <tr>
                <th>{{ $t('projectDetail.repoName') }}</th>
                <th>{{ $t('projects.namespace') }}</th>
                <th>{{ $t('projects.title') }}</th>
                <th>{{ $t('projectDetail.visibility') }}</th>
                <th>{{ $t('projectDetail.memberCount') }}</th>
                <th>{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="6" class="loading-cell">
                  <div class="loading-indicator">
                    <span class="material-icons">refresh</span>
                    {{ $t('projectDetail.loadingRepositories') }}
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredRepos.length === 0">
                <td colspan="6" class="empty-cell">{{ $t('projectDetail.noRepos') }}</td>
              </tr>
              <tr v-for="repo in filteredRepos" :key="repo.id">
                <td>{{ repo.name }}</td>
                <td>{{ repo.namespace }}</td>
                <td>{{ repo.project_name }}</td>
                <td>
                  <span :class="['status-badge', repo.is_public ? 'public' : 'private']">
                    {{ repo.is_public ? $t('projectDetail.public') : $t('projectDetail.private') }}
                  </span>
                </td>
                <td>{{ repo.memberCount || 0 }}</td>
                <td class="action-buttons">
                  <button class="btn btn-icon btn-ghost" :title="$t('projectDetail.manageMembers')">
                    <span class="material-icons">group</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Repository Modal -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ $t('projectDetail.createNewRegistry') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showAddModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form @submit.prevent="handleAddRepository" class="modal-content">
            <div class="form-group">
              <label for="add-repo-project">{{ $t('projectDetail.belongingProject') }} *</label>
              <select id="add-repo-project" v-model="addForm.projectId" required class="form-select">
                <option value="" disabled>{{ $t('projectDetail.selectProject') }}</option>
                <option v-for="project in projectList" :key="project.id" :value="project.id">
                  {{ project.namespace ? project.namespace + ' / ' : '' }}{{ project.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="add-repo-name">{{ $t('projectDetail.registryRepositoryName') }} *</label>
              <input id="add-repo-name" type="text" v-model="addForm.name" required
                     :placeholder="$t('projectDetail.registryRepositoryNamePlaceholder')" />
            </div>

            <div class="form-group">
              <label for="add-repo-desc">{{ $t('projects.description') }}</label>
              <textarea id="add-repo-desc" v-model="addForm.description" rows="3" :placeholder="$t('projects.descriptionPlaceholder')"></textarea>
            </div>

            <div v-if="addError" class="form-error">{{ addError }}</div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="showAddModal = false">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? $t('projectDetail.creating') + '...' : $t('projectDetail.createRegistry') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { http } from '@/utils/http'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import { useNotifications } from '@/composables/useNotifications'

const { showSuccess, showError } = useNotifications()

const repos = ref<any[]>([])
const projectList = ref<any[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const searchQuery = ref('')
const showAddModal = ref(false)
const addError = ref('')

const addForm = ref({
  projectId: '',
  name: '',
  description: ''
})

const filteredRepos = computed(() => {
  if (!searchQuery.value) return repos.value
  const q = searchQuery.value.toLowerCase()
  return repos.value.filter((r: any) =>
    r.name.toLowerCase().includes(q) ||
    (r.project_name && r.project_name.toLowerCase().includes(q)) ||
    (r.namespace && r.namespace.toLowerCase().includes(q))
  )
})

async function fetchRepos() {
  try {
    const res = await http.get('/api/repository/all')
    repos.value = res.data || []
  } catch (e) {
    console.error('Failed to load repositories:', e)
  } finally {
    isLoading.value = false
  }
}

async function fetchProjects() {
  try {
    const res = await http.get('/api/projects?page=1&limit=1000')
    projectList.value = res.data || []
  } catch (e) {
    console.error('Failed to load projects:', e)
  }
}

async function handleAddRepository() {
  addError.value = ''

  if (!addForm.value.projectId) {
    addError.value = '请选择所属项目'
    return
  }
  if (!addForm.value.name.trim()) {
    addError.value = '仓库名称不能为空'
    return
  }

  try {
    isSubmitting.value = true
    const res = await http.post('/api/repository/create', {
      projectId: Number(addForm.value.projectId),
      name: addForm.value.name.trim(),
      description: addForm.value.description.trim()
    })
    if (res.success) {
      showSuccess('仓库创建成功')
      showAddModal.value = false
      addForm.value = { projectId: '', name: '', description: '' }
      await fetchRepos()
    } else {
      addError.value = res.message || '创建仓库失败'
    }
  } catch (e: any) {
    addError.value = e.message || '创建仓库失败'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchRepos(), fetchProjects()])
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.repos-container { padding: 0; }

.repos-table-container {
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

.table-container { overflow-x: auto; }

.repos-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    font-weight: 600;
    color: var(--neutral-text);
    background-color: var(--hover-background);
  }

  tr:hover { background-color: var(--hover-background); }

  .loading-cell, .empty-cell {
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
  }
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;

  &.public { background: #e8f5e9; color: #2e7d32; }
  &.private { background: #fff3e0; color: #e65100; }
}

/* Modal styles */
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
  z-index: var(--z-modal, 1050);
}

.modal {
  background: var(--card-background);
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-3, 0 10px 20px rgba(0,0,0,0.19));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);

  h2 {
    margin: 0;
    font-size: 18px;
    color: var(--primary-text);
  }
}

.modal-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text);
  }

  input, textarea, .form-select {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
    background: var(--input-bg);
    color: var(--input-color);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }

  .form-select {
    appearance: auto;
  }

  textarea {
    resize: vertical;
  }
}

.form-error {
  color: var(--error-color, #f44336);
  font-size: 13px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.08);
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

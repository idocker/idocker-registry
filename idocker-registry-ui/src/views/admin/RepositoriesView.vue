<template>
  <ManagementLayout>
    <div class="repos-container">
      <div class="repos-table-container">
        <div class="table-controls">
          <input type="text" :placeholder="$t('projectDetail.searchRepos')" v-model="searchQuery" class="search-input" />
          <div class="table-actions">
            <label v-if="isAdmin" class="recycle-toggle" :title="$t('recycleBin.toggleHint')">
              <input type="checkbox" v-model="showRecycleBin" />
              <span>{{ $t('recycleBin.toggle') }}</span>
            </label>
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
                <td colspan="6" class="empty-cell">
                  {{ showRecycleBin ? $t('recycleBin.emptyRecycleBin') : $t('projectDetail.noRepos') }}
                </td>
              </tr>
              <tr v-for="repo in filteredRepos" :key="repo.id">
                <td>
                  <div class="entity-name-cell">
                    <span>{{ repo.name }}</span>
                    <span v-if="repo.deleted_at" class="status-badge recycled">
                      {{ $t('recycleBin.badge') }}
                    </span>
                  </div>
                  <div v-if="repo.deleted_at" class="recycle-meta">
                    <span>{{ $t('recycleBin.deletedAt') }}: {{ formatDate(repo.deleted_at) }}</span>
                    <span>{{ $t('recycleBin.deletedBy') }}: {{ repo.deleted_by_username || $t('recycleBin.unknownUser') }}</span>
                  </div>
                </td>
                <td>{{ repo.namespace }}</td>
                <td>{{ repo.project_name }}</td>
                <td>
                  <span :class="['status-badge', repo.is_public ? 'public' : 'private']">
                    {{ repo.is_public ? $t('projectDetail.public') : $t('projectDetail.private') }}
                  </span>
                </td>
                <td>{{ repo.memberCount || 0 }}</td>
                <td class="action-buttons">
                  <template v-if="repo.deleted_at">
                    <template v-if="isAdmin">
                      <button class="btn btn-icon btn-ghost" @click="requestRestoreRepo(repo)"
                        :title="$t('recycleBin.restore')">
                        <span class="material-icons">settings_backup_restore</span>
                      </button>
                      <button class="btn btn-icon btn-ghost btn-danger-ghost" @click="requestPurgeRepo(repo)"
                        :title="$t('recycleBin.purge')">
                        <span class="material-icons">delete_forever</span>
                      </button>
                    </template>
                  </template>
                  <template v-else>
                    <button class="btn btn-icon btn-ghost" :title="$t('projectDetail.manageMembers')" @click="openMembers(repo)">
                      <span class="material-icons">group</span>
                    </button>
                    <button class="btn btn-icon btn-ghost btn-danger-ghost" :title="$t('common.delete')" @click="requestDeleteRepo(repo)">
                      <span class="material-icons">delete</span>
                    </button>
                  </template>
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
              <textarea id="add-repo-desc" v-model="addForm.description" rows="3" :placeholder="$t('projectDetail.registryDescriptionPlaceholder')"></textarea>
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

      <!-- 回收站：删除仓库（假删除） -->
      <DeleteConfirmDialog
        v-if="showDeleteRepoModal && repoToDelete"
        :title="$t('recycleBin.deleteRepositoryTitle')"
        :entity-label="$t('recycleBin.repositoryLabel')"
        :entity-name="repoToDelete.name"
        :loading="isDeletingRepo"
        @confirm="confirmDeleteRepo"
        @cancel="showDeleteRepoModal = false"
      />

      <!-- 回收站：恢复确认 -->
      <ConfirmationDialog
        v-if="showRestoreRepoModal && repoToRestore"
        :title="$t('recycleBin.restoreConfirmTitle')"
        :message="$t('recycleBin.restoreConfirm', { name: repoToRestore.name })"
        @confirm="confirmRestoreRepo"
        @cancel="showRestoreRepoModal = false"
      />

      <!-- 回收站：彻底删除确认（会同时删除 registry 中的镜像数据） -->
      <DeleteConfirmDialog
        v-if="showPurgeRepoModal && repoToPurge"
        :title="$t('recycleBin.purgeConfirmTitle')"
        :entity-label="$t('recycleBin.repositoryLabel')"
        :entity-name="repoToPurge.name"
        :warning="$t('recycleBin.purgeWarningWithImages')"
        :loading="isPurgingRepo"
        @confirm="confirmPurgeRepo"
        @cancel="showPurgeRepoModal = false"
      />

      <!-- Member Management Modal -->
      <div v-if="showMembersModal" class="modal-overlay" @click.self="closeMembers">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>{{ $t('repoMembers.title') }}：{{ activeRepo?.name }}</h2>
            <button class="btn btn-ghost btn-icon" @click="closeMembers">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-content">
            <div v-if="membersLoading" class="members-loading">{{ $t('projectDetail.loadingRepositories') }}</div>
            <template v-else>
              <ul v-if="repoMembers.length > 0" class="member-list">
                <li v-for="m in repoMembers" :key="m.user_id" class="member-item">
                  <div class="member-info">
                    <div class="member-name">{{ m.username }}<template v-if="m.full_name">（{{ m.full_name }}）</template></div>
                    <div class="member-meta">{{ m.email || '—' }}</div>
                  </div>
                  <select class="form-select role-select" :value="m.role" @change="handleRoleChange(m, $event)">
                    <option value="project_manager">{{ $t('repoMembers.projectManager') }}</option>
                    <option value="developer">{{ $t('repoMembers.developer') }}</option>
                    <option value="operator">{{ $t('repoMembers.operator') }}</option>
                  </select>
                  <button class="btn btn-icon btn-ghost member-remove" :title="$t('common.delete')" @click="handleRemoveMember(m)">
                    <span class="material-icons">delete</span>
                  </button>
                </li>
              </ul>
              <div v-else class="members-empty">{{ $t('repoMembers.noMembers') }}</div>

              <div v-if="membersError" class="form-error">{{ membersError }}</div>

              <div class="add-member-row">
                <select v-model="memberForm.userId" class="form-select">
                  <option value="" disabled>{{ $t('repoMembers.selectUser') }}</option>
                  <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                    {{ u.username }}<template v-if="u.full_name">（{{ u.full_name }}）</template>
                  </option>
                </select>
                <select v-model="memberForm.role" class="form-select role-select">
                  <option value="project_manager">{{ $t('repoMembers.projectManager') }}</option>
                  <option value="developer">{{ $t('repoMembers.developer') }}</option>
                  <option value="operator">{{ $t('repoMembers.operator') }}</option>
                </select>
                <button class="btn btn-primary" :disabled="addingMember || availableUsers.length === 0" @click="handleAddMember">
                  <span class="material-icons">person_add</span>
                  {{ addingMember ? $t('repoMembers.adding') : $t('repoMembers.addMember') }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { http } from '@/utils/http'
import repositoryService from '@/services/repository.service'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import DeleteConfirmDialog from '@/components/dialogs/DeleteConfirmDialog.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useNotifications } from '@/composables/useNotifications'
import { formatDate as fmtDate } from '@/utils/helpers'

const { showSuccess, showError } = useNotifications()
// 回收站视图 / 恢复 / 彻底删除仅管理员可见（后端仍会兜底校验）
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')

const repos = ref<any[]>([])
const projectList = ref<any[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const searchQuery = ref('')
// 回收站（假删除）视图开关
const showRecycleBin = ref(false)
const showAddModal = ref(false)
const addError = ref('')

const addForm = ref({
  projectId: '',
  name: '',
  description: ''
})

// ===== 仓库成员管理 =====
const { t, locale } = useI18n()
const showMembersModal = ref(false)
const activeRepo = ref<any>(null)
const repoMembers = ref<any[]>([])
const userOptions = ref<any[]>([])
const membersLoading = ref(false)
const membersError = ref('')
const addingMember = ref(false)
const memberForm = ref({ userId: '', role: 'developer' })

const availableUsers = computed(() =>
  userOptions.value.filter(
    (u: any) =>
      u.is_active !== 0 &&
      u.role !== 'admin' &&
      !repoMembers.value.some((m: any) => m.user_id === u.id)
  )
)

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
    isLoading.value = true
    // 开启回收站只拉已删除（deleted=1），否则只看未删除（deleted=0）
    const res = await repositoryService.getAllRepositories({
      deleted: showRecycleBin.value ? '1' : '0'
    })
    repos.value = res.data || []
  } catch (e) {
    console.error('Failed to load repositories:', e)
    repos.value = []
  } finally {
    isLoading.value = false
  }
}

const formatDate = (dateString: string) => dateString ? fmtDate(dateString, locale.value) : '-'

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

// 切换回收站视图时重新拉取
watch(showRecycleBin, () => {
  fetchRepos()
})

// ===== 回收站（假删除）操作 =====
const repoToDelete = ref<any>(null)
const showDeleteRepoModal = ref(false)
const isDeletingRepo = ref(false)
const repoToRestore = ref<any>(null)
const showRestoreRepoModal = ref(false)
const isRestoringRepo = ref(false)
const repoToPurge = ref<any>(null)
const showPurgeRepoModal = ref(false)
const isPurgingRepo = ref(false)

function requestDeleteRepo(repo: any) {
  repoToDelete.value = repo
  showDeleteRepoModal.value = true
}

async function confirmDeleteRepo() {
  if (!repoToDelete.value || isDeletingRepo.value) return
  isDeletingRepo.value = true
  const name = repoToDelete.value.name
  try {
    // 假删除：仓库进入回收站，可由管理员恢复
    const res = await repositoryService.deleteRepository(repoToDelete.value.id)
    if (res.success === false) {
      throw new Error(res.message || t('recycleBin.operationFailed'))
    }
    showDeleteRepoModal.value = false
    repoToDelete.value = null
    await fetchRepos()
    showSuccess(t('recycleBin.deleteSuccess', { name }))
  } catch (e: any) {
    showError(e.message || t('recycleBin.operationFailed'))
  } finally {
    isDeletingRepo.value = false
  }
}

function requestRestoreRepo(repo: any) {
  repoToRestore.value = repo
  showRestoreRepoModal.value = true
}

async function confirmRestoreRepo() {
  if (!repoToRestore.value || isRestoringRepo.value) return
  isRestoringRepo.value = true
  const name = repoToRestore.value.name
  try {
    const res = await repositoryService.restoreRepository(repoToRestore.value.id)
    if (res.success === false) {
      throw new Error(res.message || t('recycleBin.operationFailed'))
    }
    showRestoreRepoModal.value = false
    repoToRestore.value = null
    await fetchRepos()
    showSuccess(t('recycleBin.restoreSuccess', { name }))
  } catch (e: any) {
    showError(e.message || t('recycleBin.operationFailed'))
  } finally {
    isRestoringRepo.value = false
  }
}

function requestPurgeRepo(repo: any) {
  repoToPurge.value = repo
  showPurgeRepoModal.value = true
}

async function confirmPurgeRepo() {
  if (!repoToPurge.value || isPurgingRepo.value) return
  isPurgingRepo.value = true
  const name = repoToPurge.value.name
  try {
    // 彻底删除：后端会同时删除 registry 中的镜像数据，不可恢复
    const res = await repositoryService.purgeRepository(repoToPurge.value.id)
    if (res.success === false) {
      throw new Error(res.message || t('recycleBin.operationFailed'))
    }
    showPurgeRepoModal.value = false
    repoToPurge.value = null
    await fetchRepos()
    showSuccess(t('recycleBin.purgeSuccess', { name }))
  } catch (e: any) {
    showError(e.message || t('recycleBin.operationFailed'))
  } finally {
    isPurgingRepo.value = false
  }
}

// ===== 仓库成员管理逻辑 =====
async function openMembers(repo: any) {
  activeRepo.value = repo
  showMembersModal.value = true
  membersError.value = ''
  memberForm.value = { userId: '', role: 'developer' }
  membersLoading.value = true
  try {
    const [membersRes, usersRes] = await Promise.all([
      http.get(`/api/repository/${repo.id}/members`),
      http.get('/api/users?page=1&limit=1000')
    ])
    repoMembers.value = membersRes.data?.members || []
    userOptions.value = usersRes.data || []
  } catch (e: any) {
    membersError.value = e.message || t('repoMembers.loadFailed')
  } finally {
    membersLoading.value = false
  }
}

function closeMembers() {
  showMembersModal.value = false
  activeRepo.value = null
}

async function loadMembers() {
  if (!activeRepo.value) return
  try {
    const res = await http.get(`/api/repository/${activeRepo.value.id}/members`)
    repoMembers.value = res.data?.members || []
  } catch (e: any) {
    membersError.value = e.message || t('repoMembers.loadFailed')
  }
}

async function handleAddMember() {
  if (!activeRepo.value) return
  if (!memberForm.value.userId) {
    membersError.value = t('repoMembers.userRequired')
    return
  }
  addingMember.value = true
  membersError.value = ''
  try {
    await http.post(`/api/repository/${activeRepo.value.id}/members`, {
      userId: Number(memberForm.value.userId),
      role: memberForm.value.role
    })
    showSuccess(t('repoMembers.addSuccess'))
    memberForm.value = { userId: '', role: 'developer' }
    await loadMembers()
  } catch (e: any) {
    membersError.value = e.message || t('repoMembers.addFailed')
  } finally {
    addingMember.value = false
  }
}

async function handleRoleChange(member: any, event: Event) {
  if (!activeRepo.value) return
  const role = (event.target as HTMLSelectElement).value
  if (member.role === role) return
  try {
    await http.put(`/api/repository/${activeRepo.value.id}/members/${member.user_id}`, { role })
    member.role = role
    showSuccess(t('repoMembers.roleUpdated'))
  } catch (e: any) {
    showError(e.message || t('repoMembers.roleUpdateFailed'))
    await loadMembers()
  }
}

async function handleRemoveMember(member: any) {
  if (!activeRepo.value) return
  if (!window.confirm(t('repoMembers.removeConfirm', { name: member.username }))) return
  try {
    await http.delete(`/api/repository/${activeRepo.value.id}/members/${member.user_id}`)
    repoMembers.value = repoMembers.value.filter((m: any) => m.user_id !== member.user_id)
    showSuccess(t('repoMembers.removeSuccess'))
  } catch (e: any) {
    showError(e.message || t('repoMembers.removeFailed'))
  }
}
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
  &.recycled { background: rgba(244, 67, 54, 0.12); color: var(--error-color, #f44336); }
}

/* 回收站（假删除） */
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

.btn-danger-ghost {
  color: var(--error-color, #f44336);
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

/* Member management modal */
.modal-lg {
  width: 680px;
}

.member-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  max-height: 40vh;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}

.member-item:last-child {
  border-bottom: none;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-weight: 500;
  color: var(--primary-text);
  word-break: break-all;
}

.member-meta {
  font-size: 12px;
  color: var(--neutral-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-select {
  width: 150px;
  padding: 8px;
  flex-shrink: 0;
}

.member-remove {
  color: var(--error-color, #f44336);
  flex-shrink: 0;
}

.members-empty,
.members-loading {
  padding: 24px 12px;
  text-align: center;
  color: var(--neutral-text);
}

.add-member-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);

  .form-select {
    flex: 1;
    min-width: 0;
  }

  .btn-primary {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}
</style>

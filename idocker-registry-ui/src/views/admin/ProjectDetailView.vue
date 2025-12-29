<template>
  <ManagementLayout>
    <div class="project-detail-container">
      <div class="project-header">
        <div class="project-info">
          <div class="project-title">
            <h1>{{ project.name }}</h1>
            <p>{{ project.description }}</p>
          </div>

          <router-link to="/admin/projects" class="back-link">
            <span class="material-icons">arrow_back</span>
            {{ $t('projectDetail.backToProjects') }}
          </router-link>
        </div>

        <div class="project-actions" v-if="false">
          <button class="btn btn-primary" @click="showRepositoryModal = true">
            <span class="material-icons">add</span>
            {{ $t('projectDetail.addRegistry') }}
          </button>
          <button class="btn btn-ghost" @click="editProject">
            <span class="material-icons">edit</span>
            {{ $t('projectDetail.editProject') }}
          </button>
        </div>
      </div>

      <div class="project-tabs">
        <button v-for="tab in tabs" :key="tab.id" :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id">
          {{ tab.name }}
        </button>
      </div>

      <div class="project-content">
        <!-- Repositories Tab -->
        <div v-if="activeTab === 'repositories'" class="tab-content">
          <div class="section-header">
            <h2>{{ $t('projectDetail.repositories') }}</h2>
            <button class="btn btn-primary" @click="showRepositoryModal = true">
              <span class="material-icons">add</span>
              {{ $t('projectDetail.addRegistry') }}
            </button>
          </div>
          <div class="repositories-table-container">


            <div class="table-container">
              <table class="repositories-table">
                <thead>
                  <tr>
                    <th>{{ $t('projects.projectName') }}</th>
                    <th>{{ $t('projects.description') }}</th>
                    <th>{{ $t('projects.type') }}</th>
                    <th>{{ $t('projects.createdAt') }}</th>
                    <th>{{ $t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="isLoading">
                    <td colspan="5" class="loading-cell">
                      <div class="loading-indicator">
                        <span class="material-icons">refresh</span>
                        {{ $t('projectDetail.loadingRepositories') }}
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="repositories.length === 0">
                    <td colspan="5" class="empty-cell">
                      <div class="empty-state">
                        <span class="material-icons">storage</span>
                        <h3>{{ $t('projectDetail.noRepositoriesYet') }}</h3>
                        <p>{{ $t('projectDetail.addFirstRepository') }}</p>
                        <button class="btn btn-primary" @click="showRepositoryModal = true">
                          <span class="material-icons">add</span>
                          {{ $t('projectDetail.addFirstRepository') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-for="repository in repositories" :key="repository.id">
                    <td>
                      <div class="repository-name-cell">
                        <div class="repository-icon">
                          <span class="material-icons">storage</span>
                        </div>
                        <span>{{ repository.name }}</span>
                      </div>
                    </td>
                    <td>{{ repository.description || '-' }}</td>

                    <td>{{ formatDate(repository.createdAt || new Date().toISOString()) }}</td>
                    <td class="action-buttons">
                      <button class="btn-icon btn-ghost" @click="editRepository(repository)" :title="$t('projectDetail.editRegistry')" disabled>
                        <span class="material-icons">edit</span>
                      </button>
                      <button class="btn-icon btn-ghost" @click="deleteRepository(repository)" :title="$t('common.delete')">
                        <span class="material-icons">delete</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Members Tab -->
        <div v-if="activeTab === 'members'" class="tab-content">
          <div class="section-header">
            <h2>{{ $t('projectDetail.projectMembers') }}</h2>
            <button class="btn btn-primary" @click="showAddMemberModal = true">
              <span class="material-icons">person_add</span>
              {{ $t('projectDetail.addMember') }}
            </button>
          </div>

          <div v-if="members.length === 0" class="empty-state">
            <span class="material-icons">people_outline</span>
            <h3>{{ $t('projectDetail.noMembersYet') }}</h3>
            <p>{{ $t('projectDetail.addTeamMembers') }}</p>
          </div>

          <div v-else class="members-list">
            <div v-for="member in members" :key="member.id" class="member-item">
              <div class="member-avatar">
                {{ member.username.charAt(0).toUpperCase() }}
              </div>
              <div class="member-info">
                <div class="member-name">{{ member.username }} <div class="member-role">{{ member.memberRole }}</div></div>
                <div class="member-email">{{ member.email }}</div>
                
              </div>
              <div class="member-actions">
                <select v-model="member.memberRole" @change="updateMemberRole(member)" class="role-select">
                  <option value="member">{{ $t('projectDetail.memberRole') }}</option>
                  <option value="maintainer">{{ $t('projects.roleMaintainer') }}</option>
                  <option value="owner">{{ $t('projects.roleOwner') }}</option>
                </select>
                <button class="btn btn-ghost btn-icon" @click="removeMember(member)">
                  <span class="material-icons">remove_circle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Member Modal -->
      <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ $t('projectDetail.addProjectMember') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showAddMemberModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form @submit.prevent="addMember" class="modal-content">
            <div class="form-group">
              <label for="member-user">{{ $t('projectDetail.selectUser') }} *</label>
              <select id="member-user" v-model="memberForm.userId" required>
                <option value="">{{ $t('projectDetail.selectUser') }}</option>
                <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                  {{ user.username }} ({{ user.email }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="member-role">{{ $t('projects.role') }}</label>
              <select id="member-role" v-model="memberForm.role">
                <option value="member">{{ $t('projectDetail.memberRole') }}</option>
                <option value="maintainer">{{ $t('projects.roleMaintainer') }}</option>
                <option value="owner">{{ $t('projects.roleOwner') }}</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="showAddMemberModal = false">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? $t('projectDetail.addingMember') + '...' : $t('projectDetail.addMember') }}
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
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import projectService from '@/services/project.service'
import repositoryService from '@/services/repository.service'
import userService from '@/services/user.service'
import { useNotifications } from '@/composables/useNotifications'
import type { ProjectDetails, ProjectMember, AddMemberData, User, Repository ,Image} from '@/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { showError } = useNotifications()

const project = ref<ProjectDetails>({} as ProjectDetails)
const repositories = ref<Image[]>([])
const members = ref<ProjectMember[]>([])
const replicationPolicies = ref([])
const availableUsers = ref<User[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const activeTab = ref('repositories')

const showRepositoryModal = ref(false)
const showAddMemberModal = ref(false)
const showReplicationModal = ref(false)

const editingRepository = ref(null)
const editingReplication = ref(null)

const repositoryForm = reactive({
  name: '',
  url: '',
  type: 'docker',
  hasAuth: false,
  authConfig: {
    username: '',
    password: ''
  }
})

const memberForm = reactive({
  userId: '',
  role: 'member'
})

const replicationForm = reactive({
  name: '',
  sourceRepositoryId: '',
  targetRepositoryId: '',
  schedule: 'manual',
  enabled: true
})

const tabs = [
  { id: 'repositories', name: t('projectDetail.repositories') },
  { id: 'members', name: t('projectDetail.members') },
  //{ id: 'replication', name: t('projectDetail.replicationPolicies') }
]

const fetchProjectData = async () => {
  try {
    isLoading.value = true
    const projectId = route.params.id as string

    const [projectResponse] = await Promise.all([
      projectService.getProject(projectId)
    ])

    if (projectResponse.success) {
      project.value = projectResponse.data
      members.value = projectResponse.data.members || []
    }

    // 获取项目相关的仓库
    const repositoriesResponse = await repositoryService.getProjectImages(projectId, {})
    if (repositoriesResponse.success && repositoriesResponse.data) {
      repositories.value = repositoriesResponse.data || []
    } else {
      repositories.value = []
    }

    replicationPolicies.value = []
  } catch (error) {
    console.error('Error fetching project data:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchUsers = async () => {
  try {
    await userService.getUsers({}).then(response => {
      if (response.success && (response.data )) {
      // 兼容两种数据结构：data 和 datas
      availableUsers.value = response.data || []
      } else {
        availableUsers.value = []
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    availableUsers.value = []
  }
}

const addMember = async () => {
  try {
    isSubmitting.value = true

    const response = await projectService.addMember(
      project.value.id.toString(),
      {
        userId: Number(memberForm.userId),
        role: memberForm.role as 'owner' | 'maintainer' | 'viewer'
      }
    )

    if (response.success) {
      await fetchProjectData()
      showAddMemberModal.value = false
      resetMemberForm()
    } else {
      throw new Error(response.message || 'Failed to add member')
    }
  } catch (error: any) {
    console.error('Error adding member:', error)
    showError(t('projectDetail.togglePolicyStatusFailed'), error.message)
  } finally {
    isSubmitting.value = false
  }
}

const updateMemberRole = async (member: ProjectMember) => {
  try {
    const response = await projectService.updateMemberRole(
      project.value.id.toString(),
      member.id.toString(),
      { role: member.memberRole }
    )

    if (!response.success) {
      throw new Error(response.message || 'Failed to update member role')
    }
  } catch (error: any) {
    console.error('Error updating member role:', error)
    showError(t('projectDetail.togglePolicyStatusFailed'), error.message)
    // Revert the change if it failed
    await fetchProjectData()
  }
}

const editRepository = (repository: Image) => {
  // TODO: Implement edit repository functionality
  console.log('Edit repository:', repository)
}

const removeMember = async (member: ProjectMember) => {
  if (confirm(t('projectDetail.confirmRemoveMember', { username: member.username }))) {
    try {
      const response = await projectService.removeMember(
        project.value.id.toString(),
        member.id.toString()
      )

      if (response.success) {
        await fetchProjectData()
      } else {
        throw new Error(response.message || 'Failed to remove member')
      }
    } catch (error: any) {
      console.error('Error removing member:', error)
      showError(t('projectDetail.deletePolicyFailed'), error.message)
    }
  }
}


const editProject = () => {
  // TODO: Implement edit project functionality
  console.log('Edit project:', project.value)
}

const resetMemberForm = () => {
  memberForm.userId = ''
  memberForm.role = 'member'
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

const deleteRepository = (repository: Image) => {
  if (confirm(t('projectDetail.confirmDeleteRepository', { name: repository.name }))) {
    // TODO: Implement delete repository functionality
    console.log('Delete repository:', repository)
  }
}

onMounted(() => {
  fetchProjectData()
  fetchUsers()
})
</script>

<style scoped lang="scss">
.project-detail-container {
  // 样式由ManagementLayout管理
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;

  .project-info {
    width: 100%;

    .back-link {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #7f8c8d;
      text-decoration: none;
      margin-bottom: 15px;
      font-size: 14px;
      float: right;
      padding-top: 10px;

      &:hover {
        color: #3498db;
      }

      .material-icons {
        font-size: 18px;
      }
    }

    .project-title {
      float: left;

      h1 {
        font-size: 28px;
        font-weight: 600;
        //color: #2c3e50;
        margin-bottom: 8px;
      }

      p {
        color: #7f8c8d;
        font-size: 16px;
      }
    }
  }

  .project-actions {
    display: flex;
    gap: 10px;

    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.project-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 30px;

  .tab-button {
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--primary-text);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      color: var(--primary-color);
    }

    &.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }
  }
}

.project-content {
  .loading {
    text-align: center;
    padding: 40px 0;
    color: #7f8c8d;

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
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    //margin-bottom: 20px;
    background-color: var(--card-bg);
    padding: 16px;
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid var(--border-color);

    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 0px;
      //color: #2c3e50;
    }
  }
}

.repositories-table-container {
  background-color: var(--card-bg);
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);

  .table-actions {
    display: flex;
    gap: 8px;
  }
}

.table-container {
  overflow-x: auto;
}

.repositories-table {
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
  }

  .repository-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .repository-icon {
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

.repository-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.repository-card {
  background: var(--card-bg);
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.repository-header {
  display: flex;
  align-items: flex-start;
  padding: 20px;

  .repository-icon {
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

  .repository-title {
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

  .repository-actions {
    display: flex;
    gap: 5px;
  }
}

.repository-stats {
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

.members-list {
  //background: white;
  background-color: var(--card-bg);
  border-radius: 0 0 8px 8px;
  //border: 1px solid #525254;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }

  .member-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3498db;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    margin-right: 15px;
  }

  .member-info {
    flex: 2;

    .member-name {
      font-weight: 600;
      //color: #2c3e50;
      margin-bottom: 4px;
    }

    .member-email {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .member-role {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(52, 152, 219, 0.1);
      color: #3498db;
      display: inline-block;
    }
  }

  .member-actions {
    display: flex;
    align-items: center;
    gap: 10px;

    .role-select {
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    }
  }
}

.policies-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.policy-item {
  padding: 20px;
  border-bottom: 1px solid #f1f2f6;

  &:last-child {
    border-bottom: none;
  }

  .policy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    .policy-name {
      display: flex;
      align-items: center;
      gap: 10px;

      h3 {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
      }

      .policy-status {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 12px;

        &.enabled {
          background: rgba(46, 204, 113, 0.1);
          color: #27ae60;
        }

        &.disabled {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }
      }
    }

    .policy-actions {
      display: flex;
      gap: 5px;
    }
  }

  .policy-details {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;

    .policy-detail {
      display: flex;
      flex-direction: column;

      .detail-label {
        font-size: 12px;
        color: #7f8c8d;
        margin-bottom: 4px;
      }

      span:not(.detail-label) {
        font-weight: 500;
        color: #2c3e50;
      }
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--border-color);

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
      //color: #2c3e50;
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
        //color: #34495e;
      }

      input,
      select,
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

      textarea {
        resize: vertical;
      }
    }

    .auth-fields {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      margin-top: 10px;
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
    background-color: var(--primary-color);
    color: white;

    &:hover:not(:disabled) {
      background-color: var(--primary-color-hover);
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
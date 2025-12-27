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
                    <td>
                      <div class="stat">
                        <span class="material-icons">dns</span>
                        <span>{{ repository.type }}</span>
                      </div>
                    </td>
                    <td>{{ formatDate(repository.created_at) }}</td>
                    <td class="action-buttons">
                      <button class="btn-icon btn-ghost" @click="editRepository(repository)" :title="$t('projectDetail.editRegistry')">
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
                <div class="member-name">{{ member.username }} <div class="member-role">{{ member.role }}</div></div>
                <div class="member-email">{{ member.email }}</div>
                
              </div>
              <div class="member-actions">
                <select v-model="member.role" @change="updateMemberRole(member)" class="role-select">
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

        <!-- Replication Policies Tab -->
        <div v-if="activeTab === 'replication'" class="tab-content">
          <div class="section-header">
            <h2>{{ $t('projectDetail.replicationPolicies') }}</h2>
            <button class="btn btn-primary" @click="showReplicationModal = true">
              <span class="material-icons">sync</span>
              {{ $t('projectDetail.createPolicy') }}
            </button>
          </div>

          <div v-if="replicationPolicies.length === 0" class="empty-state">
            <span class="material-icons">sync_disabled</span>
            <h3>{{ $t('projectDetail.noPoliciesYet') }}</h3>
            <p>{{ $t('projectDetail.createPoliciesReplicate') }}</p>
          </div>

          <div v-else class="policies-list">
            <div v-for="policy in replicationPolicies" :key="policy.id" class="policy-item">
              <div class="policy-header">
                <div class="policy-name">
                  <h3>{{ policy.name }}</h3>
                  <span :class="['policy-status', policy.enabled ? 'enabled' : 'disabled']">
                    {{ policy.enabled ? $t('projectDetail.enabled') : $t('projectDetail.disabled') }}
                  </span>
                </div>
                <div class="policy-actions">
                  <button class="btn btn-ghost btn-icon" @click="togglePolicyStatus(policy)">
                    <span class="material-icons">
                      {{ policy.enabled ? 'pause' : 'play_arrow' }}
                    </span>
                  </button>
                  <button class="btn btn-ghost btn-icon" @click="editReplicationPolicy(policy)">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn btn-ghost btn-icon" @click="deleteReplicationPolicy(policy)">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </div>

              <div class="policy-details">
                <div class="policy-detail">
                  <span class="detail-label">{{ $t('projectDetail.source') }}:</span>
                  <span>{{ policy.source_registry_name }}</span>
                </div>
                <div class="policy-detail">
                  <span class="detail-label">{{ $t('projectDetail.target') }}:</span>
                  <span>{{ policy.target_registry_name }}</span>
                </div>
                <div class="policy-detail">
                  <span class="detail-label">{{ $t('projectDetail.schedule') }}:</span>
                  <span>{{ policy.schedule }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Registry Modal -->
      <div v-if="showRegistryModal" class="modal-overlay" @click.self="closeRegistryModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingRegistry ? $t('projectDetail.editRegistry') : $t('projectDetail.addRegistry') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="closeRegistryModal">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form @submit.prevent="saveRegistry" class="modal-content">
            <div class="form-group">
              <label for="registry-name">{{ $t('projectDetail.registryName') }} *</label>
              <input id="registry-name" type="text" v-model="registryForm.name"
                :placeholder="$t('projectDetail.registryNamePlaceholder')" required />
            </div>

            <div class="form-group">
              <label for="registry-url">{{ $t('projectDetail.registryUrl') }} *</label>
              <input id="registry-url" type="url" v-model="registryForm.url"
                :placeholder="$t('projectDetail.registryUrlPlaceholder')" required />
            </div>

            <div class="form-group">
              <label for="registry-type">{{ $t('projectDetail.registryType') }}</label>
              <select id="registry-type" v-model="registryForm.type">
                <option value="docker">{{ $t('projectDetail.dockerRegistry') }}</option>
                <option value="harbor">{{ $t('projectDetail.harbor') }}</option>
                <option value="nexus">{{ $t('projectDetail.nexus') }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" v-model="registryForm.hasAuth" />
                {{ $t('projectDetail.requiresAuth') }}
              </label>
            </div>

            <div v-if="registryForm.hasAuth" class="auth-fields">
              <div class="form-group">
                <label for="auth-username">{{ $t('projectDetail.authUsername') }}</label>
                <input id="auth-username" type="text" v-model="registryForm.authConfig.username"
                  :placeholder="$t('auth.username')" />
              </div>

              <div class="form-group">
                <label for="auth-password">{{ $t('projectDetail.authPassword') }}</label>
                <input id="auth-password" type="password" v-model="registryForm.authConfig.password"
                  :placeholder="$t('auth.password')" />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="closeRegistryModal">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? $t('projectList.saving') + '...' : (editingRegistry ? $t('projectDetail.editRegistry')
                  : $t('projectDetail.addRegistry')) }}
              </button>
            </div>
          </form>
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

      <!-- Replication Policy Modal -->
      <div v-if="showReplicationModal" class="modal-overlay" @click.self="closeReplicationModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingReplication ? $t('projectDetail.editReplicationPolicy') :
              $t('projectDetail.createReplicationPolicy') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="closeReplicationModal">
              <span class="material-icons">close</span>
            </button>
          </div>

          <form @submit.prevent="saveReplicationPolicy" class="modal-content">
            <div class="form-group">
              <label for="policy-name">{{ $t('projectDetail.policyName') }} *</label>
              <input id="policy-name" type="text" v-model="replicationForm.name"
                :placeholder="$t('projectDetail.policyNamePlaceholder')" required />
            </div>

            <div class="form-group">
              <label for="source-registry">{{ $t('projectDetail.sourceRegistry') }} *</label>
              <select id="source-registry" v-model="replicationForm.sourceRegistryId" required>
                <option value="">{{ $t('projectDetail.selectSourceRegistry') }}</option>
                <option v-for="registry in registries" :key="registry.id" :value="registry.id">
                  {{ registry.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="target-registry">{{ $t('projectDetail.targetRegistry') }} *</label>
              <select id="target-registry" v-model="replicationForm.targetRegistryId" required>
                <option value="">{{ $t('projectDetail.selectTargetRegistry') }}</option>
                <option v-for="registry in registries" :key="registry.id" :value="registry.id">
                  {{ registry.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="policy-schedule">{{ $t('projectDetail.schedule') }}</label>
              <select id="policy-schedule" v-model="replicationForm.schedule">
                <option value="manual">{{ $t('projectDetail.manual') }}</option>
                <option value="daily">{{ $t('projectDetail.daily') }}</option>
                <option value="weekly">{{ $t('projectDetail.weekly') }}</option>
                <option value="hourly">{{ $t('projectDetail.hourly') }}</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="closeReplicationModal">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                {{ isSubmitting ? $t('projectList.saving') + '...' : (editingReplication ?
                  $t('projectDetail.updatePolicy') : $t('projectDetail.createPolicy')) }}
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
import type { ProjectDetails, ProjectMember, AddMemberData, User } from '@/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const project = ref<ProjectDetails>({} as ProjectDetails)
const repositories = ref([])
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
      if (response.success && response.data) {
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
      memberForm as AddMemberData
    )

    if (response.success) {
      await fetchProjectData()
      showAddMemberModal.value = false
      resetMemberForm()
    } else {
      throw new Error(response.message || 'Failed to add member')
    }
  } catch (error) {
    console.error('Error adding member:', error)
    alert(`${t('projectDetail.togglePolicyStatusFailed')}: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const updateMemberRole = async (member: ProjectMember) => {
  try {
    const response = await projectService.updateMemberRole(
      project.value.id.toString(),
      member.id.toString(),
      { role: member.role }
    )

    if (!response.success) {
      throw new Error(response.message || 'Failed to update member role')
    }
  } catch (error) {
    console.error('Error updating member role:', error)
    alert(`${t('projectDetail.togglePolicyStatusFailed')}: ${error.message}`)
    // Revert the change if it failed
    await fetchProjectData()
  }
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
    } catch (error) {
      console.error('Error removing member:', error)
      alert(`${t('projectDetail.deletePolicyFailed')}: ${error.message}`)
    }
  }
}

const saveReplicationPolicy = async () => {
  try {
    isSubmitting.value = true

    // 复制策略保存功能暂时注释，因为项目服务中没有这个方法
    // TODO: 在服务中添加保存复制策略的方法

    // 临时解决方案：使用 fetch 调用
    const policyData = {
      ...replicationForm,
      projectId: project.value.id
    }

    const url = editingReplication.value
      ? `/api/registries/replication-policies/${editingReplication.value.id}`
      : '/api/registries/replication-policies'

    const method = editingReplication.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(policyData)
    })

    if (response.ok) {
      await fetchProjectData()
      closeReplicationModal()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save replication policy')
    }
  } catch (error) {
    console.error('Error saving replication policy:', error)
    alert(`${t('projectDetail.togglePolicyStatusFailed')}: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const editReplicationPolicy = (policy) => {
  editingReplication.value = policy
  replicationForm.name = policy.name
  replicationForm.sourceRegistryId = policy.source_registry_id
  replicationForm.targetRegistryId = policy.target_registry_id
  replicationForm.schedule = policy.schedule
  replicationForm.enabled = policy.enabled

  showReplicationModal.value = true
}

const togglePolicyStatus = async (policy: any) => {
  try {
    // 复制策略功能暂时注释，因为项目服务中没有这个方法
    // TODO: 在服务中添加复制策略的方法

    // 临时解决方案：使用 fetch 调用
    const response = await fetch(`/api/registries/replication-policies/${policy.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        ...policy,
        enabled: !policy.enabled
      })
    })

    if (response.ok) {
      await fetchProjectData()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update policy status')
    }
  } catch (error) {
    console.error('Error toggling policy status:', error)
    alert(`${t('projectDetail.togglePolicyStatusFailed')}: ${error.message}`)
  }
}

const deleteReplicationPolicy = async (policy: any) => {
  if (confirm(t('projectDetail.confirmDeletePolicy', { name: policy.name }))) {
    try {
      // 删除复制策略功能暂时注释，因为项目服务中没有这个方法
      // TODO: 在服务中添加删除复制策略的方法

      // 临时解决方案：使用 fetch 调用
      const response = await fetch(`/api/registries/replication-policies/${policy.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        await fetchProjectData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete replication policy')
      }
    } catch (error) {
      console.error('Error deleting replication policy:', error)
      alert(`${t('projectDetail.deletePolicyFailed')}: ${error.message}`)
    }
  }
}

const closeRegistryModal = () => {
  showRegistryModal.value = false
  editingRegistry.value = null
  resetRegistryForm()
}

const closeReplicationModal = () => {
  showReplicationModal.value = false
  editingReplication.value = null
  resetReplicationForm()
}

const editProject = () => {
  // TODO: Implement edit project functionality
  console.log('Edit project:', project.value)
}

const resetRegistryForm = () => {
  registryForm.name = ''
  registryForm.url = ''
  registryForm.type = 'docker'
  registryForm.hasAuth = false
  registryForm.authConfig = {
    username: '',
    password: ''
  }
}

const resetMemberForm = () => {
  memberForm.userId = ''
  memberForm.role = 'member'
}

const resetReplicationForm = () => {
  replicationForm.name = ''
  replicationForm.sourceRegistryId = ''
  replicationForm.targetRegistryId = ''
  replicationForm.schedule = 'manual'
  replicationForm.enabled = true
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

const editRepository = (repository) => {
  editingRepository.value = repository
  repositoryForm.name = repository.name
  repositoryForm.url = repository.url
  repositoryForm.type = repository.type
  repositoryForm.hasAuth = repository.hasAuth || false
  if (repository.authConfig) {
    repositoryForm.authConfig.username = repository.authConfig.username || ''
    repositoryForm.authConfig.password = repository.authConfig.password || ''
  }
  showRegistryModal.value = true
}

const deleteRepository = (repository) => {
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
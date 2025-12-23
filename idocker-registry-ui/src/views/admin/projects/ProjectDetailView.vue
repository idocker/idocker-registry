<template>
  <ManagementLayout>
    <div class="project-detail-container">
      <div class="project-header">
        <div class="project-info">
          <router-link to="/admin/projects" class="back-link">
            <span class="material-icons">arrow_back</span>
            Back to Projects
          </router-link>
          
          <div class="project-title">
            <h1>{{ project.name }}</h1>
            <p>{{ project.description }}</p>
          </div>
        </div>
        
        <div class="project-actions" v-if="false">
          <button class="btn btn-primary" @click="showRegistryModal = true">
            <span class="material-icons">add</span>
            Add Registry
          </button>
          <button class="btn btn-ghost" @click="editProject">
            <span class="material-icons">edit</span>
            Edit Project
          </button>
        </div>
      </div>
    
    <div class="project-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <div class="project-content">
      <!-- Repositories Tab -->
      <div v-if="activeTab === 'repositories'" class="tab-content">
        <div v-if="isLoading" class="loading">
          <span class="material-icons">refresh</span>
          <p>Loading repositories...</p>
        </div>
        
        <div v-else-if="repositories.length === 0" class="empty-state">
          <span class="material-icons">storage</span>
          <h3>No repositories yet</h3>
          <p>Add your first Docker repository to this project</p>
          <button class="btn btn-primary" @click="showRepositoryModal = true">
            <span class="material-icons">add</span>
            Add Your First Repository
          </button>
        </div>
        
        <div v-else class="repositories-grid">
          <div v-for="repository in repositories" :key="repository.id" class="repository-card">
            <div class="repository-header">
              <div class="repository-icon">
                <span class="material-icons">storage</span>
              </div>
              <div class="repository-title">
                <h3>{{ repository.name }}</h3>
                <p>{{ repository.url }}</p>
              </div>
              <div class="repository-actions">
                <button class="btn btn-ghost btn-icon" @click="editRepository(repository)">
                  <span class="material-icons">edit</span>
                </button>
                <button class="btn btn-ghost btn-icon" @click="deleteRepository(repository)">
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>
            
            <div class="repository-stats">
              <div class="stat">
                <span class="material-icons">dns</span>
                <span>{{ repository.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Members Tab -->
      <div v-if="activeTab === 'members'" class="tab-content">
        <div class="section-header">
          <h2>Project Members</h2>
          <button class="btn btn-primary" @click="showAddMemberModal = true">
            <span class="material-icons">person_add</span>
            Add Member
          </button>
        </div>
        
        <div v-if="members.length === 0" class="empty-state">
          <span class="material-icons">people_outline</span>
          <h3>No members yet</h3>
          <p>Add team members to collaborate on this project</p>
        </div>
        
        <div v-else class="members-list">
          <div v-for="member in members" :key="member.id" class="member-item">
            <div class="member-avatar">
              {{ member.username.charAt(0).toUpperCase() }}
            </div>
            <div class="member-info">
              <div class="member-name">{{ member.username }}</div>
              <div class="member-email">{{ member.email }}</div>
              <div class="member-role">{{ member.role }}</div>
            </div>
            <div class="member-actions">
              <select 
                v-model="member.role" 
                @change="updateMemberRole(member)"
                class="role-select"
              >
                <option value="member">Member</option>
                <option value="maintainer">Maintainer</option>
                <option value="owner">Owner</option>
              </select>
              <button 
                class="btn btn-ghost btn-icon" 
                @click="removeMember(member)"
              >
                <span class="material-icons">remove_circle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Replication Policies Tab -->
      <div v-if="activeTab === 'replication'" class="tab-content">
        <div class="section-header">
          <h2>Replication Policies</h2>
          <button class="btn btn-primary" @click="showReplicationModal = true">
            <span class="material-icons">sync</span>
            Create Policy
          </button>
        </div>
        
        <div v-if="replicationPolicies.length === 0" class="empty-state">
          <span class="material-icons">sync_disabled</span>
          <h3>No replication policies yet</h3>
          <p>Create policies to replicate images between registries</p>
        </div>
        
        <div v-else class="policies-list">
          <div v-for="policy in replicationPolicies" :key="policy.id" class="policy-item">
            <div class="policy-header">
              <div class="policy-name">
                <h3>{{ policy.name }}</h3>
                <span :class="['policy-status', policy.enabled ? 'enabled' : 'disabled']">
                  {{ policy.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div class="policy-actions">
                <button 
                  class="btn btn-ghost btn-icon" 
                  @click="togglePolicyStatus(policy)"
                >
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
                <span class="detail-label">Source:</span>
                <span>{{ policy.source_registry_name }}</span>
              </div>
              <div class="policy-detail">
                <span class="detail-label">Target:</span>
                <span>{{ policy.target_registry_name }}</span>
              </div>
              <div class="policy-detail">
                <span class="detail-label">Schedule:</span>
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
          <h2>{{ editingRegistry ? 'Edit Registry' : 'Add Registry' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="closeRegistryModal">
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <form @submit.prevent="saveRegistry" class="modal-content">
          <div class="form-group">
            <label for="registry-name">Registry Name *</label>
            <input
              id="registry-name"
              type="text"
              v-model="registryForm.name"
              placeholder="Enter registry name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="registry-url">Registry URL *</label>
            <input
              id="registry-url"
              type="url"
              v-model="registryForm.url"
              placeholder="https://registry.example.com"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="registry-type">Registry Type</label>
            <select id="registry-type" v-model="registryForm.type">
              <option value="docker">Docker Registry</option>
              <option value="harbor">Harbor</option>
              <option value="nexus">Nexus</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="registryForm.hasAuth" />
              This registry requires authentication
            </label>
          </div>
          
          <div v-if="registryForm.hasAuth" class="auth-fields">
            <div class="form-group">
              <label for="auth-username">Username</label>
              <input
                id="auth-username"
                type="text"
                v-model="registryForm.authConfig.username"
                placeholder="Enter username"
              />
            </div>
            
            <div class="form-group">
              <label for="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                v-model="registryForm.authConfig.password"
                placeholder="Enter password"
              />
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeRegistryModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Saving...' : (editingRegistry ? 'Update Registry' : 'Add Registry') }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Add Member Modal -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Add Project Member</h2>
          <button class="btn btn-ghost btn-icon" @click="showAddMemberModal = false">
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <form @submit.prevent="addMember" class="modal-content">
          <div class="form-group">
            <label for="member-user">User *</label>
            <select id="member-user" v-model="memberForm.userId" required>
              <option value="">Select a user</option>
              <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                {{ user.username }} ({{ user.email }})
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="member-role">Role</label>
            <select id="member-role" v-model="memberForm.role">
              <option value="member">Member</option>
              <option value="maintainer">Maintainer</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="showAddMemberModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Adding...' : 'Add Member' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Replication Policy Modal -->
    <div v-if="showReplicationModal" class="modal-overlay" @click.self="closeReplicationModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingReplication ? 'Edit Replication Policy' : 'Create Replication Policy' }}</h2>
          <button class="btn btn-ghost btn-icon" @click="closeReplicationModal">
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <form @submit.prevent="saveReplicationPolicy" class="modal-content">
          <div class="form-group">
            <label for="policy-name">Policy Name *</label>
            <input
              id="policy-name"
              type="text"
              v-model="replicationForm.name"
              placeholder="Enter policy name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="source-registry">Source Registry *</label>
            <select id="source-registry" v-model="replicationForm.sourceRegistryId" required>
              <option value="">Select source registry</option>
              <option v-for="registry in registries" :key="registry.id" :value="registry.id">
                {{ registry.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="target-registry">Target Registry *</label>
            <select id="target-registry" v-model="replicationForm.targetRegistryId" required>
              <option value="">Select target registry</option>
              <option v-for="registry in registries" :key="registry.id" :value="registry.id">
                {{ registry.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="policy-schedule">Schedule</label>
            <select id="policy-schedule" v-model="replicationForm.schedule">
              <option value="manual">Manual</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="closeReplicationModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Saving...' : (editingReplication ? 'Update Policy' : 'Create Policy') }}
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
import { useRoute, useRouter } from 'vue-router'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'

const route = useRoute()
const router = useRouter()

const project = ref({})
const repositories = ref([])
const members = ref([])
const replicationPolicies = ref([])
const availableUsers = ref([])
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
  { id: 'repositories', name: 'Repositories' },
  { id: 'members', name: 'Members' },
  { id: 'replication', name: 'Replication Policies' }
]

const fetchProjectData = async () => {
  try {
    isLoading.value = true
    const projectId = route.params.id
    const token = localStorage.getItem('auth_token')
    
    const [projectResponse, repositoriesResponse] = await Promise.all([
      fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }),
      fetch(`/api/repositories?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    ])
    
    if (projectResponse.ok) {
      const data = await projectResponse.json()
      project.value = data.data
      members.value = data.data.members || []
    }
    
    if (repositoriesResponse.ok) {
      const data = await repositoriesResponse.json()
      repositories.value = data.data || []
    }
    
    // Mock data for available users and replication policies
    availableUsers.value = [
      { id: 2, username: 'user2', email: 'user2@example.com' },
      { id: 3, username: 'user3', email: 'user3@example.com' }
    ]
    
    replicationPolicies.value = []
  } catch (error) {
    console.error('Error fetching project data:', error)
  } finally {
    isLoading.value = false
  }
}

const saveRegistry = async () => {
  try {
    isSubmitting.value = true
    
    const registryData = {
      name: registryForm.name,
      url: registryForm.url,
      type: registryForm.type,
      projectId: project.value.id,
      authConfig: registryForm.hasAuth ? registryForm.authConfig : null
    }
    
    const url = editingRegistry.value 
      ? `/api/registries/${editingRegistry.value.id}` 
      : '/api/registries'
    
    const method = editingRegistry.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(registryData)
    })
    
    if (response.ok) {
      await fetchProjectData()
      closeRegistryModal()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save registry')
    }
  } catch (error) {
    console.error('Error saving registry:', error)
    alert(`Error: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const editRegistry = (registry) => {
  editingRegistry.value = registry
  registryForm.name = registry.name
  registryForm.url = registry.url
  registryForm.type = registry.type
  registryForm.hasAuth = !!registry.auth_config
  
  if (registry.auth_config) {
    registryForm.authConfig = { ...registry.auth_config }
  }
  
  showRegistryModal.value = true
}

const deleteRegistry = async (registry) => {
  if (confirm(`Are you sure you want to delete the registry "${registry.name}"?`)) {
    try {
      const response = await fetch(`/api/registries/${registry.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        await fetchProjectData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete registry')
      }
    } catch (error) {
      console.error('Error deleting registry:', error)
      alert(`Error: ${error.message}`)
    }
  }
}

const addMember = async () => {
  try {
    isSubmitting.value = true
    
    const response = await fetch(`/api/projects/${project.value.id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(memberForm)
    })
    
    if (response.ok) {
      await fetchProjectData()
      showAddMemberModal.value = false
      resetMemberForm()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to add member')
    }
  } catch (error) {
    console.error('Error adding member:', error)
    alert(`Error: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const updateMemberRole = async (member) => {
  try {
    const response = await fetch(`/api/projects/${project.value.id}/members/${member.user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ role: member.role })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update member role')
    }
  } catch (error) {
    console.error('Error updating member role:', error)
    alert(`Error: ${error.message}`)
    // Revert the change if it failed
    await fetchProjectData()
  }
}

const removeMember = async (member) => {
  if (confirm(`Are you sure you want to remove ${member.username} from the project?`)) {
    try {
      const response = await fetch(`/api/projects/${project.value.id}/members/${member.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (response.ok) {
        await fetchProjectData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert(`Error: ${error.message}`)
    }
  }
}

const saveReplicationPolicy = async () => {
  try {
    isSubmitting.value = true
    
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
    alert(`Error: ${error.message}`)
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

const togglePolicyStatus = async (policy) => {
  try {
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
    alert(`Error: ${error.message}`)
  }
}

const deleteReplicationPolicy = async (policy) => {
  if (confirm(`Are you sure you want to delete the replication policy "${policy.name}"?`)) {
    try {
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
      alert(`Error: ${error.message}`)
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

onMounted(() => {
  fetchProjectData()
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
    .back-link {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #7f8c8d;
      text-decoration: none;
      margin-bottom: 15px;
      font-size: 14px;
      
      &:hover {
        color: #3498db;
      }
      
      .material-icons {
        font-size: 18px;
      }
    }
    
    .project-title {
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
  border-bottom: 1px solid #f1f2f6;
  margin-bottom: 30px;
  
  .tab-button {
    padding: 12px 20px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: #7f8c8d;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      color: #3498db;
    }
    
    &.active {
      color: #3498db;
      border-bottom-color: #3498db;
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
    margin-bottom: 20px;
    
    h2 {
      font-size: 20px;
      font-weight: 600;
      //color: #2c3e50;
    }
  }
}

.registries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.registry-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.registry-header {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  
  .registry-icon {
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
  
  .registry-title {
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
  
  .registry-actions {
    display: flex;
    gap: 5px;
  }
}

.registry-stats {
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
  border-radius: 8px;
  border: 1px solid #525254;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f1f2f6;
  
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
    flex: 1;
    
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
      
      input, select, textarea {
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
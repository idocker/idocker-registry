<template>
  <ManagementLayout>
    <div class="dashboard-container">
      <div class="dashboard-stats">

        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">folder</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.projectsCount }}</div>
              <div class="stat-label">Projects</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">storage</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.registriesCount }}</div>
              <div class="stat-label">Registries</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">sync</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.replicationPoliciesCount }}</div>
              <div class="stat-label">Replication Policies</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">people</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.usersCount }}</div>
              <div class="stat-label">Users</div>
            </div>
          </div>
        </div>

        <div class="dashboard-content">
          <div class="dashboard-section">
            <h2>Recent Projects</h2>
            <div class="dashboard-list">
              <div v-if="recentProjects.length === 0" class="empty-state">
                <span class="material-icons">folder_open</span>
                <p>No projects yet</p>
              </div>
              <div v-for="project in recentProjects" :key="project.id" class="list-item">
                <router-link :to="`/admin/projects/${project.id}`" class="list-link">
                  <div class="list-icon">
                    <span class="material-icons">folder</span>
                  </div>
                  <div class="list-content">
                    <div class="list-title">{{ project.name }}</div>
                    <div class="list-subtitle">{{ project.description }}</div>
                  </div>
                </router-link>
              </div>
            </div>
          </div>

          <div class="dashboard-section">
            <h2>Recent Registries</h2>
            <div class="dashboard-list">
              <div v-if="recentRegistries.length === 0" class="empty-state">
                <span class="material-icons">storage</span>
                <p>No registries yet</p>
              </div>
              <div v-for="registry in recentRegistries" :key="registry.id" class="list-item">
                <router-link :to="`/admin/registries/${registry.id}`" class="list-link">
                  <div class="list-icon">
                    <span class="material-icons">storage</span>
                  </div>
                  <div class="list-content">
                    <div class="list-title">{{ registry.name }}</div>
                    <div class="list-subtitle">{{ registry.url }}</div>
                  </div>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'

const authStore = useAuthStore()

const stats = ref({
  projectsCount: 0,
  registriesCount: 0,
  replicationPoliciesCount: 0,
  usersCount: 0
})

const recentProjects = ref([])
const recentRegistries = ref([])

const fetchDashboardData = async () => {
  try {
    const token = localStorage.getItem('auth_token')

    const [projectsResponse, registriesResponse] = await Promise.all([
      fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }),
      fetch('/api/registries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    ])

    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json()
      recentProjects.value = projectsData.projects?.slice(0, 5) || []
      stats.value.projectsCount = projectsData.projects?.length || 0
    }

    if (registriesResponse.ok) {
      const registriesData = await registriesResponse.json()
      recentRegistries.value = registriesData.registries?.slice(0, 5) || []
      stats.value.registriesCount = registriesData.registries?.length || 0
    }

    stats.value.usersCount = 1
    stats.value.replicationPoliciesCount = 0
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped lang="scss">
.dashboard-container {
  // 样式由ManagementLayout管理
}

.dashboard-header {
  margin-bottom: 30px;

  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 8px;
  }

  p {
    color: #7f8c8d;
    font-size: 16px;
  }
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;

  .stat-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    padding: 20px;
    display: flex;
    align-items: center;

    .stat-icon {
      width: 50px;
      height: 50px;
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

    .stat-info {
      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #7f8c8d;
      }
    }
  }
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.dashboard-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 20px;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 20px;
  }
}

.dashboard-list {
  .empty-state {
    text-align: center;
    padding: 30px 0;
    color: #7f8c8d;

    .material-icons {
      font-size: 48px;
      margin-bottom: 10px;
    }
  }

  .list-item {
    border-bottom: 1px solid #f1f2f6;

    &:last-child {
      border-bottom: none;
    }
  }

  .list-link {
    display: flex;
    align-items: center;
    padding: 15px 0;
    text-decoration: none;
    color: inherit;

    &:hover {
      background: rgba(52, 152, 219, 0.05);
      margin: 0 -20px;
      padding: 15px 20px;
    }
  }

  .list-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(52, 152, 219, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;

    .material-icons {
      color: #3498db;
      font-size: 20px;
    }
  }

  .list-content {
    flex: 1;

    .list-title {
      font-weight: 500;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .list-subtitle {
      font-size: 14px;
      color: #7f8c8d;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
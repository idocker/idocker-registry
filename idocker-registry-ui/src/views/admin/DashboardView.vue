<template>
  <ManagementLayout>
    <div class="dashboard-container">
      <div class="dashboard-stats">

        <div class="stat-card-box">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">folder</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.projectsCount }}</div>
              <div class="stat-label">{{ $t('dashboard.projects') }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">storage</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.repositoriesCount }}</div>
              <div class="stat-label">{{ $t('dashboard.repositories') }}</div>
            </div>
          </div>
        </div>

        <div class="stat-card-box">
          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">sync</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.replicationPoliciesCount }}</div>
              <div class="stat-label">{{ $t('dashboard.replicationPolicies') }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <span class="material-icons">people</span>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.usersCount }}</div>
              <div class="stat-label">{{ $t('dashboard.users') }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="dashboard-content">
        <div class="dashboard-section">
          <h2>{{ $t('dashboard.recentProjects') }}</h2>
          <div class="dashboard-list">
            <div v-if="recentProjects.length === 0" class="empty-state">
              <span class="material-icons">folder_open</span>
              <p>{{ $t('dashboard.noProjectsYet') }}</p>
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
          <h2>{{ $t('dashboard.recentRepositories') }}</h2>
          <div class="dashboard-list">
            <div v-if="recentRepositories.length === 0" class="empty-state">
              <span class="material-icons">storage</span>
              <p>{{ $t('dashboard.noRepositoriesYet') }}</p>
            </div>
            <div v-for="repository in recentRepositories" :key="repository.id" class="list-item">
              <router-link :to="`/admin/repositories/${repository.id}`" class="list-link">
                <div class="list-icon">
                  <span class="material-icons">storage</span>
                </div>
                <div class="list-content">
                  <div class="list-title">{{ repository.name }}</div>
                  <div class="list-subtitle">{{ repository.url }}</div>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import dashboardService from '@/services/dashboard.service'
import type { DashboardStats, RecentProject, RecentRepository } from '@/types'

const { t } = useI18n()
const authStore = useAuthStore()

const stats = ref<DashboardStats>({
  projectsCount: 0,
  repositoriesCount: 0,
  replicationPoliciesCount: 0,
  usersCount: 0
})

const recentProjects = ref<RecentProject[]>([])
const recentRepositories = ref<RecentRepository[]>([])

const fetchDashboardData = async () => {
  try {
    // Get statistics data
    const statsResponse = await dashboardService.getStats()
    if (statsResponse.success && statsResponse.data) {
      stats.value = statsResponse.data
    }

    // Get recent projects list
    const projectsResponse = await dashboardService.getRecentProjects(5)
    if (projectsResponse.success && projectsResponse.data) {
      recentProjects.value = projectsResponse.data
    }

    // Get recent repositories list
    const repositoriesResponse = await dashboardService.getRecentRepositories(5)
    if (repositoriesResponse.success && repositoriesResponse.data) {
      recentRepositories.value = repositoriesResponse.data
    }
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
  //display: grid;
  //grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  width: 100%;
  color: var(--primary-text);;

  .stat-card-box {
    display: flex;
    //flex-direction: column;
    gap: 10px;
    max-width: 1000px;
    margin-bottom: 20px;
    width: 100%;


    .stat-card {
      background-color: var(--card-bg);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      padding: 15px;
      margin: 5px;
      display: flex;
      align-items: center;
      width: 50%;
      float: left;
      clear: both;

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
          color: var(--primary-text);;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: var(--primary-text);;
        }
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
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 20px;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color:var(--primary-text);
    margin-bottom: 20px;
  }
}

.dashboard-list {
  .empty-state {
    text-align: center;
    padding: 10px 0;
    color: var(--primary-text);

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
      color: var(--primary-text);
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
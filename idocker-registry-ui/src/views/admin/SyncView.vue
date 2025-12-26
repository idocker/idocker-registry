<template>
  <ManagementLayout>
    <div class="sync-container">
      <div class="page-header">
        <h1>Docker Registry {{ $t('sync.title') }}</h1>
        <div class="header-actions">
          <button class="btn btn-ghost" @click="refreshStatus">
            <span class="material-icons">refresh</span>
            {{ $t('sync.refreshStatus') }}
          </button>
          <button class="btn btn-primary" @click="startFullSync" :disabled="isSyncing">
            <span class="material-icons">sync</span>
            {{ $t('sync.startFullSync') }}
          </button>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="status-section">
        <div class="status-card">
          <div class="status-item">
            <div class="status-icon" :class="statusIcon">
              <span class="material-icons">{{ statusIcon === 'connected' ? 'check_circle' : 'error' }}</span>
            </div>
            <div class="status-info">
              <div class="status-label">{{ $t('sync.registryConnectionStatus') }}</div>
              <div class="status-value">{{ syncStatus.registryStatus === 'connected' ? $t('sync.connected') : $t('sync.disconnected') }}</div>
              <div class="status-detail">{{ syncStatus.registryUrl }}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">{{ syncStatus.projectCount }}</div>
              <div class="stat-label">{{ $t('sync.projectCount') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ syncStatus.repositoryCount }}</div>
              <div class="stat-label">{{ $t('sync.repositoryCount') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ syncStatus.tagCount }}</div>
              <div class="stat-label">{{ $t('sync.imageTagCount') }}</div>
            </div>
          </div>

          <div class="last-sync" v-if="syncStatus.lastSync">
            <div class="sync-label">{{ $t('sync.lastSync') }}</div>
            <div class="sync-info">
              <span>{{ formatSyncType(syncStatus.lastSync.type) }}</span>
              <span class="sync-status" :class="syncStatus.lastSync.status">
                {{ syncStatus.lastSync.status === 'completed' ? $t('sync.success') : $t('sync.failed') }}
              </span>
              <span>{{ formatDate(syncStatus.lastSync.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 同步控制 -->
      <div class="sync-controls">
        <div class="control-section">
          <h3>{{ $t('sync.syncOperations') }}</h3>
          <div class="control-buttons">
            <button 
              class="btn btn-primary" 
              @click="startFullSync" 
              :disabled="isSyncing || syncStatus.registryStatus !== 'connected'"
            >
              <span class="material-icons">sync</span>
              {{ isSyncing ? $t('sync.syncInProgress') : $t('sync.fullSync') }}
            </button>
            
            <div class="sync-options">
              <label class="checkbox-label">
                <input type="checkbox" v-model="syncOptions.stopOnError" />
                {{ $t('sync.stopOnErrorOption') }}
              </label>
            </div>
          </div>
        </div>

        <div class="control-section">
          <h3>{{ $t('sync.projectSyncOption') }}</h3>
          <div class="project-selector">
            <select v-model="selectedProjectId" class="project-select">
              <option value="">{{ $t('sync.selectProject') }}</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
            <button 
              class="btn btn-secondary" 
              @click="startProjectSync" 
              :disabled="!selectedProjectId || isSyncing || syncStatus.registryStatus !== 'connected'"
            >
              {{ $t('sync.syncThisProject') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 同步日志 -->
      <div class="sync-logs">
        <div class="logs-header">
          <h3>{{ $t('sync.syncLogs') }}</h3>
          <button class="btn btn-ghost" @click="refreshLogs">
            <span class="material-icons">refresh</span>
          </button>
        </div>

        <div class="logs-table">
          <table>
            <thead>
              <tr>
                <th>{{ $t('sync.time') }}</th>
                <th>{{ $t('sync.type') }}</th>
                <th>{{ $t('sync.project') }}</th>
                <th>{{ $t('sync.status') }}</th>
                <th>{{ $t('sync.processedCountHeader') }}</th>
                <th>{{ $t('sync.errorCountHeader') }}</th>
                <th>{{ $t('sync.duration') }}</th>
                <th>{{ $t('sync.operator') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="logsLoading">
                <td colspan="8" class="loading-cell">
                  <div class="loading-indicator">
                    <span class="material-icons">refresh</span>
                    {{ $t('sync.loading') }}
                  </div>
                </td>
              </tr>
              <tr v-else-if="syncLogs.length === 0">
                <td colspan="8" class="empty-cell">{{ $t('sync.noSyncLogs') }}</td>
              </tr>
              <tr v-for="log in syncLogs" :key="log.id" class="log-row">
                <td>{{ formatDate(log.created_at) }}</td>
                <td>
                  <span class="log-type" :class="log.sync_type">
                    {{ formatSyncType(log.sync_type) }}
                  </span>
                </td>
                <td>{{ log.project_name || $t('sync.fullSync') }}</td>
                <td>
                  <span class="status-badge" :class="log.status">
                    {{ log.status === 'completed' ? $t('sync.success') : log.status === 'failed' ? $t('sync.failed') : $t('sync.inProgress') }}
                  </span>
                </td>
                <td>{{ log.processed_count || 0 }}</td>
                <td>{{ log.error_count || 0 }}</td>
                <td>{{ log.duration ? `${log.duration}ms` : '-' }}</td>
                <td>{{ log.user_name || $t('sync.system') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="logsPagination.totalPages > 1">
          <button 
            class="btn btn-ghost" 
            @click="changeLogPage(logsPagination.page - 1)"
            :disabled="logsPagination.page === 1"
          >
            {{ $t('sync.previousPage') }}
          </button>
          <span class="page-info">
            {{ logsPagination.page }} / {{ logsPagination.totalPages }}
          </span>
          <button 
            class="btn btn-ghost" 
            @click="changeLogPage(logsPagination.page + 1)"
            :disabled="logsPagination.page === logsPagination.totalPages"
          >
            {{ $t('sync.nextPage') }}
          </button>
        </div>
      </div>

      <!-- 消息提示 -->
      <div v-if="message" class="snackbar" :class="`snackbar-${message.type}`">
        {{ message.text }}
        <button class="snackbar-close" @click="message = null">
          <span class="material-icons">close</span>
        </button>
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import syncService from '@/services/sync.service'
import projectService from '@/services/project.service'
import type { SyncStatus, SyncLog, SyncResult } from '@/services/sync.service'

const { t } = useI18n()
const authStore = useAuthStore()

// 状态
const syncStatus = ref({
  registryStatus: 'unknown',
  registryUrl: '',
  projectCount: 0,
  repositoryCount: 0,
  tagCount: 0,
  lastSync: null
})

const syncLogs = ref([])
const logsPagination = ref({
  page: 1,
  limit: 20,
  totalPages: 1
})

const projects = ref([])
const selectedProjectId = ref('')
const isSyncing = ref(false)
const logsLoading = ref(false)
const message = ref(null)

// 同步选项
const syncOptions = reactive({
  stopOnError: false
})

// 计算属性
const statusIcon = computed(() => {
  return syncStatus.value.registryStatus === 'connected' ? 'connected' : 'error'
})

// 方法
const fetchSyncStatus = async () => {
  try {
    const response = await syncService.getSyncStatus()
    
    if (response.success) {
      syncStatus.value = response.data
    } else {
      throw new Error(t('sync.fetchSyncStatusFailed'))
    }
  } catch (error) {
    console.error('获取同步状态失败:', error)
    showMessage(t('sync.fetchSyncStatusFailed'), 'error')
  }
}

const fetchProjects = async () => {
  try {
    const response = await projectService.getProjects({})
    
    if (response.success && response.data) {
      projects.value = response.data.projects || []
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
  }
}

const fetchSyncLogs = async (page = 1) => {
  try {
    logsLoading.value = true
    const response = await syncService.getSyncLogs(page, logsPagination.value.limit)
    
    if (response.success) {
      syncLogs.value = response.data || []
      if (response.pagination) {
        logsPagination.value = response.pagination
      }
    } else {
      throw new Error(t('sync.fetchSyncLogsFailed'))
    }
  } catch (error) {
    console.error('获取同步日志失败:', error)
    showMessage(t('sync.fetchSyncLogsFailed'), 'error')
  } finally {
    logsLoading.value = false
  }
}

const startFullSync = async () => {
  try {
    isSyncing.value = true
    showMessage(t('sync.fullSyncStarting'), 'info')
    
    const result = await syncService.startFullSync()
    
    if (result.success) {
      showMessage(t('sync.fullSync') + t('sync.syncCompletedSuffix') + ` ${result.message || ''}`, 'success')
      await fetchSyncStatus()
      await fetchSyncLogs()
    } else {
      throw new Error(result.message || t('sync.syncFailed'))
    }
  } catch (error) {
    console.error('全量同步失败:', error)
    showMessage(`${t('sync.fullSync')}: ${error.message}`, 'error')
  } finally {
    isSyncing.value = false
  }
}

const startProjectSync = async () => {
  if (!selectedProjectId.value) {
    showMessage(t('sync.pleaseSelectProject'), 'error')
    return
  }

  try {
    isSyncing.value = true
    showMessage(`${t('sync.syncThisProjectPrefix')} ${selectedProjectId.value}...`, 'info')
    
    const result = await syncService.startProjectSync(selectedProjectId.value)
    
    if (result.success) {
      showMessage(t('sync.projectSyncCompleted') + ` ${result.message || ''}`, 'success')
      await fetchSyncStatus()
      await fetchSyncLogs()
    } else {
      throw new Error(result.message || t('sync.projectSyncFailed'))
    }
  } catch (error) {
    console.error('项目同步失败:', error)
    showMessage(`${t('sync.projectSync')}: ${error.message}`, 'error')
  } finally {
    isSyncing.value = false
  }
}

const refreshStatus = () => {
  fetchSyncStatus()
  showMessage(t('sync.syncStatusRefreshed'), 'info')
}

const refreshLogs = () => {
  fetchSyncLogs(logsPagination.value.page)
  showMessage(t('sync.syncLogsRefreshed'), 'info')
}

const changeLogPage = (page) => {
  logsPagination.value.page = page
  fetchSyncLogs(page)
}

const formatSyncType = (type) => {
  const types = {
    'full': t('sync.fullSync'),
    'project': t('sync.projectSync')
  }
  return types[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const showMessage = (text, type = 'info') => {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 5000)
}

// 生命周期
onMounted(() => {
  fetchSyncStatus()
  fetchProjects()
  fetchSyncLogs()
})
</script>

<style scoped lang="scss">
.sync-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 12px;

    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.status-section {
  margin-bottom: 30px;
}

.status-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .status-item {
    display: flex;
    align-items: center;
    margin-bottom: 20px;

    .status-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;

      &.connected {
        background: rgba(46, 204, 113, 0.1);
        color: #2ecc71;
      }

      &.error {
        background: rgba(231, 76, 60, 0.1);
        color: #e74c3c;
      }

      .material-icons {
        font-size: 24px;
      }
    }

    .status-info {
      .status-label {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      .status-value {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .status-detail {
        font-size: 14px;
        color: var(--text-muted);
      }
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 20px;

    .stat-item {
      text-align: center;
      padding: 16px;
      background: var(--hover-bg);
      border-radius: 6px;

      .stat-number {
        font-size: 24px;
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: var(--text-secondary);
      }
    }
  }

  .last-sync {
    border-top: 1px solid var(--border-color);
    padding-top: 16px;

    .sync-label {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .sync-info {
      display: flex;
      gap: 16px;
      align-items: center;
      font-size: 14px;

      .sync-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;

        &.completed {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
        }

        &.failed {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }
      }
    }
  }
}

.sync-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;

  .control-section {
    background: var(--card-bg);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .control-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .sync-options {
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;

          input[type="checkbox"] {
            width: 16px;
            height: 16px;
          }
        }
      }
    }

    .project-selector {
      display: flex;
      gap: 12px;

      .project-select {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--bg-color);
        color: var(--text-color);

        &:focus {
          outline: none;
          border-color: var(--primary-color);
        }
      }
    }
  }
}

.sync-logs {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-color);

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .logs-table {
    overflow-x: auto;

    table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }

      th {
        font-weight: 600;
        color: var(--text-secondary);
        background: var(--hover-bg);
      }

      .loading-cell, .empty-cell {
        text-align: center;
        padding: 40px 16px;
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

      .log-row:hover {
        background: var(--hover-bg);
      }

      .log-type {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;

        &.full {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
        }

        &.project {
          background: rgba(155, 89, 182, 0.1);
          color: #9b59b6;
        }
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;

        &.completed {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
        }

        &.failed {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }

        &.started {
          background: rgba(241, 196, 15, 0.1);
          color: #f1c40f;
        }
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-top: 1px solid var(--border-color);

    .page-info {
      color: var(--text-secondary);
    }
  }
}

// 提示框样式
.snackbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 16px;
  border-radius: 4px;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1001;

  &.snackbar-success {
    background: var(--success-color);
  }

  &.snackbar-error {
    background: var(--danger-color);
  }

  &.snackbar-info {
    background: var(--info-color);
  }

  .snackbar-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;

    .material-icons {
      font-size: 18px;
    }
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
  .sync-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .sync-controls {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .logs-table {
    font-size: 12px;

    table {
      th, td {
        padding: 8px 12px;
      }
    }
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
      filter: brightness(0.9);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &.btn-secondary {
    background-color: var(--secondary-color);
    color: white;

    &:hover:not(:disabled) {
      filter: brightness(0.9);
    }
  }

  &.btn-ghost {
    background: transparent;
    color: var(--text-muted);

    &:hover {
      background: rgba(127, 140, 141, 0.1);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
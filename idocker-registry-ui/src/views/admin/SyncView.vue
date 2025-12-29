<template>
  <ManagementLayout>
    <div class="sync-container">
      <div class="page-header">
        <h1>Docker Registry {{ $t('sync.title') }}</h1>
        <div class="header-actions">
          

                <button class="btn btn-primary" @click="startFullSync"
                  :disabled="isSyncing || syncStatus.repositoryStatus !== 'connected'">
                  <span class="material-icons">sync</span>
                  {{ isSyncing ? $t('sync.syncInProgress') : $t('sync.fullSync') }}
                </button>

        </div>
      </div>

      <!-- Tab pages -->
      <div class="tabs-container">
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'status' }" @click="activeTab = 'status'">
            {{ $t('sync.syncStatusTab') }}
          </button>
          <button class="tab" :class="{ active: activeTab === 'logs' }" @click="activeTab = 'logs'">
            {{ $t('sync.syncLogsTab') }}
          </button>
        </div>
      </div>

      <!-- Status information tab page -->
      <div v-show="activeTab === 'status'" class="tab-content">
        <div class="status-section">
          <div class="status-card">
            <div class="status-item">
              <div class="status-icon" :class="statusIcon">
                <span class="material-icons">{{ statusIcon === 'connected' ? 'check_circle' : 'error' }}</span>
              </div>
              <div class="status-info">
                <div class="status-label">{{ $t('sync.registryConnectionStatus') }}</div>
                <div class="status-value">
                  {{ syncStatus.repositoryStatus === 'connected' ? $t('sync.connected') : $t('sync.disconnected') }}
                    <!-- <button class="btn btn-ghost" @click="refreshStatus">
                      <span class="material-icons">refresh</span>
                      {{ $t('sync.refreshStatus') }}
                    </button> -->
                </div>
                <div class="status-detail">{{ syncStatus.repositoryUrl }}</div>
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
      </div>

      <!-- Sync log tab page -->
      <div v-show="activeTab === 'logs'" class="tab-content">
        <div class="sync-logs">
          <div class="logs-header">
            <button class="btn btn-ghost" @click="refreshLogs">
              <span class="material-icons">refresh</span>
              {{ $t('sync.refreshLogs') }}
            </button>
          </div>

          <div class="logs-table">
            <table>
              <thead>
                <tr>
                  <th>{{ $t('sync.time') }}</th>
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
                    <span class="status-badge" :class="log.status">
                      {{ log.status === 'completed' ? $t('sync.success') : log.status === 'failed' ? $t('sync.failed') :
                        $t('sync.inProgress') }}
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
            <button class="btn btn-ghost" @click="changeLogPage(logsPagination.page - 1)"
              :disabled="logsPagination.page === 1">
              {{ $t('sync.previousPage') }}
            </button>
            <span class="page-info">
              {{ logsPagination.page }} / {{ logsPagination.totalPages }}
            </span>
            <button class="btn btn-ghost" @click="changeLogPage(logsPagination.page + 1)"
              :disabled="logsPagination.page === logsPagination.totalPages">
              {{ $t('sync.nextPage') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Message prompt -->
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
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import syncService from '@/services/sync.service'
import type { SyncStatus, SyncLog, SyncResult } from '@/types'

const { t } = useI18n()

// 状态
const syncStatus = ref<SyncStatus>({
  repositoryStatus: 'disconnected',
  repositoryUrl: '',
  projectCount: 0,
  repositoryCount: 0,
  tagCount: 0,
  lastSync: null
})

const syncLogs = ref<SyncLog[]>([])
const logsPagination = ref({
  page: 1,
  limit: 20,
  totalPages: 1
})

const logsLoading = ref(false)
const isSyncing = ref(false)
const activeTab = ref<'status' | 'logs'>('status')
const message = ref<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

// 计算属性
const statusIcon = computed(() => {
  return syncStatus.value.repositoryStatus === 'connected' ? 'connected' : 'error'
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

const fetchSyncLogs = async (page = 1) => {
  try {
    logsLoading.value = true
    const response = await syncService.getSyncLogs({
      page,
      limit: logsPagination.value.limit
    })

    if (response.success && response.data) {
      syncLogs.value = response.data.logs || []
      if (response.data.pagination) {
        logsPagination.value = response.data.pagination
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

    const result = await syncService.triggerSync('full')

    if (result.success) {
      showMessage(t('sync.fullSync') + ' ' + t('sync.syncCompletedSuffix') + (result.message ? `: ${result.message}` : ''), 'success')
      await fetchSyncStatus()
      if (activeTab.value === 'logs') {
        await fetchSyncLogs()
      }
    } else {
      throw new Error(result.message || t('sync.syncFailed'))
    }
  } catch (error: any) {
    console.error('全量同步失败:', error)
    showMessage(`${t('sync.fullSync')}: ${error.message}`, 'error')
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

const changeLogPage = (page: number) => {
  logsPagination.value.page = page
  fetchSyncLogs(page)
}

const formatSyncType = (type: string) => {
  const types: Record<string, string> = {
    'full': t('sync.fullSync'),
    'project': t('sync.projectSync')
  }
  return types[type] || type
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 5000)
}

// 生命周期
onMounted(() => {
  fetchSyncStatus()
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

.tabs-container {
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;

  .tab {
    padding: 10px 20px;
    background: none;
    border: none;
    border-radius: 4px 4px 0 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;

    &:hover {
      background: var(--hover-bg);
      color: var(--text);
    }

    &.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
      background: rgba(52, 152, 219, 0.05);
    }
  }
}

.tab-content {
  animation: fadeIn 0.3s ease-in-out;
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

    .status-actions {
      display: flex;
      float: right;
    }

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

.sync-logs {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .logs-header {
    display: flex;
    //justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-color);
    text-align: right;
    justify-content: flex-end;

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .btn{
      text-align: right;
      margin-right: auto;
      margin-left: 1px;
      
    }
  }

  .logs-table {
    overflow-x: auto;

    table {
      width: 100%;
      border-collapse: collapse;

      th,
      td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }

      th {
        font-weight: 600;
        color: var(--text-secondary);
        background: var(--hover-bg);
      }

      .loading-cell,
      .empty-cell {
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

@keyframes fadeIn {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
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

  .stats-grid {
    grid-template-columns: 1fr !important;
  }

  .logs-table {
    font-size: 12px;

    table {

      th,
      td {
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
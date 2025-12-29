<template>
    <ManagementLayout>
        <div class="audit-container">

            <div class="filters-card">

                <div v-show="showFilters" class="filters-content">
                    <div class="filter-row">
                        <div class="filter-group">
                            <label for="user-filter">{{ $t('audit.filterUser') }}</label>
                            <select id="user-filter" v-model="filters.userId">
                                <option value="">{{ $t('audit.allUsers') }}</option>
                                <option v-for="user in users" :key="user.id" :value="user.id">
                                    {{ user.username }}
                                </option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="action-filter">{{ $t('audit.filterAction') }}</label>
                            <select id="action-filter" v-model="filters.action">
                                <option value="">{{ $t('audit.allActions') }}</option>
                                <option value="login">{{ $t('audit.actionLogin') }}</option>
                                <option value="create_user">{{ $t('audit.actionCreateUser') }}</option>
                                <option value="update_user">{{ $t('audit.actionUpdateUser') }}</option>
                                <option value="delete_user">{{ $t('audit.actionDeleteUser') }}</option>
                                <option value="create_project">{{ $t('audit.actionCreateProject') }}</option>
                                <option value="update_project">{{ $t('audit.actionUpdateProject') }}</option>
                                <option value="delete_project">{{ $t('audit.actionDeleteProject') }}</option>
                                <option value="create">{{ $t('audit.actionCreate') }}</option>
                                <option value="update">{{ $t('audit.actionUpdate') }}</option>
                                <option value="delete">{{ $t('audit.actionDelete') }}</option>
                            </select>
                        </div>
                    </div>

                    <div class="filter-row">
                        <div class="filter-group">
                            <label for="resource-type-filter">{{ $t('audit.filterResourceType') }}</label>
                            <select id="resource-type-filter" v-model="filters.resourceType">
                                <option value="">{{ $t('audit.allTypes') }}</option>
                                <option value="user">{{ $t('audit.resourceTypeUser') }}</option>
                                <option value="project">{{ $t('audit.resourceTypeProject') }}</option>
                                <option value="registry">{{ $t('audit.resourceTypeRegistry') }}</option>
                                <option value="replication_policy">{{ $t('audit.resourceTypeReplicationPolicy') }}</option>
                                <option value="system">{{ $t('audit.resourceTypeSystem') }}</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="date-range-filter">{{ $t('audit.dateRange') }}</label>
                            <div class="date-range">
                                <input type="date" id="date-range-filter" v-model="filters.startDate"
                                    :placeholder="$t('audit.startDate')" />
                                <span>{{ $t('audit.to') }}</span>
                                <input type="date" v-model="filters.endDate" :placeholder="$t('audit.endDate')" />
                            </div>
                        </div>
                    </div>

                    <div class="filter-actions">
                        <button class="btn btn-primary" @click="applyFilters">
                            {{ $t('audit.applyFilter') }}
                        </button>
                        <button class="btn btn-ghost" @click="resetFilters">
                            {{ $t('audit.reset') }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="logs-table-container">
                <div class="table-controls">
                    <div class="table-info">
                        {{ $t('audit.totalRecords', { count: totalLogs }) }}
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-ghost" @click="refreshLogs">
                            <span class="material-icons">refresh</span>
                            {{ $t('common.refresh') }}
                        </button>
                        <button class="btn btn-danger" @click="showDeleteDialog = true">
                            <span class="material-icons">delete_sweep</span>
                            {{ $t('audit.cleanupLogs') }}
                        </button>
                        <button class="btn btn-ghost" @click="toggleFilters">
                            {{ showFilters ? $t('common.cancel') : $t('audit.filter') }}
                            <span class="material-icons">
                                {{ showFilters ? 'expand_less' : 'expand_more' }}
                            </span>
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="logs-table">
                        <thead>
                            <tr>
                                <th>{{ $t('audit.time') }}</th>
                                <th>{{ $t('audit.user') }}</th>
                                <th>{{ $t('audit.action') }}</th>
                                <th>{{ $t('audit.details') }}</th>
                                <th>{{ $t('audit.ipAddress') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="isLoading">
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-indicator">
                                        <span class="material-icons">refresh</span>
                                        {{ $t('audit.loading') }}
                                    </div>
                                </td>
                            </tr>
                            <tr v-else-if="logs.length === 0">
                                <td colspan="7" class="empty-cell">{{ $t('audit.noLogsFound') }}</td>
                            </tr>
                            <tr v-for="log in logs" :key="log.id">
                                <td>{{ formatDateTime(log.createdAt) }}</td>
                                <td>{{ log.username || '-' }}</td>
                                <td>
                                    <span class="action-badge" :class="getActionClass(log.action)">
                                        {{ getActionDisplay(log.action) }}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-link" @click="selectedLog = log; showDetailsDialog = true"
                                        v-if="log.details && Object.keys(log.details).length > 0">
                                        {{ $t('audit.viewDetails') }}
                                    </button>
                                    <span v-else>-</span>
                                </td>
                                <td>{{ log.ipAddress || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="pagination">
                    <button class="btn btn-ghost" @click="currentPage = Math.max(1, currentPage - 1)"
                        :disabled="currentPage === 1">
                        {{ $t('common.previousPage') }}
                    </button>
                    <span class="page-info">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button class="btn btn-ghost" @click="currentPage = Math.min(totalPages, currentPage + 1)"
                        :disabled="currentPage === totalPages">
                        {{ $t('common.nextPage') }}
                    </button>
                </div>
            </div>

            <!-- 日志详情对话框 -->
            <div v-if="showDetailsDialog" class="dialog-overlay" @click="showDetailsDialog = false">
                <div class="dialog" @click.stop>
                    <div class="dialog-header">
                        <h3>{{ $t('audit.logDetails') }}</h3>
                        <button class="dialog-close" @click="showDetailsDialog = false">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <div class="log-details">
                            <div class="detail-item">
                                <label>{{ $t('audit.time') }}:</label>
                                <span>{{ formatDateTime(selectedLog.createdAt) }}</span>
                            </div>
                            <div class="detail-item">
                                <label>{{ $t('audit.user') }}:</label>
                                <span>{{ selectedLog.username || '-' }}</span>
                            </div>
                            <div class="detail-item">
                                <label>{{ $t('audit.action') }}:</label>
                                <span>{{ getActionDisplay(selectedLog.action) }}</span>
                            </div>
                            <div class="detail-item">
                                <label>{{ $t('audit.resourceType') }}:</label>
                                <span>{{ getResourceTypeDisplay(selectedLog.resourceType) }}</span>
                            </div>
                            <div class="detail-item">
                                <label>{{ $t('audit.resourceId') }}:</label>
                                <span>{{ selectedLog.resourceId || '-' }}</span>
                            </div>
                            <div class="detail-item">
                                <label>{{ $t('audit.ipAddress') }}:</label>
                                <span>{{ selectedLog.ipAddress || '-' }}</span>
                            </div>
                            <div v-if="selectedLog.details" class="detail-item full-width">
                                <label>{{ $t('audit.details') }}:</label>
                                <pre>{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
                            </div>
                        </div>

                        <div class="dialog-actions">
                            <button class="btn btn-primary" @click="showDetailsDialog = false">{{ $t('common.close') }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 清理日志对话框 -->
            <div v-if="showDeleteDialog" class="dialog-overlay" @click="showDeleteDialog = false">
                <div class="dialog" @click.stop>
                    <div class="dialog-header">
                        <h3>{{ $t('audit.cleanupLogs') }}</h3>
                        <button class="dialog-close" @click="showDeleteDialog = false">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <div class="cleanup-options">
                            <h4>{{ $t('audit.cleanupOptions') }}</h4>

                            <div class="option">
                                <label>
                                    <input type="radio" value="by-date" v-model="deleteOption" />
                                    {{ $t('audit.cleanupByDate') }}
                                </label>
                                <div v-if="deleteOption === 'by-date'" class="option-config">
                                    <label for="days-old">{{ $t('audit.deleteDaysAgo') }}</label>
                                    <input id="days-old" type="number" v-model.number="daysOld" min="1" max="365" />
                                </div>
                            </div>

                            <div class="option">
                                <label>
                                    <input type="radio" value="all" v-model="deleteOption" />
                                    {{ $t('audit.deleteAllLogs') }}
                                </label>
                            </div>
                        </div>

                        <div class="dialog-actions">
                            <button class="btn btn-ghost" @click="showDeleteDialog = false">{{ $t('common.cancel') }}</button>
                            <button class="btn btn-danger" @click="confirmDelete" :disabled="isDeleting">
                                <span v-if="isDeleting">{{ $t('common.deleting') }}...</span>
                                <span v-else>{{ $t('common.confirm') }} {{ $t('common.delete') }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 消息提示 -->
            <div v-if="message" class="snackbar" :class="`snackbar-${message.type}`">
                {{ message.text }}
                <button class="snackbar-close" @click="message.text = ''">
                    <span class="material-icons">close</span>
                </button>
            </div>
        </div>
    </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import auditService from '@/services/audit.service'
import userService from '@/services/user.service'
import type { AuditLog, Message, User, UserPaginatedResponse } from '@/types'
import axios from 'axios'
const { t, locale } = useI18n()

// State
const isLoading = ref(false)
const isDeleting = ref(false)
const message = ref<Message | null>(null)
const showFilters = ref(false)
const showDetailsDialog = ref(false)
const showDeleteDialog = ref(false)

// Data
const logs = ref<AuditLog[]>([])
const users = ref<User[]>([])
const selectedLog = ref<AuditLog | null>(null)
const currentPage = ref(1)
const pageSize = ref(4)
const totalLogs = ref(0)

// Filter conditions
const filters = reactive({
    userId: '',
    action: '',
    search: '',
    resourceType: '',
    startDate: '',
    endDate: ''
})

// Delete options
const deleteOption = ref('by-date')
const daysOld = ref(30)

// Calculate total pages
const totalPages = ref(1)

// Get action display class
const getActionClass = (action: string) => {
    switch (action) {
        case 'login':
            return 'action-success'
        case 'create':
            return 'action-success'
        case 'update':
            return 'action-warning'
        case 'delete':
            return 'action-danger'
        default:
            return 'action-info'
    }
}

// Get action display text
const getActionDisplay = (action: string) => {
    switch (action) {
        case 'login':
            return t('audit.actionLogin')
        case 'logout':
            return t('audit.actionLogout')
        case 'create_user':
            return t('audit.actionCreateUser')
        case 'update_user':
            return t('audit.actionUpdateUser')
        case 'delete_user':
            return t('audit.actionDeleteUser')
        case 'create_project':
            return t('audit.actionCreateProject')
        case 'update_project':
            return t('audit.actionUpdateProject')
        case 'delete_project':
            return t('audit.actionDeleteProject')
        case 'create':
            return t('audit.actionCreate')
        case 'update':
            return t('audit.actionUpdate')
        case 'delete':
            return t('audit.actionDelete')
        case 'change_password':
            return t('audit.actionChangePassword')
        case 'delete_audit_logs':
            return t('audit.actionDeleteAuditLogs')
        case 'delete_old_logs':
            return t('audit.actionDeleteOldLogs')
        default:
            return action
    }
}

// Get resource type display text
const getResourceTypeDisplay = (resourceType: string) => {
    switch (resourceType) {
        case 'user':
            return t('audit.resourceTypeUser')
        case 'project':
            return t('audit.resourceTypeProject')
        case 'registry':
            return t('audit.resourceTypeRegistry')
        case 'replication_policy':
            return t('audit.resourceTypeReplicationPolicy')
        case 'system':
            return t('audit.resourceTypeSystem')
        default:
            return resourceType || '-'
    }
}

// Format date time
const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(locale.value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

// Load logs
const loadLogs = async () => {
    try {
        isLoading.value = true

        await auditService.getAuditLogs({
            page: currentPage.value,
            limit: pageSize.value,
            search: filters.search,
            action: filters.action,
            resourceType: filters.resourceType,
            userId: filters.userId,
            startDate: filters.startDate,
            endDate: filters.endDate
        }).then(response => {
            logs.value = response.data || []
            totalLogs.value = response.pagination?.total || 0
            totalPages.value = response.pagination?.totalPages || 1
        })
        
    } catch (error) {
        console.error('Failed to load audit logs:', error)
        showMessage(t('audit.loadAuditLogsFailed'), 'error')
    } finally {
        isLoading.value = false
    }
}

// Load user list
const loadUsers = async () => {
    try {
        const response = await userService.getUsers({ limit: 1000 })
        // 根据 UserPaginatedResponse 类型定义，数据在 data 字段中
        users.value = response.data || []
    } catch (error) {
        console.error('Failed to load users:', error)
    }
}

// Refresh logs
const refreshLogs = () => {
    showMessage(t('audit.logsRefreshed'), 'info')
    loadLogs()
}

// Toggle filter display
const toggleFilters = () => {
    showFilters.value = !showFilters.value
}

// Apply filter conditions
const applyFilters = () => {
    currentPage.value = 1
    loadLogs()
}

// Reset filter conditions
const resetFilters = () => {
    Object.assign(filters, {
        userId: '',
        action: '',
        resourceType: '',
        startDate: '',
        endDate: ''
    })
    currentPage.value = 1
    loadLogs()
}

// Confirm delete logs
const confirmDelete = async () => {
    try {
        isDeleting.value = true

        if (deleteOption.value === 'by-date') {
            // 按日期删除
            const response = await auditService.cleanupAuditLogs(daysOld.value)
            if (response.success) {
                showMessage(t('audit.deleteLogsSuccess', { days: daysOld.value }), 'success')
            } else {
                showMessage(response.message || t('audit.deleteLogsFailed'), 'error')
            }
        } else {
            // 删除所有日志 - 这里使用直接axios因为清理特定过滤的日志可能不在service中
            await axios.delete('/api/audit', {
                data: filters
            })
            showMessage(t('audit.deleteLogsFilteredSuccess'), 'success')
        }

        showDeleteDialog.value = false

        // 重新加载日志
        loadLogs()
    } catch (error) {
        console.error('Failed to delete audit logs:', error)
        showMessage(t('audit.deleteLogsFailed'), 'error')
    } finally {
        isDeleting.value = false
    }
}

// Show message
const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    message.value = { text, type } as Message
}

// Load data on component mount
onMounted(() => {
    loadLogs()
    loadUsers()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.audit-container {
    max-width: 1200px;
    margin: 0 auto;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h1 {
        margin: 0;
        font-size: 28px;
    }
}

.filters-card {
    background-color: var(--card-bg);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    //margin-bottom: 24px;
    overflow: hidden;
}

.filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    padding-top: 0px;
    border-bottom: 1px solid var(--border-color);

    h2 {
        margin: 0;
        font-size: 18px;
    }
}

.filters-content {
    padding: 16px;
}

.filter-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;

    @media (max-width: 768px) {
        flex-direction: column;
        gap: 12px;
    }
}

.filter-group {
    flex: 1;

    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
    }

    select,
    input {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 14px;
        background-color: var(--input-bg);
        color: var(--text);

        &:focus {
            outline: none;
            border-color: var(--primary-color);
        }
    }

    .date-range {
        display: flex;
        align-items: center;
        gap: 8px;

        span {
            color: var(--text-secondary);
        }
    }
}

.filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 8px;
}

.logs-table-container {
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

    .table-info {
        color: var(--text-secondary);
    }

    .table-actions {
        display: flex;
        gap: 8px;
    }
}

.table-container {
    overflow-x: auto;
}

.logs-table {
    width: 100%;
    border-collapse: collapse;

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

    .action-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;

        &.action-success {
            background-color: rgba(var(--success-color-rgb), 0.1);
            color: var(--success-color);
        }

        &.action-warning {
            background-color: rgba(var(--warning-color-rgb), 0.1);
            color: var(--warning-color);
        }

        &.action-danger {
            background-color: rgba(var(--danger-color-rgb), 0.1);
            color: var(--danger-color);
        }

        &.action-info {
            background-color: rgba(var(--info-color-rgb), 0.1);
            color: var(--info-color);
        }
    }

    .btn-link {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        text-decoration: underline;
        font-size: 14px;

        &:hover {
            color: var(--primary-color);
            filter: brightness(0.9);
        }
    }
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 16px;

    .page-info {
        color: var(--text-secondary);
    }
}

// Dialog styles
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.dialog {
    background-color: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: auto;
}

.dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);

    h3 {
        margin: 0;
        font-size: 18px;
    }

    .dialog-close {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);

        .material-icons {
            font-size: 20px;
        }
    }
}

.dialog-content {
    padding: 16px;
}

.log-details {
    .detail-item {
        display: flex;
        margin-bottom: 12px;

        label {
            font-weight: 500;
            width: 120px;
            color: var(--text-secondary);
        }

        span,
        pre {
            flex: 1;
        }

        &.full-width {
            flex-direction: column;

            label {
                margin-bottom: 8px;
                width: auto;
            }
        }

        pre {
            background-color: var(--code-bg);
            border-radius: 4px;
            padding: 12px;
            font-size: 12px;
            overflow: auto;
            max-height: 200px;
        }
    }
}

.cleanup-options {
    margin-bottom: 16px;

    h4 {
        margin-bottom: 16px;
    }
}

.option {
    margin-bottom: 16px;

    label {
        display: block;
        margin-bottom: 8px;
        cursor: pointer;
        font-weight: 500;
    }

    .option-config {
        margin-left: 24px;

        label {
            font-weight: normal;
            margin-bottom: 8px;
        }

        input {
            width: 100px;
            padding: 8px;
            border: 1px solid var(--border-color);
            border-radius: 4px;

            &:focus {
                outline: none;
                border-color: var(--primary-color);
            }
        }
    }
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
}

.btn-danger {
    background-color: var(--danger-color);
    color: white;

    &:hover {
        //background-color: darken(var(--danger-color), 10%);
        color: var(--primary-color);
        filter: brightness(0.9);
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
        background-color: var(--success-color);
    }

    &.snackbar-error {
        background-color: var(--danger-color);
    }

    &.snackbar-info {
        background-color: var(--info-color);
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

// Responsive design
@media (max-width: 768px) {
    .audit-container {
        padding: 16px;
    }

    .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
    }

    .dialog {
        width: 95%;
    }
}
</style>
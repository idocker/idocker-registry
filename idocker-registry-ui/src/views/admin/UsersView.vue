<template>
    <ManagementLayout>
        <div class="users-container">

            <div class="users-table-container">
                <div class="table-controls">
                    <input type="text" :placeholder="$t('userList.searchUsers')" v-model="searchQuery" class="search-input" />
                    <div class="table-actions">
                        <button class="btn btn-primary" @click="showCreateDialog = true">
                            <span class="material-icons">add</span>
                            {{ $t('userList.addUser') }}
                        </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>{{ $t('userList.username') }}</th>
                                <th>{{ $t('userList.email') }}</th>
                                <th>{{ $t('userList.role') }}</th>
                                <th>{{ $t('userList.createdAt') }}</th>
                                <th>{{ $t('userList.lastLogin') }}</th>
                                <th>{{ $t('userList.actions') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="isLoading">
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-indicator">
                                        <span class="material-icons">refresh</span>
                                        {{ $t('userList.loading') }}
                                    </div>
                                </td>
                            </tr>
                            <tr v-else-if="filteredUsers.length === 0">
                                <td colspan="7" class="empty-cell">{{ $t('userList.noUsersFound') }}</td>
                            </tr>
                            <tr v-for="user in paginatedUsers" :key="user.id">
                                <td>{{ user.username }}</td>
                                <td>{{ user.email }}</td>
                                <td>
                                    <span class="role-badge" :class="`role-${user.role}`">
                                        {{ getRoleDisplay(user.role) }}
                                    </span>
                                </td>
                                <td>{{ formatDate(user.created_at) }}</td>
                                <td>{{ user.last_login ? formatDate(user.last_login) : '-' }}</td>
                                <td class="action-buttons">
                                    <button class="btn btn-icon btn-ghost" @click="editUser(user)" :title="$t('userList.editUser')">
                                        <span class="material-icons">edit</span>
                                    </button>
                                    <button class="btn btn-icon btn-ghost" @click="deleteUser(user)" :title="$t('userList.deleteUser')">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="pagination" v-if="totalPages > 1">
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
                    <select v-model="pageSize" class="page-size-select" @change="currentPage = 1">
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                    </select>
                </div>
            </div>

            <!-- 创建/编辑用户对话框 -->
            <div v-if="showCreateDialog || showEditDialog" class="dialog-overlay" @click="closeDialogs">
                <div class="dialog" @click.stop>
                    <div class="dialog-header">
                        <h3>{{ showEditDialog ? $t('userList.editUser') : $t('userList.createUser') }}</h3>
                        <button class="dialog-close" @click="closeDialogs">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <form @submit.prevent="saveUser" class="user-form">
                            <div class="form-group">
                                <label for="username">{{ $t('userList.username') }}</label>
                                <input id="username" type="text" v-model="userForm.username" required
                                    :disabled="showEditDialog" />
                            </div>

                            <div class="form-group">
                                <label for="email">{{ $t('userList.email') }}</label>
                                <input id="email" type="email" v-model="userForm.email" required />
                            </div>

                            <div class="form-group">
                                <label for="password" v-if="!showEditDialog">{{ $t('users.password') }}</label>
                                <label for="password" v-else>{{ $t('userList.newPasswordPlaceholder') }}</label>
                                <input id="password" type="password" v-model="userForm.password"
                                    :required="!showEditDialog" />
                            </div>

                            <div class="form-group">
                                <label for="isActive">{{ $t('users.active') }}</label>
                                <select id="isActive" v-model="userForm.isActive" required>
                                    <option value="true">{{ $t('common.yes') }}</option>
                                    <option value="false">{{ $t('common.no') }}</option>
                                </select>
                            </div>

                            <div class="dialog-actions">
                                <button type="button" class="btn btn-ghost" @click="closeDialogs">{{ $t('common.cancel') }}</button>
                                <button type="submit" class="btn btn-primary" :disabled="isSaving">
                                    <span v-if="isSaving">{{ $t('userList.saving') }}...</span>
                                    <span v-else>{{ $t('common.save') }}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- 删除确认对话框 -->
            <div v-if="showDeleteDialog" class="dialog-overlay" @click="showDeleteDialog = false">
                <div class="dialog" @click.stop>
                    <div class="dialog-header">
                        <h3>{{ $t('confirm.deleteTitle') }}</h3>
                        <button class="dialog-close" @click="showDeleteDialog = false">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <p>{{ $t('userList.confirmDeleteUser', { username: userToDelete?.username }) }}</p>

                        <div class="dialog-actions">
                            <button class="btn btn-ghost" @click="showDeleteDialog = false">{{ $t('common.cancel') }}</button>
                            <button class="btn btn-danger" @click="confirmDelete" :disabled="isDeleting">
                                <span v-if="isDeleting">{{ $t('userList.deleting') }}...</span>
                                <span v-else>{{ $t('common.confirm') }} {{ $t('common.delete') }}</span>
                            </button>
                        </div>
                    </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user.service'
import { formatDate as fmtDate } from '@/utils/helpers'
import type { Message, User } from '@/types'

const { t, locale } = useI18n()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const message = ref<Message | null>(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// Auth store
const authStore = useAuthStore()

// Dialog state
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// User data
const users = ref<User[]>([])
const userToDelete = ref<User>({} as User)
const userForm = reactive({
    id: null as number | null,
    username: '',
    email: '',
    password: '',
    role: 'operator' as User['role'],
    isActive: true
})

// Computed properties
const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value

    const query = searchQuery.value.toLowerCase()
    return users.value.filter((user: User) =>
        user.username.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    )
})

const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    //console.log('filteredUsers', filteredUsers.value)
    return filteredUsers.value.slice(start, end)
})

const totalPages = computed(() => {
    return Math.ceil(filteredUsers.value.length / pageSize.value)
})

// Get user role display
const getRoleDisplay = (role: string) => {
    switch (role) {
        case 'admin':
            return t('userList.roleAdmin')
        case 'project_manager':
            return t('userList.roleProjectManager')
        case 'developer':
            return t('userList.roleDeveloper')
        case 'operator':
            return t('userList.roleOperator')
        default:
            return role
    }
}

// Format date
 const formatDate = (dateString: string) => fmtDate(dateString, locale.value)

// Load user list
const loadUsers = async () => {
    try {
        isLoading.value = true
        //const response = 
        await userService.getUsers({
            page: currentPage.value,
            limit: pageSize.value
        }).then(response => {
            console.log('response====', response)
            // 兼容两种数据结构：data 和 datas
            users.value = response.data || []
            //totalPages.value = response.pagination?.totalPages || 1
        })
        
    } catch (e: any) {
        console.error('Failed to load users:', e)
        showMessage(e?.message || t('userList.loadUsersFailed'), 'error')
    } finally {
        isLoading.value = false
    }
}

// 刷新用户列表
const refreshUsers = () => {
    loadUsers()
}

// 编辑用户
const editUser = (user: User) => {
        Object.assign(userForm, {
            id: user.id,
            username: user.username,
            email: user.email,
            password: '',
            role: user.role as User['role']
        })
    showEditDialog.value = true
}

// Delete user
const deleteUser = (user: User) => {
    userToDelete.value = user
    showDeleteDialog.value = true
}

// Confirm delete
const confirmDelete = async () => {
    try {
        isDeleting.value = true
        const response = await userService.deleteUser(userToDelete.value.id.toString())
        
        if (response.success) {
            // Remove user from list
            const index = users.value.findIndex(u => u.id === userToDelete.value.id)
            if (index !== -1) {
                users.value.splice(index, 1)
            }
            showMessage( t('userList.userDeleted'),  'success')
        } else {
            showMessage(response.message || t('userList.deleteUserFailed'),  'error')
        }
        
        showDeleteDialog.value = false
        userToDelete.value = null
    } catch (e: any) {
        console.error('Failed to delete user:', e)
        showMessage(e?.message || t('userList.deleteUserFailed'), 'error')
    } finally {
        isDeleting.value = false
    }
}

// Save user
const saveUser = async () => {
    try {
        isSaving.value = true
        
        if (showEditDialog.value) {
            // Edit user
            const response = await userService.updateUser(userForm.id?.toString(), {
                email: userForm.email,
                role: userForm.role,
                isActive: userForm.isActive
            })
            
            if (response.success) {
                // Update user in list
                const index = users.value.findIndex(u => u.id === userForm.id)
                if (index !== -1) {
                    Object.assign(users.value[index], response.data)
                }
                showMessage( t('userList.userUpdated'), 'success')
            } else {
                showMessage(response.message || t('userList.saveUserFailed'), 'error' )
            }
        } else {
            // Create user
            const response = await userService.createUser({
                username: userForm.username,
                email: userForm.email,
                password: userForm.password,
                role: 'operator' as User['role']
            })
            
            if (response.success) {
                // Add to list
                users.value.unshift(response.data)
                showMessage( t('userList.userCreated'), 'success')
            } else {
                showMessage(response.message || t('userList.saveUserFailed'),  'error')
            }
        }

        closeDialogs()
    } catch (e: any) {
        console.error('Failed to save user:', e)
        showMessage(e?.message || t('userList.saveUserFailed'), 'error')
    } finally {
        isSaving.value = false
    }
}

// Close dialogs
const closeDialogs = () => {
    showCreateDialog.value = false
    showEditDialog.value = false
    resetForm()
}

// Reset form
const resetForm = () => {
        Object.assign(userForm, {
            id: null,
            username: '',
            email: '',
            password: '',
            role: 'developer',
            isActive: true
        })
}

// Show message
const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    message.value = { text, type } as Message
    setTimeout(() => {
        message.value = null
    }, 3000)
}

// Load user list on component mount
onMounted(async () => {
    // Ensure user profile is loaded
    if (authStore.token && !authStore.currentUser) {
        try {
            await authStore.fetchProfile()
        } catch (error) {
            console.error('Failed to fetch user profile:', error)
        }
    }

    loadUsers()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.users-container {
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

.users-table-container {
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
        //background-color: var(--bg-color);

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

.table-container {
    overflow-x: auto;
}

.users-table {
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
        color: var(--neutral-text);
        background-color: var(--hover-background);
    }

    tr:hover {
        background-color: var(--hover-background);
    }

    .loading-cell,
    .empty-cell {
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

    .role-badge {
        padding: 4px 8px;
        border-radius: 12px;

        font-weight: 500;

        &.role-admin {
            background-color: rgba(var(--danger-color-rgb), 0.1);
            color: var(--danger-color);
        }

        &.role-maintainer {
            background-color: rgba(var(--warning-color-rgb), 0.1);
            color: var(--warning-color);
        }

        &.role-user {
            background-color: rgba(var(--info-color-rgb), 0.1);
            color: var(--info-color);
        }
    }

    .badge {
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 500;

        &.badge-success {
            background-color: rgba(var(--success-color-rgb), 0.1);
            color: var(--success-color);
        }

        &.badge-muted {
            background-color: rgba(var(--text-muted-rgb), 0.1);
            color: var(--neutral-text);
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
        color: var(--neutral-text);
    }
}

// Dialog styles
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    //background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.dialog {
    //background-color: var(--card-bg);
    background-color: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
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
        color: var(--neutral-text);

        .material-icons {
            font-size: 20px;
        }
    }
}

.dialog-content {
    padding: 36px;
}

.user-form {
    .form-group {
        margin-bottom: 16px;

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }

        input[type="text"],
        input[type="email"],
        input[type="password"],
        select {
            width: 100%;
            padding: 8px 12px 8px 10px;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            background-color: var(--background) !important;
            color: var(--primary-text);

            &:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
            }
        }

        label {
            display: flex;
            align-items: center;
            cursor: pointer;

            input[type="checkbox"] {
                width: auto;
                margin-right: 8px;
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
        filter: brightness(0.9);
    }
}

// Snackbar styles
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

// Animation
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
    .users-container {
        padding: 16px;
    }

    .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
    }

    .table-controls {
        flex-direction: column;
        gap: 12px;

        .search-input {
            width: 100%;
        }
    }

    .dialog {
        width: 95%;
    }
}
</style>
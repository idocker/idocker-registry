<template>
    <ManagementLayout>
        <div class="users-container">

            <div class="users-table-container">
                <div class="table-controls">
                    <input type="text" placeholder="搜索用户..." v-model="searchQuery" class="search-input" />
                    <div class="table-actions">
                        <button class="btn btn-ghost" @click="refreshUsers">
                            <span class="material-icons">refresh</span>
                            刷新
                        </button>
                        <button class="btn btn-primary" @click="showCreateDialog = true">
                    <span class="material-icons">add</span>
                    添加用户
                </button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>角色</th>
                                <th>LDAP用户</th>
                                <th>创建时间</th>
                                <th>最后登录</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="isLoading">
                                <td colspan="7" class="loading-cell">
                                    <div class="loading-indicator">
                                        <span class="material-icons">refresh</span>
                                        加载中...
                                    </div>
                                </td>
                            </tr>
                            <tr v-else-if="filteredUsers.length === 0">
                                <td colspan="7" class="empty-cell">没有找到用户</td>
                            </tr>
                            <tr v-for="user in paginatedUsers" :key="user.id">
                                <td>{{ user.username }}</td>
                                <td>{{ user.email }}</td>
                                <td>
                                    <span class="role-badge" :class="`role-${user.role}`">
                                        {{ getRoleDisplay(user.role) }}
                                    </span>
                                </td>
                                <td>
                                    <span v-if="user.ldap_user" class="badge badge-success">是</span>
                                    <span v-else class="badge badge-muted">否</span>
                                </td>
                                <td>{{ formatDate(user.created_at) }}</td>
                                <td>{{ user.last_login ? formatDate(user.last_login) : '从未登录' }}</td>
                                <td class="action-buttons">
                                    <button class="btn-icon btn-ghost" @click="editUser(user)" title="编辑用户">
                                        <span class="material-icons">edit</span>
                                    </button>
                                    <button class="btn-icon btn-ghost" @click="deleteUser(user)" title="删除用户">
                                        <span class="material-icons">delete</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="pagination">
                    <button class="btn btn-ghost" @click="currentPage = Math.max(1, currentPage - 1)"
                        :disabled="currentPage === 1">
                        上一页
                    </button>
                    <span class="page-info">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button class="btn btn-ghost" @click="currentPage = Math.min(totalPages, currentPage + 1)"
                        :disabled="currentPage === totalPages">
                        下一页
                    </button>
                </div>
            </div>

            <!-- 创建/编辑用户对话框 -->
            <div v-if="showCreateDialog || showEditDialog" class="dialog-overlay" @click="closeDialogs">
                <div class="dialog" @click.stop>
                    <div class="dialog-header">
                        <h3>{{ showEditDialog ? '编辑用户' : '添加用户' }}</h3>
                        <button class="dialog-close" @click="closeDialogs">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <form @submit.prevent="saveUser" class="user-form">
                            <div class="form-group">
                                <label for="username">用户名</label>
                                <input id="username" type="text" v-model="userForm.username" required
                                    :disabled="showEditDialog" />
                            </div>

                            <div class="form-group">
                                <label for="email">邮箱</label>
                                <input id="email" type="email" v-model="userForm.email" required />
                            </div>

                            <div class="form-group">
                                <label for="password" v-if="!showEditDialog">密码</label>
                                <label for="password" v-else>新密码（留空则不修改）</label>
                                <input id="password" type="password" v-model="userForm.password"
                                    :required="!showEditDialog" />
                            </div>

                            <div class="form-group">
                                <label for="role">角色</label>
                                <select id="role" v-model="userForm.role" required>
                                    <option value="user">用户</option>
                                    <option value="maintainer">维护者</option>
                                    <option value="admin">管理员</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" v-model="userForm.ldapUser" />
                                    LDAP用户
                                </label>
                            </div>

                            <div class="dialog-actions">
                                <button type="button" class="btn btn-ghost" @click="closeDialogs">取消</button>
                                <button type="submit" class="btn btn-primary" :disabled="isSaving">
                                    <span v-if="isSaving">保存中...</span>
                                    <span v-else>保存</span>
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
                        <h3>确认删除</h3>
                        <button class="dialog-close" @click="showDeleteDialog = false">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <p>确定要删除用户 <strong>{{ userToDelete?.username }}</strong> 吗？此操作不可撤销。</p>

                        <div class="dialog-actions">
                            <button class="btn btn-ghost" @click="showDeleteDialog = false">取消</button>
                            <button class="btn btn-danger" @click="confirmDelete" :disabled="isDeleting">
                                <span v-if="isDeleting">删除中...</span>
                                <span v-else>确认删除</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 消息提示 -->
            <div v-if="message" class="snackbar" :class="`snackbar-${message.type}`">
                {{ message.text }}
                <button class="snackbar-close" @click="message = ''">
                    <span class="material-icons">close</span>
                </button>
            </div>
        </div>
    </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import { useAuthStore } from '@/stores/auth'

// 状态
const isLoading = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const message = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(8)

// 认证存储
const authStore = useAuthStore()

// 对话框状态
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// 用户数据
const users = ref([])
const userToDelete = ref(null)
const userForm = reactive({
    id: null,
    username: '',
    email: '',
    password: '',
    role: 'user',
    ldapUser: false
})

// 计算属性
const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value

    const query = searchQuery.value.toLowerCase()
    return users.value.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    )
})

const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    console.log('filteredUsers', filteredUsers.value)
    return filteredUsers.value.slice(start, end)
})

const totalPages = computed(() => {
    return Math.ceil(filteredUsers.value.length / pageSize.value)
})

// 获取用户角色显示
const getRoleDisplay = (role: string) => {
    switch (role) {
        case 'admin':
            return '管理员'
        case 'maintainer':
            return '维护者'
        case 'member':
            return '成员'
        default:
            return '用户'
    }
}

// 格式化日期
const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// 加载用户列表
const loadUsers = async () => {
    try {
        isLoading.value = true
        const response = await axios.get('/api/users', {
            headers: {
                'Authorization': `Bearer ${authStore.token}`
            }
        })
        users.value = response.data.data || []
    } catch (error) {
        console.error('Failed to load users:', error)
        showMessage('加载用户列表失败', 'error')
    } finally {
        isLoading.value = false
    }
}

// 刷新用户列表
const refreshUsers = () => {
    loadUsers()
}

// 编辑用户
const editUser = (user) => {
    Object.assign(userForm, {
        id: user.id,
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        ldapUser: user.ldap_user
    })
    showEditDialog.value = true
}

// 删除用户
const deleteUser = (user) => {
    userToDelete.value = user
    showDeleteDialog.value = true
}

// 确认删除
const confirmDelete = async () => {
    try {
        isDeleting.value = true
        await axios.delete(`/api/users/${userToDelete.value.id}`, {
            headers: {
                'Authorization': `Bearer ${authStore.token}`
            }
        })

        // 从列表中移除用户
        const index = users.value.findIndex(u => u.id === userToDelete.value.id)
        if (index !== -1) {
            users.value.splice(index, 1)
        }

        showMessage('用户删除成功', 'success')
        showDeleteDialog.value = false
        userToDelete.value = null
    } catch (error) {
        console.error('Failed to delete user:', error)
        showMessage('删除用户失败', 'error')
    } finally {
        isDeleting.value = false
    }
}

// 保存用户
const saveUser = async () => {
    try {
        isSaving.value = true

        const authHeaders = {
            'Authorization': `Bearer ${authStore.token}`
        }

        if (showEditDialog.value) {
            // 编辑用户
            await axios.put(`/api/users/${userForm.id}`, {
                username: userForm.username,
                email: userForm.email,
                role: userForm.role,
                ldapUser: userForm.ldapUser
            }, { headers: authHeaders })

            // 更新列表中的用户
            const index = users.value.findIndex(u => u.id === userForm.id)
            if (index !== -1) {
                Object.assign(users.value[index], userForm)
            }

            showMessage('用户更新成功', 'success')
        } else {
            // 创建用户
            const response = await axios.post('/api/users', {
                username: userForm.username,
                email: userForm.email,
                password: userForm.password,
                role: userForm.role,
                ldapUser: userForm.ldapUser
            }, { headers: authHeaders })

            // 添加到列表
            users.value.unshift(response.data)

            showMessage('用户创建成功', 'success')
        }

        closeDialogs()
    } catch (error) {
        console.error('Failed to save user:', error)
        showMessage(showEditDialog.value ? '更新用户失败' : '创建用户失败', 'error')
    } finally {
        isSaving.value = false
    }
}

// 关闭对话框
const closeDialogs = () => {
    showCreateDialog.value = false
    showEditDialog.value = false
    resetForm()
}

// 重置表单
const resetForm = () => {
    Object.assign(userForm, {
        id: null,
        username: '',
        email: '',
        password: '',
        role: 'user',
        ldapUser: false
    })
}

// 显示消息
const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    message.value = { text, type }
}

// 组件挂载时加载用户列表
onMounted(async () => {
    // 确保已加载用户信息
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
        background-color: var(--bg-color);

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
            color: var(--text-muted);
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

// 对话框样式
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
    background-color: #222;
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
        color: var(--text-muted);

        .material-icons {
            font-size: 20px;
        }
    }
}

.dialog-content {
    padding: 16px;
}

.user-form {
    .form-group {
        margin-bottom: 16px;

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }

        input,
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 14px;

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

// 响应式设计
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
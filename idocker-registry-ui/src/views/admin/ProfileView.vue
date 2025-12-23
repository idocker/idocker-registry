<template>
    <ManagementLayout>
        <div class="profile-container">
            <div class="profile-sections">
                <div class="profile-section">
                    <div class="profile-avatar-section">
                        <div class="avatar-container">
                            <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="User Avatar" class="avatar" />
                            <div v-else class="avatar-placeholder">
                                <span class="material-icons">account_circle</span>
                            </div>
                            <div class="avatar-actions">
                                <button class="btn btn-primary" @click="showAvatarUpload = true">
                                    <span class="material-icons">photo_camera</span>
                                    更换头像
                                </button>
                            </div>
                        </div>
                    </div>

                    <form @submit.prevent="updateProfile" class="profile-form">
                        <div class="form-group">
                            <label for="username">用户名</label>
                            <input id="username" type="text" v-model="profileForm.username"
                                :disabled="isUpdatingProfile" required />
                        </div>

                        <div class="form-group">
                            <label for="email">邮箱</label>
                            <input id="email" type="email" v-model="profileForm.email" :disabled="isUpdatingProfile"
                                required />
                        </div>

                        <div class="form-group">
                            <label>角色</label>
                            <input type="text" :value="getRoleDisplay(profileForm.role)" disabled
                                class="role-display" />
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" :disabled="isUpdatingProfile">
                                <span v-if="isUpdatingProfile">更新中...</span>
                                <span v-else>保存更改</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div v-if="userProjects.length > 0" class="profile-section">
                    <h2>我的项目</h2>
                    <div class="projects-list">
                        <div v-for="project in userProjects" :key="project.id" class="project-card">
                            <div class="project-info">
                                <h3>{{ project.name }}</h3>
                                <p v-if="project.description">{{ project.description }}</p>
                                <div class="project-meta">
                                    <span class="project-role">角色: {{ getRoleDisplay(project.member_role) }}</span>
                                    <span class="project-date">加入时间: {{ formatDate(project.created_at) }}</span>
                                </div>
                            </div>
                            <div class="project-actions">
                                <router-link :to="`/admin/projects/${project.id}`" class="btn btn-ghost">
                                    查看详情
                                </router-link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 头像上传对话框 -->
            <div v-if="showAvatarUpload" class="dialog-overlay" @click="showAvatarUpload = false">
                <div class="dialog" @click.stop>
                    <div class="dialog-header">
                        <h3>上传头像</h3>
                        <button class="dialog-close" @click="showAvatarUpload = false">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <div class="avatar-upload-content">
                            <div class="current-avatar">
                                <p>当前头像</p>
                                <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="Current Avatar"
                                    class="avatar-preview" />
                                <div v-else class="avatar-preview-placeholder">
                                    <span class="material-icons">account_circle</span>
                                </div>
                            </div>

                            <div class="avatar-upload">
                                <p>上传新头像</p>
                                <input type="file" ref="avatarInput" accept="image/*" @change="handleAvatarChange"
                                    class="avatar-input" />
                                <div v-if="avatarPreview" class="avatar-preview-container">
                                    <img :src="avatarPreview" alt="Avatar Preview" class="avatar-preview" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dialog-actions">
                        <button class="btn btn-ghost" @click="showAvatarUpload = false">取消</button>
                        <button class="btn btn-primary" @click="uploadAvatar"
                            :disabled="!avatarPreview || isUploadingAvatar">
                            <span v-if="isUploadingAvatar">上传中...</span>
                            <span v-else>确认上传</span>
                        </button>
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
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import type { SnackbarMessage } from '@/types'

const authStore = useAuthStore()

// 表单状态
const isUpdatingProfile = ref(false)
const isUploadingAvatar = ref(false)
const message = ref('')
const showAvatarUpload = ref(false)
const avatarPreview = ref('')
const avatarInput = ref(null)

// 用户表单
const profileForm = reactive({
    username: '',
    email: '',
    role: '',
    avatar: ''
})

// 用户项目
const userProjects = ref([])

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

// 加载用户信息
const loadUserProfile = async () => {
    try {
        const response = await axios.get('/api/users/'+authStore.user.id)

        // 更新表单数据
        Object.assign(profileForm, response.data)

        // 加载用户项目
        if (response.data.role !== 'admin') {
            await loadUserProjects()
        }
    } catch (error) {
        console.error('Failed to load user profile:', error)
        showMessage('加载用户信息失败', 'error')
    }
}

// 加载用户项目
const loadUserProjects = async () => {
    try {
        const response = await axios.get('/api/projects')
        userProjects.value = response.data.projects || []
    } catch (error) {
        console.error('Failed to load user projects:', error)
        showMessage('加载用户项目失败', 'error')
    }
}

// 更新用户信息
const updateProfile = async () => {
    try {
        isUpdatingProfile.value = true

        const response = await axios.put('/api/users/'+authStore.user.id, {
            username: profileForm.username,
            email: profileForm.email
        })

        // 更新存储的用户信息
        authStore.user = response.data
        localStorage.setItem('user_data', JSON.stringify(response.data))

        showMessage('个人信息更新成功', 'success')
    } catch (error: any) {
        console.error('Failed to update profile:', error)
        showMessage(error.response?.data?.error || '更新个人信息失败', 'error')
    } finally {
        isUpdatingProfile.value = false
    }
}



// 处理头像选择
const handleAvatarChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (file) {
        // 简单的客户端预览
        const reader = new FileReader()
        reader.onload = (e) => {
            avatarPreview.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
}

// 上传头像
const uploadAvatar = async () => {
    if (!avatarPreview.value) return

    try {
        isUploadingAvatar.value = true

        // 将base64转换为File对象
        const response = await fetch(avatarPreview.value)
        const blob = await response.blob()
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })

        const formData = new FormData()
        formData.append('avatar', file)

        const uploadResponse = await axios.post('/api/users/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        // 更新头像URL
        profileForm.avatar = uploadResponse.data.avatarUrl

        // 更新用户信息
        const userResponse = await axios.get('/api/users/profile/me')
        authStore.user = userResponse.data
        localStorage.setItem('user_data', JSON.stringify(userResponse.data))

        showMessage('头像上传成功', 'success')
        showAvatarUpload.value = false
        avatarPreview.value = ''
    } catch (error: any) {
        console.error('Failed to upload avatar:', error)
        showMessage(error.response?.data?.error || '头像上传失败', 'error')
    } finally {
        isUploadingAvatar.value = false
    }
}

// 显示消息
const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    message.value = { text, type } as SnackbarMessage
}

// 组件挂载时加载用户信息
onMounted(() => {
    loadUserProfile()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.profile-container {
    max-width: 900px;
    margin: 0 auto;
}

.profile-sections {
    display: flex;
    flex-direction: column;
    gap: 32px;

}

.profile-section {
    background-color: var(--card-bg);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 24px;

    h2 {
        margin-bottom: 24px;
        font-size: 20px;
    }

    .profile-form{
        margin: 0 auto;
        max-width: 400px;
        align-items: center;
        justify-content: center;
        padding-bottom: 20px;
    }
}

.profile-avatar-section {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;

    .avatar-container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }

    .avatar,
    .avatar-placeholder {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--primary-color);
    }

    .avatar-placeholder {
        background-color: var(--primary-color-light);
        display: flex;
        align-items: center;
        justify-content: center;

        .material-icons {
            font-size: 50px;
            color: var(--primary-color);
        }
    }

    .avatar-actions {
        text-align: center;
    }
}

.profile-form {
    .form-group {
        margin-bottom: 20px;

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }

        input[type="text"], input[type="email"], input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border-color);
            background-color: var(--input-bg);
            border-radius: var(--border-radius);
            color: var(--input-color);
            font-size: 16px;

            &:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
            }

            &.role-display {
                background-color: var(--input-bg);
                color: var(--text-muted);
            }
        }
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 24px;
    }
}

.projects-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
}

.project-card {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;

    .project-info {
        flex: 1;

        h3 {
            margin-bottom: 8px;
            font-size: 18px;
        }

        p {
            color: var(--text-muted);
            margin-bottom: 16px;
        }

        .project-meta {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 14px;
            color: var(--text-muted);
        }
    }

    .project-actions {
        margin-top: 16px;
    }
}

.avatar-upload-content {
    display: flex;
    flex-direction: column;
    gap: 24px;

    .current-avatar,
    .avatar-upload {
        text-align: center;

        p {
            margin-bottom: 12px;
            font-weight: 500;
        }

        .avatar-preview,
        .avatar-preview-placeholder {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto;
            border: 2px solid var(--primary-color);
        }

        .avatar-preview-placeholder {
            background-color: var(--primary-color-light);
            display: flex;
            align-items: center;
            justify-content: center;

            .material-icons {
                font-size: 60px;
                color: var(--primary-color);
            }
        }

        .avatar-input {
            margin-top: 12px;
            display: none;
        }

        .avatar-preview-container {
            margin-top: 12px;
        }
    }

    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }
}

// 响应式设计
// 对话框样式
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
    max-width: 500px;
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

// 响应式设计
@media (max-width: 768px) {
    .profile-container {
        padding: 16px;
    }

    .projects-list {
        grid-template-columns: 1fr;
    }

    .dialog {
        width: 95%;
    }
}
</style>
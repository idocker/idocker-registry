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
                                    {{ $t('profile.changeAvatar') }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <form @submit.prevent="updateProfile" class="profile-form">
                        <div class="form-group">
                            <label for="username">{{ $t('profile.username') }}</label>
                            <input id="username" type="text" v-model="profileForm.username"
                                :disabled="isUpdatingProfile" required />
                        </div>

                        <div class="form-group">
                            <label for="email">{{ $t('profile.email') }}</label>
                            <input id="email" type="email" v-model="profileForm.email" :disabled="isUpdatingProfile"
                                required />
                        </div>

                        <div class="form-group">
                            <label>{{ $t('profile.role') }}</label>
                            <input type="text" :value="getRoleDisplay(profileForm.role)" disabled
                                class="role-display" />
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary" :disabled="isUpdatingProfile">
                                <span v-if="isUpdatingProfile">{{ $t('profile.updating') }}...</span>
                                <span v-else>{{ $t('profile.saveChanges') }}</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div v-if="userProjects.length > 0" class="profile-section">
                    <h2>{{ $t('profile.myProjects') }}</h2>
                    <div class="projects-list">
                        <div v-for="project in userProjects" :key="project.id" class="project-card">
                            <div class="project-info">
                                <h3>{{ project.name }}</h3>
                                <p v-if="project.description">{{ project.description }}</p>
            <div class="project-meta">
                <span class="project-role">{{ $t('profile.projectRole') }}: {{ getRoleDisplay(project.memberRole) }}</span>
                <span class="project-date">{{ $t('profile.joinTime') }}: {{ formatDate(project.memberSince) }}</span>
            </div>
                            </div>
                            <div class="project-actions">
                                <router-link :to="`/admin/projects/${project.id}`" class="btn btn-ghost">
                                    {{ $t('profile.viewDetails') }}
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
                        <h3>{{ $t('profile.uploadAvatar') }}</h3>
                        <button class="dialog-close" @click="showAvatarUpload = false">
                            <span class="material-icons">close</span>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <div class="avatar-upload-content">
                            <div class="current-avatar">
                                <p>{{ $t('profile.currentAvatar') }}</p>
                                <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="Current Avatar"
                                    class="avatar-preview" />
                                <div v-else class="avatar-preview-placeholder">
                                    <span class="material-icons">account_circle</span>
                                </div>
                            </div>

                            <div class="avatar-upload">
                                <p>{{ $t('profile.uploadNewAvatar') }}</p>
                                <input type="file" ref="avatarInput" accept="image/*" @change="handleAvatarChange"
                                    class="avatar-input" />
                                <div v-if="avatarPreview" class="avatar-preview-container">
                                    <img :src="avatarPreview" alt="Avatar Preview" class="avatar-preview" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dialog-actions">
                        <button class="btn btn-ghost" @click="showAvatarUpload = false">{{ $t('common.cancel') }}</button>
                        <button class="btn btn-primary" @click="uploadAvatar"
                            :disabled="!avatarPreview || isUploadingAvatar">
                            <span v-if="isUploadingAvatar">{{ $t('profile.uploading') }}...</span>
                            <span v-else>{{ $t('profile.confirmUpload') }}</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 消息提示 -->
            <div v-if="message" class="snackbar" :class="`snackbar-${message.type}`">
                {{ message.text }}
                <button class="snackbar-close" @click="closeMessage">
                    <span class="material-icons">close</span>
                </button>
            </div>
        </div>
    </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user.service'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import { formatDate as fmtDate } from '@/utils/helpers'
import type { SnackbarMessage,Message, Project, User ,UserProjects} from '@/types'

const { t, locale } = useI18n()
const authStore = useAuthStore()

// Form state
const isUpdatingProfile = ref(false)
const isUploadingAvatar = ref(false)
const message = ref<Message | null>(null)
const showAvatarUpload = ref(false)
const avatarPreview = ref('')
const avatarInput = ref(null)

// User form
const profileForm = reactive({
    username: '',
    email: '',
    role: '',
    avatar: ''
})


// User projects
const userProjects = ref<Project[]>([])

// Get user role display
const getRoleDisplay = (role: string) => {
    switch (role) {
        case 'admin':
            return t('users.roleAdmin')
        case 'maintainer':
            return t('projects.roleMaintainer')
        case 'member':
            return t('projects.roleViewer')
        default:
            return t('users.roleUser')
    }
}

// Format date
const formatDate = (dateString: string) => fmtDate(dateString, locale.value)

// Load user profile
const loadUserProfile = async () => {
    try {
        const response = await userService.getUser(authStore.user.id.toString())
        
        if (response.success) {
            // Update form data
            Object.assign(profileForm, response.data)

            // Load user projects
            if (response.data.role !== 'admin') {
                await loadUserProjects()
            }
        } else {
            showMessage({ text: t('profile.loadProfileFailed'), type: 'error' })
        }
    } catch (error) {
        console.error('Failed to load user profile:', error)
        showMessage({ text: t('profile.loadProfileFailed'), type: 'error' })
    }
}

// Load user projects
const loadUserProjects = async () => {
    try {
        const response = await userService.getUserProjects(authStore.user.id.toString())
        
        if (response.success) {
            userProjects.value = response.data.projects || []
        } else {
            showMessage({ text: t('profile.loadProjectsFailed'), type: 'error' })
        }
    } catch (error) {
        console.error('Failed to load user projects:', error)
        showMessage({ text: t('profile.loadProjectsFailed'), type: 'error' })
    }
}

// Update user profile
const updateProfile = async () => {
    try {
        isUpdatingProfile.value = true

        const response = await userService.updateUser(authStore.user.id.toString(), {
            email: profileForm.email
        })

        if (response.success) {
            // Update stored user info
            authStore.user = response.data
            localStorage.setItem('user_data', JSON.stringify(response.data))
            showMessage({ text: t('profile.profileUpdated'), type: 'success' })
        } else {
            showMessage({ text: response.message || t('profile.updateProfileFailed'), type: 'error' })
        }
        } catch (error: any) {
            console.error('Failed to update profile:', error)
            showMessage({ text: error.response?.data?.error || t('profile.updateProfileFailed'), type: 'error' })
    } finally {
        isUpdatingProfile.value = false
    }
}



// Handle avatar selection
const handleAvatarChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (file) {
        // Simple client-side preview
        const reader = new FileReader()
        reader.onload = (e) => {
            avatarPreview.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
}

// Upload avatar
const uploadAvatar = async () => {
    if (!avatarPreview.value) return

    try {
        isUploadingAvatar.value = true

        // Convert base64 to File object
        const response = await fetch(avatarPreview.value)
        const blob = await response.blob()
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })

        // Use userService to upload avatar
        const uploadResponse = await userService.uploadAvatar(file)

        if (uploadResponse.success) {
            // Update avatar URL
            profileForm.avatar = uploadResponse.data.avatarUrl

            // Reload user profile
            await loadUserProfile()

            showMessage({ text: t('profile.avatarUploaded'), type: 'success' })
            showAvatarUpload.value = false
            avatarPreview.value = ''
        } else {
            throw new Error( t('profile.uploadAvatarFailed'))
        }
    } catch (error: any) {
        console.error('Failed to upload avatar:', error)
        showMessage({ text: error.message || t('profile.uploadAvatarFailed'), type: 'error' })
    } finally {
        isUploadingAvatar.value = false
    }
}

// Show message
const showMessage = (msg: Message) => {
    message.value = msg
    setTimeout(() => {
        message.value = null
    }, 3000)
}
const closeMessage = () => {
    message.value = null
}

// Load user profile on component mount
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
                color: var(--neutral-text);
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
            color: var(--neutral-text);
            margin-bottom: 16px;
        }

        .project-meta {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 14px;
            color: var(--neutral-text);
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

// Responsive design
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
        color: var(--neutral-text);

        .material-icons {
            font-size: 20px;
        }
    }
}

.dialog-content {
    padding: 16px;
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

// Responsive design
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
<template>
    <ManagementLayout>
        <div class="password-container">
            <div class="password-card">
                <form @submit.prevent="changePassword" class="password-form">
                    <div class="form-group">
                        <label for="currentPassword">当前密码</label>
                        <input id="currentPassword" type="password" v-model="passwordForm.currentPassword"
                            :disabled="isChangingPassword" required />
                    </div>

                    <div class="form-group">
                        <label for="newPassword">新密码</label>
                        <input id="newPassword" type="password" v-model="passwordForm.newPassword"
                            :disabled="isChangingPassword" required />
                        <div class="password-strength">
                            <div class="strength-bar">
                                <div class="strength-fill" :class="passwordStrengthClass"></div>
                            </div>
                            <span class="strength-text">{{ passwordStrengthText }}</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">确认新密码</label>
                        <input id="confirmPassword" type="password" v-model="passwordForm.confirmPassword"
                            :disabled="isChangingPassword" required />
                        <div v-if="passwordForm.confirmPassword && !isPasswordMatch" class="password-mismatch">
                            密码不匹配
                        </div>
                    </div>

                    <div class="password-requirements">
                        <p class="requirements-title">密码要求：</p>
                        <ul>
                            <li :class="{ 'requirement-met': passwordRequirements.length }">
                                <span class="material-icons">{{ passwordRequirements.length ? 'check_circle' :
                                    'radio_button_unchecked' }}</span>
                                至少6个字符
                            </li>
                            <li :class="{ 'requirement-met': passwordRequirements.uppercase }">
                                <span class="material-icons">{{ passwordRequirements.uppercase ? 'check_circle' :
                                    'radio_button_unchecked' }}</span>
                                包含大写字母
                            </li>
                            <li :class="{ 'requirement-met': passwordRequirements.lowercase }">
                                <span class="material-icons">{{ passwordRequirements.lowercase ? 'check_circle' :
                                    'radio_button_unchecked' }}</span>
                                包含小写字母
                            </li>
                            <li :class="{ 'requirement-met': passwordRequirements.number }">
                                <span class="material-icons">{{ passwordRequirements.number ? 'check_circle' :
                                    'radio_button_unchecked' }}</span>
                                包含数字
                            </li>
                        </ul>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-ghost" @click="resetForm">
                            重置
                        </button>
                        <button type="submit" class="btn btn-primary"
                            :disabled="isChangingPassword || !isPasswordValid || !isPasswordMatch">
                            <span v-if="isChangingPassword">修改中...</span>
                            <span v-else>修改密码</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 消息提示 -->
        <div v-if="message" class="snackbar" :class="`snackbar-${message.type}`">
            {{ message.text }}
            <button class="snackbar-close" @click="message = ''">
                <span class="material-icons">close</span>
            </button>
        </div>

    </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import axios from 'axios'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'

// 状态
const isChangingPassword = ref(false)
const message = ref('')

// 密码表单
const passwordForm = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
})

// 计算属性
const isPasswordMatch = computed(() => {
    return passwordForm.newPassword === passwordForm.confirmPassword
})

const isPasswordValid = computed(() => {
    return passwordForm.newPassword.length >= 6
})

const passwordRequirements = computed(() => {
    const password = passwordForm.newPassword
    return {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password)
    }
})

const passwordStrength = computed(() => {
    const requirements = passwordRequirements.value
    const metRequirements = Object.values(requirements).filter(Boolean).length

    if (metRequirements === 0 || metRequirements === 1) return 'weak'
    if (metRequirements === 2) return 'medium'
    return 'strong'
})

const passwordStrengthClass = computed(() => {
    return `strength-${passwordStrength.value}`
})

const passwordStrengthText = computed(() => {
    switch (passwordStrength.value) {
        case 'weak':
            return '弱'
        case 'medium':
            return '中等'
        case 'strong':
            return '强'
        default:
            return ''
    }
})

// 修改密码
const changePassword = async () => {
    if (!isPasswordValid.value || !isPasswordMatch.value) {
        showMessage('请检查新密码输入', 'error')
        return
    }

    try {
        isChangingPassword.value = true

        await axios.put('/api/users/password/me', {
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
        })

        // 清空密码表单
        resetForm()

        showMessage('密码修改成功', 'success')
    } catch (error: any) {
        console.error('Failed to change password:', error)
        showMessage(error.response?.data?.error || '修改密码失败', 'error')
    } finally {
        isChangingPassword.value = false
    }
}

// 重置表单
const resetForm = () => {
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
}

// 显示消息
const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    message.value = { text, type }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.password-container {
    max-width: 600px;
    margin: 0 auto;
}

.password-card {
    background-color: var(--card-bg);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 32px;
    width: 100%;
}

.password-form {
    .form-group {
        margin-bottom: 24px;

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }

        input {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 16px;

            &:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
            }
        }
    }

    .password-strength {
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 8px;

        .strength-bar {
            flex: 1;
            height: 4px;
            background-color: var(--border-color);
            border-radius: 2px;
            overflow: hidden;

            .strength-fill {
                height: 100%;
                border-radius: 2px;
                transition: width 0.3s, background-color 0.3s;
                width: 33%;

                &.strength-weak {
                    background-color: var(--danger-color);
                }

                &.strength-medium {
                    background-color: var(--warning-color);
                    width: 66%;
                }

                &.strength-strong {
                    background-color: var(--success-color);
                    width: 100%;
                }
            }
        }

        .strength-text {
            font-size: 12px;
            font-weight: 500;
            min-width: 30px;
        }
    }

    .password-mismatch {
        margin-top: 8px;
        color: var(--danger-color);
        font-size: 14px;
    }

    .password-requirements {
        margin: 24px 0;
        padding: 16px;
        background-color: var(--hover-bg);
        border-radius: 8px;

        .requirements-title {
            margin-bottom: 12px;
            font-weight: 500;
            font-size: 14px;
        }

        ul {
            margin: 0;
            padding: 0;
            list-style: none;

            li {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 14px;
                color: var(--text-muted);

                &.requirement-met {
                    color: var(--success-color);
                }

                .material-icons {
                    font-size: 16px;
                }
            }
        }
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
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

// 响应式设计
@media (max-width: 768px) {
    .password-container {
        padding: 16px;
    }

    .password-card {
        padding: 24px 16px;
    }
}
</style>
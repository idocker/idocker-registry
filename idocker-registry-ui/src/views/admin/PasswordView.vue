<template>
    <ManagementLayout>
        <div class="password-container">
            <div class="password-card">
                <form @submit.prevent="changePassword" class="password-form">
                    <div class="form-group">
                        <label for="currentPassword">{{ $t('password.currentPassword') }}</label>
                        <input id="currentPassword" type="password" v-model="passwordForm.currentPassword"
                            :disabled="isChangingPassword" required />
                    </div>

                    <div class="form-group">
                        <label for="newPassword">{{ $t('password.newPassword') }}</label>
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
                        <label for="confirmPassword">{{ $t('password.confirmPassword') }}</label>
                        <input id="confirmPassword" type="password" v-model="passwordForm.confirmPassword"
                            :disabled="isChangingPassword" required />
                        <div v-if="passwordForm.confirmPassword && !isPasswordMatch" class="password-mismatch">
                            {{ $t('password.passwordMismatch') }}
                        </div>
                    </div>

                    <div class="password-requirements">
                        <p class="requirements-title">{{ $t('password.passwordRequirements') }}</p>
                        <ul>
                            <li :class="{ 'requirement-met': passwordRequirements.length }">
                                <span class="material-icons">{{ passwordRequirements.length ? 'check_circle' :
                                    'radio_button_unchecked' }}</span>
                                {{ $t('password.requirementLength') }}
                            </li>
                            <li :class="{ 'requirement-met': passwordRequirements.special }">
                                <span class="material-icons">{{ passwordRequirements.special ? 'check_circle' :
                                    'radio_button_unchecked' }}</span>
                                {{ $t('password.requirementSpecial') }}
                            </li>
                        </ul>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-ghost" @click="resetForm">
                            {{ $t('common.reset') }}
                        </button>
                        <button type="submit" class="btn btn-primary"
                            :disabled="isChangingPassword || !isPasswordValid || !isPasswordMatch">
                            <span v-if="isChangingPassword">{{ $t('password.changing') }}...</span>
                            <span v-else>{{ $t('password.changePassword') }}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 消息提示 -->
        <div v-if="message" class="snackbar" :class="`snackbar-${message.type}`">
            {{ message.text }}
                <button class="snackbar-close" @click="message = null">
                <span class="material-icons">close</span>
            </button>
        </div>

    </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'
import authService from '@/services/auth.service'
import type { Message } from '@/types'

const { t } = useI18n()

// State
const isChangingPassword = ref(false)
const message = ref<Message | null>(null)

// Password form
const passwordForm = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
})

// Computed properties
const isPasswordMatch = computed(() => {
    return passwordForm.newPassword === passwordForm.confirmPassword
})

// Password must be at least 6 chars and contain at least one special character
// (no uppercase/lowercase/digit requirement)
const hasSpecialCharacter = (password: string) => /[\p{P}\p{S}]/u.test(password)

const isPasswordValid = computed(() => {
    return passwordForm.newPassword.length >= 6 && hasSpecialCharacter(passwordForm.newPassword)
})

const passwordRequirements = computed(() => {
    const password = passwordForm.newPassword
    return {
        length: password.length >= 6,
        special: hasSpecialCharacter(password)
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
            return t('password.strengthWeak')
        case 'medium':
            return t('password.strengthMedium')
        case 'strong':
            return t('password.strengthStrong')
        default:
            return ''
    }
})

// 修改密码
const changePassword = async () => {
    if (!isPasswordValid.value || !isPasswordMatch.value) {
        showMessage(t('password.checkPasswordInput'), 'error')
        return
    }

    try {
        isChangingPassword.value = true

        const response = await authService.changePassword({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
        })
        
        if (response.success) {
            // Clear password form
            resetForm()
            showMessage(t('password.passwordChanged'), 'success')
        } else {
            showMessage(response.message || t('password.changePasswordFailed'), 'error')
        }
    } catch (error: any) {
        console.error('Failed to change password:', error)
        showMessage(error.response?.data?.error || t('password.changePasswordFailed'), 'error')
    } finally {
        isChangingPassword.value = false
    }
}

// Reset form
const resetForm = () => {
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
}

// Show message
const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    message.value = { text, type } as Message
    setTimeout(() => {
        message.value = null
    }, 3000)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.password-container {
    //max-width: 600px;
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
    max-width: 400px;
    align-items: center;
    margin: 0 auto;

    .form-group {
        margin-bottom: 24px;

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }

        input[type="password"] {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: 1px solid var(--border-color);
            background-color: var(--input-bg);
            border-radius: var(--border-radius);
            color: var(--input-color);

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
            height: 1px;
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
        background-color: var(--hover-background);
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
                color: var(--neutral-text);

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
    .password-container {
        padding: 16px;
    }

    .password-card {
        padding: 24px 16px;
    }
}
</style>
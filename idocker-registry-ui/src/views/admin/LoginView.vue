<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>{{ $t('loginPage.title') }}</h1>
        <p>{{ $t('loginPage.signInToManage') }}</p>
      </div>

      <!-- 会话失效提示：仅当因过期/401/其他标签页登出而被踢回时显示；
           首次访问受保护页不会置标记，因此这里不会出现。 -->
      <div v-if="sessionExpiredHint" class="session-expired-hint" role="status">
        <span class="material-icons" aria-hidden="true">info</span>
        <span>{{ $t('loginPage.sessionExpiredHint') }}</span>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">{{ $t('loginPage.username') }}</label>
          <input
            id="username"
            type="text"
            v-model="loginForm.username"
            :placeholder="$t('loginPage.enterUsername')"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">{{ $t('loginPage.password') }}</label>
          <input
            id="password"
            type="password"
            v-model="loginForm.password"
            :placeholder="$t('loginPage.enterPassword')"
            required
          />
        </div>

        <div class="form-group">
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
            <span v-if="isLoading">{{ $t('loginPage.signInText') }}</span>
            <span v-else>{{ $t('loginPage.signInButton') }}</span>
          </button>
        </div>
      </form>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const error = ref('')

// 进入页面时快照一次：提示在本次停留期间保持显示，
// 同时把标记消费掉，用户刷新登录页不会再被重复提醒。
// 注意只清标记，不清 loginRedirectPath（登录后还要靠它回跳）。
const sessionExpiredHint = ref(false)
onMounted(() => {
  sessionExpiredHint.value = authStore.sessionExpired
  if (authStore.sessionExpired) {
    authStore.clearSessionExpired()
  }
})

const loginForm = reactive({
  username: '',
  password: '',
  ldapAuth: false
})

const handleLogin = async () => {
  try {
    isLoading.value = true
    error.value = ''

    // 用户已主动登录，过期的提示不再需要
    authStore.clearSessionExpired()

    await authStore.login(loginForm)

    // 优先级：被踢回前的原页面 → URL 上的 redirect 参数 → 前端首页。
    // 默认落到 `/`（镜像列表）而不是管理页：登录后第一眼应该是能用的功能，
    // 管理页是二级入口。
    const redirectPath = authStore.loginRedirectPath ||
                     router.currentRoute.value.query.redirect as string ||
                     '/'

    // Clear redirect path
    authStore.loginRedirectPath = ''

    router.push(redirectPath)
  } catch (err: any) {
    error.value = err.message || t('loginPage.loginFailed')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  //background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 8px;
  }
  
  p {
    color: var(--text-secondary);
    font-size: 16px;
  }
}

// 会话失效提示（仅过期/401 踢回时出现，见 script 里的 sessionExpiredHint）
// 文字用 --primary-text 而非 --text-secondary：后者在暗色卡片上
// 对比度约 2.8:1，低于 WCAG AA；这是告知用户“为何被踢回”的必要信息，
// 不应比正文更难读。
.session-expired-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 20px;
  padding: 10px 12px;
  border-left: 3px solid var(--warning-color);
  border-radius: var(--border-radius);
  background: var(--hover-background);
  color: var(--primary-text);
  font-size: 0.875rem;
  line-height: 1.5;

  .material-icons {
    flex: 0 0 auto;
    font-size: 18px;
    color: var(--warning-color);
  }
}

.login-form {
  .form-group {
    margin-bottom: 20px;
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-color);
    }
    input[type="text"],
    input[type="password"] {

      background-color: var(--input-bg);
    }
    
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      background-color: var(--input-bg);
      
      &:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
      }
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      
      input[type="checkbox"] {
        width: auto;
        margin-right: 8px;
      }
    }
  }
  
  .btn {
    width: 100%;
    padding: 12px;
    margin-top: 20px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &.btn-primary {
      background-color: #3498db;
      color: white;
      
      &:hover:not(:disabled) {
        background-color: #2980b9;
      }
      
      &:disabled {
        background-color: #bdc3c7;
        cursor: not-allowed;
      }
    }
  }
}

.login-actions {
  text-align: center;
  margin-top: 20px;
  
  .link {
    color: #3498db;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.error-message {
  margin-top: 20px;
  padding: 12px;
  background-color: #fee;
  border-left: 4px solid #e74c3c;
  color: #e74c3c;
  border-radius: 4px;
}

</style>
<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>{{ $t('loginPage.title') }}</h1>
        <p>{{ $t('loginPage.signInToManage') }}</p>
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
          <label class="checkbox-label">
            <input type="checkbox" v-model="loginForm.ldapAuth" />
            {{ $t('loginPage.useLdapAuth') }}
          </label>
        </div>

        <div class="form-group">
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
            <span v-if="isLoading">{{ $t('loginPage.signInText') }}</span>
            <span v-else>{{ $t('loginPage.signInButton') }}</span>
          </button>
        </div>

        <div class="login-actions">
          <router-link to="/register" class="link">{{ $t('loginPage.createAccount') }}</router-link>
        </div>
      </form>

      <div v-if="showLoginPrompt" class="login-prompt">
        <p>{{ $t('loginPage.loginPrompt') }}</p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const error = ref('')

// 计算属性：是否显示登录提示
const showLoginPrompt = computed(() => {
  return authStore.showLoginPrompt && authStore.loginRedirectPath
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

    // 重置登录提示状态
    authStore.showLoginPrompt = false

    await authStore.login(loginForm)

    // 检查是否有重定向地址，优先使用存储的路径
    const redirectPath = authStore.loginRedirectPath ||
                     router.currentRoute.value.query.redirect as string ||
                     '/admin/profile'

    // 清除重定向路径
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 8px;
  }
  
  p {
    color: #7f8c8d;
    font-size: 16px;
  }
}

.login-form {
  .form-group {
    margin-bottom: 20px;
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #34495e;
    }
    
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      
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

.login-prompt {
  margin-top: 20px;
  padding: 12px;
  background-color: #e8f4fd;
  border-left: 4px solid #3498db;
  color: #34495e;
  border-radius: 4px;
  
  p {
    margin: 0;
    font-weight: 500;
  }
}
</style>
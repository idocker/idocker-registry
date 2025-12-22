<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal auth-modal">
      <div class="modal-header">
        <h3 class="modal-title">Registry Authentication</h3>
        <button class="btn btn-ghost btn-icon modal-close" @click="$emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="auth-info">
          <p>This registry requires authentication. Please provide your credentials to continue.</p>
          
          <div class="server-info">
            <div class="server-url">
              <strong>Server:</strong> {{ realm }}
            </div>
            
            <div class="service-info">
              <strong>Service:</strong> {{ service }}
            </div>
            
            <div class="scope-info">
              <strong>Scope:</strong> {{ scope }}
            </div>
          </div>
        </div>
        
        <div class="auth-form">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input
              type="text"
              class="form-input"
              v-model="credentials.username"
              placeholder="Enter your username"
              @keyup.enter="handleAuthenticate"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input
              type="password"
              class="form-input"
              v-model="credentials.password"
              placeholder="Enter your password"
              @keyup.enter="handleAuthenticate"
            />
          </div>
          
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          @click="handleAuthenticate"
          :disabled="isAuthenticating || !credentials.username || !credentials.password"
        >
          <span v-if="isAuthenticating" class="spinner small"></span>
          Authenticate
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AuthenticationInfo } from '@/types'

interface Props {
  realm?: string
  service?: string
  scope?: string
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  authenticated: [token: string]
}>()

// Form state
const credentials = ref({
  username: '',
  password: ''
})

const isAuthenticating = ref(false)
const errorMessage = ref('')

// Watch for changes in props to reset form
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Reset form when dialog opens
    credentials.value = { username: '', password: '' }
    errorMessage.value = ''
    isAuthenticating.value = false
  }
})

const handleAuthenticate = async () => {
  if (!credentials.value.username || !credentials.value.password) {
    errorMessage.value = 'Please enter both username and password'
    return
  }
  
  if (!props.realm) {
    errorMessage.value = 'Authentication realm is missing'
    return
  }
  
  isAuthenticating.value = true
  errorMessage.value = ''
  
  try {
    // Create Basic Auth header
    const basicAuth = btoa(`${credentials.value.username}:${credentials.value.password}`)
    
    // Request token from authentication server
    const authUrl = new URL(props.realm)
    authUrl.searchParams.set('service', props.service || '')
    authUrl.searchParams.set('scope', props.scope || '')
    
    const response = await fetch(authUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`)
    }
    
    const tokenData = await response.json()
    
    // Extract token from response
    const token = tokenData.token || tokenData.access_token
    
    if (!token) {
      throw new Error('No token received from authentication server')
    }
    
    // Emit success
    emit('authenticated', token)
    emit('close')
  } catch (error) {
    console.error('Authentication error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Authentication failed'
  } finally {
    isAuthenticating.value = false
  }
}
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal-backdrop);
  @include center-content();
  
  .modal {
    background-color: var(--card-background);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-3);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
    
    .auth-modal {
      .modal-header {
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        
        .modal-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 500;
        }
        
        .modal-close {
          color: var(--neutral-text);
        }
      }
      
      .modal-body {
        padding: 16px;
        
        .auth-info {
          margin-bottom: 24px;
          
          p {
            margin: 0 0 16px 0;
            color: var(--primary-text);
            line-height: 1.5;
          }
          
          .server-info {
            background-color: var(--hover-background);
            border-radius: var(--border-radius);
            padding: 12px;
            
            .server-url,
            .service-info,
            .scope-info {
              margin-bottom: 8px;
              font-size: 14px;
              
              &:last-child {
                margin-bottom: 0;
              }
              
              strong {
                color: var(--primary-text);
              }
            }
          }
        }
        
        .auth-form {
          .form-group {
            margin-bottom: 16px;
            
            .form-label {
              display: block;
              margin-bottom: 4px;
              font-weight: 500;
              color: var(--primary-text);
            }
            
            .form-input {
              width: 100%;
              padding: 8px 12px;
              border: 1px solid var(--border-color);
              border-radius: var(--border-radius);
              background-color: var(--background);
              color: var(--primary-text);
              
              &:focus {
                outline: none;
                border-color: var(--accent-text);
              }
            }
          }
          
          .error-message {
            color: var(--error-color);
            font-size: 14px;
            margin-top: 8px;
            padding: 8px 12px;
            background-color: rgba(244, 67, 54, 0.1);
            border-radius: var(--border-radius);
          }
        }
      }
      
      .modal-footer {
        padding: 16px;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    }
  }
}
</style>
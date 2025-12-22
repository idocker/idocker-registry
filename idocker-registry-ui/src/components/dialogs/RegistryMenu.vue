<template>
  <div class="registry-menu-container">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Registry Settings</h3>
          <button class="btn btn-ghost btn-icon modal-close" @click="$emit('close')">
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="tabs">
            <button
              class="tab-button"
              :class="{ active: activeTab === 'current' }"
              @click="activeTab = 'current'"
            >
              Current Registry
            </button>
            
            <button
              class="tab-button"
              :class="{ active: activeTab === 'add' }"
              @click="activeTab = 'add'"
            >
              Add Registry
            </button>
            
            <button
              class="tab-button"
              :class="{ active: activeTab === 'saved' }"
              @click="activeTab = 'saved'"
            >
              Saved Registries
            </button>
          </div>
          
          <!-- Current Registry Tab -->
          <div v-if="activeTab === 'current'" class="tab-content">
            <div class="form-group">
              <label class="form-label">Registry URL</label>
              <input
                type="text"
                class="form-input"
                v-model="currentRegistryUrl"
                placeholder="https://registry.example.com"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Registry Name</label>
              <input
                type="text"
                class="form-input"
                v-model="currentRegistryName"
                placeholder="Display name for this registry"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Pull URL</label>
              <input
                type="text"
                class="form-input"
                v-model="currentPullUrl"
                placeholder="URL used for docker pull commands"
              />
              <div class="form-hint">
                This is the URL that will be shown in the docker pull commands.
                Leave empty to use the registry URL.
              </div>
            </div>
            
            <button class="btn btn-primary" @click="applyCurrentRegistry">
              Apply Changes
            </button>
          </div>
          
          <!-- Add Registry Tab -->
          <div v-if="activeTab === 'add'" class="tab-content">
            <div class="form-group">
              <label class="form-label">Registry URL</label>
              <input
                type="text"
                class="form-input"
                v-model="newRegistryUrl"
                placeholder="https://registry.example.com"
              />
            </div>
            
            <button class="btn btn-primary" @click="addRegistry">
              Add Registry
            </button>
          </div>
          
          <!-- Saved Registries Tab -->
          <div v-if="activeTab === 'saved'" class="tab-content">
            <div v-if="registryServersList.length === 0" class="empty-state">
              <span class="material-icons">bookmark_border</span>
              <p>No saved registries</p>
            </div>
            
            <div v-else class="registry-list">
              <div
                v-for="registry in registryServersList"
                :key="registry"
                class="registry-item"
              >
                <div class="registry-info">
                  <div class="registry-name">{{ registry }}</div>
                </div>
                <div class="registry-actions">
                  <button
                    class="btn btn-ghost btn-icon"
                    @click="switchToRegistry(registry)"
                    title="Switch to this registry"
                  >
                    <span class="material-icons">login</span>
                  </button>
                  
                  <button
                    v-if="!isDefaultRegistry(registry)"
                    class="btn btn-ghost btn-icon delete-button"
                    @click="confirmDeleteRegistry(registry)"
                    title="Remove this registry"
                  >
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Delete confirmation dialog -->
    <ConfirmationDialog
      v-if="showDeleteDialog"
      title="Remove Registry"
      :message=registryDeleteMsg
      @confirm="deleteRegistry"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRegistryStore } from '@/stores/registry'
import { stripHttps } from '@/utils/helpers'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'

const emit = defineEmits<{
  close: []
  registryChanged: [url: string]
  notify: [message: string]
}>()

const registryStore = useRegistryStore()

// Tab management
const activeTab = ref('current')

// Current registry form
const currentRegistryUrl = ref('')
const currentRegistryName = ref('')
const currentPullUrl = ref('')

// New registry form
const newRegistryUrl = ref('')

// Delete registry confirmation
const showDeleteDialog = ref(false)
const registryToDelete = ref('')

// Computed properties
const registryServersList = computed(() => registryStore.registryServersList)

let registryDeleteMsg = '';

// Initialize form values
watch(
  () => [
    registryStore.registryUrl,
    registryStore.registryName,
    registryStore.pullUrl
  ],
  () => {
    currentRegistryUrl.value = registryStore.registryUrl
    currentRegistryName.value = registryStore.registryName
    currentPullUrl.value = registryStore.pullUrl
  },
  { immediate: true }
)

// Initialize delete message
watch(
  () => registryToDelete.value,
  () => {
    registryDeleteMsg = `Are you sure you want to delete registry [${registryToDelete.value}]?`
  },
  { immediate: true }
)

// Methods
const applyCurrentRegistry = () => {
  if (!currentRegistryUrl.value) {
    emit('notify', 'Please enter a registry URL')
    return
  }
  
  registryStore.setRegistryUrl(currentRegistryUrl.value)
  
  if (currentRegistryName.value) {
    registryStore.setRegistryName(currentRegistryName.value)
  }
  
  if (currentPullUrl.value) {
    registryStore.setPullUrl(currentPullUrl.value)
  }
  
  emit('registryChanged', currentRegistryUrl.value)
  emit('close')
  emit('notify', 'Registry settings applied')
}

const addRegistry = () => {
  if (!newRegistryUrl.value) {
    emit('notify', 'Please enter a registry URL')
    return
  }
  
  registryStore.addRegistryServer(newRegistryUrl.value)
  newRegistryUrl.value = ''
  activeTab.value = 'saved'
  emit('notify', 'Registry added to your saved list')
}

const isDefaultRegistry = (url: string) => {
  return registryStore.defaultRegistries.includes(url)
}

const switchToRegistry = (url: string) => {
  registryStore.setRegistryUrl(url)
  emit('registryChanged', url)
  emit('close')
  emit('notify', `Switched to registry: ${stripHttps(url)}`)
}

const confirmDeleteRegistry = (url: string) => {
  registryToDelete.value = url
  registryDeleteMsg = `Are you sure you want to delete registry [${url}]?`
  showDeleteDialog.value = true
}

const deleteRegistry = () => {
  showDeleteDialog.value = false
  registryStore.removeRegistryServer(registryToDelete.value)
  emit('notify', `Registry removed: ${stripHttps(registryToDelete.value)}`)
}
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.registry-menu-container {
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
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow: auto;
      
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
        
        .tabs {
          display: flex;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
          
          .tab-button {
            padding: 8px 16px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            color: var(--neutral-text);
            font-weight: 500;
            cursor: pointer;
            transition: all var(--transition-fast);
            
            &:hover {
              color: var(--primary-text);
            }
            
            &.active {
              color: var(--accent-text);
              border-bottom-color: var(--accent-text);
            }
          }
        }
        
        .tab-content {
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
            
            .form-hint {
              font-size: 12px;
              color: var(--neutral-text);
              margin-top: 4px;
            }
          }
          
          .empty-state {
            text-align: center;
            padding: 32px;
            color: var(--neutral-text);
            
            .material-icons {
              font-size: 48px;
              margin-bottom: 8px;
            }
            
            p {
              margin: 0;
            }
          }
          
          .registry-list {
            .registry-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px;
              background-color: var(--hover-background);
              border-radius: var(--border-radius);
              margin-bottom: 8px;
              
              .registry-info {
                .registry-name {
                  font-weight: 500;
                  color: var(--primary-text);
                }
              }
              
              .registry-actions {
                display: flex;
                gap: 4px;
                
                .delete-button {
                  color: var(--error-color);
                  
                  &:hover {
                    background-color: rgba(244, 67, 54, 0.1);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
</style>
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal dockerfile-modal">
      <div class="modal-header">
        <h3 class="modal-title">Dockerfile</h3>
        <button class="btn btn-ghost btn-icon modal-close" @click="$emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="dockerfile-container">
          <pre class="dockerfile-content">{{ dockerfileContent }}</pre>
        </div>
        
        <div class="copy-button-container">
          <CopyToClipboardButton
            :text="dockerfileContent"
            @notify="handleNotification"
            text-label="Copy Dockerfile"
          />
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayerInfo } from '@/types'
import CopyToClipboardButton from '@/components/tag-list/CopyToClipboardButton.vue'

interface Props {
  layers: LayerInfo[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  notify: [message: string]
}>()

// Generate Dockerfile content from layers
const dockerfileContent = computed(() => {
  if (!props.layers || props.layers.length === 0) {
    return '# No Dockerfile information available'
  }
  
  let dockerfile = '# Generated from image layers\n'
  dockerfile += '# This is a reconstruction based on the layer information\n\n'
  
  // This is a simplified Dockerfile reconstruction
  // In a real implementation, you would need to decode the layers to get the actual commands
  dockerfile += 'FROM scratch\n\n'
  
  // Add comments for each layer
  props.layers.forEach((layer, index) => {
    dockerfile += `# Layer ${index + 1}\n`
    dockerfile += `# Size: ${formatBytes(layer.size)}\n`
    dockerfile += `# Media Type: ${layer.mediaType}\n`
    
    if (layer.digest) {
      dockerfile += `# Digest: ${layer.digest}\n`
    }
    
    dockerfile += '\n'
  })
  
  return dockerfile
})

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleNotification = (message: string) => {
  emit('notify', message)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

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
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
    
    .dockerfile-modal {
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
        
        .dockerfile-container {
          background-color: #282c34;
          border-radius: var(--border-radius);
          padding: 16px;
          overflow: auto;
          max-height: 60vh;
          
          .dockerfile-content {
            color: #abb2bf;
            font-family: 'Roboto Mono', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
          }
        }
        
        .copy-button-container {
          margin-top: 16px;
          text-align: right;
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
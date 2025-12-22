<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="btn btn-ghost btn-icon modal-close" @click="$emit('cancel')">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <p>{{ message }}</p>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">
          Cancel
        </button>
        <button class="btn btn-danger" @click="$emit('confirm')">
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  message: string
}

defineProps<Props>()

defineEmits<{
  confirm: []
  cancel: []
}>()
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
    max-width: 500px;
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
      
      p {
        margin: 0;
        color: var(--primary-text);
        line-height: 1.5;
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
</style>
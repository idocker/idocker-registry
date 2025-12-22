<template>
  <transition name="snackbar">
    <div v-if="isVisible" class="snackbar" :class="snackbarClass">
      <span class="material-icons snackbar-icon">
        {{ snackbarIcon }}
      </span>
      <span class="snackbar-message">{{ message }}</span>
      <button
        v-if="closable"
        class="btn btn-ghost btn-icon snackbar-close"
        @click="close"
      >
        <span class="material-icons">close</span>
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Props {
  message: string
  isError?: boolean
  duration?: number
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isError: false,
  duration: 4000,
  closable: true
})

const emit = defineEmits<{
  close: []
}>()

const isVisible = ref(false)

const snackbarClass = computed(() => {
  return {
    error: props.isError,
    success: !props.isError
  }
})

const snackbarIcon = computed(() => {
  if (props.isError) {
    return 'error'
  } else {
    return 'check_circle'
  }
})

let timer: number | undefined

watch(() => props.message, (newValue) => {
  if (newValue) {
    showSnackbar()
  }
})

onMounted(() => {
  if (props.message) {
    showSnackbar()
  }
})

const showSnackbar = () => {
  // Clear any existing timer
  if (timer) {
    clearTimeout(timer)
  }
  
  // Show the snackbar
  isVisible.value = true
  
  // Set auto-close timer
  if (props.duration && props.duration > 0) {
    timer = window.setTimeout(() => {
      isVisible.value = false
    }, props.duration)
  }
}

const close = () => {
  isVisible.value = false
  emit('close')
  
  if (timer) {
    clearTimeout(timer)
    timer = undefined
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.snackbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--primary-text);
  color: var(--background);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-2);
  z-index: var(--z-toast);
  max-width: 90%;
  
  &.error {
    background-color: var(--error-color);
  }
  
  &.success {
    background-color: var(--success-color);
  }
  
  .snackbar-icon {
    font-size: 20px;
  }
  
  .snackbar-message {
    flex: 1;
    font-weight: 500;
  }
  
  .snackbar-close {
    color: var(--background);
    margin-left: 8px;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }
}

// Transitions
.snackbar-enter-active,
.snackbar-leave-active {
  transition: all 0.3s ease;
}

.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translate(-50%, 100%);
}

.snackbar-enter-to,
.snackbar-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
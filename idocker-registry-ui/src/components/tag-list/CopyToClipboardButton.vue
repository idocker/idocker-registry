<template>
  <button
    class="btn btn-ghost btn-icon copy-button"
    @click="copyToClipboard"
    :title="copyButtonTitle"
  >
    <span class="material-icons">{{ copied ? 'check' : 'content_copy' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  text: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  notify: [message: string]
}>()

const copied = ref(false)
const copyTimeout = ref<number>()

const copyButtonTitle = computed(() => {
  return copied.value ? 'Copied!' : `Copy "${props.text}"`
})

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.text)
    
    // Update UI state
    copied.value = true
    
    // Reset after a short delay
    if (copyTimeout.value) {
      clearTimeout(copyTimeout.value)
    }
    
    copyTimeout.value = setTimeout(() => {
      copied.value = false
    }, 2000)
    
    emit('notify', 'Copied to clipboard')
  } catch (error) {
    // Fallback for browsers that don't support clipboard API
    fallbackCopyToClipboard()
  }
}

const fallbackCopyToClipboard = () => {
  const textArea = document.createElement('textarea')
  textArea.value = props.text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    document.execCommand('copy')
    
    // Update UI state
    copied.value = true
    
    // Reset after a short delay
    if (copyTimeout.value) {
      clearTimeout(copyTimeout.value)
    }
    
    copyTimeout.value = setTimeout(() => {
      copied.value = false
    }, 2000)
    
    emit('notify', 'Copied to clipboard')
  } catch (error) {
    emit('notify', 'Failed to copy to clipboard')
  }
  
  document.body.removeChild(textArea)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.copy-button {
  transition: all var(--transition-fast);
  
  &:hover {
    color: var(--accent-text);
  }
  
  &:active {
    transform: scale(0.9);
  }
  
  &.copied {
    color: var(--success-color);
  }
}
</style>
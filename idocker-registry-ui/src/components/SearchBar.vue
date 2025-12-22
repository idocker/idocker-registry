<template>
  <div class="search-bar">
    <span class="material-icons search-icon">search</span>
    <input
      type="text"
      class="search-input"
      v-model="searchQuery"
      placeholder="Search repositories..."
      @keyup.enter="handleSearch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  search: [query: string]
}>()

const searchQuery = ref('')

// Debounce search input
let debounceTimer: number | undefined

watch(searchQuery, (newValue) => {
  clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    handleSearch()
  }, 300)
})

const handleSearch = () => {
  emit('search', searchQuery.value)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.search-bar {
  position: relative;
  width: 100%;
  max-width: 400px;
  
  .search-input {
    width: 100%;
    padding: 8px 12px 8px 40px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: var(--background);
    color: var(--primary-text);
    
    &:focus {
      outline: none;
      border-color: var(--accent-text);
    }
    
    &::placeholder {
      color: var(--neutral-text);
    }
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--neutral-text);
    pointer-events: none;
  }
}
</style>
<template>
  <div class="pagination">
    <button
      class="pagination-item"
      :class="{ 'disabled': currentPage <= 1 }"
      @click="goToPage(currentPage - 1)"
      :disabled="currentPage <= 1"
    >
      <span class="material-icons">chevron_left</span>
    </button>
    
    <template v-for="(page, index) in paginationItems" :key="index">
      <button
        v-if="page.page !== null"
        class="pagination-item"
        :class="{ 'active': page.page === currentPage }"
        @click="goToPage(page.page)"
      >
        {{ page.label }}
      </button>
      
      <span
        v-else
        class="pagination-ellipsis"
      >
        ...
      </span>
    </template>
    
    <button
      class="pagination-item"
      :class="{ 'disabled': currentPage >= totalPages }"
      @click="goToPage(currentPage + 1)"
      :disabled="currentPage >= totalPages"
    >
      <span class="material-icons">chevron_right</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getPageLabels } from '@/utils/helpers'

interface Props {
  currentPage: number
  totalPages: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  pageChanged: [page: number]
}>()

// Generate pagination items with ellipsis for large page counts
const paginationItems = computed(() => {
  return getPageLabels(props.currentPage, props.totalPages)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('pageChanged', page)
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 16px 0;
  
  .pagination-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    transition: all var(--transition-fast);
    background-color: transparent;
    border: none;
    color: var(--primary-text);
    
    &:hover:not(.disabled) {
      background-color: var(--hover-background);
    }
    
    &.active {
      background-color: var(--accent-text);
      color: white;
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .material-icons {
      font-size: 20px;
    }
  }
  
  .pagination-ellipsis {
    padding: 0 8px;
    color: var(--neutral-text);
    font-weight: bold;
  }
}
</style>
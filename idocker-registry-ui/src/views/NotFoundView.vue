<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-icon">
        <span class="material-icons">sentiment_very_dissatisfied</span>
      </div>
      
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      
      <div class="actions">
        <button class="btn btn-primary" @click="goHome">
          <span class="material-icons">home</span>
          Go Home
        </button>
        <button class="btn btn-secondary" @click="goBack">
          <span class="material-icons">arrow_back</span>
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push({ name: 'catalog' })
}

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.not-found-container {
  @include center-content();
  min-height: 80vh;
  flex-direction: column;
  
  .not-found-content {
    text-align: center;
    max-width: 500px;
    
    .error-icon {
      margin-bottom: 16px;
      
      .material-icons {
        font-size: 80px;
        color: var(--neutral-text);
      }
    }
    
    h1 {
      font-size: 64px;
      margin: 0 0 16px 0;
      color: var(--primary-text);
    }
    
    h2 {
      font-size: 24px;
      margin: 0 0 16px 0;
      color: var(--primary-text);
    }
    
    p {
      color: var(--neutral-text);
      margin: 0 0 32px 0;
      line-height: 1.5;
    }
    
    .actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      
      .btn {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }
}
</style>
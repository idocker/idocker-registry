<template>
  <footer class="app-footer">
    <ul class="footer-links">
      <li class="foot-left">
        iDocker Registry v{{ version }}.
      </li>
      <li class="foot-right">
        Hyperlinked.cn All Rights Reserved © 2025-2026.
      </li>
    </ul>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Import version from package.json
const version = ref('0.1.0') // Default version

onMounted(async () => {
  try {
    // Try to get the version from package.json
    const response = await fetch('/package.json')
    if (response.ok) {
      const packageData = await response.json()
      version.value = packageData.version || '0.1.0'
    }
  } catch (error) {
    console.warn('Could not load version information:', error)
    // Fallback to default version
    version.value = '0.1.0'
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
@use '@/styles/mixins.scss' as *;

.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;

  .footer-logo {
    color: var(--footer-text);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      color: var(--header-accent-text);
    }
  }

  .footer-links {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
    gap: 16px;
    width: 100%;

    li {
      a {
        color: var(--footer-neutral-text);
        text-decoration: none;
        font-size: 14px;

        &:hover {
          color: var(--footer-text);
        }
      }
    }

    li .foot-left {
      float: left;
      color: var(--footer-text);
      text-align: left;
    }

    li .foot-right {
      float: right;
      color: var(--footer-text);
      text-align: right;
    }
  }
}

@media (max-width: 768px) {
  .foot-right {
    display: none;
    width: 0px;
  }

  .foot-left {
    display: block;
    text-align: center;
    width: 100%;
    margin: 0 auto;
  }
}
</style>
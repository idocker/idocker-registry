<template>
  <footer class="app-footer">
    <span class="footer-copyright">
      {{ $t('footer.copyright') }} v{{ version }}
    </span>
  </footer>
</template>

<script setup lang="ts">
declare const __APP_VERSION__: string
const version = __APP_VERSION__
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.app-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 20px;

  .footer-copyright {
    color: var(--neutral-text);
    font-size: 12px;
  }
}
</style>
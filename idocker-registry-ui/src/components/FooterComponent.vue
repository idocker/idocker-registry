<template>
  <footer class="app-footer">
    <nav class="footer-links" :aria-label="$t('footer.officialLinks')">
      <a :href="LINKS.github" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="footer-sep" aria-hidden="true">·</span>
      <a :href="LINKS.dockerHub" target="_blank" rel="noopener noreferrer">Docker Hub</a>
      <span class="footer-sep" aria-hidden="true">·</span>
      <a :href="LINKS.website" target="_blank" rel="noopener noreferrer">{{ $t('footer.website') }}</a>
      <span class="footer-sep" aria-hidden="true">·</span>
      <a :href="`mailto:${LINKS.email}`">{{ LINKS.email }}</a>
    </nav>
    <span class="footer-copyright">
      {{ $t('footer.copyright') }} v{{ version }}
    </span>
  </footer>
</template>

<script setup lang="ts">
declare const __APP_VERSION__: string
const version = __APP_VERSION__

/**
 * 官方资源地址：对外发布信息，集中在此处，改地址只需改这一个地方。
 * 与 README「官方地址」、web/ 产品页页脚保持一致。
 */
const LINKS = {
  github: 'https://github.com/idocker/idocker-registry',
  dockerHub: 'https://hub.docker.com/r/idockervip/idocker-registry',
  website: 'https://www.idocker.vip',
  email: 'liu.menjoy@gmail.com'
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding: 12px 20px;

  .footer-links {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;

    a {
      color: var(--footer-neutral-text);
      text-decoration: none;

      &:hover {
        color: #fff;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      &:focus-visible {
        outline: 2px solid var(--footer-neutral-text);
        outline-offset: 2px;
        border-radius: 2px;
      }
    }

    .footer-sep {
      color: var(--footer-neutral-text);
      opacity: 0.5;
    }
  }

  .footer-copyright {
    color: var(--footer-neutral-text);
    font-size: 12px;
  }
}
</style>

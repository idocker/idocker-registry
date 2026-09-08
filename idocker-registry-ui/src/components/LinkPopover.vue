<!--
  LinkPopover
  A "link" action button that shows docker pull/push commands on hover,
  rendered via Teleport + fixed positioning so it is never clipped by
  scrollable/overflow containers. Positions itself inside the viewport,
  flipping upward when there is not enough space below the trigger.
-->
<template>
  <span ref="triggerEl" class="lp-trigger" @mouseenter="show" @mouseleave="scheduleHide">
    <button class="btn btn-ghost btn-small" type="button">
      <span class="material-icons">link</span>
      {{ $t('imageDetail.link') }}
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        class="lp-popover"
        :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide"
      >
        <div class="lp-row">
          <span class="lp-badge pull">pull</span>
          <code class="lp-command" :title="pull">{{ pull }}</code>
          <button class="btn btn-icon btn-ghost lp-copy" :title="$t('imageDetail.copyCommand')" @click="copy(pull)">
            <span class="material-icons">content_copy</span>
          </button>
        </div>
        <div class="lp-row">
          <span class="lp-badge push">push</span>
          <code class="lp-command" :title="push">{{ push }}</code>
          <button class="btn btn-icon btn-ghost lp-copy" :title="$t('imageDetail.copyCommand')" @click="copy(push)">
            <span class="material-icons">content_copy</span>
          </button>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifications } from '@/composables/useNotifications'

const props = defineProps<{
  pull: string
  push: string
}>()

const { t } = useI18n()
const { showInfo, showError } = useNotifications()

const open = ref(false)
const pos = ref({ top: 0, left: 0 })
const triggerEl = ref<HTMLElement | null>(null)
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const EST_POPOVER_WIDTH = 460
const EST_POPOVER_HEIGHT = 92
const GAP = 8

const show = () => {
  clearTimer()
  if (open.value) return
  if (!triggerEl.value) return
  const rect = triggerEl.value.getBoundingClientRect()
  const maxLeft = window.innerWidth - EST_POPOVER_WIDTH - GAP
  const left = Math.max(GAP, Math.min(rect.right - EST_POPOVER_WIDTH, maxLeft))
  const below = rect.bottom + GAP
  const top =
    below + EST_POPOVER_HEIGHT <= window.innerHeight - GAP
      ? below
      : Math.max(GAP, rect.top - EST_POPOVER_HEIGHT - GAP)
  pos.value = { top, left }
  open.value = true
}

const scheduleHide = () => {
  clearTimer()
  hideTimer.value = setTimeout(() => {
    open.value = false
  }, 250)
}

const cancelHide = () => clearTimer()

const clearTimer = () => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value)
    hideTimer.value = null
  }
}

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showInfo(t('success.dataCopied'))
  } catch (err) {
    console.error('Failed to copy:', err)
    showError(t('error.loadFailed'))
  }
}
</script>

<style scoped lang="scss">
.lp-trigger {
  position: relative;
  display: inline-block;
}

.lp-popover {
  position: fixed;
  z-index: 2000;
  width: 440px;
  max-width: calc(100vw - 16px);
  padding: 10px 12px;
  background: var(--card-background, #fff);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.lp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;

  + .lp-row {
    border-top: 1px solid var(--border-color);
  }
}

.lp-badge {
  flex-shrink: 0;
  min-width: 42px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;

  &.pull {
    background: #e3f2fd;
    color: #1565c0;
  }

  &.push {
    background: #e8f5e9;
    color: #2e7d32;
  }
}

.lp-command {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.lp-copy {
  flex-shrink: 0;
}
</style>

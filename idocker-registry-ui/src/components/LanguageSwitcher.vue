<template>
  <div class="language-switcher">
    <button class="language-btn" @click="toggleMenu" :title="$t('common.language')">
      <!-- <span class="material-icons">{{ currentIcon }}</span> -->
      <span>{{ currentLabel }}</span>
    </button>

    <div v-if="showMenu" class="language-menu" @click.self="closeMenu" ref="menuRef">
      <div class="language-menu-content">
        <div class="menu-items">
          <button
            class="menu-item"
            :class="{ active: i18n.locale.value === locale.value }"
            v-for="locale in locales"
            :key="locale.value"
            @click="setLanguage(locale.value)"
          >
            <span class="material-icons">{{ locale.icon }}</span>
            <span>{{ locale.subLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const i18n = useI18n()

const showMenu = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const locales = [
  {
    value: 'zh-CN',
    label: '中',
    subLabel: '简体中文',
    icon: 'translate'
  },
  {
    value: 'en-US',
    label: 'En',
    subLabel: 'English',
    icon: 'language'
  }
]

const currentLabel = computed(() => {
  const current = locales.find(l => l.value === i18n.locale.value)
  return current ? current.label : i18n.locale.value
})

const currentIcon = computed(() => {
  const current = locales.find(l => l.value === i18n.locale.value)
  return current ? current.icon : 'translate'
})

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const setLanguage = (lang: string) => {
  i18n.locale.value = lang
  localStorage.setItem('locale', lang)
  document.documentElement.lang = lang
  closeMenu()
}

// Click outside to close menu
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

const addClickOutsideListener = () => {
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
}

const removeClickOutsideListener = () => {
  document.removeEventListener('click', handleClickOutside)
}

watch(showMenu, (newVal) => {
  if (newVal) {
    addClickOutsideListener()
  } else {
    removeClickOutsideListener()
  }
})

onMounted(() => {
  if (showMenu.value) {
    addClickOutsideListener()
  }
})

onUnmounted(() => {
  removeClickOutsideListener()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.language-switcher {
  position: relative;
  //top: 20px;
}

.language-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background-color: transparent;
  color: var(--header-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  
  .material-icons {
    font-size: 20px;
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.language-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 180px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  color: var(--primary-text);
}

.language-menu-content {
  padding: 8px 0;
}

.menu-items {
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background-color: transparent;
    color: var(--primary-text);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    text-align: left;
    font-weight: 500;
    
    .material-icons {
      font-size: 20px;
      opacity: 0.8;
    }
    
    &:hover {
      background-color: var(--hover-background);
      
      .material-icons {
        opacity: 1;
      }
    }
    
    &:active {
      transform: scale(0.98);
    }
    
    &.active {
      background-color: rgba(92, 136, 255, 0.1);
      color: #5c88ff;
      font-weight: 600;
      
      .material-icons {
        opacity: 1;
      }
    }
  }
}

// Dark theme adjustments
body.dark-theme {
  .language-menu {
    background-color: var(--card-bg);
    color: var(--primary-text);
  }
  
  .menu-items .menu-item {
    color: var(--primary-text);
    
    &:hover {
      background-color: var(--hover-background);
    }
    
    &.active {
      background-color: rgba(92, 136, 255, 0.2);
      color: #7ea1ff;
    }
  }
}
</style>

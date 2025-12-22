/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_REGISTRY_URL: string
  readonly VITE_REGISTRY_TITLE: string
  readonly VITE_PULL_URL: string
  readonly VITE_DELETE_IMAGES: string
  readonly VITE_SHOW_CONTENT_DIGEST: string
  readonly VITE_CATALOG_ELEMENTS_LIMIT: string
  readonly VITE_SINGLE_REGISTRY: string
  readonly VITE_NGINX_PROXY_PASS_URL: string
  readonly VITE_NGINX_LISTEN_PORT: string
  readonly VITE_DEFAULT_REGISTRIES: string
  readonly VITE_READ_ONLY_REGISTRIES: string
  readonly VITE_SHOW_CATALOG_NB_TAGS: string
  readonly VITE_HISTORY_CUSTOM_LABELS: string
  readonly VITE_USE_CONTROL_CACHE_HEADER: string
  readonly VITE_THEME: string
  readonly VITE_TAGLIST_ORDER: string
  readonly VITE_CATALOG_DEFAULT_EXPANDED: string
  readonly VITE_CATALOG_MIN_BRANCHES: string
  readonly VITE_CATALOG_MAX_BRANCHES: string
  readonly VITE_TAGLIST_PAGE_SIZE: string
  readonly VITE_REGISTRY_SECURED: string
  readonly VITE_SHOW_TAG_HISTORY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
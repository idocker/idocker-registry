import { defineStore } from 'pinia'
import type { 
  RegistryConfig, 
  AuthenticationInfo, 
  BearerToken,
  RegistryError,
  SnackbarMessage 
} from '@/types'
import { 
  truthy, 
  falsy, 
  stringToArray, 
  stripHttps,
  getFromStorage, 
  setToStorage,
  removeFromStorage 
} from '@/utils/helpers'

export const useRegistryStore = defineStore('registry', {
  state: () => ({
    // Registry configuration
    registryUrl: '',
    registryName: '',
    pullUrl: '',
    
    // Configuration flags
    deleteImages: falsy(import.meta.env.VITE_DELETE_IMAGES),
    showContentDigest: truthy(import.meta.env.VITE_SHOW_CONTENT_DIGEST),
    catalogElementsLimit: parseInt(import.meta.env.VITE_CATALOG_ELEMENTS_LIMIT || '1000'),
    singleRegistry: truthy(import.meta.env.VITE_SINGLE_REGISTRY),
    readOnlyRegistries: falsy(import.meta.env.VITE_READ_ONLY_REGISTRIES),
    showCatalogNbTags: truthy(import.meta.env.VITE_SHOW_CATALOG_NB_TAGS),
    useControlCacheHeader: truthy(import.meta.env.VITE_USE_CONTROL_CACHE_HEADER),
    theme: (import.meta.env.VITE_THEME as 'light' | 'dark' | 'auto') || 'auto',
    taglistOrder: import.meta.env.VITE_TAGLIST_ORDER || 'alpha-asc;num-desc',
    catalogDefaultExpanded: truthy(import.meta.env.VITE_CATALOG_DEFAULT_EXPANDED),
    catalogMinBranches: parseInt(import.meta.env.VITE_CATALOG_MIN_BRANCHES || '1'),
    catalogMaxBranches: parseInt(import.meta.env.VITE_CATALOG_MAX_BRANCHES || '1'),
    tagsPerPage: parseInt(import.meta.env.VITE_TAGLIST_PAGE_SIZE || '100'),
    isRegistrySecured: truthy(import.meta.env.VITE_REGISTRY_SECURED),
    showTagHistory: truthy(import.meta.env.VITE_SHOW_TAG_HISTORY),
    
    // Default registries list
    defaultRegistries: stringToArray(import.meta.env.VITE_DEFAULT_REGISTRIES || ''),
    historyCustomLabels: stringToArray(import.meta.env.VITE_HISTORY_CUSTOM_LABELS || ''),
    
    // Runtime state
    authToken: '',
    isDarkTheme: false,
    registryServers: [] as string[],
    
    // UI state
    isLoading: false,
    snackbarMessage: '' as string | SnackbarMessage,
    pageError: null as RegistryError | null,
    filter: ''
  }),
  
  getters: {
    isSingleRegistry: (state) => state.singleRegistry,
    
    currentTheme: (state) => {
      if (state.theme === 'auto') {
        return state.isDarkTheme ? 'dark' : 'light'
      }
      return state.theme
    },
    
    registryServersList: (state) => {
      return [...state.defaultRegistries, ...state.registryServers]
    }
  },
  
  actions: {
    // Initialize the store with values from localStorage or query params
    initialize() {
      this.loadRegistryServers()
      this.loadTheme()
      this.initializeRegistry()
    },
    
    // Initialize registry URL and name from environment or query params
    initializeRegistry() {
      // Try to get from query parameters
      const queryParams = new URLSearchParams(window.location.search)
      const urlParam = queryParams.get('url')
      
      if (urlParam) {
        try {
          this.registryUrl = decodeURIComponent(urlParam)
          this.registryName = stripHttps(this.registryUrl)
          return
        } catch (error) {
          console.error('Error decoding URL from query param:', error)
        }
      }
      
      // Use configured registry URL
      const configuredUrl = import.meta.env.VITE_REGISTRY_URL
      if (configuredUrl) {
        this.registryUrl = configuredUrl
      } else if (!this.singleRegistry) {
        // Try to get from stored registry servers
        if (this.registryServersList.length > 0) {
          this.registryUrl = this.registryServersList[0]
        }
      } else {
        // Default to current origin
        this.registryUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
      }
      
      this.registryName = stripHttps(this.registryUrl)
      
      // Set pull URL
      const configuredPullUrl = import.meta.env.VITE_PULL_URL
      this.pullUrl = configuredPullUrl || stripHttps(this.registryUrl)
    },
    
    // Set the registry URL
    setRegistryUrl(url: string) {
      this.registryUrl = url.replace(/\/$/, '')
      this.registryName = stripHttps(this.registryUrl)
      
      // Clear auth token when registry changes
      this.authToken = ''
    },
    
    // Set registry name
    setRegistryName(name: string) {
      this.registryName = name
    },
    
    // Set pull URL
    setPullUrl(url: string) {
      this.pullUrl = stripHttps(url)
    },
    
    // Authentication
    setAuthToken(token: string) {
      this.authToken = token
    },
    
    clearAuthToken() {
      this.authToken = ''
    },
    
    // Registry servers management
    loadRegistryServers() {
      try {
        const stored = getFromStorage('registryServers')
        if (stored) {
          this.registryServers = JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading registry servers:', error)
        this.registryServers = []
      }
    },
    
    addRegistryServer(url: string) {
      const normalizedUrl = url.replace(/\/$/, '')
      if (!this.registryServersList.includes(normalizedUrl)) {
        this.registryServers.push(normalizedUrl)
        this.saveRegistryServers()
      }
    },
    
    removeRegistryServer(url: string) {
      const index = this.registryServers.indexOf(url)
      if (index !== -1) {
        this.registryServers.splice(index, 1)
        this.saveRegistryServers()
      }
    },
    
    saveRegistryServers() {
      try {
        setToStorage('registryServers', JSON.stringify(this.registryServers))
      } catch (error) {
        console.error('Error saving registry servers:', error)
      }
    },
    
    // Theme management
    loadTheme() {
      try {
        const stored = getFromStorage('theme')
        if (stored) {
          this.theme = stored as 'light' | 'dark' | 'auto'
        }
        
        // Determine initial theme state
        if (this.theme === 'auto') {
          this.isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        } else {
          this.isDarkTheme = this.theme === 'dark'
        }
      } catch (error) {
        console.error('Error loading theme:', error)
      }
    },
    
    setTheme(theme: 'light' | 'dark' | 'auto') {
      this.theme = theme
      
      try {
        setToStorage('theme', theme)
      } catch (error) {
        console.error('Error saving theme:', error)
      }
      
      // Update the actual theme
      if (theme === 'auto') {
        this.isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        this.isDarkTheme = theme === 'dark'
      }
    },
    
    toggleTheme() {
      if (this.theme === 'auto') {
        // When toggling from auto, switch to the opposite of current
        this.setTheme(this.isDarkTheme ? 'light' : 'dark')
      } else {
        // Toggle between light and dark
        this.setTheme(this.isDarkTheme ? 'light' : 'dark')
      }
    },
    
    // UI state management
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading
    },
    
    showSnackbar(message: string | SnackbarMessage, isError: boolean = false) {
      this.snackbarMessage = message
    },
    
    clearSnackbar() {
      this.snackbarMessage = ''
    },
    
    showError(error: RegistryError) {
      this.pageError = error
    },
    
    clearError() {
      this.pageError = null
    },
    
    setFilter(filter: string) {
      this.filter = filter
    }
  }
})
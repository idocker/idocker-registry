import { defineStore } from 'pinia'
import type { 
  RepositoryConfig, 
  AuthenticationInfo, 
  BearerToken,
  RepositoryError,
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

export const useRepositoryStore = defineStore('repository', {
  state: () => ({
    // Repository configuration
    repositoryUrl: '',
    repositoryName: '',
    pullUrl: '',
    
    // Configuration flags
    deleteImages: falsy(import.meta.env.VITE_DELETE_IMAGES),
    showContentDigest: truthy(import.meta.env.VITE_SHOW_CONTENT_DIGEST),
    catalogElementsLimit: parseInt(import.meta.env.VITE_CATALOG_ELEMENTS_LIMIT || '1000'),
    singleRepository: truthy(import.meta.env.VITE_SINGLE_REPOSITORY),
    readOnlyRepositories: falsy(import.meta.env.VITE_READ_ONLY_REPOSITORIES),
    showCatalogNbTags: truthy(import.meta.env.VITE_SHOW_CATALOG_NB_TAGS),
    useControlCacheHeader: truthy(import.meta.env.VITE_USE_CONTROL_CACHE_HEADER),
    theme: (import.meta.env.VITE_THEME as 'light' | 'dark' | 'auto') || 'auto',
    taglistOrder: import.meta.env.VITE_TAGLIST_ORDER || 'alpha-asc;num-desc',
    catalogDefaultExpanded: truthy(import.meta.env.VITE_CATALOG_DEFAULT_EXPANDED),
    catalogMinBranches: parseInt(import.meta.env.VITE_CATALOG_MIN_BRANCHES || '1'),
    catalogMaxBranches: parseInt(import.meta.env.VITE_CATALOG_MAX_BRANCHES || '1'),
    tagsPerPage: parseInt(import.meta.env.VITE_TAGLIST_PAGE_SIZE || '100'),
    isRepositorySecured: truthy(import.meta.env.VITE_REPOSITORY_SECURED),
    showTagHistory: truthy(import.meta.env.VITE_SHOW_TAG_HISTORY),
    
    // Default repositories list
    defaultRepositories: stringToArray(import.meta.env.VITE_DEFAULT_REPOSITORIES || ''),
    historyCustomLabels: stringToArray(import.meta.env.VITE_HISTORY_CUSTOM_LABELS || ''),
    
    // Runtime state
    authToken: '',
    isDarkTheme: false,
    repositoryServers: [] as string[],
    
    // UI state
    isLoading: false,
    snackbarMessage: '' as string | SnackbarMessage,
    pageError: null as RepositoryError | null,
    filter: ''
  }),
  
  getters: {
    isSingleRepository: (state) => state.singleRepository,
    
    currentTheme: (state) => {
      if (state.theme === 'auto') {
        return state.isDarkTheme ? 'dark' : 'light'
      }
      return state.theme
    },
    
    repositoryServersList: (state) => {
      return [...state.defaultRepositories, ...state.repositoryServers]
    }
  },
  
  actions: {
    // Initialize the store with values from localStorage or query params
    initialize() {
      this.loadRepositoryServers()
      this.loadTheme()
      this.initializeRepository()
    },
    
    // Initialize repository URL and name from environment or query params
    initializeRepository() {
      // Try to get from query parameters
      const queryParams = new URLSearchParams(window.location.search)
      const urlParam = queryParams.get('url')
      
      if (urlParam) {
        try {
          this.repositoryUrl = decodeURIComponent(urlParam)
          this.repositoryName = stripHttps(this.repositoryUrl)
          return
        } catch (error) {
          console.error('Error decoding URL from query param:', error)
        }
      }
      
      // Use configured repository URL
      const configuredUrl = import.meta.env.VITE_REPOSITORY_URL
      if (configuredUrl) {
        this.repositoryUrl = configuredUrl
      } else if (!this.singleRepository) {
        // Try to get from stored repository servers
        if (this.repositoryServersList.length > 0) {
          this.repositoryUrl = this.repositoryServersList[0]
        }
      } else {
        // Default to current origin
        this.repositoryUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
      }
      
      this.repositoryName = stripHttps(this.repositoryUrl)
      
      // Set pull URL
      const configuredPullUrl = import.meta.env.VITE_PULL_URL
      this.pullUrl = configuredPullUrl || stripHttps(this.repositoryUrl)
    },
    
    // Set the repository URL
    setRepositoryUrl(url: string) {
      this.repositoryUrl = url.replace(/\/$/, '')
      this.repositoryName = stripHttps(this.repositoryUrl)
      
      // Clear auth token when repository changes
      this.authToken = ''
    },
    
    // Set repository name
    setRepositoryName(name: string) {
      this.repositoryName = name
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
    
    // Repository servers management
    loadRepositoryServers() {
      try {
        const stored = getFromStorage('repositoryServers')
        if (stored) {
          this.repositoryServers = JSON.parse(stored)
        }
      } catch (error) {
        console.error('Error loading repository servers:', error)
        this.repositoryServers = []
      }
    },
    
    addRepositoryServer(url: string) {
      const normalizedUrl = url.replace(/\/$/, '')
      if (!this.repositoryServersList.includes(normalizedUrl)) {
        this.repositoryServers.push(normalizedUrl)
        this.saveRepositoryServers()
      }
    },
    
    removeRepositoryServer(url: string) {
      const index = this.repositoryServers.indexOf(url)
      if (index !== -1) {
        this.repositoryServers.splice(index, 1)
        this.saveRepositoryServers()
      }
    },
    
    saveRepositoryServers() {
      try {
        setToStorage('repositoryServers', JSON.stringify(this.repositoryServers))
      } catch (error) {
        console.error('Error saving repository servers:', error)
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
    
    showError(error: RepositoryError) {
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
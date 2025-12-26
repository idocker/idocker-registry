import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios'
import type {
  AuthenticationInfo,
  BearerToken,
  RegistryError,
  RegistryErrorResponse,
  CatalogResponse,
  TagListResponse,
  DockerManifest,
  DockerConfig
} from '@/types'
import { useRegistryStore } from '@/stores/registry'
import { useAuthStore } from '@/stores/auth'

// Cache for API responses
const responseCache = new Map<string, { response: AxiosResponse; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Registry HTTP Service
 * Handles all API requests to Docker Registry with authentication and caching
 */
class RegistryHttpService {
  private axiosInstance: AxiosInstance
  private _registryStore: ReturnType<typeof useRegistryStore> | null = null

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      }
    })
    
    this.setupInterceptors()
  }
  
  // Getter for registry store to ensure it's only accessed when needed
  private get registryStore(): ReturnType<typeof useRegistryStore> {
    if (!this._registryStore) {
      this._registryStore = useRegistryStore()
    }
    return this._registryStore
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Set withCredentials if registry is secured
        config.withCredentials = this.registryStore.isRegistrySecured
        
        // Add authentication token if available
        const token = this.registryStore.authToken
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add application authentication token for backend API calls
        const authStore = useAuthStore()
        if (authStore.token && config.url?.startsWith('/api/')) {
          config.headers.Authorization = `Bearer ${authStore.token}`
        }
        
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        //console.log('response interceptor:', response)
        // Cache successful responses
        const key = this.getCacheKey(response.config)
        responseCache.set(key, {
          response: response,
          timestamp: Date.now()
        })
        
        return response
      },
      async (error) => {
        const authStore = useAuthStore()
        console.log('error interceptor:', error)
        // Handle application authentication errors (401 for backend API)
        if (error.response?.status === 401 && error.config?.url?.startsWith('/api/')) {
          // Clear authentication state
          authStore.token = ''
          authStore.user = null
          localStorage.removeItem('idocker_token')
          localStorage.removeItem('user_data')
          delete axios.defaults.headers.common['Authorization']
          
          // Show login prompt and redirect to login page
          authStore.showLoginPrompt = true
          authStore.loginRedirectPath = window.location.pathname + window.location.search
          
          // Redirect to login page
          if (window.location.pathname !== '/admin/login') {
            window.location.href = '/admin/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search)
          }
          
          // Don't retry the request
          return Promise.reject(this.formatError(error))
        }
        
        // Handle Docker Registry authentication errors
        if (error.response?.status === 401) {
          // Try to handle authentication
          const authHeader = error.response.headers['www-authenticate']
          
          if (authHeader) {
            const authInfo = this.parseAuthenticationHeader(authHeader)
            
            if (authInfo && authInfo.realm && authInfo.service) {
              try {
                // Request new token
                const token = await this.authenticate(authInfo)
                
                // Store token and retry request
                this.registryStore.setAuthToken(token)
                
                // Update original request with new token
                error.config.headers.Authorization = `Bearer ${token}`
                
                return this.axiosInstance.request(error.config)
              } catch (authError) {
                throw this.formatError(authError)
              }
            }
          }
        }
        
        throw this.formatError(error)
      }
    )
  }

  private parseAuthenticationHeader(header: string): AuthenticationInfo | null {
    // Parse Bearer realm="...",service="...",scope="..."
    const bearerMatch = header.match(/Bearer realm="([^"]+)",service="([^"]+)",scope="([^"]+)"/)
    
    if (bearerMatch) {
      return {
        realm: bearerMatch[1],
        service: bearerMatch[2],
        scope: bearerMatch[3]
      }
    }
    
    return null
  }

  private async authenticate(authInfo: AuthenticationInfo): Promise<string> {
    const { realm, service, scope } = authInfo
    
    if (!realm || !service) {
      throw new Error('Invalid authentication information')
    }
    
    try {
      const response = await axios.get(`${realm}?service=${service}&scope=${scope}`, {
        withCredentials: this.registryStore.isRegistrySecured
      })
      
      const tokenData: BearerToken = response.data
      
      if (!tokenData.token && !tokenData.access_token) {
        throw new Error('No token received from authentication server')
      }
      
      return tokenData.token || tokenData.access_token || ''
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`)
    }
  }

  private formatError(error: any): RegistryError {
    if (error.response) {
      // Server responded with an error
      if (error.response.data && error.response.data.errors) {
        // Registry error format
        const errorResponse: RegistryErrorResponse = error.response.data
        
        if (errorResponse.errors && errorResponse.errors.length > 0) {
          const registryError = errorResponse.errors[0]
          return {
            code: registryError.code,
            message: registryError.message,
            detail: registryError.detail,
            status: error.response.status
          }
        }
      }
      
      // Other HTTP errors
      return {
        code: 'HTTP_ERROR',
        message: error.response.statusText || 'Unknown error',
        status: error.response.status,
        detail: typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data)
      }
    } else if (error.request) {
      // Network error
      if (error.config?.url?.match('^http://') && window.location.protocol === 'https:') {
        return {
          code: 'MIXED_CONTENT',
          message: 'Mixed content error: Cannot access HTTP resource from HTTPS page',
          detail: `Cannot access ${error.config.url} from ${window.location.origin}`
        }
      } else if (!error.config?.url?.match('^http')) {
        return {
          code: 'INCORRECT_URL',
          message: 'Invalid URL format',
          detail: `The URL ${error.config?.url} is not a valid HTTP URL`
        }
      }
      
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        detail: error.message || 'Unknown network error'
      }
    }
    
    // Other errors
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      detail: String(error)
    }
  }

  private getCacheKey(config: AxiosRequestConfig): string {
    return `${config.method || 'GET'}_${config.url}_${JSON.stringify(config.params)}`
  }

  private getCachedResponse(config: AxiosRequestConfig): AxiosResponse | null {
    const key = this.getCacheKey(config)
    const cached = responseCache.get(key)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.response
    }
    
    // Remove expired cache
    if (cached) {
      responseCache.delete(key)
    }
    
    return null
  }

  // Generic HTTP methods for backend API calls
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config)
      return response.data
    } catch (error) {
      throw this.formatError(error)
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config)
      return response.data
    } catch (error) {
      throw this.formatError(error)
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config)
      return response.data
    } catch (error) {
      throw this.formatError(error)
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config)
      return response.data
    } catch (error) {
      throw this.formatError(error)
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data, config)
      return response.data
    } catch (error) {
      throw this.formatError(error)
    }
  }

  clearCache() {
    responseCache.clear()
  }
}

// Create singleton instance with lazy initialization
let httpService: RegistryHttpService | null = null

function getHttpService(): RegistryHttpService {
  if (!httpService) {
    httpService = new RegistryHttpService()
  }
  return httpService
}

// Export default function for backward compatibility
export default getHttpService

// Also export as named export for direct import
export const http = getHttpService()
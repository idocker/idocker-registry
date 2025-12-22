import { defineStore } from 'pinia'
import type { RegistryError } from '@/types'
import getHttpService from '@/utils/http'

interface TagListOptions {
  useControlCacheHeader?: boolean
  isRegistrySecured?: boolean
  comparator?: (a: string, b: string) => number
}

export const useTagListStore = defineStore('taglist', {
  state: () => ({
    tags: [] as string[],
    loadend: false,
    error: null as RegistryError | null
  }),
  
  actions: {
    async fetchTags(imageName: string, options: TagListOptions = {}) {
      this.loadend = false
      this.error = null
      
      try {
        const response = await httpService.getTags(imageName)
        this.tags = response.tags || []
        
        // Sort tags if comparator is provided
        if (options.comparator) {
          this.tags.sort(options.comparator)
        }
        
        this.loadend = true
      } catch (error) {
        this.error = error as RegistryError
        this.loadend = true
      }
    },
    
    clearError() {
      this.error = null
    },
    
    cleanup() {
      this.tags = []
      this.loadend = false
      this.error = null
    }
  }
})
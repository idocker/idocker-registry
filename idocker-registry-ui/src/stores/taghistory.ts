import { defineStore } from 'pinia'
import type { TagHistoryItem, RegistryError } from '@/types'
import httpService from '@/utils/http'

interface TagHistoryOptions {
  customLabels?: string[]
  useControlCacheHeader?: boolean
  isRegistrySecured?: boolean
}

export const useTagHistoryStore = defineStore('taghistory', {
  state: () => ({
    history: [] as TagHistoryItem[],
    architectures: [] as { architecture: string; os: string; variant?: string }[],
    loadend: false,
    error: null as RegistryError | null
  }),
  
  actions: {
    async fetchHistory(
      imageName: string, 
      tag: string, 
      options: TagHistoryOptions = {}
    ) {
      this.loadend = false
      this.error = null
      
      try {
        // Get the manifest for the tag
        const manifest = await httpService.getManifest(imageName, tag)
        
        // Process manifest list if available
        if (manifest.manifests) {
          // This is a manifest list (multi-arch image)
          this.architectures = manifest.manifests.map(m => ({
            architecture: m.platform?.architecture || 'unknown',
            os: m.platform?.os || 'unknown',
            variant: m.platform?.variant
          }))
          
          // Get the first manifest's digest to load its history
          if (manifest.manifests.length > 0) {
            const firstManifest = await httpService.getManifest(
              imageName, 
              manifest.manifests[0].digest.split(':')[1]
            )
            
            await this.processManifest(imageName, firstManifest, options)
          }
        } else {
          // This is a single manifest
          await this.processManifest(imageName, manifest, options)
        }
        
        this.loadend = true
      } catch (error) {
        this.error = error as RegistryError
        this.loadend = true
      }
    },
    
    async processManifest(
      imageName: string,
      manifest: any,
      options: TagHistoryOptions = {}
    ) {
      if (!manifest.config) {
        return
      }
      
      // Get the config for the manifest
      const config = await httpService.getBlob(imageName, manifest.config.digest)
      
      if (!config) {
        return
      }
      
      // Extract history from config
      const history = config.history || []
      
      // Process history entries
      this.history = []
      
      // Create a TagHistoryItem for each relevant history entry
      for (let i = 0; i < history.length; i++) {
        const entry = history[i]
        
        // Skip empty layers
        if (entry.empty_layer) {
          continue
        }
        
        // Calculate total size up to this point
        let size = 0
        if (manifest.layers && manifest.layers[i]) {
          size = manifest.layers[i].size
        }
        
        // Extract labels
        let labels: Record<string, string> = {}
        
        // Add standard labels
        if (entry.labels) {
          labels = { ...entry.labels }
        }
        
        // Add custom labels if configured
        if (options.customLabels) {
          for (const labelKey of options.customLabels) {
            if (config.Labels && config.Labels[labelKey]) {
              labels[labelKey] = config.Labels[labelKey]
            }
          }
        }
        
        // Create history item
        const historyItem: TagHistoryItem = {
          tag: '',
          digest: manifest.config?.digest || '',
          created: entry.created || new Date().toISOString(),
          size,
          architecture: config.architecture || 'unknown',
          os: config.os || 'unknown',
          variant: config.variant || '',
          dockerVersion: config.docker_version || '',
          labels,
          layers: []
        }
        
        this.history.push(historyItem)
      }
      
      // Sort history by creation date (newest first)
      this.history.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      
      // If there are multiple history entries, calculate sizes for each
      if (this.history.length > 1 && manifest.layers) {
        let cumulativeSize = 0
        
        // Process layers in reverse order (oldest to newest)
        for (let i = manifest.layers.length - 1; i >= 0; i--) {
          const layer = manifest.layers[i]
          cumulativeSize += layer.size
          
          // Find corresponding history entry
          const historyIndex = manifest.layers.length - 1 - i
          if (this.history[historyIndex]) {
            this.history[historyIndex].size = cumulativeSize
            this.history[historyIndex].layers = [layer]
          }
        }
      } else if (this.history.length === 1 && manifest.layers) {
        // Single entry, use total size
        this.history[0].size = manifest.layers.reduce((total, layer) => total + layer.size, 0)
        this.history[0].layers = manifest.layers
      }
    },
    
    async deleteHistoryEntry(imageName: string, digest: string) {
      try {
        await httpService.deleteManifest(imageName, digest)
        
        // Remove from local history
        this.history = this.history.filter(item => item.digest !== digest)
      } catch (error) {
        throw error
      }
    },
    
    clearError() {
      this.error = null
    },
    
    cleanup() {
      this.history = []
      this.architectures = []
      this.loadend = false
      this.error = null
    }
  }
})
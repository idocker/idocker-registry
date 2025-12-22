import { defineStore } from 'pinia'
import type { Repository, RegistryError } from '@/types'
import { getBranching } from '@/utils/helpers'
import getHttpService from '@/utils/http'

interface CatalogOptions {
  elementsLimit?: number
  showNbTags?: boolean
  catalogMinBranches?: number
  catalogMaxBranches?: number
  defaultExpanded?: boolean
  isRegistrySecured?: boolean
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    repositories: [] as Repository[],
    nRepositories: 0,
    nImages: 0,
    loadend: false,
    error: null as RegistryError | null
  }),
  
  getters: {
    filteredRepositories: (state) => (filter: string): Repository[] => {
      if (!filter) return state.repositories
      
      const lowerFilter = filter.toLowerCase()
      
      function filterRepos(repos: Repository[]): Repository[] {
        return repos.filter(repo => {
          // Check if the repository name matches the filter
          if (repo.name.toLowerCase().includes(lowerFilter)) {
            return true
          }
          
          // If it has children, check if any children match
          if (repo.children && Object.keys(repo.children).length > 0) {
            repo.children = filterRepos(Object.values(repo.children))
            return repo.children.length > 0
          }
          
          // If it has tags, check if any tags match
          if (repo.tags) {
            repo.tags = repo.tags.filter(tag => 
              tag.toLowerCase().includes(lowerFilter)
            )
            return repo.tags.length > 0
          }
          
          return false
        })
      }
      
      return filterRepos([...state.repositories])
    }
  },
  
  actions: {
    async fetchCatalog(options: CatalogOptions = {}) {
      this.loadend = false
      this.error = null
      
      try {
        const limit = options.elementsLimit || 1000
        const httpService = getHttpService()
        const response = await httpService.getCatalog()
        const repoNames = response.repositories || []
        
        // Sort repositories alphabetically
        repoNames.sort()
        
        let repositories: Repository[] = []
        
        // Create repository objects without branching structure
        // Preserve full repository names (including namespaces) as is
        repositories = repoNames.map(name => ({ name }))
        
        // If showNbTags is enabled, fetch tag counts for each repository
        if (options.showNbTags) {
          for (const repo of repositories) {
            try {
              // Try different approaches to fetch tags
              // First try with the repository name as is
              let tagsResponse = null
              let repoName = repo.name
              
              try {
                tagsResponse = await httpService.getTags(repoName)
              } catch (error) {
                console.warn(`Failed to fetch tags for ${repoName}, trying with encoded name`)
                
                // Try URL encoding the repository name to handle special characters
                try {
                  const encodedRepoName = encodeURIComponent(repoName)
                  tagsResponse = await httpService.getTags(encodedRepoName)
                  console.log(`Successfully fetched tags with encoded name: ${encodedRepoName}`)
                } catch (error2) {
                  console.error(`Failed to fetch tags even with encoded name: ${repoName}`)
                  throw error2
                }
              }
              
              if (tagsResponse) {
                repo.tagCount = tagsResponse.tags.length
                console.log(`Fetched tags for repository: ${repoName}, tag count: ${repo.tagCount}`)
              }
            } catch (error) {
              console.warn(`Could not fetch tags for ${repoName}:`, error)
              repo.tagCount = 0
            }
          }
        }
        
        this.repositories = repositories
        this.nRepositories = repositories.length
        this.nImages = repositories.length
        this.loadend = true
        
        // Debug logging to identify the issue
        console.log('Catalog repositories:', repositories.map(r => r.name))
      } catch (error) {
        this.error = error as RegistryError
        this.loadend = true
      }
    },
    
    applyFilter(filter: string) {
      // This getter is used by components to filter repositories
      // No state change needed as filtering is done via getters
    },
    
    clearError() {
      this.error = null
    },
    
    cleanup() {
      this.repositories = []
      this.nRepositories = 0
      this.nImages = 0
      this.loadend = false
      this.error = null
    }
  }
})
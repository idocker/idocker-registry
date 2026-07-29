import type { TagListOrder, ThemeColors } from '@/types'

/**
 * URL manipulation functions
 */
export function stripHttps(url?: string): string {
  if (!url) return ''
  
  // Remove protocol
  return url.replace(/^https?:\/\//, '')
}

export function getRelativePath(url?: string): string {
  if (!url) return ''
  
  try {
    const urlObj = new URL(url)
    return urlObj.pathname
  } catch {
    return url
  }
}

/**
 * Registry repository functions
 */
export function getBranching(
  min: number = 1,
  max: number = 1
): (repositories: string[]) => { [key: string]: any } {
  if (min < 0 || max < min) {
    throw new Error('Invalid branching configuration: min must be >= 0 and max must be >= min')
  }
  
  return function(repositories: string[]) {
    if (min === 0) {
      // No branching
      return repositories.reduce((acc, repo) => {
        acc[repo] = { name: repo }
        return acc
      }, {} as { [key: string]: any })
    }
    
    return repositories.reduce((acc, repo) => {
      const parts = repo.split('/')
      
      // Create nested structure
      let current = acc
      for (let i = 0; i < Math.min(parts.length, max); i++) {
        const part = parts[i]
        
        if (!current[part]) {
          current[part] = {
            name: part,
            children: i === parts.length - 1 || i >= min + max - 1 ? undefined : {}
          }
        }
        
        if (current[part].children) {
          current = current[part].children
        }
      }
      
      return acc
    }, {} as { [key: string]: any })
  }
}

/**
 * Tag sorting functions
 */
export function taglistOrderParser(orderStr: string): TagListOrder {
  const parts = orderStr.split(';').map(p => p.trim())
  
  if (parts.length !== 2) {
    throw new Error(`Invalid taglist order format: ${orderStr}. Expected format: "primary;secondary"`)
  }
  
  const parsePart = (part: string): { type: 'num' | 'alpha', direction: 'asc' | 'desc' } => {
    const [type, direction] = part.split('-')
    
    if (!type || !direction) {
      throw new Error(`Invalid taglist order part: ${part}. Expected format: "type-direction"`)
    }
    
    if (type !== 'num' && type !== 'alpha') {
      throw new Error(`Invalid order type: ${type}. Must be "num" or "alpha"`)
    }
    
    if (direction !== 'asc' && direction !== 'desc') {
      throw new Error(`Invalid order direction: ${direction}. Must be "asc" or "desc"`)
    }
    
    return { type, direction }
  }
  
  const primary = parsePart(parts[0])
  const secondary = parsePart(parts[1])
  
  return {
    primary: primary.type,
    primaryDirection: primary.direction,
    secondary: secondary.type,
    secondaryDirection: secondary.direction
  }
}

export function getTagComparator(order: TagListOrder): (a: string, b: string) => number {
  return function(a: string, b: string) {
    // Primary comparison
    let result = 0
    
    if (order.primary === 'num') {
      result = compareNumeric(a, b)
    } else {
      result = compareAlphabetic(a, b)
    }
    
    if (order.primaryDirection === 'desc') {
      result = -result
    }
    
    // If primary comparison is equal, use secondary
    if (result === 0) {
      if (order.secondary === 'num') {
        result = compareNumeric(a, b)
      } else {
        result = compareAlphabetic(a, b)
      }
      
      if (order.secondaryDirection === 'desc') {
        result = -result
      }
    }
    
    return result
  }
}

function compareNumeric(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g
  const aParts = a.match(regex) || []
  const bParts = b.match(regex) || []
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''
    
    // If both are numbers, compare numerically
    if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10)
      if (diff !== 0) return diff
    } else {
      // Otherwise compare alphabetically
      const diff = aPart.localeCompare(bPart)
      if (diff !== 0) return diff
    }
  }
  
  return aParts.length - bParts.length
}

function compareAlphabetic(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}

/**
 * Pagination functions
 */
export function getNumPages(items: any[], itemsPerPage: number): number {
  return Math.ceil(items.length / itemsPerPage)
}

export function getPageLabels(currentPage: number, totalPages: number): Array<{ page: number, label: string, active: boolean }> {
  const pages = []
  const maxVisible = 7
  
  if (totalPages <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        page: i,
        label: i.toString(),
        active: i === currentPage
      })
    }
  } else {
    // Show first, last, and around current
    // Always include first page
    pages.push({
      page: 1,
      label: '1',
      active: 1 === currentPage
    })
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      pages.push({
        page: currentPage - 2,
        label: '...',
        active: false
      })
    }
    
    // Show pages around current
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push({
        page: i,
        label: i.toString(),
        active: i === currentPage
      })
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push({
        page: currentPage + 2,
        label: '...',
        active: false
      })
    }
    
    // Always include last page
    if (totalPages > 1) {
      pages.push({
        page: totalPages,
        label: totalPages.toString(),
        active: totalPages === currentPage
      })
    }
  }
  
  return pages
}

/**
 * Array manipulation functions
 */
export function stringToArray(str: string): string[] {
  if (!str) return []
  return str.split(',').map(s => s.trim()).filter(s => s.length > 0)
}

/**
 * Boolean conversion functions
 */
export function truthy(value: any): boolean {
  if (typeof value === 'string') {
    return value === 'true' || value === '1' || value === 'yes' || value === 'on'
  }
  return Boolean(value)
}

export function falsy(value: any): boolean {
  if (typeof value === 'string') {
    return value === 'false' || value === '0' || value === 'no' || value === 'off' || value === ''
  }
  return !Boolean(value)
}

/**
 * Format functions
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function normalizeDate(dateString: string): string {
  if (!dateString) return ''
  const s = dateString.replace(' ', 'T')
  return s.includes('Z') || s.includes('+') || s.endsWith('T') ? s : s + 'Z'
}

export function parseDate(dateString: string): Date | null {
  if (!dateString) return null
  const d = new Date(normalizeDate(dateString))
  return isNaN(d.getTime()) ? null : d
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function formatDate(dateString: string, locale: string = 'en-US'): string {
  const date = parseDate(dateString)
  if (!date) return dateString || ''
  const y = date.getFullYear()
  const M = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return locale.startsWith('zh') ? `${y}-${M}-${d}` : `${y}/${M}/${d}`
}

export function formatDateTime(dateString: string, locale: string = 'en-US'): string {
  const date = parseDate(dateString)
  if (!date) return dateString || ''
  const y = date.getFullYear()
  const M = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const m = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  const datePart = locale.startsWith('zh') ? `${y}-${M}-${d}` : `${y}/${M}/${d}`
  return `${datePart} ${h}:${m}:${s}`
}

/**
 * Local storage helpers
 */
export function getFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Theme helpers
 */
export function loadTheme(theme?: string, isDark?: boolean): string {
  if (theme === 'auto') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  }
  
  if (theme === 'dark' || theme === 'light') {
    return theme
  }
  
  // Default to light if no theme specified
  return 'light'
}

export function applyTheme(theme: 'light' | 'dark', colors?: Partial<ThemeColors>): void {
  const body = document.body
  
  // Set theme class
  if (theme === 'dark') {
    body.classList.add('dark-theme')
  } else {
    body.classList.remove('dark-theme')
  }
  
  // Apply custom colors if provided
  if (colors) {
    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        body.style.setProperty(cssVar, value)
      }
    })
  }
}

/**
 * Digest helpers
 */
export async function calculateDigest(text: string): Promise<string> {
  if (!window.crypto || !window.TextEncoder) {
    throw new Error('Crypto API not available')
  }
  
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await window.crypto.subtle.digest('SHA-256', data)
  
  return 'sha256:' + Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
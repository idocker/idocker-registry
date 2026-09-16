/**
 * URL manipulation functions
 */
export function stripHttps(url?: string): string {
  if (!url) return ''
  
  // Remove protocol
  return url.replace(/^https?:\/\//, '')
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
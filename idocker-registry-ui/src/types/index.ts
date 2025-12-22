// Registry configuration types
export interface RegistryConfig {
  url: string
  name: string
  title?: string
  pullUrl?: string
  deleteImages?: boolean
  showContentDigest?: boolean
  catalogElementsLimit?: number
  singleRegistry?: boolean
  defaultRegistries?: string[]
  readOnlyRegistries?: boolean
  showCatalogNbTags?: boolean
  historyCustomLabels?: string[]
  useControlCacheHeader?: boolean
  theme?: 'light' | 'dark' | 'auto'
  taglistOrder?: string
  catalogDefaultExpanded?: boolean
  catalogMinBranches?: number
  catalogMaxBranches?: number
  tagsPerPage?: number
  isRegistrySecured?: boolean
  showTagHistory?: boolean
}

// Registry API types
export interface Repository {
  name: string
  tags?: string[]
  children?: Repository[]
  tagCount?: number
}

export interface CatalogResponse {
  repositories: string[]
}

export interface TagListResponse {
  tags: string[]
}

export interface TagHistoryResponse {
  history: TagHistoryItem[]
}

export interface TagHistoryItem {
  tag: string
  digest: string
  created: string
  size: number
  architecture?: string
  os?: string
  variant?: string
  dockerVersion?: string
  labels?: Record<string, string>
  layers?: LayerInfo[]
}

export interface LayerInfo {
  digest: string
  size: number
  mediaType: string
}

export interface DockerManifest {
  schemaVersion: number
  mediaType: string
  config?: DockerManifestConfig
  layers?: LayerInfo[]
  manifests?: DockerManifest[]
  annotations?: Record<string, string>
}

export interface DockerManifestConfig {
  mediaType: string
  size: number
  digest: string
}

export interface DockerConfig {
  architecture: string
  config?: Record<string, any>
  container?: string
  container_config?: Record<string, any>
  created: string
  docker_version: string
  history?: HistoryEntry[]
  os: string
  rootfs?: {
    type: string
    diff_ids: string[]
  }
}

export interface HistoryEntry {
  created: string
  created_by?: string
  empty_layer?: boolean
  comment?: string
}

export interface AuthenticationInfo {
  realm?: string
  service?: string
  scope?: string
}

export interface BearerToken {
  token?: string
  access_token?: string
  expires_in?: number
  issued_at?: string
}

// Error types
export interface RegistryError {
  code: string
  message: string
  detail?: string
  url?: string
  status?: number
}

export interface RegistryErrorResponse {
  errors: RegistryError[]
}

// UI component types
export interface SnackbarMessage {
  message: string
  isError?: boolean
  duration?: number
}

export interface PaginationInfo {
  page: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface TagListOrder {
  primary: 'num' | 'alpha'
  primaryDirection: 'asc' | 'desc'
  secondary: 'num' | 'alpha'
  secondaryDirection: 'asc' | 'desc'
}

// Theme types
export interface ThemeColors {
  primaryText: string
  neutralText: string
  background: string
  hoverBackground: string
  accentText: string
  headerText: string
  headerAccentText: string
  headerBackground: string
  footerText: string
  footerNeutralText: string
  footerBackground: string
}
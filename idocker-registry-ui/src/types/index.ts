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

// Project types
export interface Project {
  id: number
  name: string
  description?: string
  namespace?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByUsername?: string
  createdByName?: string
  memberRole?: 'owner' | 'maintainer' | 'viewer'
  memberSince?: string
  memberCount?: number
  repositoryCount?: number
}

// 统一API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

export interface ApiError {
  success: false
  message: string
  error?: string
}

// 分页数据类型
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// 项目分页响应（保持向后兼容）
export interface ProjectPaginatedResponse extends ApiResponse<{ projects: Project[]; pagination: PaginationMeta }> {}

// 镜像分页响应
export interface ImagePaginatedResponse extends ApiResponse<{ images: Image[]; pagination: PaginationMeta }> {}

// Image types
export interface ImageTag {
  id: number | string
  name: string
  digest: string
  size: number
  architecture?: string
  os?: string
  createdAt?: string
  pullCommand?: string
  pushCommand?: string
}

export interface Image {
  id: number | string
  name: string
  namespace?: string
  project: string
  description?: string
  tags: ImageTag[]
  size?: number
  createdAt: string
  updatedAt?: string
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
import type { P } from "vue-router/dist/router-CWoNjPRp.mjs"

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

export interface Message{
  text: string
  type: 'success' | 'error' | 'info' | 'warning'
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

export interface ProjectMember {
  id: number
  username: string
  email?: string
  fullName?: string
  userRole: 'admin' | 'user'
  isActive: boolean
  memberRole: 'owner' | 'maintainer' | 'viewer'
  memberSince: string
}

export interface ProjectDetails extends Project {
  members: ProjectMember[]
  repositories: Array<{
    id: number
    name: string
    description?: string
    isPublic: boolean
    createdAt: string
    updatedAt: string
  }>
}

export interface CreateProjectData {
  name: string
  description?: string
  namespace?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  namespace?: string
  isActive?: boolean
}

export interface AddMemberData {
  userId: number
  role: 'owner' | 'maintainer' | 'viewer'
}

export interface UpdateMemberRoleData {
  role: 'owner' | 'maintainer' | 'viewer'
}

// User types
export interface User {
  id: number
  username: string
  email?: string
  fullName?: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserDetail extends User {
  projects: Array<{
    id: number
    name: string
    description?: string
    memberRole: 'owner' | 'maintainer' | 'viewer'
    memberSince: string
  }>
}

export interface UserProjects {
  user: User;
  projects: Project[]
}

export interface CreateUser {
  username: string
  password: string
  email?: string
  fullName?: string
  role?: 'admin' | 'user'
}

export interface UpdateUser {
  email?: string
  fullName?: string
  role?: 'admin' | 'user'
  isActive?: boolean
}

export interface ChangePassword {
  password: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  fullName: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
}

// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  password: string
  email?: string
  fullName?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: UserProfile
  }
}

// Repository/Image types
export interface Repository {
  id: number
  name: string
  description?: string
  isPublic: boolean
  projectId: number
  projectName: string
  project?: string  // 兼容字段
  namespace: string
  fullName: string
}

export interface Image {
  id: number
  name: string
  namespace?: string
  project: string
  description?: string
  isPublic: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  tags: ImageTag[]
}

export interface ImageTag {
  id: number
  name: string
  tag?: string  // 兼容字段
  digest: string
  size: number
  architecture?: string
  os?: string
  createdAt?: string
  created_at?: string  // 兼容字段
  pullCommand?: string
  pushCommand?: string
}

export interface ImageDetails {
  repository: Repository
  tags: ImageTag[]
}

export interface ImageTagDetails {
  repository: Repository
  tag: ImageTag
  buildHistory: BuildHistory[]
}

export interface BuildHistory {
  id: number
  created: string
  createdBy?: string
  created_by?: string  // 兼容字段
  emptyLayer: boolean
  comment?: string
  size: number
}

// Dashboard types
export interface DashboardStats {
  projectsCount: number
  repositoriesCount: number
  usersCount: number
  replicationPoliciesCount: number
}

export interface RecentProject {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface RecentRepository {
  id: number
  name: string
  url: string
  createdAt: string
  updatedAt: string
}

// Sync types
export interface SyncStatus {
  repositoryStatus: 'connected' | 'disconnected'
  repositoryUrl: string
  projectCount: number
  repositoryCount: number
  tagCount: number
  lastSync: {
    id: number
    type: string
    status: string
    processedCount: number
    errorCount: number
    duration: number
    createdAt: string
  } | null
}

export interface SyncLog {
  id: number
  sync_type: string
  status: string
  processed_count: number
  error_count: number
  duration: number
  created_at: string
  project_name?: string  // 可选字段
  user_name?: string  // 可选字段
}

export interface SyncResult {
  success: boolean
  processedCount?: number
  errorCount?: number
  totalCount?: number
  duration?: number
}

// Audit types
export interface AuditLog {
  id: number
  action: string
  resourceType: string
  resourceId: string
  details: any
  ipAddress: string
  userAgent: string
  createdAt: string
  username?: string
  fullName?: string
  email?: string
}

export interface AuditLogDetail extends AuditLog {
  details: any
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface AuditStatistics {
  summary: {
    totalOperations: number
    daysRange: number
  }
  byAction: Array<{ action: string; count: number }>
  byResourceType: Array<{ resource_type: string; count: number }>
  byUser: Array<{ username: string; fullName: string; count: number }>
  dailyStats: Array<{ date: string; count: number }>
  activeOperations: Array<{ action: string; count: number }>
}

export interface ExportFilters {
  action?: string
  resourceType?: string
  userId?: string
  startDate?: string
  endDate?: string
  format?: 'json' | 'csv'
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
export interface PageInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

// 通用分页响应
export interface PaginatedApiResponse<T>  {
  success: boolean
  message?: string
  data?: T[];
  pagination?: PageInfo;
}

// 项目分页响应（保持向后兼容）
export interface ProjectPaginatedResponse extends PaginatedApiResponse<Project> {}

// 镜像分页响应
export interface ImagePaginatedResponse extends PaginatedApiResponse<Image> {}

// 用户分页响应
export interface UserPaginatedResponse extends PaginatedApiResponse<User> {}

// 审计日志分页响应
export interface AuditLogPaginatedResponse extends PaginatedApiResponse<AuditLog> {}



// 特定类型的分页响应
export interface ImageRepositoryPaginatedResponse extends PaginatedApiResponse<Image> {}

export interface ProjectRepositoryPaginatedResponse extends PaginatedApiResponse<Project> {}

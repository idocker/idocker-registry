# 类型声明说明

本目录包含了整个项目使用的所有TypeScript类型定义，统一管理以提高代码复用性和维护性。

## 类型分类

### API相关类型
- `ApiResponse<T>` - 通用API响应格式
- `ApiError` - API错误响应格式
- `PaginatedResponse<T>` - 通用分页响应格式
- `PaginationMeta` - 分页元数据
- `PaginationParams` - 分页请求参数

### 特定分页响应类型
- `ProjectPaginatedResponse` - 项目列表分页响应
- `ImagePaginatedResponse` - 镜像列表分页响应
- `UserPaginatedResponse` - 用户列表分页响应
- `AuditLogPaginatedResponse` - 审计日志分页响应
- `ImageRepositoryPaginatedResponse` - 镜像仓库分页响应
- `ProjectRepositoryPaginatedResponse` - 项目仓库分页响应

### 认证相关类型
- `LoginCredentials` - 登录凭据
- `RegisterData` - 注册数据
- `UserProfile` - 用户资料
- `ChangePasswordData` - 修改密码数据
- `LoginResponse` - 登录响应

### 用户相关类型
- `User` - 用户信息
- `UserDetail` - 用户详细信息
- `CreateUser` - 创建用户数据
- `UpdateUser` - 更新用户数据
- `ChangePassword` - 修改密码（简化版）

### 项目相关类型
- `Project` - 项目信息
- `ProjectMember` - 项目成员
- `ProjectDetails` - 项目详细信息
- `CreateProjectData` - 创建项目数据
- `UpdateProjectData` - 更新项目数据
- `AddMemberData` - 添加成员数据
- `UpdateMemberRoleData` - 更新成员角色数据

### 镜像仓库相关类型
- `Repository` - 仓库信息
- `Image` - 镜像信息
- `ImageTag` - 镜像标签
- `ImageDetails` - 镜像详细信息
- `ImageTagDetails` - 镜像标签详细信息
- `BuildHistory` - 构建历史

### 审计日志相关类型
- `AuditLog` - 审计日志
- `AuditLogDetail` - 审计日志详细信息
- `AuditLogFilters` - 审计日志过滤条件
- `AuditStatistics` - 审计统计信息
- `ExportFilters` - 导出过滤条件

### 仪表板相关类型
- `DashboardStats` - 仪表板统计数据
- `RecentProject` - 最近项目
- `RecentRepository` - 最近仓库

### 同步相关类型
- `SyncStatus` - 同步状态
- `SyncLog` - 同步日志
- `SyncResult` - 同步结果

### 注册表相关类型
- `RegistryConfig` - 注册表配置
- `CatalogResponse` - 目录响应
- `TagListResponse` - 标签列表响应
- `TagHistoryResponse` - 标签历史响应
- `TagHistoryItem` - 标签历史项
- `LayerInfo` - 层信息
- `DockerManifest` - Docker清单
- `DockerManifestConfig` - Docker清单配置
- `DockerConfig` - Docker配置
- `HistoryEntry` - 历史条目
- `AuthenticationInfo` - 认证信息
- `BearerToken` - Bearer令牌

### 错误相关类型
- `RegistryError` - 注册表错误
- `RegistryErrorResponse` - 注册表错误响应

### UI相关类型
- `SnackbarMessage` - 消息提示
- `PaginationInfo` - 分页信息
- `TagListOrder` - 标签列表排序
- `ThemeColors` - 主题颜色

## 兼容性处理

### 标签名称兼容性
在`ImageTag`接口中，同时提供了`name`和`tag`字段，以兼容不同的API响应格式。前端代码应优先使用`name`字段，但同时也处理`tag`字段的存在：

```typescript
// 示例：获取标签名称
const tagName = imageTag.name || imageTag.tag
```

### 创建时间兼容性
在`ImageTag`接口中，同时提供了`createdAt`和`created_at`字段，以兼容不同的API响应格式。前端代码应优先使用`createdAt`字段，但同时也处理`created_at`字段的存在：

```typescript
// 示例：获取创建时间
const createdTime = imageTag.createdAt || imageTag.created_at
```

## 使用指南

1. 所有类型定义都从`@/types`目录导入，而不是从各个服务文件导入。

2. 如果需要添加新的类型定义，应该将其添加到此目录的适当分类中，而不是在服务文件或组件文件中定义。

3. 对于特定于某个模块的类型（如composables中的ApiState），可以保留在相应的模块中，但应确保命名清晰，避免与全局类型冲突。

4. 所有服务文件应从此目录导入类型，而不是重复定义。
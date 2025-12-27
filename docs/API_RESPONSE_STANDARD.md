# API响应格式统一规范

## 版本
- 版本: 2.0.0
- 日期: 2024-12-24
- 作者: IDocker Registry Team

## 概述

本文档定义了iDocker Registry后端API的统一响应格式标准，确保前后端数据一致性，提高类型安全性。

## 统一响应格式

### 1. 成功响应（带数据）

```javascript
{
  "success": true,
  "data": { ... }
}
```

**使用场景**：查询数据、创建/更新资源后返回详细信息

**示例**：
```javascript
// 获取项目列表
{
  "success": true,
  "data": {
    "projects": [...],
    "pagination": { ... }
  }
}

// 获取镜像详情
{
  "success": true,
  "data": {
    "repository": { ... },
    "tags": [...]
  }
}
```

### 2. 成功响应（仅消息）

```javascript
{
  "success": true,
  "message": "操作成功"
}
```

**使用场景**：删除操作、简单的状态更新

**示例**：
```javascript
// 删除项目
{
  "success": true,
  "message": "项目删除成功"
}
```

### 3. 成功响应（带消息和数据）

```javascript
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**使用场景**：需要提示用户操作结果的情况

**示例**：
```javascript
// 同步完成
{
  "success": true,
  "message": "镜像信息同步完成",
  "data": {
    "repositories": 5,
    "syncedTags": 12
  }
}
```

### 4. 错误响应

```javascript
{
  "success": false,
  "message": "错误描述"
}
```

**可选字段**：
- `error`: 错误代码（如 "INVALID_TOKEN", "UNIQUE_VIOLATION"）
- `errors`: 验证错误数组

**示例**：
```javascript
// 通用错误
{
  "success": false,
  "message": "获取项目列表失败"
}

// 验证错误
{
  "success": false,
  "message": "数据验证失败",
  "errors": [
    {
      "field": "name",
      "message": "项目名称不能为空"
    }
  ]
}

// 认证错误
{
  "success": false,
  "message": "认证令牌已过期",
  "error": "TOKEN_EXPIRED"
}
```

### 5. 分页响应

```javascript
{
  "success": true,
  "data": {
    "images" | "projects": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**分页信息说明**：
- `page`: 当前页码（从1开始）
- `limit`: 每页数量
- `total`: 总记录数
- `totalPages`: 总页数
- `hasNextPage`: 是否有下一页
- `hasPrevPage`: 是否有上一页

## 后端实现

### API响应工具类

位置：`server/utils/apiResponse.js`

**提供的函数**：

```javascript
// 成功响应（带数据）
success(data, message?)

// 成功响应（仅消息）
successMessage(message)

// 错误响应
error(message, statusCode, errorCode?)

// 分页响应
paginated(items, pagination, message?)

// 验证错误响应
validationError(errors)
```

### 使用示例

```javascript
import { success, error, paginated } from '../utils/apiResponse.js';

// 成功返回数据
res.status(200).json(success(user));

// 成功返回消息
res.status(200).json(successMessage('用户删除成功'));

// 分页返回
res.status(200).json(paginated(projects, pagination));

// 错误返回
res.status(500).json(error('操作失败'));
```

## 前端类型定义

位置：`idocker-registry-ui/src/types/index.ts`

```typescript
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

// 项目分页响应
export interface ProjectPaginatedResponse extends ApiResponse<{
  projects: Project[]
  pagination: PaginationMeta
}> {}

// 镜像分页响应
export interface ImagePaginatedResponse extends ApiResponse<{
  images: Image[]
  pagination: PaginationMeta
}> {}
```

### 使用示例

```typescript
import type { ApiResponse, ProjectPaginatedResponse } from '@/types'

// 获取项目列表
const result = await projectService.getProjects() as ProjectPaginatedResponse

if (result.success && result.data) {
  const projects = result.data.projects
  const pagination = result.data.pagination
}
```

## HTTP状态码规范

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | 成功 | 所有成功的GET、PUT、DELETE请求 |
| 201 | 创建成功 | POST请求创建资源成功 |
| 400 | 请求错误 | 数据验证失败、参数错误 |
| 401 | 未授权 | JWT无效、Token过期 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 唯一性约束冲突 |
| 500 | 服务器错误 | 内部服务器错误 |

## 错误代码规范

| 错误代码 | 含义 | HTTP状态码 |
|---------|------|-----------|
| INVALID_TOKEN | 认证令牌无效 | 401 |
| TOKEN_EXPIRED | 认证令牌已过期 | 401 |
| UNIQUE_VIOLATION | 违反唯一性约束 | 409 |
| FOREIGN_KEY_VIOLATION | 违反外键约束 | 400 |
| VALIDATION_ERROR | 数据验证失败 | 400 |
| NOT_FOUND | 资源不存在 | 404 |
| INTERNAL_SERVER_ERROR | 内部服务器错误 | 500 |
| APPLICATION_ERROR | 应用程序错误 | 500 |

## 向后兼容性

为了确保现有前端代码正常工作，分页响应保持向后兼容：

```typescript
// 旧格式（向后兼容）
interface PaginatedResponse {
  projects?: Project[]
  pagination?: { ... }
}

// 新格式（推荐）
interface ProjectPaginatedResponse extends ApiResponse<{
  projects: Project[]
  pagination: PaginationMeta
}> {}
```

前端代码可以继续使用 `result.projects` 和 `result.pagination`，同时支持 `result.data.projects` 和 `result.data.pagination`。

## 迁移指南

### 后端路由更新

1. 导入响应工具：
```javascript
import { success, error, paginated } from '../utils/apiResponse.js';
```

2. 替换响应代码：
```javascript
// 旧代码
res.status(200).json({
  success: true,
  data: result
});

// 新代码
res.status(200).json(success(result));
```

### 前端服务更新

1. 更新类型导入：
```typescript
import type { ApiResponse, ProjectPaginatedResponse } from '@/types'
```

2. 使用新类型：
```typescript
const result = await http.get(url) as ProjectPaginatedResponse

if (result.success && result.data) {
  // 处理数据
}
```

## 检查清单

- [x] 创建统一API响应工具类
- [x] 定义TypeScript类型
- [x] 更新项目路由使用统一格式
- [x] 更新镜像路由使用统一格式
- [x] 保持向后兼容性
- [x] 更新前端类型定义
- [x] 提供使用文档

## 后续优化建议

1. **全局应用统一格式**：将所有路由迁移到使用 `apiResponse` 工具
2. **错误处理标准化**：使用统一的错误代码
3. **API文档**：基于新格式更新Swagger/OpenAPI文档
4. **类型生成**：从后端类型定义自动生成前端类型

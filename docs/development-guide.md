# iDocker Registry - 开发者指南

> 本文档面向二次开发与维护者：后端/前端分层、数据库 Schema、API 清单、权限矩阵、
> 环境变量与开发约定。安装部署与日常使用请看根目录的 [`README.md`](../README.md)。
>
> 基于 `idocker-registry-server 1.1.0` + `idocker-registry-ui 2.0.6` 梳理（版本号已按 package.json 校正）
> 初版生成日期: 2026-07-29 | 校正日期: 2026-09-16 | 用途: 提升后续开发效率
>
> **校正说明**：原版多处与实际代码不符，已逐条核对修正。文中标 ⚠️ 处均为「已验证的代码事实」。

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术栈速查](#2-技术栈速查)
3. [后端体系详解](#3-后端体系详解)
4. [前端体系详解](#4-前端体系详解)
5. [数据库 Schema](#5-数据库-schema)
6. [API 路由清单](#6-api-路由清单)
7. [角色权限矩阵](#7-角色权限矩阵)
8. [环境变量大全](#8-环境变量大全)
9. [部署与开发流程](#9-部署与开发流程)
10. [开发约定 & 代码模式](#10-开发约定--代码模式)
11. [常见开发任务速查](#11-常见开发任务速查)

---

## 1. 项目概览

iDocker 是一个 **Docker Registry 管理平台**，提供 Web UI 来管理 Docker 镜像仓库。

| 子系统 | 技术 | 端口 | 用途 |
|--------|------|------|------|
| **server** | Node.js/Express + SQLite | 7518/8031 | REST API + Docker Registry v2 代理 |
| **ui** | Vue 3 + TypeScript + Vite | 8030(dev) | SPA 前端 |

> **注意**: NODE_ENV=production 时服务运行在 7518；开发模式 UI 在 8030，API 代理到 8031

**官方资源**：源码 <https://github.com/idocker/idocker-registry> ・ 镜像 `idockervip/idocker-registry:2.0.6`（<https://hub.docker.com/r/idockervip/idocker-registry>）・ 官网 <https://www.idocker.vip>

---

## 2. 技术栈速查

### 后端依赖

| 包 | 用途 | 关键配置 |
|----|------|---------|
| `express` ^4.18.2 | Web 框架 | JSON body limit: 10mb |
| `sqlite3` ^5.1.7 | 数据库 | WAL + NORMAL sync |
| `jsonwebtoken` | JWT | 默认 24h 过期 |
| `bcryptjs` ^2.4.3 | 密码哈希 | 10 轮 salt |
| `http-proxy-middleware` ^2.0.6 | Docker Registry 代理 |
| `winston` ^3.10.0 | 日志 | 5 级 + 文件轮转 |
| `joi` ^17.9.2 | 参数校验 |
| `helmet` ^7.0.0 | 安全头 | CSP 已禁用 |
| `express-rate-limit` ^6.10.0 | 限流 | 15min/1000次，跳过 /v2 |
| `axios` ^1.5.0 | HTTP 客户端 |
| `dotenv` ^16.3.1 | 环境变量 |
| `multer` ^1.4.5 | 文件上传 |

### 前端依赖

| 包 | 用途 |
|----|------|
| `vue` ^3.3.4 | 框架 (Composition API + `<script setup>`) |
| `vue-router` ^4.2.4 | 路由 |
| `vue-i18n` ^9.1.9 | 国际化 (zh-CN/en-US) |
| `pinia` ^2.1.6 | 状态管理 |
| `axios` ^1.5.0 | HTTP |
| `material-design-icons-iconfont` ^6.7.0 | 图标 |
| `sass` ^1.65.0 | CSS 预处理 |
| `typescript` ~5.1.6 | 类型系统 |
| `vite` ^4.4.9 | 构建工具 |
| `vue-tsc` ^1.8.8 | TS 类型检查 |

---

## 3. 后端体系详解

### 3.1 架构模式: Model → Route → Service

```
请求 → 路由(Route) → 参数校验 → 调用 Model/Service → 统一响应
```

- **Model**: 继承 `BaseModel`，提供通用 CRUD + paginate
- **Route**: 只做校验 + 调用 + 响应，无复杂逻辑
- **Service**: 封装复杂业务（认证、Docker 交互、同步）

### 3.2 Middleware 中间件链

```
request → rateLimit → helmet → cors → logging → bodyParser
  → /v2: dockerRegistryRoutes → dockerRegistryProxy
  → /api/auth: authRoutes (无认证)
  → /api/*: authMiddleware + route
  → static files → SPA fallback → errorHandler
```

### 3.3 统一响应格式 (`utils/apiResponse.js`)

```javascript
// 成功带数据
{ success: true, data: {...} }

// 成功带消息
{ success: true, message: "..." }

// 成功分页
{ success: true, data: [...], pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }

// 失败
{ success: false, message: "...", error?: "ERROR_CODE" }

// 验证错误
{ success: false, message: "Data validation failed", errors: [...] }
```

在 Route 层使用: `success()`, `error()`, `paginated()`, `validationError()`

### 3.4 errorHandler 错误处理

| 错误类型 | HTTP Status | error 字段 |
|----------|-------------|------------|
| SQLITE_CONSTRAINT_UNIQUE | 409 | UNIQUE_VIOLATION |
| SQLITE_CONSTRAINT_FOREIGNKEY | 400 | FOREIGN_KEY_VIOLATION |
| Joi 验证错误 | 400 | (details 数组) |
| JsonWebTokenError | 401 | INVALID_TOKEN |
| TokenExpiredError | 401 | TOKEN_EXPIRED |
| 自定义 AppError (statusCode) | 自定义 | 自定义 |
| 其他 | 500 | INTERNAL_SERVER_ERROR |

**关键工具函数**:
- `asyncHandler(fn)`: 包装异步路由，自动捕获 Promise reject
- `notFoundHandler`: 404 路由处理
- `AppError`: 自定义错误类 (`new AppError(msg, statusCode, errorCode)`)

### 3.5 认证体系 (`middleware/auth.js`)

| 中间件 | 用途 | 认证方式 |
|--------|------|---------|
| `authMiddleware` | JWT API 认证 | Bearer Token |
| `requireRole(roles)` | 角色鉴权 | 检查 req.user.role |
| `dockerAuthMiddleware` | Docker Registry 认证 | Basic + Bearer |

**Docker 认证流程**:
1. Docker 客户端发请求 → 无认证头 → 返回 401 + `WWW-Authenticate`
2. 客户端重试带 Basic Auth → `AuthService.verifyUser()`
3. 验证通过 → `req.user` + `req.dockerAuth` → 继续代理

### 3.6 AuthService 关键方法

| 方法 | 用途 |
|------|------|
| `verifyUser(username, password)` | 验证用户凭证 |
| `generateToken(user, expiresIn?)` | 生成 JWT (payload: userId/username/role) |
| `generateDockerToken(user, service, scopes?)` | 生成 Docker Registry Token |
| `validateToken(token)` | 验证 JWT 并返回用户 |
| `hashPassword(password)` | bcrypt 哈希 |
| `comparePassword(password, hashed)` | 密码比对 |
| `extractBasicAuth(header)` | 提取 Basic Auth 凭证 |
| `extractBearerToken(header)` | 提取 Bearer Token |
| `getUserById(userId)` | 通过 ID 获取用户 |
| `usernameExists(username)` | 检查用户名是否存在 |

### 3.7 dockerAuthzService 权限校验

**角色层次**:
- `admin`: pull + push + delete
- `project_manager`: pull + push + delete
- `developer`: pull + push + delete
- `operator`: pull only

**仓库名解析**: `project-name/repo-name` → projectName=project-name, repoName=repo-name
（首段恒为项目名；命名空间仅作管理分组/环境标签，不参与镜像仓库路径）

**单段名**: `nginx` → 归属内置 **default 项目**（default 命名空间），用于共用基础镜像，docker 路径不含项目层（`docker pull idocker.vip/nginx:latest`）；default 项目镜像对所有登录用户可见可拉，push 仅限 admin/被授权成员。

### 3.8 BaseModel 通用方法

| 方法 | 说明 |
|------|------|
| `get(sql, params)` | 查询单条 |
| `all(sql, params)` | 查询多条 |
| `run(sql, params)` | 执行 INSERT/UPDATE/DELETE |
| `paginate(sql, params, page, limit)` | 分页查询 |
| `findById(id)` | 通过 ID 查找 |
| `findAll(where?, params?)` | 查找所有 |
| `create(data)` | 创建（返回含 id） |
| `update(id, data)` | 更新 |
| `delete(id)` | 删除 |

### 3.9 日志系统 (`utils/logger.js`)

```
日志级别: error(0) < warn(1) < info(2) < http(3) < debug(4) < sysinfo(5)
```

| 日志文件 | 级别 | 保留 |
|----------|------|------|
| error.log | 仅 error | 5 个文件 × 5MB |
| combined.log | 所有级别 | 5 个文件 × 5MB |
| exceptions.log | 未捕获异常 | - |
| rejections.log | 未处理 Promise 拒绝 | - |

日志工具函数:
- `logger.info/warn/error/debug(...)`：标准日志
- `createAuditLogger(user, operation, additional)`：创建带审计上下文的日志器
- `logApiRequest(req, res, responseTime)`：记录 API 请求
- `logDockerApiRequest(req, res, registry)`：记录 Docker API 请求

### 3.10 Re-use: 新加功能模板

```javascript
// routes/xxx.js
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { success, error, paginated } from '../utils/apiResponse.js';

const router = express.Router();

router.get('/list', authMiddleware, asyncHandler(async (req, res) => {
  // ...
  res.json(success(data, '成功'));
}));

export default router;

// models/XxxModel.js
import { BaseModel } from './BaseModel.js';
export class XxxModel extends BaseModel {
  constructor() { super('table_name'); }
  // 自定义方法...
}

// index.js 注册
// app.use('/api/xxx', authMiddleware, xxxRoutes);
```

---

## 4. 前端体系详解

### 4.1 目录结构

```
src/
├── components/          # 通用组件 (*Component.vue)
│   ├── HeaderComponent.vue
│   ├── FooterComponent.vue
│   ├── SnackbarComponent.vue
│   └── dialogs/         # 对话框 (*Dialog.vue)
├── views/               # 页面视图 (*View.vue)
│   ├── ImageView.vue
│   ├── ImageDetailView.vue
│   ├── admin/
│   │   ├── LoginView.vue
│   │   ├── UsersView.vue
│   │   ├── ProjectsView.vue
│   │   └── ...
├── stores/              # Pinia 状态
├── services/            # API 调用封装
├── composables/         # 组合式函数
├── types/index.ts       # 所有 TS 类型定义
├── utils/               # 工具函数
│   ├── http.ts          # Axios 封装 (RegistryHttpService)
│   └── helpers.ts       # 标签排序/分页/主题
├── i18n/                # 国际化
├── styles/              # SCSS 样式
└── router/index.ts      # 路由定义 + 鉴权守卫
```

### 4.2 路由定义与鉴权

| 路径 | 名称 | 鉴权 | 管理员 |
|------|------|------|--------|
| `/` | catalog | 是 | - |
| `/images` | images | 是 | - |
| `/images/:id` | image-detail | 是 | - |
| `/admin/login` | admin-login | 否 | - |
| `/admin/profile` | admin-profile | 是 | - |
| `/admin/password` | admin-password | 是 | - |
| `/admin/users` | admin-users | 是 | 是 |
| `/admin/audit` | admin-audit | 是 | 是 |
| `/admin/dashboard` | admin-dashboard | 是 | - |
| `/admin/namespaces` | admin-namespaces | 是 | 是 |
| `/admin/projects` | admin-projects | 是 | 是 |
| `/admin/projects/:id` | admin-project-detail | 是 | 是 |
| `/admin/repositories` | admin-repositories | 是 | 是 |
| `/admin/sync` | admin-sync | 是 | 是 |
| `/:pathMatch(.*)*` | not-found | - | - |

⚠️ 与代码的差异（已核对 `router/index.ts`）：
- 原版列出的 `/images/:imageId/tags/:tagId`（`image-tag-detail`）**不存在**，
  `views/ImageTagDetailView.vue` 也不存在（实际有 `views/admin/RepositoriesView.vue`、`PlaceholderView.vue`）。
- `meta.title` 多为硬编码英文（不走 i18n），全表只有 `admin-repositories` 用了 `meta.titleKey`。
- 守卫除 `requiresAuth` 外还会检查 `requiresAdmin`：非 admin 访问会重定向 `/admin/profile`（不是 403 页）。

**路由守卫逻辑**: `router.beforeEach` 检查 `meta.requiresAuth`
- 未认证 → 显示登录提示 + 重定向 `/admin/login`
- 已登录访问登录页 → 重定向 `/admin/profile`

### 4.3 Pinia Store

| Store | 职责 |
|-------|------|
| `authStore` | token 管理、登录/登出、当前用户、isAuthenticated |
| `registryStore` | Registry 配置 (url/theme/UI 状态) |
| `repositoryStore` | Repository 配置 |

**authStore 核心字段 & 方法**:
- `token`: 当前 JWT Token
- `user`: 当前用户
- `isAuthenticated` (getter): `!!token`
- `isAdmin` (getter): `role === 'admin'`
- `login(credentials)`: 登录 → 存 localStorage
- `logout()`: 退出 → 清 localStorage
- `fetchProfile()`: 拉取用户信息
- `initAuth()`: 初始化（从 localStorage 恢复）

### 4.4 Composables

| Composable | 实际导出 | 引用情况 |
|------------|----------|----------|
| `useApi.ts` | `useApi<T>()`、`usePaginatedApi<T>()`、`useConfirmAction()`、`useSearchAndFilter()` | ⚠️ **全项目零引用** |
| `useAuthListener.ts` | `useAuthListener()`：JWT 过期检测 + 60s 定期检查 | 仅 `App.vue` 使用 |
| `useNotifications.ts` | `showSuccess/showError/showWarning/showInfo`、`useNotifications()` | 6 个组件使用 |
| `useAuthCheck.js` | 认证状态快捷检查（纯 JS） | ⚠️ **零引用** |

⚠️ 原版写的 `useConfirmation()` **不存在**，实际叫 `useConfirmAction()`（内部用原生
`window.confirm`，默认文案硬编码中文）。

**useApi 使用示例**:
```typescript
const { data, isLoading, execute } = useApi<UserProfile>()

async function load() {
  await execute(() => userService.getProfile())
}
```

### 4.5 API 调用层 (`services/*.service.ts`)

```
组件/View → services/*.service.ts → utils/http.ts 的 `http` 单例 (Axios)
```

⚠️ 实际**不经过** `composables/useApi`（它零引用）；service 内部直接 `return http.get<T>('/api/...')`。
`utils/http.ts` 必须**具名导入**：`import { http } from '@/utils/http'`——该文件的默认导出是
`getHttpService` 函数，不是实例。

**服务文件清单**:
| 文件 | 对应后端路由 |
|------|-------------|
| `auth.service.ts` | `/api/auth/*` |
| `user.service.ts` | `/api/users/*` |
| `project.service.ts` | `/api/projects/*` |
| `namespace.service.ts` | `/api/namespaces/*` |
| `repository.service.ts` | `/api/repository/*` |
| `audit.service.ts` | `/api/audit/*` |
| `sync.service.ts` | `/api/sync/*` |
| `dashboard.service.ts` | ⚠️ `/api/dashboard/*` —— **后端根本没有这组路由**（`index.js` 未注册，`routes/` 下无对应文件），调用会落到 Express 默认 404 |

### 4.6 HTTP 拦截器 (`utils/http.ts`)

`RegistryHttpService` 类自动处理:
- **请求**: 注入 Bearer token（UI 认证 + Registry 认证）
- **响应 401 (API)**: 清除认证 + 重定向登录
- **响应 401 (Registry)**: 解析 `www-authenticate` 头 → 自动获取 Token → 重试
- **缓存**: ⚠️ 成功响应会写入内存 Map（TTL 5 分钟），但 `getCachedResponse()` **无任何调用方**——
  缓存**只写不读**，`clearCache()` 不影响数据新鲜度。不要拿它解释「改了数据看不到新值」。
- **错误格式化**: RegistryError 标准化

### 4.7 国际化 (i18n)

```
vue-i18n + 非 legacy 模式 + globalInjection
```
- 默认语言: `zh-CN` (从 localStorage 读取 `locale`)
- Fallback: `en-US`
- 文件: `zh-CN.ts` (1018 行), `en-US.ts` (1016 行)
- **关键模块**: common, nav, managementLayout, namespaces, projects, users, audit, sync, repository, images, auth, message, errors, dialogs, guide

**使用方式**: `$t('key.path')` 或 Composition API 的 `t()`
**添加新语言**: 在 `i18n/locales/` 下新建，在 `i18n/index.ts` 注册

### 4.8 主题系统

```
三模式: light / dark / auto (跟随系统)
驱动: CSS 变量 (variables.scss)
切换: document.body.className = 'dark-theme'
持久化: localStorage
```

**关键 CSS 变量**:

| 变量 | light 值 | dark 值 |
|------|---------|---------|
| `--primary-text` | #25313b | #98a8bd |
| `--background` | #ffffff | #22272e |
| `--card-background` | #ffffff | #1c1f28 |
| `--border-color` | #e0e0e0 | #2d2e2e |
| `--header-background` | #25313b | #333a45 |

### 4.9 前端开发编码规范

1. **组件命名**: 页面视图 `*View.vue`，通用组件 `*Component.vue`，对话框 `*/dialogs/*.vue`
2. **样式**: 使用 `variables.scss` 中的 CSS 变量，在 `global.scss` 写全局样式
3. **类型**: 所有类型集中在 `types/index.ts`，严禁分散定义
4. **API 调用**: 统一的 `useApi<T>()` + `services/*.service.ts` 模式
5. **文本**: 所有用户可见文本走 i18n，禁止硬编码中文/英文
6. **Vite 别名**: `@/` 指向 `src/`

---

## 5. 数据库 Schema

### 5.1 表结构

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `users` | 用户 | id, username(UNIQUE), password, email, full_name, role, is_active, last_login |
| `projects` | 项目 | id, name(UNIQUE), description, namespace, namespace_id, is_active, created_by(FK→users) |
| `repository_members` | 仓库成员 | id, repository_id(FK), user_id(FK), role, UNIQUE(repository_id, user_id) |
| `repositories` | 仓库 | id, name, project_id(FK), description, is_public, is_active, UNIQUE(name, project_id) |
| `image_tags` | 镜像标签 | id, repository_id(FK), tag, digest, size, architecture, os, UNIQUE(repository_id, tag) |
| `audit_logs` | 审计日志 | id, user_id(FK), action, resource_type, resource_id, details(JSON), ip_address, user_agent |
| `registry_configs` | Registry配置 | id, name, url, username, password, is_default, is_active |
| `sync_logs` | 同步日志 | id, sync_type, project_id(FK), user_id(FK), status, processed_count, error_count, duration, details |
| `namespaces` | 命名空间 | id, name(UNIQUE), description, is_active, created_by(FK→users) |

### 5.2 索引

- `idx_users_username` (username)
- `idx_projects_name` (name)
- `idx_repositories_project_id` (project_id)
- `idx_image_tags_repository_id` (repository_id)
- `idx_audit_logs_user_id`, `_action`, `_created_at`
- `idx_namespaces_name` (name)
- `idx_repository_members_repository_id`, `_user_id`

### 5.3 用户角色枚举

`CHECK (role IN ('admin', 'project_manager', 'developer', 'operator'))`

### 5.4 仓库成员角色枚举（`repository_members`）

`CHECK (role IN ('project_manager', 'developer', 'operator'))`

⚠️ 旧的 `project_members` 表已废弃：schema 迁移 v2 会 `DROP TABLE IF EXISTS project_members`，
全新数据库直接置 `user_version = 2`，不会创建该表。`ProjectModel` 中名字带 project 的
`checkProjectPermission()` / `memberExists()` / `getMemberId()` 实际都 JOIN `repositories`
查 `repository_members`——“项目成员”是派生概念。

### 5.5 PRAGMA 配置

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = MEMORY;
```

### 5.6 默认数据

- 管理员: `admin / admin123`
- 命名空间: `default`

---

## 6. API 路由清单

### 6.1 公开路由 (无需认证)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/auth/register` | 注册 (需 ALLOW_USER_REGISTRATION) |
| GET | `/v2/` | Docker Registry API 版本检查 —— ⚠️ **故意返回 401 挑战**（非匿名），以驱动 docker/podman/skopeo 在后续请求都带上凭证，代码注释有明确说明 |

### 6.2 认证路由 (`/api/auth`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/auth/profile` | 获取用户信息 |
| PUT | `/api/auth/change-password` | 修改密码（原版误写为 `/password`） |
| GET | `/api/auth/refresh` | 刷新 Token（原版误写为 POST） |

### 6.3 用户管理 (`/api/users` - 需 admin)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/users` | 用户列表 (分页/搜索) |
| GET | `/api/users/:id` | 用户详情 |
| GET | `/api/users/:id/projects` | 该用户参与的项目 / 仓库成员关系 |
| POST | `/api/users` | 创建用户 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户（软删除） |
| PUT | `/api/users/:id/password` | 重置密码 |

⚠️ 原版列出的 `GET /api/users/all` **不存在**（`routes/users.js` 中没有该路由）。

### 6.4 命名空间 (`/api/namespaces`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/namespaces` | 列表 (分页/搜索) |
| GET | `/api/namespaces/:id` | 详情 |
| POST | `/api/namespaces` | 创建（需 admin） |
| PUT | `/api/namespaces/:id` | 更新描述（需 admin）；改名 409 `NAMESPACE_NAME_IMMUTABLE`；带 `isActive` 一律 400 `NAMESPACE_STATUS_NOT_SUPPORTED`（状态走独立接口） |
| DELETE | `/api/namespaces/:id` | 移入回收站（需 admin）；其下仍有未删除项目时 409 `NAMESPACE_HAS_PROJECTS`；default 为 409 `PROTECTED_RESOURCE` |
| POST | `/api/namespaces/:id/restore` | 从回收站恢复（需 admin） |
| DELETE | `/api/namespaces/:id/purge` | 物理删除（需 admin，不可逆）；其下存在任何项目（含已删除）时 409 `NAMESPACE_HAS_PROJECTS` |

> 三层（命名空间/项目/仓库）的列表接口均支持 `deleted` 参数：`0`（默认，仅未删除）/ `1`（仅回收站）/ `all`。
> “删除”均为假删除：写 `deleted_at` / `deleted_by`，**不动 `is_active`**（启用/停用是另一回事）。
> 物理删除不会级联：只要后代存在（含回收站里的），一律 409 拒绝，需自下而上逐个清理。

### 6.5 项目 (`/api/projects`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/projects` | 项目列表 (权限过滤) |
| GET | `/api/projects/all` | 所有项目 (需 admin) |
| GET | `/api/projects/:id` | 项目详情 |
| POST | `/api/projects` | 创建 (需 admin) |
| PUT | `/api/projects/:id` | 更新 (需 admin) |
| DELETE | `/api/projects/:id` | 移入回收站（需 admin）；其下仍有未删除仓库时 409 `PROJECT_HAS_REPOSITORIES` |
| POST | `/api/projects/:id/restore` | 从回收站恢复（需 admin） |
| DELETE | `/api/projects/:id/purge` | 物理删除（需 admin，不可逆）；其下存在任何仓库（含已删除）时 409 `PROJECT_HAS_REPOSITORIES` |

> **项目级成员管理已废弃**（原基于 `project_members` 表，schema v2 已 DROP）：成员管理统一走仓库级
> `/api/repository/:id/members`。“项目成员”现为派生概念（= 该项目下任一仓库的成员）。

### 6.6 仓库/镜像 (`/api/repository`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/repository` | 仓库列表（分页/搜索） |
| GET | `/api/repository/all` | 全部仓库 |
| GET | `/api/repository/images` | 镜像列表 |
| GET | `/api/repository/images/:imageId` | 镜像详情 |
| GET | `/api/repository/projects/:projectId/images` | 项目镜像列表（注意是 `projects`，原版误写为 `project`） |
| GET | `/api/repository/images/:imageId/tags/:tagId` | 标签详情 |
| DELETE | `/api/repository/images/:imageId/tags/:tagId` | 删除标签 |
| POST | `/api/repository/create` | 创建仓库（⚠️ 非 admin 必须先有仓库才能 push，入口就在这里） |
| POST | `/api/repository/sync` | 触发仓库同步 |
| GET | `/api/repository/config` | Registry 配置（原版误写为 `/images/:imageId/config`） |
| GET | `/api/repository/:id/members` | 仓库成员列表 |
| POST | `/api/repository/:id/members` | 添加仓库成员 |
| PUT | `/api/repository/:id/members/:userId` | 修改成员角色 |
| DELETE | `/api/repository/:id/members/:userId` | 移除成员 |
| PUT | `/api/repository/:id/public` | 切换仓库公开状态 |
| DELETE | `/api/repository/:id` | 移入回收站（admin，或该仓库的 `project_manager`/`developer` 成员）；镜像与标签不动 |
| POST | `/api/repository/:id/restore` | 从回收站恢复（需 admin） |
| DELETE | `/api/repository/:id/purge` | 物理删除 DB 记录（需 admin，不可逆）；标签/成员由 FK CASCADE 一并清除，**registry 里的镜像数据不动**（释放磁盘需离线 GC，见 `deploy/registry-gc.md`） |

### 6.7 审计 (`/api/audit`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/audit/logs` | 审计日志列表 |
| GET | `/api/audit/logs/:id` | 单条日志详情 |
| GET | `/api/audit/statistics` | 审计统计 |
| DELETE | `/api/audit/logs/cleanup` | 清理日志 |
| GET | `/api/audit/actions` | 可选动作枚举 |
| GET | `/api/audit/resource-types` | 可选资源类型枚举 |
| POST | `/api/audit/export` | 导出日志（原版误写为 GET） |

### 6.8 同步 (`/api/sync`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/sync/status` | 同步状态 |
| POST | `/api/sync/all` | 全部同步（原版误写为 GET） |
| POST | `/api/sync/project/:projectId` | 项目同步（原版误写为 `/api/sync/project`） |
| GET | `/api/sync/logs` | 同步日志 |

### 6.9 Docker Registry (`/v2/*`)

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/v2/token` | Token 服务 |
| GET/PUT/DELETE | `/v2/<name>/manifests/<ref>` | manifest 操作 |
| GET/POST/PATCH/PUT | `/v2/<name>/blobs/<digest>/uploads/...` | blob 上传 |
| GET | `/v2/<name>/tags/list` | 标签列表 |
| GET | `/v2/_catalog` | 仓库目录 |

---

## 7. 角色权限矩阵

### 7.1 系统角色 (users.role)

| 角色 | 标识 | 权限范围 |
|------|------|---------|
| admin | admin | 全部权限 |
| 项目管理者 | project_manager | 项目管理、仓库 pull+push+delete |
| 开发者 | developer | 仓库 pull+push+delete |
| 运维人员 | operator | 仓库 pull 只读 |

### 7.2 Docker 操作权限 (dockerAuthzService)

| 角色 | pull | push | delete |
|------|------|------|--------|
| admin | ✅ | ✅ | ✅ |
| project_manager | ✅ | ✅ | ✅ |
| developer | ✅ | ✅ | ✅ |
| operator | ✅ | ❌ | ❌ |

### 7.3 不需要检查权限的情况

- admin 用户可以直接访问所有系统功能和资源
- is_public 为 true 的仓库，所有用户都可以 pull
- 未登录用户只能访问 /v2/ (版本检查) 和 /v2/token

### 7.4 前端路由权限

- `requiresAuth: true`：需要登录
- `requiresAdmin: true`：需要 admin 角色
- 守卫逻辑：未认证 → 登录提示页；已登录访问登录页 → 重定向到 profile

---

## 8. 环境变量大全

### 8.1 服务端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 7518 | 服务端口 |
| `BLUE` | `true` | (未文档化，环境标识) |
| `NODE_ENV` | development | 运行环境（生产镜像已用 Dockerfile 的 `ENV` 固化为 production，compose 无需再设） |
| `DB_PATH` | /app/data/registry.db | 数据库路径 |
| `LOG_LEVEL` | info | 日志级别 |
| `LOG_DIR` | /app/logs | 日志目录 |
| `JWT_SECRET` | (自动生成) | JWT 签名密钥。**无需配置**：未设置时生成 48 字节随机值并以 `JWT_SECRET=...` 写入 `<数据目录>/.env`（权限 0600），重启复用；仅多实例需要共享密钥时才显式指定。历史位置 `<数据目录>/.jwt_secret` 会自动迁移。实现见 `config/jwtSecret.js`。 |
| `JWT_EXPIRES_IN` | 24h | JWT 过期时间 |
| `DOCKER_REGISTRY_URL` | http://localhost:7519 | 内部 Registry 地址；**已写死为常量，不再读环境变量**（单容器、单 registry，见 `config/env.js`） |
| `DOCKER_REGISTRY_TIMEOUT` | 30000 | Registry 请求超时(ms) |
| `DOCKER_REGISTRY_USERNAME` | null | 外部 Registry 用户名 |
| `DOCKER_REGISTRY_PASSWORD` | null | 外部 Registry 密码 |
| `IDOCKER_REGISTRY_URL` | http://localhost:7518 | 平台自身访问地址 |
| `DEFAULT_ADMIN_PASSWORD` | admin123 | 默认管理员密码 |
| `ALLOW_USER_REGISTRATION` | false | 是否允许自助注册 |

### 8.2 前端环境变量 (VITE_)

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_REGISTRY_URL` | - | 默认 Registry URL |
| `VITE_REGISTRY_TITLE` | - | 自定义标题 |
| `VITE_PULL_URL` | - | pull 命令 URL |
| `VITE_DELETE_IMAGES` | false | 允许删除镜像 |
| `VITE_SHOW_CONTENT_DIGEST` | false | 显示内容摘要 |
| `VITE_CATALOG_ELEMENTS_LIMIT` | 1000 | 目录最大元素数 |
| `VITE_SINGLE_REGISTRY` | false | 单 Registry 模式 |
| `VITE_DEFAULT_REGISTRIES` | [] | 默认 Registry 列表 |
| `VITE_READ_ONLY_REGISTRIES` | false | 只读 Registry |
| `VITE_SHOW_CATALOG_NB_TAGS` | false | 显示标签数量 |
| `VITE_HISTORY_CUSTOM_LABELS` | [] | 历史页自定义标签 |
| `VITE_USE_CONTROL_CACHE_HEADER` | false | 使用缓存控制头 |
| `VITE_THEME` | auto | 主题 |
| `VITE_TAGLIST_ORDER` | alpha-asc;num-desc | 标签排序 |
| `VITE_CATALOG_DEFAULT_EXPANDED` | false | 目录默认展开 |
| `VITE_CATALOG_MIN_BRANCHES` | 1 | 最小分支数 |
| `VITE_CATALOG_MAX_BRANCHES` | 1 | 最大分支数 |
| `VITE_TAGLIST_PAGE_SIZE` | 100 | 每页标签数 |
| `VITE_REGISTRY_SECURED` | false | Registry 安全模式 |
| `VITE_SHOW_TAG_HISTORY` | true | 显示标签历史 |

---

## 9. 部署与开发流程

### 9.1 开发模式 (本地前后端)

⚠️ **原版描述的热更新流程已不可用**：`docker-compose.dev.yaml` **在本仓库中不存在**
（工作目录与 `git ls-files` 都没有），`-f docker-compose.dev.yaml` 会直接报错；
`deploy/dev-entrypoint.sh` 也因此成为无引用者。要恢复容器内热更新，需先补回这份 dev override。

当前可用的本地开发方式：

```bash
# 前端：Vite dev server（端口 8030，/api 与 /v2 代理到 8031）
cd idocker-registry-ui && npm run dev:client

# 后端：先 npm install，再起 nodemon（读 idocker-registry-server/.env，PORT=8031）
cd idocker-registry-server && npm run dev

# 前端构建产物（仍需要）
cd idocker-registry-ui && npm run build
```

若要验证容器内行为，需重建镜像后 `docker compose up -d`（见 9.2）。

### 9.2 生产部署

```bash
docker compose up -d
```

### 9.3 容器架构

```
单个容器内:
- docker-registry (内部 Registry, 默认 7519)
- node index.js (Express 服务, 端口 7518)
```

### 9.4 重要文件

| 文件 | 作用 |
|------|------|
| `docker-compose.yaml` | 生产配置 |
| `docker-compose.dev.yaml` | ⚠️ **本仓库不存在**（仅文档引用过，实际文件缺失） |
| `deploy/docker-entrypoint.sh` | 生产入口 |
| `deploy/dev-entrypoint.sh` | 开发入口 |
| `deploy/config.yaml` | Docker Registry 内部配置 |

### 9.5 开发命令速查

```bash
# 后端开发
cd idocker-registry-server && npm run dev     # nodemon 启动

# 前端开发
cd idocker-registry-ui && npm run dev:client  # Vite 启动 (8030)

# 前后端同时：⚠️ 不可用——dev:server 会 cd 到 UI 下不存在的 idocker-registry-server 目录
# cd idocker-registry-ui && npm run dev

# 构建
cd idocker-registry-ui && npm run build       # → dist/（含 vue-tsc --noEmit 类型检查）

# 后端冒烟测试（仅覆盖 apiResponse / messages）
cd idocker-registry-server && npm test

# 代码检查：⚠️ 不可用——.eslintrc.cjs 依赖 @rushstack/eslint-patch，该包不在 devDependencies
# cd idocker-registry-ui && npm run lint
cd idocker-registry-ui && npm run format
```

---

## 10. 开发约定 & 代码模式

### 10.1 后端开发约定

| 约定 | 规则 |
|------|------|
| 响应格式 | 统一使用 `apiResponse.js` 的 `success/error/paginated` |
| 异步错误 | 路由处理函数用 `asyncHandler()` 包裹 |
| 参数校验 | 手动校验，或在 Route 层用 joi |
| 数据库操作 | 通过 Model 层，继承 `BaseModel` |
| 复杂逻辑 | 抽到 Service 层 |
| 日志记录 | 重要操作记录到 `audit_logs` 表 |
| 消息常量 | `utils/messages.js` 中定义了集中消息常量，但**尚未接线**（当前 0 引用）；各 route 实际为硬编码消息（中/英混杂）。新代码跟随所在文件风格即可，整体迁移属独立重构 |
| 文件命名 | 小写驼峰 + 首字母大写类名 |
| 模块引入 | ESM (`import/export`) |
| 控制器 | 不再使用 controllers，逻辑集中在 routes |

### 10.2 前端开发约定

| 约定 | 规则 |
|------|------|
| 组件风格 | Composition API + `<script setup>` |
| 类型定义 | 集中在 `types/index.ts` |
| 状态管理 | 通过 Pinia store |
| API 调用 | `services/*.service.ts` 直接调用 `utils/http.ts` 的 `http` 单例；⚠️ `useApi<T>()` 零引用，不要按原版描述改造 |
| HTTP | 使用 `utils/http.ts` 的 RegistryHttpService |
| 国际化 | 所有用户可见文本走 vue-i18n |
| 路由鉴权 | `meta.requiresAuth` + `meta.requiresAdmin` |
| 文件命名 | 驼峰，视图后缀 `View.vue`，组件后缀 `Component.vue` |
| Vue 文件 | `<template>` → `<script setup lang="ts">` → `<style lang="scss" scoped>` |
| Vite 别名 | `@/` → `src/` |

### 10.3 文件命名字典

| 后缀 | 用途 | 示例 |
|------|------|------|
| `*View.vue` | 页面视图 | `LoginView.vue` |
| `*Component.vue` | 通用组件 | `HeaderComponent.vue` |
| `*Dialog.vue` | 对话框 | `ConfirmationDialog.vue` |
| `*Model.js` | 数据模型 | `UserModel.js` |
| `*Service.js` | 业务服务 | `authService.js` |
| `*.service.ts` | API 调用 | `user.service.ts` |
| `use*.ts` | 组合式函数 | `useApi.ts` |
| `*.store.ts` | (实际上用 Pinia `stores/`) | - |

---

## 11. 常见开发任务速查

### 11.1 新增一个后端功能模块

```bash
# 1. 创建数据模型
touch models/XxxModel.js

# 2. 创建路由
touch routes/xxx.js

# 3. 在 index.js 注册路由
# app.use('/api/xxx', authMiddleware, xxxRoutes);

# 4. 创建前端 API 服务 (可选)
touch src/services/xxx.service.ts

# 5. 添加 i18n 翻译 (在 zh-CN.ts 和 en-US.ts 中添加 key)
```

### 11.2 新增一个前端页面

```bash
# 1. 创建视图文件
touch src/views/admin/XxxView.vue

# 2. 在 router/index.ts 注册路由
# { path: '/admin/xxx', name: 'admin-xxx', component: ... }

# 3. 添加 i18n 翻译

# 4. 如果有 API 调用，创建或扩展 service 文件
```

### 11.3 数据库迁移

```
数据库 schema 变更通过 PRAGMA user_version + 增量 ALTER 实现
查看 config/database.js 中 migration 逻辑
```

### 11.4 添加新语言

```bash
# 1. 复制 en-US.ts 为 xx-XX.ts
# 2. 在 i18n/index.ts 注册
# 3. 所有 key 必须与 en-US.ts 保持一致
```

### 11.5 后端新增一个 Docker 操作类型

```javascript
// 在 dockerUtils.js 的 extractRepositoryAndAction()
// 或 index.js 的 extractDockerOperationInfo() 中添加判断逻辑

// 在 dockerAuthzService.js 的 ROLE_HIERARCHY 中确认权限
```

### 11.6 后端新增环境变量

```javascript
// 1. config/env.js 中添加新的 export
export const MY_NEW_VAR = process.env.MY_NEW_VAR || 'default';

// 2. docker-compose.yaml 中添加 environment 配置

// 3. 使用 import * as env from '../config/env.js' 引用
```

### 11.7 排查常见问题

| 问题 | 排查方向 |
|------|---------|
| 前端 401 循环 | 检查 token 过期 / authStore.initAuth() 是否执行 |
| Registry 连接失败 | 检查 DOCKER_REGISTRY_URL、DOCKER_REGISTRY_TIMEOUT |
| SQLite 锁 | WAL 模式后基本解决，检查 concurrent 写入 |
| 前端构建失败 | npm run build 前先 npm run lint |

---

> **维护说明**：本文档基于对项目源码的扫描整理而成。代码变更后请同步更新对应章节
> （尤其是第 5 节数据库 Schema、第 6 节 API 清单、第 8 节环境变量）；文中标 ⚠️ 的条目
> 是已核对过的代码事实，改动相关逻辑时请一并复核。

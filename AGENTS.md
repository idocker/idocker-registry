# iDocker Registry - Project Knowledge Base

## 项目概览

iDocker是一个Docker Registry管理平台，提供Web UI来管理Docker镜像仓库。包含两个子系统：
- **server** (Node.js/Express) - REST API + Docker Registry v2 proxy
- **ui** (Vue 3/TypeScript) - SPA前端

## 项目结构

```
/workspace/idocker/
├── idocker-registry-server/     # 后端服务
│   ├── index.js                 # 入口：Express启动、中间件、路由注册
│   ├── config/
│   │   ├── env.js               # 环境变量配置（PORT, DB_PATH, JWT_SECRET等）
│   │   └── database.js          # SQLite数据库初始化和连接管理
│   ├── middleware/
│   │   ├── auth.js              # JWT验证、角色鉴权、Docker认证中间件
│   │   └── errorHandler.js      # 统一错误处理、SQLite/JWT/验证错误
│   ├── models/
│   │   ├── BaseModel.js         # 基础CRUD模型（get/all/run/paginate/create/update/delete）
│   │   ├── AuthModel.js         # 用户认证、登录日志、令牌验证
│   │   ├── UserModel.js         # 用户管理（列表/搜索/软删除/统计）
│   │   ├── NamespaceModel.js    # 命名空间CRUD（软删除、项目计数）
│   │   ├── ProjectModel.js      # 项目管理、成员管理、权限检查
│   │   ├── RepositoryModel.js   # 仓库CRUD、标签计数、镜像列表
│   │   ├── ImageTagModel.js     # 镜像标签CRUD
│   │   ├── AuditModel.js        # 审计日志、统计、导出、清理
│   │   ├── DockerLogModel.js    # Docker操作日志
│   │   ├── RegistryConfigModel.js # Registry配置CRUD
│   │   └── SyncLogModel.js      # 同步日志
│   ├── routes/
│   │   ├── auth.js              # /api/auth (login/logout/register/profile/change-password/refresh)
│   │   ├── users.js             # /api/users (CRUD + 用户仓库成员关系查询)
│   │   ├── namespaces.js        # /api/namespaces (CRUD + reactivate)
│   │   ├── projects.js          # /api/projects (CRUD + 成员管理 + role管理)
│   │   ├── repository.js        # /api/repository (images/tags/sync/config)
│   │   ├── dockerRegistry.js    # /v2/* (Docker Registry API代理 + 鉴权 + Token服务)
│   │   ├── audit.js             # /api/audit (logs/statistics/export/cleanup)
│   │   └── sync.js              # /api/sync (status/all/project/logs)
│   ├── services/
│   │   ├── authService.js       # JWT生成/验证、密码哈希、Basic/Bearer提取
│   │   ├── dockerAuthzService.js # Docker操作权限校验（project/repo角色）
│   │   ├── dockerRegistryService.js # Docker Registry API交互（catalog/tags/manifest/blob）
│   │   ├── dockerLogService.js  # Docker操作日志记录
│   │   └── dockerSyncService.js # 仓库数据同步逻辑
│   └── utils/
│       ├── apiResponse.js       # 统一响应：success/error/paginated/validationError
│       ├── dockerUtils.js       # 仓库名解析、认证挑战生成、Docker错误响应
│       ├── logger.js            # Winston日志（控制台+文件）
│       └── messages.js          # 集中式消息常量（国际化）
├── idocker-registry-ui/        # 前端
│   ├── src/
│   │   ├── main.ts             # 入口：Pinia + Router + i18n
│   │   ├── App.vue             # 根组件：Header+RouterView+Footer+Snackbar+登录提示
│   │   ├── router/index.ts     # 路由定义 + 鉴权守卫
│   │   ├── stores/
│   │   │   ├── auth.ts         # Pinia：令牌管理、登录/登出、Profile
│   │   │   ├── registry.ts     # Pinia：Registry配置、主题、UI状态
│   │   │   └── repository.ts   # Pinia：Repository配置（与registry类似）
│   │   ├── services/
│   │   │   ├── repository.service.ts # 镜像/标签API
│   │   │   ├── project.service.ts    # 项目API
│   │   │   ├── auth.service.ts       # 认证API
│   │   │   ├── user.service.ts       # 用户管理API
│   │   │   ├── namespace.service.ts  # 命名空间API
│   │   │   ├── audit.service.ts      # 审计日志API
│   │   │   ├── sync.service.ts       # 同步API
│   │   │   └── dashboard.service.ts  # 仪表盘API
│   │   ├── composables/
│   │   │   ├── useApi.ts            # API调用状态管理 + 分页 + 确认弹窗
│   │   │   ├── useAuthListener.ts   # 令牌过期检测、自动刷新、定期检查
│   │   │   ├── useAuthCheck.js      # 认证状态快捷检查
│   │   │   └── useNotifications.ts  # 通知系统（success/error/warning/info）
│   │   ├── styles/
│   │   │   ├── variables.scss       # CSS变量（颜色、阴影、间距）
│   │   │   ├── global.scss          # 全局样式
│   │   │   ├── components.scss      # 组件样式
│   │   │   ├── layout.scss          # 布局样式
│   │   │   ├── typography.scss      # 排版样式
│   │   │   └── mixins.scss          # SCSS混合
│   │   ├── types/index.ts          # 所有TypeScript类型定义
│   │   ├── utils/
│   │   │   ├── http.ts             # Axios封装（缓存、认证、拦截器）
│   │   │   └── helpers.ts          # 工具函数（标签排序、分页、主题、存储）
│   │   ├── components/
│   │   │   ├── HeaderComponent.vue  # 顶部导航（主题切换+语言+用户菜单）
│   │   │   ├── FooterComponent.vue
│   │   │   ├── ErrorComponent.vue
│   │   │   ├── SnackbarComponent.vue
│   │   │   ├── SearchBar.vue
│   │   │   ├── LanguageSwitcher.vue
│   │   │   ├── VersionNotification.vue
│   │   │   └── dialogs/
│   │   │       ├── RegistryMenu.vue
│   │   │       └── UserMenu.vue
│   │   └── views/
│   │       ├── ImageView.vue            # 主页：项目列表+镜像展示
│   │       ├── ImageDetailView.vue      # 镜像详情
│   │       ├── ImageTagDetailView.vue   # 标签详情
│   │       ├── NotFoundView.vue
│   │       └── admin/
│   │           ├── LoginView.vue
│   │           ├── ProfileView.vue
│   │           ├── PasswordView.vue
│   │           ├── UsersView.vue
│   │           ├── AuditView.vue
│   │           ├── DashboardView.vue
│   │           ├── NamespacesView.vue
│   │           ├── ProjectsView.vue
│   │           ├── ProjectDetailView.vue
│   │           └── SyncView.vue
│   └── i18n/index.ts            # 国际化（zh-CN/en-US）
└── deploy/                      # 部署脚本 + Docker
```

---

## 后端规则与约定

### 1. 架构模式：Model-Route-Service
- **Model** 继承 `BaseModel`，提供通用CRUD + paginate
- **Route** 只做：参数校验 → 调用Model/Service → 统一响应
- **Service** 封装复杂业务逻辑（认证、Docker交互、同步）

### 2. 响应格式（apiResponse.js）
```javascript
// 成功带数据
{ success: true, data: {...} }
// 成功分页
{ success: true, data: [...], pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }
// 失败
{ success: false, message: "...", error?: "ERROR_CODE" }
```

### 3. 路由注册顺序（index.js）
1. `/v2` → dockerRegistryRoutes（自定义Docker Registry端点）
2. `/v2` → dockerRegistryProxy（代理到内部Registry）
3. `/api/auth` → authRoutes（无需认证）
4. `/api/*` → 其余路由（均需 authMiddleware）
5. Static files + SPA fallback

### 4. 权限体系
| 角色 | 访问范围 |
|------|----------|
| `admin` | 所有资源，所有项目 |
| `owner` | 项目所有者，可管理成员 |
| `maintainer` | 项目维护者，可push镜像 |
| `viewer` | 项目成员，可pull镜像 |

- 项目角色存储于 `project_members` 表（role: owner/maintainer/viewer）
- Docker Registry权限校验在 `DockerAuthzService.checkRepositoryPermission()`

### 5. 数据库
- SQLite，使用 `sqlite3` 包（回调风格，由BaseModel包装为Promise）
- 自动建表：首次启动 `initDatabase()` 创建所有表+索引+默认数据
- 默认管理员：`admin / admin123`
- 默认命名空间：`default`
- PRAGMA: `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=NORMAL`

### 6. Docker Registry代理机制
- `http-proxy-middleware` 将 `/v2/*` 请求代理到内部Registry（默认 localhost:7519）
- 请求经过：鉴权 → 权限校验 → 代理转发 → 操作日志记录
- `/v2/token` 端点处理Docker客户端的Token认证请求
- URL中仓库名称格式：`project-name/repo-name`（首段为项目名；命名空间仅用于团队/环境等管理分组，不参与镜像仓库路径）
- **内置 default 项目**（从属 default 命名空间）：存放 nginx/mysql/redis/jdk 等共用基础镜像，**使用单段名称、路径不带项目层**，例如 `idocker.vip/nginx:latest`（单段自动归属 default 项目，多段照常 `project/repo`）
- default 项目镜像对**所有登录用户**可见、可拉取（pull 放行）；**推送仅管理员/被授权成员**（非成员 push 一律 403）
- 密码规则：至少 6 字符且**必须包含至少 1 个特殊符号**（大小写/数字不强制）
- 服务器统一时区 **Asia/Shanghai**（宿主 + 容器 TZ + 镜像内置 tzdata）；SQLite 存 UTC ISO，Web 按浏览器时区展示
- 镜像 push 成功后**即时同步 tag 入库**（无需手动 sync）；若最新 tag（按 `image_tags.created_at`）非 latest，会自动把该 digest 再以 `latest` 引用推送（`docker pull <repo>` 恒为最新）
- 内部 registry 配置：`relativeurls: true`（Location 相对化，避免回传内部 localhost 地址）、`storage.delete.enabled: true`（标签删除可用）、manifest 解析 Accept 含 OCI（`vnd.oci.image.*`）
- /v2 仓库权限校验基于 `repository_members`（角色 project_manager/developer/operator），admin 全权；普通用户镜像列表 = 成员项目 ∪ default 项目

### 7. 日志
- Winston：控制台 + 文件（error.log, combined.log, exceptions.log, rejections.log）
- 日志级别：error(0) < warn(1) < info(2) < http(3) < debug(4) < sysinfo(5)
- 所有重要操作记录到 `audit_logs` 表

### 8. 安全
- Helmet安全头（禁用CSP以兼容Docker Registry）
- Rate limiting（15分钟1000次，跳过/v2路径）
- CORS（生产环境全开，开发环境限制origin）
- JWT令牌（默认24h过期）
- 密码bcrypt哈希（10轮salt）

---

## 前端规则与约定

### 1. 技术栈
- Vue 3 (Composition API + `<script setup>`)
- TypeScript（类型定义集中在 `types/index.ts`）
- Pinia（状态管理）
- Vue Router（路由守卫鉴权）
- Axios（HTTP客户端，带缓存和自动Bearer Token注入）
- vue-i18n（国际化，zh-CN/en-US）
- SCSS（CSS变量主题系统）

### 2. 状态管理
- `authStore` - 认证状态（token/user/isAuthenticated）
- `registryStore` - Registry配置（url/theme/UI状态）
- `repositoryStore` - Repository配置（与registryStore几乎相同）

### 3. API调用模式
- `services/*.service.ts` 封装API调用
- 底层通过 `utils/http.ts`（RegistryHttpService类）发送请求
- Axios拦截器自动处理：
  - 注入 `Bearer` token
  - 401错误 → 清除认证 + 重定向登录
  - Registry 401 → 自动获取Token并重试
  - 响应缓存（5分钟TTL）

### 4. 路由鉴权
- `router.beforeEach` 守卫检查 `meta.requiresAuth`
- 未认证 → 显示登录提示 + 重定向到 `/admin/login`
- 已登录访问登录页 → 重定向到 `/admin/profile`

### 5. 国际化
- `vue-i18n`，默认 `zh-CN`，fallback `en-US`
- 组件中使用 `$t('auth.sessionExpired')` 或 `t()` (Composition API)
- 所有用户可见文本均应使用i18n

### 6. 主题系统
- 三种模式：`light` / `dark` / `auto`（跟随系统）
- CSS变量驱动（定义在 `variables.scss`）
- 通过 `document.body.className` 切换 `dark-theme` 类
- 主题存储在localStorage

### 7. 组件命名
- 页面视图：`*View.vue`（ImageView, LoginView等）
- 通用组件：`*Component.vue`（HeaderComponent）
- 对话框：`*/dialogs/*.vue`（RegistryMenu, UserMenu）

---

## 开发常用命令

```bash
# 安装依赖
cd idocker-registry-server && npm install
cd idocker-registry-ui && npm install

# 构建
npm run build

# 代码检查
npm run lint
npm run format
```

---

## 线上运行位置（事实源，务必区分）

**iDocker 的实际运行/启动由 `/data/docker/idocker` 目录下的 compose 管理**，而非本源码仓库内的 compose：

- 线上目录：`/data/docker/idocker/docker-compose.yaml`（生产 compose，唯一事实源）
- 服务/容器：服务名 `idocker-registry`，容器名 `idocker`，镜像 `idocker-registry:latest`
- 端口：容器内 7518（iDocker Web/API），对外映射 `7588:7518`；容器内 7519 为内部 docker-registry，未映射宿主机
- 卷挂载：`./registry → /var/lib/registry`（镜像 blob）、`./data → /app/data`（SQLite `registry.db`）、`./logs → /app/logs`
- 该目录**只含 compose 与运行时数据，不含应用源码**（代码在镜像内 `/app/idocker`）
- 启动/停止/重启/查状态/看日志，均以 `/data/docker/idocker` 为工作目录执行，例如：
  ```bash
  cd /data/docker/idocker && docker compose up -d    # 启动
  docker compose down                                # 停止
  docker compose ps                                  # 状态
  docker logs -f idocker                             # 容器日志
  ```

本仓库（源码区）根目录的 `docker-compose.yaml` / `docker-compose.dev.yaml` 用于**构建镜像与开发调试**，不是线上启动文件；线上改动代码后需重建镜像 `idocker-registry:latest` 并到 `/data/docker/idocker` 重启 compose 才生效。

---

## Docker 开发模式（热更新，推荐）

首次启动：
```bash
# 编译前端
cd idocker-registry-ui && npm run build

# 启动容器（带源码 volume mount + nodemon 热重载）
cd /workspace/idocker && docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
```

日常迭代流程（无需重启容器）：
```
# 改前端 → 编译 → 刷新浏览器
cd idocker-registry-ui && npm run build    # ~5s
# 浏览器刷新即可看到变化

# 改后端 → 自动重启
# 直接修改 idocker-registry-server/ 下任意 .js 文件
# nodemon --legacy-watch 通过轮询检测变化，自动重启 node 进程
# 等待 ~3s 后刷新浏览器即可
```

### 关键配置

| 文件 | 作用 |
|------|------|
| `docker-compose.yaml` | **生产配置** – 纯镜像启动，无热更新挂载 |
| `docker-compose.dev.yaml` | **开发配置** – 叠加到生产配置上，添加 volume mount + nodemon 入口 |
| `deploy/dev-entrypoint.sh` | 开发入口：启动 docker-registry + nodemon polling 热重载 |
| `deploy/docker-entrypoint.sh` | 生产入口（镜像 `CMD` 默认） |

### 环境切换

```bash
# 生产部署
docker compose up -d

# 开发调试（源码热更新）
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
```

生产环境的 UI 静态文件来自镜像构建（`Dockerfile` 中 `COPY --from=builder /app/ui/dist /app/idocker/public`），后端代码也来自镜像，无需 volume 覆盖。

### 后端热更新原理

- `nodemon --legacy-watch` 运行在容器内，轮询 `/app/idocker`（排除 `node_modules`）
- 容器 `node_modules` 来自镜像构建（Alpine 编译），不会被 host 覆盖
- 所有 source 目录（`config/` `routes/` `models/` `services/` `middleware/` `utils/` + `index.js` + `.env`）通过 volume mount 从 host 同步
- 热更新 **不适用**：修改 `package.json`（需重建镜像）、新增 npm 包（需重建镜像）

---

## 关键文件速查

| 功能 | 后端文件 | 前端文件 |
|------|---------|---------|
| 认证 | `routes/auth.js`, `services/authService.js` | `stores/auth.ts`, `services/auth.service.ts` |
| 项目管理 | `routes/projects.js`, `models/ProjectModel.js` | `services/project.service.ts` |
| 命名空间 | `routes/namespaces.js`, `models/NamespaceModel.js` | `services/namespace.service.ts` |
| 镜像/标签 | `routes/repository.js`, `models/RepositoryModel.js` | `services/repository.service.ts` |
| Docker代理 | `routes/dockerRegistry.js`, `services/dockerAuthzService.js` | `utils/http.ts` |
| 审计 | `routes/audit.js`, `models/AuditModel.js` | `services/audit.service.ts` |
| 同步 | `routes/sync.js`, `services/dockerSyncService.js` | `services/sync.service.ts` |
| 用户管理 | `routes/users.js`, `models/UserModel.js` | `services/user.service.ts` |

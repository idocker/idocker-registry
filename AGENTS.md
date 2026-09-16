# iDocker Registry - Project Knowledge Base

## 项目概览

iDocker是一个Docker Registry管理平台，提供Web UI来管理Docker镜像仓库。包含两个子系统：
- **server** (Node.js/Express) - REST API + Docker Registry v2 proxy
- **ui** (Vue 3/TypeScript) - SPA前端

## 项目结构

```
/workspace/idocker-registry/    # 本工作空间根（注意：不是 /workspace/idocker，后者不存在）
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
│   │   ├── ProjectModel.js      # 项目管理、权限检查（成员关系一律查 repository_members）
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
│   │   ├── projects.js          # /api/projects (CRUD；成员管理已迁至仓库级)
│   │   ├── repository.js        # /api/repository (images/tags/create/sync/config + 仓库成员管理)
│   │   ├── dockerRegistry.js    # /v2/* (Docker Registry API代理 + 鉴权 + Token服务)
│   │   ├── audit.js             # /api/audit (logs/statistics/actions/export/cleanup)
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
│   │           ├── RepositoriesView.vue
│   │           ├── PlaceholderView.vue  # /admin/user-guide 占位页
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
// 成功带消息
{ success: true, message: "..." }
// 成功分页
{ success: true, data: [...], pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }
// 失败
{ success: false, message: "...", error?: "ERROR_CODE" }
// 验证错误
{ success: false, message: "Data validation failed", errors: [...] }
```

工具函数（`apiResponse.js`）：`success` / `successMessage` / `paginated` / `error` / `validationError`。

### 3. 路由注册顺序（index.js）
1. helmet → cors → rateLimit（`skip` 掉 `/v2`）→ `express.json({limit:'10mb'})` → 日志中间件
2. `/v2` → dockerRegistryRoutes（token 服务 + 鉴权 + 权限校验）
3. `/v2` → dockerRegistryProxy（代理到内部Registry）
4. `/api/auth` → authRoutes（无需认证）
5. `/api/{users,namespaces,projects,repository,audit,sync}` → 均挂 authMiddleware
6. `express.static(public/)`
7. errorHandler
8. SPA fallback（非 `/api`、非 `/v2`、且路径不带文件扩展名 → index.html）

⚠️ `errorHandler` 注册在 SPA fallback **之前**，且项目里**没有 404 handler**：未匹配的
`/api/*` 路径拿到的是 Express 默认 404 HTML，而不是 `{success:false}` 形状。
不要假设所有错误响应都是统一格式。

### 4. 权限体系

**系统角色**（`users.role`，数据库 CHECK 约束枚举）：

| 角色 | 访问范围 | Docker 动作 |
|------|----------|-------------|
| `admin` | 所有资源、所有项目，无需成员关系 | pull / push / delete |
| `project_manager` | 项目管理者 | pull / push / delete |
| `developer` | 开发人员 | pull / push / delete |
| `operator` | 运维只读 | 仅 pull |

**仓库级成员**（`repository_members` 表，Docker 权限的唯一授权来源）：

- 角色枚举：`project_manager` / `developer` / `operator`，行级唯一约束 `UNIQUE(repository_id, user_id)`
- ⚠️ 旧的 `project_members` 表**已废弃**：schema 迁移 v2 执行 `DROP TABLE IF EXISTS project_members`，
  全新数据库直接置 `user_version = 2`，根本不会创建该表。
- `ProjectModel` 里名字带 project 的 `checkProjectPermission()` / `memberExists()` / `getMemberId()`
  实际都 JOIN `repositories` 去查 `repository_members`（源码注释也写明"项目成员 = 该项目下任一仓库的成员"）。
  "项目成员"因此是**派生概念**，没有独立存储。
- 项目下的镜像可见性判定见 `routes/repository.js`，走的就是上述派生逻辑。
- Docker Registry 权限校验入口：`DockerAuthzService.checkRepositoryPermission()`

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
- **default 命名空间与 default 项目受保护，不可删除**：`NamespaceModel.deleteNamespace()` 与
  `ProjectModel.deleteProject()` 在命中 `name === 'default'` 时直接抛错，路由层返回 409
  `PROTECTED_RESOURCE`。同时禁止通过 `PUT` 绕过：改名（`Cannot rename the default ...`）与
  停用（`is_active=0`）都会被 409 拒绝——否则先改名/停用再删除即可绕过保护。
  判定依据是**名字字面量 `'default'`**（路径解析、`findByName('default')` 等多处都依赖它），
  不是 id，所以两处保护都校验名称。前端 `NamespacesView` / `ProjectsView` 已隐藏 default 的删除按钮。
- ⚠️ **非 admin 用户不能靠 push 创建新仓库**：`checkRepositoryPermission()` 要求仓库已存在于数据库，
  否则返回 403（`Repository '<x>' not found — push requires an existing repository`）。
  新仓库需先在 Web UI 建好再 push。注意 `dockerRegistry.js` 里的 `:name/manifests/:reference`
  这类单段参数路由**匹配不到** `project/repo` 多段名，所以代码里的 `createRepositoryIfNotExists`
  那条路径实际基本不会触发。
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
- `authStore` - 认证状态（token/user/isAuthenticated）；localStorage key：`idocker_token`、`user_data`
- `registryStore` - Registry配置（url/theme/UI状态）；localStorage key：`registryServers`、`theme`
- `repositoryStore` - ⚠️ **零引用的死 store**，是 registryStore 的改名副本，且引用了
  `.env` 与 `env.d.ts` 中都不存在的 `VITE_REPOSITORY_*` / `VITE_SINGLE_REPOSITORY` 等变量——不要基于它开发
- 全项目**没有 pinia 持久化插件**，全部手写裸 key（另：语言用 `locale`，见 `i18n/index.ts`）

### 3. API调用模式
- `services/*.service.ts` 封装API调用：`class XxxService` + 文件末尾 `export default new XxxService()`
- 底层通过 `utils/http.ts` 的**具名导出** `http` 单例（`RegistryHttpService` 类）。
  必须 `import { http } from '@/utils/http'` —— 该文件的默认导出是 `getHttpService` 函数，不是实例
- ⚠️ `composables/useApi.ts` 全项目**零引用**（`useApi`/`usePaginatedApi`/`useConfirmAction`/
  `useSearchAndFilter` 均无调用点）。"`services/*.service.ts` → `useApi<T>()`" 这条链在实际代码中
  **不存在**，不要按它改造
- `stores/auth.ts` 的登录/登出/profile/改密走原生 axios，与 `http` 并存；两种写法跟随所在文件即可
- Axios拦截器自动处理：
  - 注入 `Bearer` token（`/api/` 用 `authStore.token`，其余用 `registryStore.authToken`）
  - `/api/` 401 → 清除认证 + 硬跳转 `/admin/login?redirect=...`
  - Registry 401 → 解析 `www-authenticate` 取 Token 后重试一次
  - 响应缓存：⚠️ 成功响应会写入内存 Map（TTL 5 分钟），但 `getCachedResponse()` **没有任何调用方**
    —— **缓存只写不读**，排查"改了数据看不到新值"时不要把它当嫌疑

### 4. 路由鉴权
- `router.beforeEach` 守卫检查 `meta.requiresAuth`
- 未认证 → 显示登录提示 + 重定向到 `/admin/login`
- 已登录访问登录页 → 重定向到 `/admin/profile`

### 5. 国际化
- `vue-i18n`，默认 `zh-CN`，fallback `en-US`
- 组件中使用 `$t('auth.sessionExpired')` 或 `t()` (Composition API)
- 所有用户可见文本均应使用i18n
- ⚠️ **消息里的 `@` / `|` / `{}` 会被 vue-i18n 当作语法解析**，字面量必须转义，
  否则在该键**首次渲染时**抛 `SyntaxError: Invalid linked format` 之类错误，
  导致整个页面白屏——而源码里那串文案看起来完全正常，极难定位：
  - `@` → `{'@'}`（否则被当作 linked message，如 `@:key`）
  - `|` → `{'|'}`（复数分隔符）
  - `{` `}` → `{'{'}` / `{'}'}`（插值）
- 实例：`password.requirementSpecial` 的 `!@#$%^&*` 曾使修改密码页白屏
  （2026-09 修复）。改完 i18n 文案可用 `@intlify/message-compiler` 的
  `baseCompile(msg, { onError })` 快速验证：无 onError 回调即通过。

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
# 安装依赖（两个子系统各自独立；package-lock.json 已入库，npm ci 可复现）
cd idocker-registry-server && npm ci
cd idocker-registry-ui && npm ci

# 前端构建（= vue-tsc --noEmit && vite build，类型不通过就没有产物）
cd idocker-registry-ui && npm run build

# 后端冒烟测试（仅覆盖 apiResponse / messages 两个纯逻辑模块，不碰数据库与 HTTP）
cd idocker-registry-server && npm test

# 后端语法自检
node --check idocker-registry-server/routes/xxx.js

# 格式化
cd idocker-registry-ui && npm run format

# 代码检查：⚠️ 当前跑不起来 —— .eslintrc.cjs 依赖 @rushstack/eslint-patch，该包不在 devDependencies
# cd idocker-registry-ui && npm run lint
```

> `idocker-registry-ui/package.json` 里的 `dev` / `dev:server` / `build:server` / `start` / `init-db`
> 都会 `cd idocker-registry-server`，但 UI 目录下**没有**这个子目录——这些脚本在本仓库布局下失效，
> 只有 `dev:client` 与 `build` 可用。

---

## 提交与发布约定

- **前端版本号每次推送递增**：`idocker-registry-ui/package.json` 的 `version` 是 UI
  页脚显示的唯一来源（`vite.config.ts` 用 `define` 注入 `__APP_VERSION__`，
  `FooterComponent.vue` 读取）。每次要推送的前端改动都把它 +1，并在**同一次提交**里
  跑 `npm install --package-lock-only` 同步 `package-lock.json` 里的 version，
  否则 lock 与 package.json 不一致。
- 用户说「提交」= 仅 `git commit`；说「提交推送」= commit + push。

---

## 线上运行位置（生产环境；本节未在源码区验证）

> **验证状态**：本节描述的是**生产服务器**上的部署形态。在当前工作空间（源码区）中，
> `ls /data/docker/idocker` 返回不存在，`docker ps` 也没有对应容器，故本节内容**无法在源码区复现验证**。
> 请以实际登录生产机的观察为准，不要把它当作本仓库可验证的事实。

**iDocker 的实际运行/启动由 `/data/docker/idocker` 目录下的 compose 管理**，而非本源码仓库内的 compose：

- 线上目录：`/data/docker/idocker/docker-compose.yaml`（生产 compose，唯一事实源）
- 服务/容器：服务名 `idocker-registry`，容器名 `idocker`，镜像 `idocker-registry:latest`
- 端口：容器内 7518（iDocker Web/API），对外映射 `7588:7518`；容器内 7519 为内部 docker-registry，未映射宿主机
- 卷挂载：`./registry → /var/lib/registry`（镜像 blob）、`./data → /app/data`（SQLite `registry.db`）、`./logs → /app/logs`
- ⚠️ **容器以非 root 运行（`USER node`，uid/gid 1000）**，而 bind mount 会盖掉镜像内
  目录的属主。首次部署、或重建过这三个宿主目录后，必须先 `chown -R 1000:1000`，否则
  内部 registry 写不了 blob（push 全失败）、后端写不了 `registry.db`（启动即挂）。
- 该目录**只含 compose 与运行时数据，不含应用源码**（代码在镜像内 `/app/idocker`）
- 启动/停止/重启/查状态/看日志，均以 `/data/docker/idocker` 为工作目录执行，例如：
  ```bash
  cd /data/docker/idocker && docker compose up -d    # 启动
  docker compose down                                # 停止
  docker compose ps                                  # 状态
  docker logs -f idocker                             # 容器日志
  ```

本仓库（源码区）根目录的 `docker-compose.yaml` 用于**构建镜像**，不是线上启动文件；
线上改动代码后需重建镜像 `idocker-registry:latest` 并到 `/data/docker/idocker` 重启 compose 才生效。

### 本仓库 `docker-compose.yaml` 的实际内容（已核对）

| 项 | 本仓库实际值 |
|----|--------------|
| 镜像 | `idocker-registry:1.0.2`；**没有 `build:` 段**，必须先手工 `docker build` |
| 容器名 | `idocker-registry` |
| 端口 | `7588:7518`；内部 registry 7519 不映射到宿主 |
| 卷 | `./test/registry-data`、`./test/app-data`、`./test/app-logs`（`test/` 不入 git） |
| 环境 | `TZ=Asia/Shanghai`、`DOCKER_REGISTRY_URL=http://localhost:7519`、`NODE_ENV=production` 等 |

⚠️ 这些值与上一节描述的线上值（容器名 `idocker`、镜像 `:latest`、卷 `./registry|./data|./logs`）
**不一致**：这是两套不同的部署形态，改部署相关代码时务必先确认目标环境。

---

## Docker 开发模式（热更新）

> ⚠️ **该流程当前不可用**：`docker-compose.dev.yaml` **在本仓库中不存在**（工作目录与 `git ls-files`
> 都没有），`-f docker-compose.dev.yaml` 会直接报错；`deploy/dev-entrypoint.sh` 也因此成为无引用者。
> 若要恢复容器内热更新，需先补回这份 dev override（源码 volume 挂载 + nodemon 入口）。

首次启动（可用部分）：
```bash
# 编译前端产物
cd idocker-registry-ui && npm run build
```

日常本地开发（当前推荐，不依赖 dev compose）：
```bash
# 前端：Vite dev server，端口 8030，/api 与 /v2 代理到 8031
cd idocker-registry-ui && npm run dev:client

# 后端：先 npm install，再起 nodemon（读 idocker-registry-server/.env，PORT=8031）
cd idocker-registry-server && npm run dev
```

改完代码要验证容器内运行效果，只能重建镜像并重启 compose（见上一节）。

### 关键配置

| 文件 | 作用 | 本仓库状态 |
|------|------|------------|
| `docker-compose.yaml` | 纯镜像启动，无热更新挂载 | ✅ 存在 |
| `docker-compose.dev.yaml` | 叠加生产配置，添加 volume mount + nodemon 入口 | ❌ **不存在** |
| `deploy/dev-entrypoint.sh` | 开发入口：启动 docker-registry + nodemon polling | ⚠️ 存在但无引用者 |
| `deploy/docker-entrypoint.sh` | 生产入口（镜像 `CMD` 默认） | ✅ 存在 |

### 环境切换

```bash
# 生产部署
docker compose up -d

# 开发调试（源码热更新）—— 需先补回 docker-compose.dev.yaml，当前不可用
# docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
```

生产环境的 UI 静态文件来自镜像构建（`Dockerfile` 中 `COPY --from=builder /app/ui/dist /app/idocker/public`），后端代码也来自镜像，无需 volume 覆盖。

### 后端热更新原理（前提：存在 dev compose；本仓库当前不成立）

以下描述的是 `deploy/dev-entrypoint.sh` 与 dev override 配合时的行为：

- `nodemon --legacy-watch` 运行在容器内，轮询 `/app/idocker`（排除 `node_modules`）
- 容器 `node_modules` 来自镜像构建（Alpine 编译），不会被 host 覆盖
- 所有 source 目录（`config/` `routes/` `models/` `services/` `middleware/` `utils/` + `index.js` + `.env`）通过 volume mount 从 host 同步
- 热更新 **不适用**：修改 `package.json`（需重建镜像）、新增 npm 包（需重建镜像）

---

## 已知陷阱与死代码（已逐条核对代码）

以下内容不影响主流程，但会误导阅读与改动，列出来避免重复踩坑：

**后端**
- `utils/messages.js` 定义了集中式消息常量，但**全仓库 0 处引用**；各 route 实际是硬编码消息（中英混杂）。
  新代码跟随所在文件风格即可，整体迁移属于独立重构，别混进无关改动。
- `middleware/auth.js` 的 `requireProjectPermission` 引用了**未定义的 `dbGet`**，且无任何调用点——死代码，不要复用。
- `middleware/auth.js` 的 `dockerAuthMiddleware` / `handleTokenService` 与 `routes/dockerRegistry.js` 内的
  同名实现重复；`/v2` 实际生效的是 `routes/dockerRegistry.js` 那份。
- `index.js` 的请求日志中间件用 `res.statusCode !== 200` 判断错误，但它执行于请求**开始时**，
  此时 `statusCode` 恒为 200 —— 该错误日志分支实际不会触发。

**前端**
- 零引用代码：`composables/useApi.ts`、`composables/useAuthCheck.js`、`stores/repository.ts`、
  `utils/helpers.ts` 的 `applyTheme()`。
- `types/index.ts`、`services/user.service.ts`、`services/sync.service.ts` 各有三行
  `import type { ... } from 'vue-router/dist/router-CWoNjPRp.mjs'`（指向 vue-router 构建产物的 hash 文件名，
  疑为 IDE 误自动导入，导入的 `P`/`A` 均未使用）。由于 `build` 会跑 `vue-tsc --noEmit`，这是最可能挡住
  构建的地方，动这三个文件时优先删掉这几行。
- `views/admin/DashboardView.vue` 链到 `/admin/repositories/${id}`，但路由表只有 `/admin/repositories`
  （无 `:id`），点击会落到 not-found。
- `tsconfig.json` 是 `"strict": false`，类型检查比预期宽松，不要假设严格模式在兜底。

**部署 / 构建**
- `.dockerignore` **未排除 `.env`**，`COPY idocker-registry-server /app/idocker` 会把开发用的
  `idocker-registry-server/.env`（含明文 registry 凭据）打进镜像，并由容器内 dotenv 加载，
  造成开发配置串味到生产进程。
- `deploy/build.sh` / `deploy/build.bat` / `deploy/.env` 是**旧架构残留的孤儿**：无人引用，
  其中的端口 8080、`REGISTRY_URL=http://localhost:5000`、tag `:latest` 均与当前镜像
  （7518/7519、`DOCKER_REGISTRY_URL`、`:1.0.2`）不符，不要用。
- `idocker-registry-ui/Dockerfile` 引用不存在的 `idocker-registry-ui/server/` 目录，
  `COPY` 就会失败 —— 死文件，不要基于它构建。
- `deploy/docker-entrypoint.sh` 未 trap/转发 SIGTERM，PID 1 是 shell，`docker stop` 不会优雅终止子进程。

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

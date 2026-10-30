<div align="center">
<img src="./idocker-registry-ui/src/assets/logo.png" alt="iDocker Registry" width="400">
</div>

# iDocker Registry

---

## 概述

iDocker Registry 是一款企业级 Docker 镜像仓库管理平台，提供 Web UI 管理 Docker 镜像仓库。包含两个子系统：

- **server** — Node.js/Express REST API + Docker Registry v2 代理
- **ui** — Vue 3 / TypeScript SPA 前端

### 核心特性

| 特性 | 说明 |
|------|------|
| 三层架构 | 命名空间 → 项目 → 仓库，清晰隔离团队资源 |
| 默认公共库 | 内置 default 项目存放 mysql/redis/nginx/jdk 等基础镜像，**单段路径**拉取（`idocker.vip/nginx`），全员可见 |
| 细粒度权限 | 4 种角色（admin / project_manager / developer / operator），仓库级权限控制 |
| Docker 代理 | 对 Docker Registry v2 API 的完整代理，集成鉴权与审计 |
| 即时同步 | push 后标签自动入库；最新标签自动同步为 `latest` |
| 审计日志 | 完整的操作记录，支持搜索、筛选、导出 |
| 国际化 | 中文 / 英文双语界面 |
| 主题切换 | 浅色 / 深色 / 跟随系统 |

---

## 角色体系

| 角色 | 标识 | 权限范围 | Docker 权限 |
|------|------|----------|-------------|
| 管理员 | admin | 全部权限：用户、命名空间、项目、审计、同步 | 完全控制 |
| 项目管理者 | project_manager | 项目下所有仓库的成员管理 | pull / push / delete |
| 开发者 | developer | 仓库镜像读写 | pull / push / delete |
| 运维人员 | operator | 仓库镜像只读 | pull |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 (Composition API) + TypeScript + Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router |
| HTTP | Axios (缓存、自动 Token 注入) |
| 国际化 | vue-i18n (zh-CN / en-US) |
| 样式 | SCSS (CSS 变量主题系统) |
| 后端 | Node.js + Express |
| 数据库 | SQLite (WAL 模式) |
| 认证 | JWT + bcrypt |
| 日志 | Winston |
| Docker 代理 | http-proxy-middleware |

---

## 快速开始

### 开发环境

```bash
# 安装依赖（两个子系统各自独立）
cd idocker-registry-server && npm install
cd idocker-registry-ui && npm install

# 编译前端
cd idocker-registry-ui && npm run build

# 本地开发：后端 nodemon（读 .env，PORT=8031）
cd idocker-registry-server && npm run dev
# 本地开发：前端 Vite dev server（8030，/api 与 /v2 代理到 8031）
cd idocker-registry-ui && npm run dev:client
```

> ⚠️ 此前的 `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d`
> **当前不可用**：`docker-compose.dev.yaml` 在本仓库中不存在（`deploy/dev-entrypoint.sh` 也因此无引用者）。
> 要在容器内验证改动，需先构建镜像再启动。

### 生产环境

```bash
cd /workspace/idocker-registry
docker build -t idocker-registry:2.0.4 .   # 与 compose 的 image tag 保持一致；compose 无 build 段
docker compose up -d
```

### 数据库结构变更（已内置自动迁移）

2.0.x 需要 `namespaces` / `projects` / `repositories` 三张表上的 `deleted_at` / `deleted_by`
（回收站功能），1.2.x 的库没有这几列。启动时 `initDatabase()` 会自动补齐，**无需手工干预**：

1. 先 `ALTER TABLE ... ADD COLUMN` 补列
2. 再 `CREATE INDEX ... ON <table>(deleted_at)` 建索引

⚠️ 这个顺序不能颠倒。历史上曾把建索引写在补列之前，导致 1.2.x 的库启动时抛
`no such column: deleted_at`，而异常经 winston 的 exceptionHandler 落盘后进程即退出，
`docker logs` 里只看得到 `database connect success` —— 真实原因在 `logs/exceptions.log`。

从 1.2.x 升级前建议先备份 `data/` 整个目录（含 `-wal`/`-shm`；WAL 模式下单独拷
`registry.db` 不一定包含最新写入，最好先停容器）。

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

---

## 镜像拉取与推送

所有 Docker 操作需先登录（Web 用户即仓库用户）：

```bash
docker login idocker.vip
```

### 默认公共库（基础镜像，单段路径）

default 项目（default 命名空间）存放 mysql / redis / nginx / jdk 等团队共用基础镜像，路径**不带项目层**，对所有登录用户可见、可拉取：

```bash
docker pull idocker.vip/nginx:latest
```

推送基础镜像默认仅管理员，需先打标签：

```bash
docker tag nginx:latest idocker.vip/nginx:latest
docker push idocker.vip/nginx:latest
```

### 项目镜像（两段路径）

其余项目镜像路径为 `项目/仓库`：

```bash
docker pull idocker.vip/wvp/media-worker:latest
docker push idocker.vip/wvp/media-worker:latest
```

> push 后标签自动入库并即时可见；当仓库存在多个标签时，系统会把 `created_at` 最新的标签自动同步为 `latest`，保证 `docker pull <repo>` 始终拉到最新版本。

---

## 项目结构

```
idocker-registry-server/
├── index.js                 # 入口
├── config/
│   ├── env.js               # 环境变量
│   └── database.js          # SQLite 初始化 + 迁移
├── middleware/
│   ├── auth.js              # JWT 验证 + 角色鉴权
│   └── errorHandler.js      # 统一错误处理
├── models/                  # 数据模型 (BaseModel CRUD)
├── routes/                  # API 路由
├── services/                # 业务逻辑
└── utils/                   # 工具函数

idocker-registry-ui/
├── src/
│   ├── components/          # 组件
│   ├── views/               # 页面 (admin/ 管理后台)
│   ├── stores/              # Pinia 状态
│   ├── services/            # API 封装
│   ├── composables/         # 组合函数
│   ├── i18n/                # 国际化
│   ├── styles/              # 全局样式
│   ├── types/               # TypeScript 类型
│   └── utils/               # 工具函数
```

---

## 环境变量

### 后端 (server/.env)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 7518 | 服务端口 |
| `DB_PATH` | /app/data/registry.db | 数据库路径 |
| `JWT_SECRET` | - | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 24h | Token 过期时间 |
| `DOCKER_REGISTRY_URL` | http://localhost:7519 | 内部 Registry 地址 |
| `LOG_LEVEL` | info | 日志级别 |

### 前端 (UI)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_REGISTRY_URL` | - | 默认 Registry URL |
| `VITE_THEME` | auto | 主题 (light/dark/auto) |
| `VITE_TAGLIST_ORDER` | alpha-asc;num-desc | 标签排序 |
| `VITE_DELETE_IMAGES` | false | 是否允许删除 |

---

## API 概览

| 端点 | 说明 |
|------|------|
| `/api/auth/*` | 登录、注册、刷新令牌 |
| `/api/users/*` | 用户管理（仅 admin） |
| `/api/namespaces/*` | 命名空间 CRUD |
| `/api/projects/*` | 项目管理 |
| `/api/repository/*` | 仓库管理、镜像标签 |
| `/api/audit/*` | 审计日志 |
| `/api/sync/*` | 镜像同步 |
| `/v2/*` | Docker Registry API 代理 |

---

## 许可证

MIT

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
| 细粒度权限 | 4 种角色（admin / project_manager / developer / operator），仓库级权限控制 |
| Docker 代理 | 对 Docker Registry v2 API 的完整代理，集成鉴权与审计 |
| 镜像同步 | 将 Registry 数据同步到平台数据库 |
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
# 安装依赖
cd idocker-registry-server && npm install
cd idocker-registry-ui && npm install

# 编译前端
cd idocker-registry-ui && npm run build

# Docker 开发模式（源码热更新）
cd /workspace/idocker
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
```

开发模式下：
- 前端：修改 → `npm run build`（~5s）→ 刷新浏览器
- 后端：nodemon 自动检测文件变更并重启

### 生产环境

```bash
docker compose up -d
```

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

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

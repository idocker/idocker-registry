<div align="center">
<img src="./idocker-registry-ui/src/assets/logo.png" alt="iDocker Registry" width="360">

# iDocker Registry

**一个容器就够了 —— 自带 Web 界面的 Docker 镜像仓库**

[简体中文](README.md) | [English](README.en.md)

[![Docker Hub](https://img.shields.io/badge/docker-idockervip%2Fidocker--registry-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/idockervip/idocker-registry)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## 简介

iDocker Registry 是一个可私有化部署的 Docker 镜像仓库：在标准 Registry v2 之上加了 Web 管理界面与团队权限，打包成**单个容器**。

跑起来之后：

- 用 `docker login` / `push` / `pull` 直接管理镜像，与官方客户端完全兼容
- 在浏览器里按「命名空间 → 项目 → 仓库」组织镜像，按仓库给成员分配权限
- 登录、推送、删除、权限变更全程写入审计日志
- 元数据存在内置 SQLite，镜像层存在本地目录，不依赖任何外部数据库或中间件

它面向的是几个人的小团队、一台内网服务器，或者任何想要一个不受公共仓库限速与额度约束的私有镜像中心的人。

---

## 为什么选它

Harbor 功能齐全，但为了存几个镜像就要维护一组容器和外部数据库。iDocker Registry 把同样的日常能力收进**一个容器**里：

- **一个容器搞定** —— Web 界面、REST API、Docker Registry 三合一，对外只暴露一个端口
- **不依赖外部服务** —— 内置 SQLite 与 Registry 进程，不需要 MySQL / PostgreSQL / Redis 或任何中间件
- **一条命令启动** —— `docker run` 即可用，镜像压缩后约 75 MB
- **开箱即用** —— 首次启动自动建库、生成密钥、创建默认管理员，不需要初始化脚本
- **用完即走** —— 全部数据在三个挂载目录里，删容器不丢数据，备份就是拷目录

如果你需要镜像签名、漏洞扫描、跨机房复制这类企业级能力，Harbor 仍然更合适。如果你要的是「有界面的私有仓库 + 团队权限」，这个更省事。

---

## 功能

**仓库管理**

- 命名空间 → 项目 → 仓库三级组织，按团队隔离
- 内置 `default` 公共库，存放 nginx / mysql / redis 等基础镜像，全团队可拉
- 仓库级成员权限，粒度细到单个仓库
- 回收站：删除可恢复，也可彻底清除

**镜像操作**

- 完整 Docker Registry v2 兼容，`docker pull` / `push` 直接可用
- push 后标签立即入库，无需手动同步
- 自动把最新标签镜像为 `latest`，`docker pull <repo>` 永远拿到最新
- 基础镜像使用单段路径（`registry.example.com/nginx:latest`），项目镜像使用两段（`registry.example.com/wvp/api:latest`）

**管理**

- 用户管理、角色分配
- 审计日志：登录、镜像操作、权限变更全程留痕，支持搜索筛选与导出
- 中英双语界面，浅色 / 深色 / 跟随系统三种主题
- 支持从已有 Registry 反向同步仓库列表

---

## 快速开始

```bash
# 1) 建目录并授权（容器以 uid 1000 运行，这一步必须做）
mkdir -p registry data logs
sudo chown -R 1000:1000 registry data logs

# 2) 启动
docker run -d --name idocker-registry \
  -p 7588:7518 \
  -e IDOCKER_REGISTRY_URL=http://localhost:7588 \
  -v "$PWD/registry:/var/lib/registry" \
  -v "$PWD/data:/app/data" \
  -v "$PWD/logs:/app/logs" \
  --restart unless-stopped \
  idockervip/idocker-registry:2.0.4
```

浏览器打开 `http://localhost:7588`：

```
用户名：admin
密码：admin123
```

> 首次登录后请立即修改密码。规则：至少 6 位，且必须包含至少 1 个特殊字符。

`IDOCKER_REGISTRY_URL` 请改成实际对外地址（如 `https://registry.example.com`），它决定界面里展示的镜像路径和跨域来源。

---

## 部署

### 用 compose

仓库自带 `docker-compose.yaml`，可以直接用官方镜像，不必修改文件：

```bash
git clone <your-repo-url> idocker-registry && cd idocker-registry
mkdir -p registry data logs && sudo chown -R 1000:1000 registry data logs

IDOCKER_IMAGE=idockervip/idocker-registry:2.0.4 docker compose up -d
```

或者从源码构建（见「开发」）。

### 目录说明

三个挂载目录分工明确：

| 目录 | 容器内路径 | 内容 | 丢失后果 |
|------|-----------|------|---------|
| `registry` | `/var/lib/registry` | 镜像层与清单 | 所有镜像丢失 |
| `data` | `/app/data` | SQLite 数据库、密钥 | 用户/项目/权限丢失 |
| `logs` | `/app/logs` | 运行日志 | 仅历史日志丢失 |

**容器以 uid 1000（`node` 用户）运行，bind mount 会覆盖镜像内目录的属主。** 目录属于 root 时容器无法写库，启动报：

```
error: Server startup failed: SQLITE_CANTOPEN: unable to open database file
```

修复：

```bash
sudo chown -R 1000:1000 registry data logs
docker restart idocker-registry
```

`registry` 属主不对 → push 全部失败；`data` 属主不对 → 启动即失败；`logs` 属主不对 → 同样无法启动。

### 配置

绝大多数情况只需要设 `IDOCKER_REGISTRY_URL`，其余都有默认值：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `IDOCKER_REGISTRY_URL` | `http://localhost:7518` | 对外访问地址 |
| `PORT` | `7518` | 服务端口 |
| `DEFAULT_ADMIN_PASSWORD` | `admin123` | 仅首次建库时生效 |
| `JWT_EXPIRES_IN` | `24h` | 登录有效期 |
| `ALLOW_USER_REGISTRATION` | `false` | 是否开放自助注册 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `LOG_DIR` | `/app/logs` | 日志目录 |
| `DB_PATH` | `/app/data/registry.db` | 数据库路径 |

两个密钥**无需配置**，首次启动自动生成并保存在 `data` 目录，重启复用：

| 密钥 | 文件 | 作用 |
|------|------|------|
| JWT 签名密钥 | `data/.env` | 丢失后所有登录失效 |
| 上传签名密钥 | `data/.registry_http_secret` | 丢失后正在进行的上传失效 |

`IDOCKER_REGISTRY_URL` 之外基本不需要动。内部 registry 地址固定为 `http://localhost:7519`，不可也不必配置。

### 备份与升级

停容器后整个目录备份即可：

```bash
docker compose down
sudo cp -a data data.bak-$(date +%F)
```

> 数据库是 WAL 模式，最新写入可能还在 `registry.db-wal` 中，**不要单独拷贝 `registry.db`**——要么拷整个目录，要么先停容器。

升级只需换镜像重启，数据库结构会在启动时自动补齐：

```bash
IDOCKER_IMAGE=idockervip/idocker-registry:<新版本> docker compose up -d
```

### 释放磁盘

删除标签或仓库不会立刻释放镜像层空间，需要离线运行一次 GC（期间 registry 需停机）。步骤见 [`deploy/registry-gc.md`](deploy/registry-gc.md)。

### 排查启动失败

`docker logs` 有时只停在 `database connect success`。真实原因在 `logs/exceptions.log`，先看这个文件。

---

## 日常使用

下文用 `registry.example.com` 代表你的部署地址，请替换成自己的域名。

登录一次，Web 账号即 Docker 账号：

```bash
docker login registry.example.com
```

### 拉取基础镜像

`default` 项目里的镜像路径不带项目层，所有登录用户可拉：

```bash
docker pull registry.example.com/nginx:latest
docker pull registry.example.com/mysql:latest
```

### 项目镜像

其余镜像路径为 `项目名/仓库名`：

```bash
docker pull registry.example.com/wvp/api:latest
docker push registry.example.com/wvp/api:latest
```

> **推送前请先在界面里创建好仓库。** 非管理员不能靠 push 顺带创建新仓库——目标仓库不存在时返回 403。

### 打标签与推送

```bash
docker tag my-app:dev registry.example.com/wvp/api:v1.2.3
docker push registry.example.com/wvp/api:v1.2.3
```

推送成功后标签立刻出现在界面上。如果最新的标签不是 `latest`，系统会额外把该版本以 `latest` 再推一次，保证 `docker pull registry.example.com/wvp/api` 始终是最新版本。

---

## 权限

| 角色 | 标识 | 能做什么 |
|------|------|---------|
| 管理员 | `admin` | 全部功能，对所有仓库有完整操作权，无需加成员 |
| 项目管理者 | `project_manager` | 管理所辖仓库的成员，拉取 / 推送 / 删除镜像 |
| 开发者 | `developer` | 拉取 / 推送 / 删除镜像 |
| 运维人员 | `operator` | 只读，仅拉取镜像 |

权限按**仓库**授予，不是按项目。给某人在一个项目里授权某个仓库，不会连带授予同项目其他仓库。

内置的 `default` 命名空间与 `default` 项目受保护，不能删除、改名或停用。

---

## 开发

后端和内部 registry 跑在容器里（源码挂载，改完自动重启），前端在宿主机跑 Vite：

```bash
# 首次准备数据目录
mkdir -p test/dev-registry-data test/dev-app-data test/dev-app-logs
sudo chown -R 1000:1000 test/dev-registry-data test/dev-app-data test/dev-app-logs

# 终端 1：后端 + registry（宿主 8031）
docker compose -f docker-compose.dev.yaml up

# 终端 2：前端（8030，/api 与 /v2 代理到 8031）
cd idocker-registry-ui && npm install && npm run dev:client
```

打开 `http://localhost:8030`。改后端代码即时生效；改 `package.json` 依赖或前端代码需要重建镜像。

### 从源码构建

```bash
docker build -t idocker-registry:latest .
docker compose up -d
```

`Dockerfile` 基于官方 `node:22-alpine`，无需额外准备。

### 不用容器

```bash
# 后端
cd idocker-registry-server && npm install
PORT=8031 node index.js

# 前端
cd idocker-registry-ui && npm install && npm run dev:client
```

### 提交前检查

```bash
cd idocker-registry-ui && npm run build          # 含 vue-tsc 类型检查，不通过则无产物
cd idocker-registry-server && npm test           # 后端冒烟测试
node --check idocker-registry-server/routes/projects.js
```

> 前端 `npm run lint` 当前不可用：`.eslintrc.cjs` 依赖的 `@rushstack/eslint-patch` 未列入 devDependencies。
>
> `idocker-registry-ui/package.json` 中的 `dev` / `dev:server` / `build:server` / `start` / `init-db` 会 `cd idocker-registry-server`，但 UI 目录下没有该子目录，这些脚本失效；可用的是 `dev:client` 与 `build`。

---

## API

所有 `/api/*` 接口（除登录外）需要 `Authorization: Bearer <token>`。

| 端点 | 说明 |
|------|------|
| `POST /api/auth/login` | 登录，返回 JWT |
| `GET /api/auth/profile` | 当前用户资料 |
| `PUT /api/auth/change-password` | 修改密码 |
| `/api/users/*` | 用户管理（仅管理员） |
| `/api/namespaces/*` | 命名空间，`POST /:id/restore` 从回收站恢复 |
| `/api/projects/*` | 项目，`POST /:id/restore` 恢复 |
| `/api/repository/*` | 仓库、标签、成员，`POST /:id/restore` 恢复 |
| `GET /api/audit/logs` | 审计日志，另有 `statistics` / `actions` / `export` / `cleanup` |
| `GET /api/sync/status` | 同步状态，另有 `POST /all` / `POST /project/:id` / `GET /logs` |
| `/v2/*` | Docker Registry v2 API |

列表接口用 `deleted=0|1|all` 筛选正常项 / 回收站 / 全部。

响应统一为：

```json
{ "success": true, "data": {} }
{ "success": false, "message": "..." }
```

分页响应附带 `pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`。

---

## 已知限制

- **单实例**：内置 registry 与后端同容器，不支持水平扩展
- **无 LDAP / OAuth**：登录表单有 `ldapAuth` 字段，后端未实现
- **注册默认关闭**：需设 `ALLOW_USER_REGISTRATION=true`，且开放后无需认证，公网慎用
- **Node 18 构建有告警**：`sass@1.104` 要求 Node ≥ 20.19，会打印 `EBADENGINE`，但能正常构建

---

## 项目结构

```
.
├── Dockerfile                  # 多阶段构建：前端 → 后端依赖 → 运行时
├── docker-compose.yaml         # 生产部署
├── docker-compose.dev.yaml     # 开发部署（源码挂载 + 热更新）
├── deploy/                     # registry 配置、启动脚本、GC 手册
├── idocker-registry-server/    # Node/Express 后端
│   ├── config/                 # 环境变量、数据库与迁移
│   ├── models/                 # 数据访问层
│   ├── routes/                 # API 路由
│   └── services/               # 业务逻辑（认证、Docker 授权、同步）
└── idocker-registry-ui/        # Vue 3 前端
    └── src/
        ├── views/              # 页面（admin/ 为管理后台）
        ├── components/         # 组件（dialogs/ 为弹窗）
        ├── stores/             # Pinia
        ├── services/           # API 封装
        ├── i18n/locales/       # 中英文案
        └── styles/             # 主题变量
```

---

## 贡献

欢迎 Issue 与 PR。提交前请跑通上文的「提交前检查」，涉及数据库迁移时保持对老库幂等。

## 许可证

MIT，详见 [LICENSE](LICENSE)。

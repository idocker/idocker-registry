---
name: idocker-deploy
description: Use when building, starting, restarting, or debugging the running iDocker Registry (Dockerfile, docker-compose.yaml, deploy/, internal docker-registry on 7519) — includes where the docs disagree with the actual files.
---

# iDocker 构建与部署

## 本工作空间的真实情况（已逐条核对文件）

| 事实 | 实际值 |
|------|--------|
| 源码根 | `/workspace/idocker-registry` |
| compose 文件 | 只有 `docker-compose.yaml`；**`docker-compose.dev.yaml` 不存在** |
| 镜像 | `docker-compose.yaml` 声明 `idocker-registry:1.0.2`，且**没有 `build:` 段** |
| 容器名 | `idocker-registry`（不是 `idocker`） |
| 端口 | 宿主 `7588` → 容器 `7518`；内部 registry `7519` 不映射到宿主 |
| 卷 | `./test/registry-data`、`./test/app-data`、`./test/app-logs`（`test/` 目录不入 git，Docker 会自建） |

`AGENTS.md` 里写的 `/data/docker/idocker/docker-compose.yaml`、容器名 `idocker`、
镜像 tag `:latest`、卷 `./registry|./data|./logs`，**在本环境都不成立**——该目录不存在，
容器也不存在（`docker ps` 只有无关的 `zlm`）。不要照抄那份描述去做线上运维。

## 构建镜像

`Dockerfile` 是多阶段、基于 `node:22-alpine`：

1. builder 装编译依赖（sqlite3 出原生模块），npm 源指向 npmmirror；
2. 装后端生产依赖到 `/app/idocker`；
3. 装前端依赖并 `npm run build`；
4. 运行阶段 `apk add docker-registry tzdata`，把前端 `dist` 拷进 `/app/idocker/public`，
   复制 `deploy/config.yaml` 到 `/etc/docker/registry/config.yml`，`CMD ["docker-entrypoint.sh"]`。
5. `EXPOSE 7518` 与 `7519`。**镜像里没有 `ENV TZ`**，时区靠 compose 的 `TZ=Asia/Shanghai` 注入。

构建产物不在版本库里，构建需要网络（npm install）。`deploy/build.sh` / `build.bat` 是**过期的
孤儿脚本**（打的 tag 是 `:latest`、端口 8080、变量名 `REGISTRY_URL`、registry 指向 5000，
全都与当前镜像不符），不要用它。

```bash
cd /workspace/idocker-registry
docker build -t idocker-registry:1.0.2 .     # 与 compose 中的 tag 对齐
```

## 启动与运维

```bash
cd /workspace/idocker-registry
docker compose up -d
docker compose ps
docker logs -f idocker-registry
docker compose down
```

容器内由 `deploy/docker-entrypoint.sh` 拉起两个进程：

1. `docker-registry serve /etc/docker/registry/config.yml &`（内部镜像存储，7519）；
2. 各 `sleep 3` 后用 `pgrep`/`kill -0` 校验存活，失败 `exit 1`；
3. `node /app/idocker/index.js &`（Express，7518）；
4. `wait $SERVER_PID`。

该脚本**没有 trap/转发 SIGTERM**，PID 1 是 shell —— `docker stop` 不会优雅通知两个子进程，
只是等超时后被 SIGKILL。排查"重启后数据不一致"时值得留意。

## 内部 registry 配置（`deploy/config.yaml`）

- `http.addr: :7519`，`filesystem.rootdirectory: /var/lib/registry`，`cache.blobdescriptor: inmemory`。
- `http.relativeurls: true` —— Location 头相对化，避免把内部 `localhost` 地址回传给 Docker 客户端。
- `storage.delete.enabled: true` —— 标签/镜像删除可用。
- 没有 `auth` 段：内部 registry 假定只有本机能访问。
- 该文件是在**构建时**拷进镜像的（`Dockerfile` 的 COPY），不是运行时挂载 —— 改它必须重建镜像。

## 环境变量

`config/env.js` 是唯一的读取入口（`dotenv.config()` 按 cwd 加载）。关键默认值：

- `PORT` 7518、`DB_PATH` `/app/data/registry.db`、`LOG_DIR` `/app/logs`、`LOG_LEVEL` info
- `DOCKER_REGISTRY_URL` `http://localhost:7519`、`DOCKER_REGISTRY_TIMEOUT` 30000
- `IDOCKER_REGISTRY_URL` `http://localhost:7518`、`JWT_EXPIRES_IN` 24h
- `JWT_SECRET` / `DEFAULT_ADMIN_PASSWORD` 都有**占位弱默认值**（生产必须覆盖）
- `ALLOW_USER_REGISTRATION` false

开发用 `idocker-registry-server/.env` 与生产值不同：`PORT=8031`、`LOG_LEVEL=debug`、
`DOCKER_REGISTRY_URL=http://localhost:7518`、`IDOCKER_REGISTRY_URL=http://localhost:8030`。

> **配置串味风险**：`.dockerignore` **没有排除 `.env`**，`COPY idocker-registry-server /app/idocker`
> 会把这份开发 `.env` 打进镜像 `/app/idocker/.env`。容器里 `dotenv` 会加载它，于是
> `LOG_LEVEL=debug`、`IDOCKER_REGISTRY_URL=http://localhost:8030` 等开发值会进入生产进程
> （compose 的 `environment` 优先级更高，覆盖同名项，但不能覆盖 `.env` 独有的项）。
> 这也意味着**镜像内含明文凭据**——处理该镜像或改 `.dockerignore` 时要注意。

## 已知的文档漂移与孤儿文件

- `deploy/dev-entrypoint.sh`（nodemon `--legacy-watch` 热重载）没有任何引用者：唯一的 dev
  compose 文件不存在，所以文档描述的"容器内热更新"流程**无法执行**。要热更新得自己写一个
  dev override，或直接改代码后重建镜像。
- `deploy/.env`（`PORT=8080`、`REGISTRY_URL=http://localhost:5000`）无人引用，属旧架构残留。
- `idocker-registry-ui/Dockerfile` 引用不存在的 `idocker-registry-ui/server/` 目录，
  `COPY` 就会失败 —— 死文件，不要基于它构建。
- 前端 `VITE_*` 变量来自 `idocker-registry-ui/.env`（构建期固化，无 build-arg 覆盖机制）。
  其中 `VITE_REGISTRY_URL` 为空 = 走相对路径；`VITE_DELETE_IMAGES=true` 表示 UI 允许删镜像。

## 排障顺序

1. `docker compose ps` / `docker logs <container>`：先看 entrypoint 的存活校验是否 `exit 1`。
2. 容器内两个进程是否都在：`docker exec <c> ps`（`docker-registry` 与 `node index.js`）。
3. `/health` 是否 200：`curl -s localhost:7588/health`（healthcheck 用的就是它）。
4. 镜像操作异常时，区分是**平台鉴权/权限**问题还是**内部 registry**问题：
   后者直连容器内 `localhost:7519/v2/_catalog` 看。
5. SQLite 相关：数据在 `./test/app-data/registry.db`，日志在 `./test/app-logs/`。

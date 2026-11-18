---
name: idocker-deploy
description: Use when building, starting, restarting, or debugging the running iDocker Registry (Dockerfile, docker-compose.yaml, deploy/, internal docker-registry on 7519) — includes where the docs disagree with the actual files.
---

# iDocker 构建与部署

## 官方资源（对外地址以此为准）

| 项 | 地址 |
|----|------|
| 源码（GitHub） | https://github.com/idocker/idocker-registry.git |
| Docker Hub 镜像 | `idockervip/idocker-registry:2.0.6`（https://hub.docker.com/r/idockervip/idocker-registry） |
| 官网 / 产品主页 | https://www.idocker.vip |

> 本工作空间的 `git remote origin` 指向内网 `git.joyeasy.xyz`，与上面的公开 GitHub 仓库**不是同一地址**；
> 写文档、发布说明时用 GitHub 那条，做本仓库推送时用 remote 里那条。

## 本工作空间的真实情况（已逐条核对文件）

| 事实 | 实际值 |
|------|--------|
| 源码根 | `/workspace/idocker-registry` |
| compose 文件 | 两份：`docker-compose.yaml`（生产）与 `docker-compose.dev.yaml`（开发、源码挂载） |
| 镜像 | 写死在 compose 里：`idockervip/idocker-registry:2.0.6`（不读 `IDOCKER_IMAGE` 或 `.env`），**没有 `build:` 段** |
| 容器名 | 生产 `idocker-registry`；开发 `idocker-dev`（不是 `idocker`） |
| 端口 | 生产宿主 `7588` → 容器 `7518`；开发宿主 `8031`；内部 registry `7519` 不映射到宿主 |
| 卷 | 生产 `./registry`、`./data`、`./logs`（仓库根目录，不入 git）；开发 `./test/dev-*` |

`AGENTS.md` 里写的是**生产机** `/data/docker/idocker/docker-compose.yaml`、容器名 `idocker` 的部署形态，
本源码区没有该目录，无法复现验证。本仓库这份 compose 才是开发/构建时的依据。

> 注意：这两份 compose 都**不读变量**，换版本直接改 `image:` 那一行；
> 两份的镜像名要保持一致，否则开发环境构建出的镜像主 compose 用不到。

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
docker build -t idockervip/idocker-registry:<版本> -t idockervip/idocker-registry:latest .
```

构建后先实测再发布（启动容器、看 `/health`、登录一次），不要只凭 `docker build` 的退出码：

```bash
mkdir -p registry data logs && chown -R 1000:1000 registry data logs
docker compose up -d && sleep 45
docker compose ps                                    # 应为 (healthy)
curl -sS localhost:7588/health                       # 200
docker compose down && rm -rf registry data logs     # 临时目录用完即删
```

## 发布（只推 idocker.vip，Docker Hub 由用户手工同步）

**固定分工：本环境只负责推到自建仓库 `idocker.vip`。Docker Hub 由用户自己从
`idocker.vip` 同步或手工推送 —— 不要尝试直连 `registry-1.docker.io`，也不要去用
`.env` 里的 Hub 凭据。**

```bash
docker tag idockervip/idocker-registry:<版本> idocker.vip/idocker-registry:<版本>
docker tag idockervip/idocker-registry:<版本> idocker.vip/idocker-registry:latest

docker push idocker.vip/idocker-registry:<版本>       # 凭据已在 ~/.docker/config.json
docker push idocker.vip/idocker-registry:latest

timeout 30 curl -sS -u '<user>:<pass>' 'https://idocker.vip/v2/idocker-registry/tags/list'
```

核实远端 digest 与本地 `docker images` 一致（多架构 manifest list 要带 Accept 头）：

```bash
timeout 30 curl -sS -u '<user>:<pass>' -o /dev/null -D - \
  -H 'Accept: application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json' \
  'https://idocker.vip/v2/idocker-registry/manifests/<版本>' | grep -i docker-content-digest
```

> 为什么不在本环境推 Hub：`registry-1.docker.io` 的 DNS 解析到 Facebook 段（`2a03:2880:...`）、
> 443 直连被封，`docker push` 只会超时。这是既定分工，不是待修故障。

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

开发环境的变量全部写在 `docker-compose.dev.yaml` 的 `environment` 里，**不再使用
`idocker-registry-server/.env`**（该文件已移除，历史上带过明文凭据）。

> **已修复的历史隐患**：早先 `.dockerignore` 没排除 `.env`、`idocker-registry-server/.env`
> 又会被 `COPY` 打进镜像 `/app/idocker/.env`，导致开发值（`LOG_LEVEL=debug`、
> `IDOCKER_REGISTRY_URL=http://localhost:8030`）串味到生产进程，镜像里还含明文凭据。
> 现在 `.dockerignore` 已排除 `.env` 与 `idocker-registry-server/.env`，删掉的前提条件
> 是这两条规则别被误删 —— 构建后可这样确认：
>
> ```bash
> docker run --rm --entrypoint sh idockervip/idocker-registry:<版本> -c 'ls /app/idocker/.env'
> # 应输出 No such file or directory
> ```

## 已知的文档漂移与孤儿文件

- `deploy/dev-entrypoint.sh` 被 `docker-compose.dev.yaml` 正常引用，用 Node 22 内置的
  `node --watch index.js` 做后端热更新（不是 nodemon）。dev compose 用 `entrypoint:`
  覆盖（不是 `command:`）——因为基础镜像自带 `ENTRYPOINT`，写 `command` 会让生产入口
  仍被执行。真正无法走热更新的只有：改 `package.json` 依赖、改前端代码——都需要重建镜像。
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

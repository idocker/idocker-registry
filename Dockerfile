# ---------- Stage 1: 前端构建 ----------
FROM idocker.vip/node:22 AS ui-builder
WORKDIR /app/ui
RUN npm config set registry https://registry.npmmirror.com
COPY idocker-registry-ui/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
COPY idocker-registry-ui ./
RUN npm run build

# ---------- Stage 2: 后端生产依赖（含 SQLite 原生编译） ----------
FROM idocker.vip/node:22 AS server-deps
WORKDIR /app/idocker
RUN npm config set registry https://registry.npmmirror.com
COPY idocker-registry-server/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    apk add --no-cache --virtual .build-deps python3 make g++ sqlite-dev \
    && npm ci --omit=dev --no-audit --no-fund \
    && apk del .build-deps \
    && npm cache clean --force

# ---------- Stage 3: Runtime ----------
FROM idocker.vip/node:22

# 这个容器永远是生产运行形态、时区固定为 Asia/Shanghai（AGENTS.md 要求全链路统一时区），
# 属于镜像属性而非部署参数，因此写进镜像，compose 无需再重复声明。
# 注意：只能放在 runtime 阶段——前面两个构建阶段需要 devDependencies（vite/vue-tsc）。
ENV NODE_ENV=production TZ=Asia/Shanghai

WORKDIR /app

# 安装运行时依赖
# 基础镜像已自带 node 用户（uid=1000 gid=1000），直接复用，无需另建。
# compose 里三个数据目录是宿主 bind mount，挂载会盖掉镜像内的属主，
# 宿主上需按 1000:1000 chown。
#
# ⚠️ docker-registry 版本必须固定，不能写成裸的 `docker-registry`：
# apk 会拉取当前 Alpine 仓库里的最新版，而 distribution 3.x 与 2.8 存在已知行为差异
# （例如 http.secret 缺失时，3.x 直接拒启、2.8 只警告；上传/删除等路径也需实测）。
# 3.x 迁移要单独安排，不能让它随 apk 被动升级进来：
# 版本漂移曾直接导致重建镜像后容器起不来，所以这里钉死在已验证的 2.8.3-r24。
# 若构建报 "unable to select packages: docker-registry-2.8.3-r24"，说明 Alpine 仓库
# 已把 2.8.x 撤下：要么改用带 Alpine 小版本的基础镜像 tag，要么提前做 3.x 迁移。
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache docker-registry=2.8.3-r24 tzdata

# 从构建阶段拷贝生产依赖与前端产物
# 用 COPY --chown 而不是事后 chown -R：node_modules 有数万个文件，
# 递归 chown 会把它们全部复制进新层，凭空多出上百 MB。
COPY --chown=node:node --from=server-deps /app/idocker/node_modules /app/idocker/node_modules
COPY --chown=node:node idocker-registry-server /app/idocker
COPY --chown=node:node --from=ui-builder /app/ui/dist /app/idocker/public

# 拷贝运行时配置与启动脚本
COPY deploy/config.yaml /etc/docker/registry/config.yml
COPY deploy/docker-entrypoint.sh deploy/registry-http-secret.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/registry-http-secret.sh

# 创建必要目录、清理冗余文件、设置目录权限
# /app/idocker 无需在此 chown，上面已由 COPY --chown 处理；
# 这三个数据目录仅供不经 bind mount 直接运行时使用，
# 走 compose 挂载时以宿主目录的属主为准。
RUN mkdir -p /var/lib/registry /app/data /app/logs \
    && rm -rf /app/idocker/node_modules/.cache \
              /app/idocker/simple-test.js \
              /app/idocker/test /app/idocker/tests 2>/dev/null || true \
    && chown -R node:node /var/lib/registry /app/data /app/logs

# 切换到非 root 用户
USER node

EXPOSE 7518
EXPOSE 7519

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7518/ || exit 1

CMD ["docker-entrypoint.sh"]
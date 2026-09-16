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

# 建议 .dockerignore 排除：node_modules、.git、*.md、test/、tests/、simple-test.js

WORKDIR /app

# 安装运行时依赖 + 创建非 root 用户
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache docker-registry tzdata \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

# 从构建阶段拷贝生产依赖与前端产物
COPY --from=server-deps /app/idocker/node_modules /app/idocker/node_modules
COPY idocker-registry-server /app/idocker
COPY --from=ui-builder /app/ui/dist /app/idocker/public

# 拷贝运行时配置与启动脚本
COPY deploy/config.yaml /etc/docker/registry/config.yml
COPY deploy/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建必要目录、清理冗余文件、设置目录权限
RUN mkdir -p /var/lib/registry /app/data /app/logs \
    && rm -rf /app/idocker/node_modules/.cache \
              /app/idocker/simple-test.js \
              /app/idocker/test /app/idocker/tests 2>/dev/null || true \
    && chown -R appuser:appgroup /var/lib/registry /app/data /app/logs /app/idocker

# 切换到非 root 用户
USER appuser

EXPOSE 7518
EXPOSE 7519

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7518/ || exit 1

CMD ["docker-entrypoint.sh"]
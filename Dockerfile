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
WORKDIR /app
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache docker-registry tzdata
COPY --from=server-deps /app/idocker/node_modules /app/idocker/node_modules
COPY idocker-registry-server /app/idocker
COPY --from=ui-builder /app/ui/dist /app/idocker/public
COPY deploy/config.yaml /etc/docker/registry/config.yml
COPY deploy/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /var/lib/registry /app/data /app/logs \
    && rm -rf /app/idocker/node_modules/.cache \
              /app/idocker/simple-test.js \
              /app/idocker/test /app/idocker/tests 2>/dev/null || true
EXPOSE 7518
EXPOSE 7519
CMD ["docker-entrypoint.sh"]
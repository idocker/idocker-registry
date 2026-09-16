# ============================================ Multi-stage build
#
# 层顺序的两条原则（改这个文件时务必保持）：
#   1. 所有依赖安装层排在所有源码 COPY 之前 —— 否则改后端源码会让它
#      之后的层（包括前端的 npm install）全部缓存失效，每次改后端都要
#      重装前端依赖。
#   2. npm 缓存挂到 BuildKit cache —— 即使依赖层重建，已下载的包仍在
#      本地缓存里，不必重新下载。
FROM idocker.vip/node:22 AS builder
WORKDIR /app

RUN apk add --update --no-cache curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev make gcc g++ \
    && npm config set registry https://registry.npmmirror.com

# ---------- 依赖层：只在对应的 package.json 变化时重建 ----------
COPY idocker-registry-server/package*.json /app/idocker/
COPY idocker-registry-ui/package*.json /app/ui/

RUN --mount=type=cache,target=/root/.npm \
    cd /app/idocker && npm install --omit=dev --no-audit --no-fund

RUN --mount=type=cache,target=/root/.npm \
    cd /app/ui && npm install --no-audit --no-fund

# ---------- 源码层：改动不会触发上面的依赖层重建 ----------
# 前端源码与构建放在后端源码之前：这样改后端时只剩最后一层重建，
# 连前端的 npm run build 都能命中缓存。
COPY idocker-registry-ui /app/ui
RUN cd /app/ui && npm run build

COPY idocker-registry-server /app/idocker

# ============================================ Runtime image
# 与 builder 同一个内网镜像（node:22-alpine 的重命名版，已确认 alpine + apk），
# 构建全程不依赖 Docker Hub。
FROM idocker.vip/node:22
WORKDIR /app

# Install Docker Registry (+ tzdata so the container honours TZ=Asia/Shanghai)
RUN apk add --no-cache docker-registry tzdata

# Copy backend build artifacts
COPY --from=builder /app/idocker /app/idocker

# Copy frontend build artifacts
COPY --from=builder /app/ui/dist /app/idocker/public

# Copy Registry configuration
COPY deploy/config.yaml /etc/docker/registry/config.yml

# Copy startup script
COPY deploy/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directories
RUN mkdir -p /var/lib/registry /app/data /app/logs \
    && rm -rf /app/idocker/node_modules/.cache /app/idocker/simple-test.js

EXPOSE 7518
EXPOSE 7519

CMD ["docker-entrypoint.sh"]

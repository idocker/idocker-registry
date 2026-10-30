#!/bin/sh
set -e

echo "=========================================="
echo "iDocker 开发模式（源码挂载 + 容器内热更新）"
echo "=========================================="

# 内部 registry：与生产同一份配置、同一端口（7519）。
# DOCKER_REGISTRY_URL 已在 config/env.js 里写死指向它，无需再注入环境变量。
# http.secret 由 registry-http-secret.sh 解析：REGISTRY_HTTP_SECRET 优先，
# 否则复用/生成 <数据目录>/.registry_http_secret（3.x 缺它拒不启动）。
echo ">>> Starting Docker Registry on :7519 ..."
REGISTRY_HTTP_SECRET=$(sh /usr/local/bin/registry-http-secret.sh)
export REGISTRY_HTTP_SECRET
docker-registry serve /etc/docker/registry/config.yml &
sleep 2

if ! pgrep -f "docker-registry serve" >/dev/null 2>&1; then
  echo ">>> Error: Docker Registry failed to start"
  exit 1
fi
echo ">>> Docker Registry is up"

# 后端：node --watch 是 Node 22 内置能力，改文件即自动重启，不需要 nodemon
# （镜像用 npm ci --omit=dev 构建，本就没有 nodemon，现场装还得联网）。
#
# 若在 macOS / Docker Desktop 上发现改文件不触发重启（宿主的文件事件不传入容器），
# 换成轮询方案即可：
#   npx nodemon --legacy-watch --watch /app/idocker --ignore node_modules index.js
echo ">>> Starting iDocker Service with hot reload ..."
cd /app/idocker
exec node --watch index.js

#!/bin/sh
set -e

echo "=========================================="
echo "  IDocker Registry 启动中..."
echo "=========================================="

# 创建必要的目录
mkdir -p /app/data
mkdir -p /app/logs
mkdir -p /var/lib/registry

# 检查数据库是否存在，如果不存在则初始化
if [ ! -f "/app/data/registry.db" ]; then
  echo "数据库不存在，正在初始化..."
  # 数据库将在首次启动时自动创建
fi

# 启动 Docker Registry (内部，不认证)
echo "启动 Docker Registry (端口 5000)..."
registry serve /etc/docker/registry/config.yml &
REGISTRY_PID=$!

# 等待 Registry 启动
echo "等待 Docker Registry 启动..."
sleep 3

# 检查 Registry 是否启动成功
if ! kill -0 $REGISTRY_PID 2>/dev/null; then
  echo "错误: Docker Registry 启动失败"
  exit 1
fi

echo "Docker Registry 已启动 (PID: $REGISTRY_PID)"

# 启动后端服务 (监听 8080)
echo "启动后端 API 服务 (端口 8080)..."
node /app/dist/index.js &
SERVER_PID=$!

echo "=========================================="
echo "  IDocker Registry 已成功启动！"
echo "=========================================="
echo "Web UI: http://localhost:8080"
echo "Docker API: http://localhost:8080/v2/"
echo "=========================================="

# 等待后端服务
wait $SERVER_PID

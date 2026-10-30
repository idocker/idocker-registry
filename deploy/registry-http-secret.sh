#!/bin/sh
# 解析内部 registry 的 http.secret（用于签名上传 state 与会话 URL 上的 _state 参数）。
#
# 为什么需要它：distribution 2.8 在 http.secret 缺失时会随机生成一个并打一条 warning，
# 3.x 起则直接拒绝启动（"No HTTP secret provided"）。而纯随机生成也有代价——每次重启
# 都换密钥，重启时未完成的分片上传会失效，多副本之间 state 也互不认。
#
# 解析顺序：
#   1. 环境变量 REGISTRY_HTTP_SECRET —— 显式配置优先（多实例共享同一密钥时用），此时不落盘
#   2. <数据目录>/.registry_http_secret —— 首次生成后持久化，之后一直复用
#   3. 都没有时：生成 32 字节随机值、写入该文件（0600）并复用
#
# 数据目录跟随后端的 DB_PATH（两个 compose 里都是 /app/data，与 registry.db、.env 同目录）。
# 密钥只存在于挂载的数据卷里，不进镜像。
#
# 契约：值打印到 stdout，由调用方 export；所有提示走 stderr，不污染取值。
set -u

DATA_DIR=$(dirname "${DB_PATH:-/app/data/registry.db}")
SECRET_FILE="$DATA_DIR/.registry_http_secret"

# 1) 显式配置优先：尊重环境变量，不生成也不落盘
if [ -n "${REGISTRY_HTTP_SECRET:-}" ]; then
  printf '%s' "$REGISTRY_HTTP_SECRET"
  exit 0
fi

# 2) 已有持久化值就复用（-s 同时排除空文件）
if [ -s "$SECRET_FILE" ]; then
  printf '%s' "$(cat "$SECRET_FILE")"
  exit 0
fi

# 3) 首次生成并持久化
secret=$(od -An -tx1 -N 32 /dev/urandom | tr -d ' \n')
if [ -z "$secret" ]; then
  echo ">>> Error: failed to generate registry http.secret from /dev/urandom" >&2
  exit 1
fi

if mkdir -p "$DATA_DIR" 2>/dev/null && printf '%s' "$secret" > "$SECRET_FILE" 2>/dev/null; then
  chmod 600 "$SECRET_FILE" 2>/dev/null || true
  echo ">>> registry http.secret generated and persisted to $SECRET_FILE" >&2
else
  # 不阻断启动（本次运行有可用值），但要把代价说清楚
  echo ">>> Warning: could not persist registry http.secret to $SECRET_FILE" >&2
  echo "    this run works, but the secret changes on every restart and in-flight uploads will fail." >&2
fi

printf '%s' "$secret"

# 部署

1. 配置内部网络通信
2. 设计统一的权限认证流程
3. 集成前端静态资源
4. 实现安全的代理和转发机制


## 架构说明

架构：
1. Docker Registry (端口 5000) - 不对外暴露，只对内网/容器内部可见
2. 后端服务 (统一端口，比如 8080)：
   - 与 Docker Registry 内部通信（不需要认证，因为不对外暴露）
   - 封装符合 v2 规范的 API
   - 提供 Docker Registry API（/v2/...）
   - 提供 Web UI API（/api/...）
   - 进行权限认证和审计
3. 前端 UI - 作为静态资源集成到后端服务中
4. 单一容器部署，只暴露一个端口
```
┌─────────────────────────────────────────────────────────┐
│           Docker 容器 (单一暴露端口: 8080)                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │         Express.js 后端服务                      │  │
│  ├─────────────────────────────────────────────────┤  │
│  │  /v2/*          → Docker Registry API (认证代理) │  │
│  │  /api/*         → Web UI API (JWT 认证)          │  │
│  │  /              → 静态文件服务 (Vue UI)          │  │
│  └─────────────────┬───────────────────────────────┘  │
│                    │                                    │
│                    ▼                                    │
│  ┌─────────────────────────────────────────────────┐  │
│  │    Docker Registry (内部通信, 不对外暴露)         │  │
│  │    Port: 5000 (仅容器内部访问)                    │  │
│  │    不需要认证 (信任后端代理)                      │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
    外部访问：localhost:8080
```

## 架构优势

| 方面 | 当前架构 | 推荐架构 |
|------|---------|---------|
| 安全性 | Registry 暴露外网 | Registry 完全隐藏 |
| 部署复杂度 | 需要 2-3 个容器 | 单一容器 |
| 权限控制 | 分散 | 统一在服务端 |
| 审计日志 | 不完整 | 完整记录所有操作 |
| 维护成本 | 高 | 低 |

## 部署方案

### 1. Dockerfile 示例

```dockerfile
# 多阶段构建
FROM node:18-alpine as builder
WORKDIR /app

# 构建后端
COPY idocker-registry-server/package*.json ./server/
RUN cd server && npm install
COPY idocker-registry-server ./server
RUN cd server && npm run build

# 构建前端
COPY idocker-registry-ui/package*.json ./ui/
RUN cd ui && npm install
COPY idocker-registry-ui ./ui
RUN cd ui && npm run build

# 运行时镜像
FROM node:18-alpine
WORKDIR /app

# 安装依赖
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/database ./database
COPY --from=builder /app/ui/dist ./public

# 启动 Docker Registry (内部)
# 安装 registry:2 并配置为不认证
RUN apk add --no-cache docker-registry

# 启动脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
CMD ["docker-entrypoint.sh"]
```

### 2. 启动脚本

```bash
#!/bin/sh

# 启动 Docker Registry (内部，不认证)
registry serve /etc/docker/registry/config.yml &

# 等待 Registry 启动
sleep 3

# 启动后端服务 (监听 8080)
node /app/dist/index.js
```

### 3. Registry 配置 (config.yml)

```yaml
version: 0.1
log:
  level: info
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: :5000
  net: tcp
  # 不需要认证，仅内部访问
  headers:
    X-Content-Type-Options: [nosniff]
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

### 4. 后端服务调整

当前代码已经基本符合要求，只需确认：

1. **统一端口配置**（.env）：
```env
PORT=8080
UI_URL=http://localhost:8080
REGISTRY_URL=http://localhost:5000  # 容器内部
```

2. **静态文件服务**（index.js）：
```javascript
// 在路由前添加静态文件服务
app.use(express.static('public'));  // Vue 构建后的文件

// API 路由
app.use('/api', apiRoutes);
app.use('/v2', dockerRegistryRoutes);

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/v2')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});
```

3. **Docker Registry 代理**（dockerRegistryService）：
```javascript
// 确保内部通信不需要认证
const axiosConfig = {
  baseURL: process.env.REGISTRY_URL,
  timeout: this.timeout,
  // 不需要 auth，因为 Registry 是内部访问
};
```

### 5. 部署命令

```bash
# 构建镜像
docker build -t idocker-registry:latest .

# 运行容器
docker run -d \
  --name idocker-registry \
  -p 8080:8080 \
  -v registry-data:/var/lib/registry \
  -v app-data:/app/data \
  -e REGISTRY_URL=http://localhost:5000 \
  idocker-registry:latest
```

### 6. docker-compose.yml

```yaml
version: '3.8'

services:
  idocker-registry:
    build: .
    container_name: idocker-registry
    ports:
      - "8080:8080"
    volumes:
      - registry-data:/var/lib/registry
      - app-data:/app/data
    environment:
      - REGISTRY_URL=http://localhost:5000
      - JWT_SECRET=your-secret-key
      - PORT=8080
    restart: unless-stopped

volumes:
  registry-data:
  app-data:
```

## 需要注意的事项

1. **当前代码已经支持这个架构**，主要是配置调整
2. **前端构建产物**需要放到后端的 `public` 目录
3. **Registry 配置**为内部访问模式（无认证）
4. **权限控制**完全由后端代理层负责
5. **审计日志**记录所有 Docker 操作

你的想法非常好！当前代码已经基本实现了这个架构模式，主要是构建和部署配置需要调整。
# Docker Registry UI 部署指南

## 概述

本指南详细介绍了如何部署更新后的 Docker Registry UI 系统，该系统现在通过后端服务器代理对 Docker Registry API 的访问，提高了安全性和权限控制能力。

## 系统架构

1. **前端 (Vue.js)**
   - 端口: 8030
   - 只与后端 API 通信
   - 不直接访问 Docker Registry API

2. **后端服务器 (Express.js)**
   - 端口: 8031
   - 处理前端请求
   - 代理对 Docker Registry API 的访问
   - 管理用户认证和授权
   - 记录审计日志

## 部署步骤

### 1. 安装依赖

#### 后端依赖
```bash
cd server
npm install
```

#### 前端依赖
```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件或设置环境变量：

```env
# 服务器端口
SERVER_PORT=8031

# 前端URL
FRONTEND_URL=http://localhost:8030

# JWT密钥 (生产环境中请使用强密钥)
JWT_SECRET=your-strong-jwt-secret-key

# 数据库配置 (SQLite, 位于 server/data/)
DATABASE_PATH=./data/registry.db
```

### 3. 初始化数据库

```bash
cd server
npm run init-db
```

### 4. 配置 Registry

通过 UI 或 API 添加 Docker Registry 配置：

1. 登录系统
2. 导航到"注册表管理"
3. 添加新的 Registry 配置，包括：
   - 名称
   - URL
   - 类型 (Docker)
   - 认证配置 (可选)

#### Registry 认证配置

**Bearer Token 认证**:
```json
{
  "type": "bearer",
  "token": "your-registry-bearer-token"
}
```

**Basic 认证**:
```json
{
  "type": "basic",
  "username": "your-username",
  "password": "your-password"
}
```

### 5. 启动服务

#### 开发模式

```bash
# 启动后端服务器
cd server
npm run dev

# 在另一个终端启动前端
npm run dev
```

#### 生产模式

```bash
# 构建前端
npm run build

# 启动后端服务器
cd server
npm start
```

## 反向代理配置

如果需要部署到生产环境，建议使用 Nginx 或其他反向代理服务器：

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/dockere-registry-vueui/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:8031;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## HTTPS 配置

对于生产环境，强烈建议配置 HTTPS：

1. 获取 SSL 证书
2. 配置 Nginx 处理 HTTPS
3. 更新前端 URL 为 HTTPS

### Nginx HTTPS 配置示例

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # 前端静态文件
    location / {
        root /path/to/dockere-registry-vueui/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:8031;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 重定向 HTTP 到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Docker 部署

### 后端 Dockerfile

创建 `server/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8031

CMD ["npm", "start"]
```

### 前端 Dockerfile

创建 `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "8031:8031"
    environment:
      - SERVER_PORT=8031
      - JWT_SECRET=your-strong-jwt-secret-key
    volumes:
      - ./server/data:/app/server/data

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "8030:80"
    depends_on:
      - backend
```

## 监控和日志

### 日志配置

后端使用 Winston 进行日志记录。可以通过环境变量配置日志级别：

```env
LOG_LEVEL=info
```

### 监控

建议设置以下监控指标：

1. API 响应时间
2. 错误率
3. 用户认证失败次数
4. Registry API 调用频率

## 故障排除

### 常见问题

1. **前端无法连接到后端**
   - 检查后端服务是否运行在端口 8031
   - 验证防火墙设置
   - 检查 CORS 配置

2. **无法访问 Registry**
   - 验证 Registry URL 配置是否正确
   - 检查网络连接
   - 验证认证凭据

3. **权限错误**
   - 确认用户已登录
   - 检查用户角色和权限设置

### 调试模式

启用调试模式：

```env
DEBUG=true
LOG_LEVEL=debug
```

## 安全建议

1. 使用强密码和安全的 JWT 密钥
2. 启用 HTTPS
3. 定期更新依赖
4. 限制管理员账户数量
5. 监控审计日志
6. 定期备份数据库
# iDocker Registry 单容器部署指南

## 架构概述

本项目采用单容器部署架构，将所有组件集成到一个 Docker 容器中：

```
┌─────────────────────────────────────────────────────────┐
│           Docker 容器 (端口: 8080)                  │
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
│  │    Docker Registry (内部通信, 不对外暴露)          │  │
│  │    Port: 5000 (仅容器内部访问)                    │  │
│  │    不需要认证 (信任后端代理)                       │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
    外部访问：localhost:8080
```

## 架构优势

| 特性 | 说明 |
|------|------|
| **安全性** | Docker Registry 完全隐藏，仅后端可访问 |
| **简化部署** | 单一容器，易于管理和维护 |
| **统一认证** | 所有认证在后端代理层处理 |
| **完整审计** | 所有 Docker 操作记录在日志中 |
| **低维护** | 无需管理多个容器和服务 |

## 部署步骤

### 方式 1：使用 Docker Compose（推荐）

```bash
# 进入项目目录
cd d:/workspace/iDocker-Registry

# 构建并启动
docker-compose -f deploy/docker-compose.yaml up -d

# 查看日志
docker-compose -f deploy/docker-compose.yaml logs -f

# 停止服务
docker-compose -f deploy/docker-compose.yaml down
```

### 方式 2：使用 Docker 命令

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
  -e JWT_SECRET=your-secret-key-change-this \
  idocker-registry:latest

# 查看日志
docker logs -f idocker-registry

# 停止容器
docker stop idocker-registry
```

### 方式 3：使用部署脚本

```bash
# Windows
cd deploy
build.bat

# Linux/Mac
cd deploy
chmod +x build.sh
./build.sh
```

## 访问方式

### Web UI 界面
```
http://localhost:8080
```

### Docker CLI 操作

```bash
# 登录
docker login localhost:8080 -u admin -p admin123

# 推送镜像
docker tag <image> localhost:8080/<project>/<name>
docker push localhost:8080/<project>/<name>

# 拉取镜像
docker pull localhost:8080/<project>/<name>
```

### 健康检查
```
http://localhost:8080/health
```

## 环境变量配置

### 必需配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 8080 |
| `REGISTRY_URL` | 内部 Registry 地址 | http://localhost:5000 |
| `JWT_SECRET` | JWT 密钥（生产环境必须修改） | - |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | production |
| `DB_PATH` | 数据库路径 | /app/data/registry.db |
| `LOG_LEVEL` | 日志级别 | info |
| `DEFAULT_ADMIN_PASSWORD` | 默认管理员密码 | admin123 |
| `ALLOW_USER_REGISTRATION` | 允许用户注册 | false |

## 数据持久化

### Registry 数据（镜像存储）
```bash
# 挂载卷
-v registry-data:/var/lib/registry

# 或使用主机路径
-v /path/to/registry/data:/var/lib/registry
```

### 应用数据（数据库、日志）
```bash
# 挂载卷
-v app-data:/app/data

# 或使用主机路径
-v /path/to/app/data:/app/data
```

## 端口说明

| 端口 | 说明 | 是否对外暴露 |
|------|------|------------|
| 8080 | 后端 API + Web UI | ✅ 是 |
| 5000 | Docker Registry（内部） | ❌ 否 |

## 默认账户

首次启动会自动创建默认管理员账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

**重要**：首次登录后请立即修改默认密码！

## 开发模式

### 本地开发

后端和前端分别运行（多端口）：

```bash
# 终端 1: 启动后端
cd idocker-registry-server
npm run dev
# 后端运行在 http://localhost:8031

# 终端 2: 启动前端
cd idocker-registry-ui
npm run dev:client
# 前端运行在 http://localhost:8030
```

### Docker 开发环境

```bash
# 构建并运行开发环境
docker-compose -f deploy/docker-compose.yaml up -d
```

## 故障排查

### 查看日志
```bash
# 容器日志
docker logs idocker-registry

# 实时日志
docker logs -f idocker-registry

# 最近的 100 行
docker logs --tail 100 idocker-registry
```

### 进入容器
```bash
docker exec -it idocker-registry sh
```

### 检查容器状态
```bash
docker ps -a
docker inspect idocker-registry
```

### 常见问题

1. **无法访问 Web UI**
   - 检查端口映射：`docker ps`
   - 查看容器日志：`docker logs idocker-registry`

2. **Docker 登录失败**
   - 确认使用正确的端口：`localhost:8080`
   - 检查用户名密码是否正确
   - 查看认证日志

3. **镜像推送失败**
   - 确认 Registry 已初始化
   - 检查磁盘空间
   - 查看详细错误日志

4. **数据丢失**
   - 确认使用了卷挂载
   - 检查卷是否正确挂载

## 性能优化

### 1. 资源限制
```bash
docker run -d \
  --name idocker-registry \
  --memory="2g" \
  --cpus="2" \
  -p 8080:8080 \
  idocker-registry:latest
```

### 2. 镜像存储优化
使用外部存储（NAS、云存储等）：
```bash
docker run -d \
  -v /mnt/nas/registry:/var/lib/registry \
  idocker-registry:latest
```

### 3. 数据库优化
定期清理审计日志和临时数据。

## 安全建议

1. **修改默认密码**
   - 首次登录后立即修改 admin 密码

2. **使用强 JWT 密钥**
   ```bash
   # 生成随机密钥
   openssl rand -base64 32
   ```

3. **启用 HTTPS**
   - 使用反向代理（Nginx、Traefik）
   - 配置 SSL 证书

4. **网络隔离**
   - 使用 Docker 网络
   - 限制容器间通信

5. **定期备份**
   - 备份数据库：`/app/data/registry.db`
   - 备份 Registry 数据：`/var/lib/registry`

## 备份与恢复

### 备份
```bash
# 备份数据库
docker exec idocker-registry sh -c "cp /app/data/registry.db /app/data/backup_$(date +%Y%m%d).db"

# 备份 Registry 数据
docker run --rm \
  --volumes-from idocker-registry \
  -v $(pwd):/backup \
  alpine tar czf /backup/registry_backup_$(date +%Y%m%d).tar.gz /var/lib/registry
```

### 恢复
```bash
# 恢复数据库
docker cp backup_20240101.db idocker-registry:/app/data/registry.db

# 恢复 Registry 数据
docker run --rm \
  --volumes-from idocker-registry \
  -v $(pwd):/backup \
  alpine sh -c "cd / && tar xzf /backup/registry_backup.tar.gz"
```

## 更新升级

```bash
# 停止并删除旧容器
docker-compose -f deploy/docker-compose.yaml down

# 拉取新代码
git pull

# 重新构建并启动
docker-compose -f deploy/docker-compose.yaml up -d --build
```

## 监控

### 健康检查
```bash
curl http://localhost:8080/health
```

### 容器状态
```bash
docker stats idocker-registry
```

### 日志监控
```bash
docker logs -f --tail 100 idocker-registry
```

## 更多信息

- 项目文档：`docs/` 目录
- API 文档：`docs/API_RESPONSE_STANDARD.md`
- 认证指南：`docs/AUTHENTICATION_GUIDE.md`

## 技术支持

如遇问题，请查看：
1. 容器日志
2. 故障排查章节
3. 项目文档

---

**版本**: 2.0.0
**更新日期**: 2024-01-XX

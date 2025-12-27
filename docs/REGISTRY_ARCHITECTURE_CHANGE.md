# Registry API 架构变更说明

## 概述

本变更将系统从直接调用 Docker Registry API 的方式改为通过后端服务器代理的方式，以提高安全性并实现更细粒度的权限控制。

## 变更前架构

1. 前端直接通过 Vite 代理调用 Docker Registry API (`/api/v2/*`)
2. Docker Registry API 暴露在前端应用中
3. 难以实现细粒度的权限控制
4. Registry 认证信息可能暴露在前端

## 变更后架构

1. 前端只调用后端服务器 API (`/api/registry/*`)
2. 后端服务器作为代理，调用实际的 Docker Registry API
3. Registry 认证信息存储在后端，不暴露给前端
4. 后端实现基于资源的权限控制
5. 所有操作都记录审计日志

## 新增组件

### 后端

1. **RegistryProxyController** (`/server/controllers/registryProxyController.js`)
   - 处理 Registry API 代理请求
   - 支持 Catalog、Tags、Manifest 等操作
   - 处理不同类型的 Registry 认证

2. **registryProxy 路由** (`/server/routes/registryProxy.js`)
   - 定义 Registry API 代理路由
   - 应用认证和权限中间件

3. **权限中间件增强** (`/server/middleware/auth.js`)
   - 增强了 `authorize` 函数，支持基于资源和操作的权限控制
   - 支持 "registry" 资源和 "read"、"delete" 操作

4. **审计日志工具** (`/server/utils/audit.js`)
   - 提供统一的审计日志记录功能
   - 记录用户操作、资源访问和权限变更

### 前端

1. **HTTP 服务更新** (`/src/utils/http.ts`)
   - 将所有 Registry API 调用重定向到后端
   - 移除对 Docker Registry API 的直接调用
   - 保持与原有功能的兼容性

2. **Vite 配置更新** (`/vite.config.ts`)
   - 移除对 Docker Registry API 的代理配置
   - 只保留对后端 API 的代理

## API 端点映射

| 前端调用 | 后端路由 | Docker Registry API |
|---------|----------|---------------------|
| `/api/registry/catalog` | GET `/api/registry/catalog` | GET `/v2/_catalog` |
| `/api/registry/tags/:repository` | GET `/api/registry/tags/:repository` | GET `/v2/:repository/tags/list` |
| `/api/registry/manifest/:repository/:tag` | GET `/api/registry/manifest/:repository/:tag` | GET `/v2/:repository/manifests/:tag` |
| `/api/registry/tags/:repository/:tag` | DELETE `/api/registry/tags/:repository/:tag` | DELETE `/v2/:repository/manifests/:digest` |

## 权限控制

1. **认证**
   - 所有 Registry API 代理路由需要用户认证
   - 使用 JWT 令牌验证用户身份

2. **授权**
   - 管理员拥有所有权限
   - 普通用户默认有读取权限
   - 删除操作需要管理员权限

3. **审计**
   - 所有 Registry 操作都记录审计日志
   - 包括操作类型、资源、用户信息和结果

## Registry 认证配置

后端支持多种 Registry 认证方式：

1. **Bearer Token**
   ```json
   {
     "type": "bearer",
     "token": "your-bearer-token"
   }
   ```

2. **Basic Auth**
   ```json
   {
     "type": "basic",
     "username": "your-username",
     "password": "your-password"
   }
   ```

## 部署注意事项

1. 确保 `axios` 依赖已添加到服务器端 package.json
2. 确保 Registry 模型支持认证配置
3. 考虑在生产环境中配置 HTTPS
4. 确保 JWT 密钥安全

## 测试

1. 测试 Catalog 列表获取
2. 测试标签列表获取和显示
3. 测试 Manifest 获取
4. 测试标签删除（管理员权限）
5. 验证审计日志记录
6. 验证权限控制（普通用户 vs 管理员）
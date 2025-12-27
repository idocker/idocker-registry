# iDocker Registry 项目升级总结

## 升级概述

本次升级对iDocker Registry项目进行了全面的重构和优化，按照现代化架构标准重新设计了项目结构，增强了功能性和可维护性。

## 升级内容

### 1. 服务端架构重构

#### 新的目录结构
- `server/index.js` - 应用程序入口
- `server/config/` - 配置文件目录
  - `database.js` - 数据库配置和初始化
- `server/middleware/` - 中间件目录
  - `auth.js` - 认证中间件
  - `errorHandler.js` - 错误处理中间件
- `server/routes/` - API路由目录
  - `auth.js` - 认证相关路由
  - `users.js` - 用户管理路由
  - `projects.js` - 项目管理路由
  - `registry.js` - 镜像仓库管理路由
  - `audit.js` - 审计日志路由
  - `dockerRegistry.js` - Docker Registry API兼容路由
- `server/services/` - 服务层目录
  - `dockerRegistryService.js` - Docker Registry API服务
- `server/utils/` - 工具类目录
  - `logger.js` - 日志工具

#### 数据库结构优化
- 用户表 (users)
- 项目表 (projects)
- 项目成员表 (project_members)
- 镜像仓库表 (repositories)
- 镜像标签表 (image_tags)
- 审计日志表 (audit_logs)
- Registry配置表 (registry_configs)

### 2. Docker Registry API重新实现

#### 完整的API支持
- 遵循Docker Registry API v2规范
- 支持镜像仓库的完整CRUD操作
- 支持镜像标签管理
- 支持构建历史查看
- 支持拉取和推送权限控制
- 支持多Registry配置

#### 权限控制
- 基于项目的权限控制
- 支持管理员、维护者、查看者角色
- Docker客户端Basic认证和JWT令牌认证

### 3. 前端架构优化

#### 新的目录结构
- `src/layouts/` - 布局组件
  - `BaseLayout.vue` - 基础布局
  - `AdminLayout.vue` - 管理后台布局
- `src/services/` - API服务层
  - `auth.service.ts` - 认证服务
  - `registry.service.ts` - 镜像仓库服务
  - `project.service.ts` - 项目管理服务
  - `user.service.ts` - 用户管理服务
  - `audit.service.ts` - 审计日志服务
- `src/composables/` - 组合式函数
  - `useApi.ts` - API调用管理
  - `useNotifications.ts` - 通知管理
  - `useAuthCheck.js` - 认证检查
- `src/views/` - 页面视图
  - `ImageView.vue` - 镜像列表视图

### 4. 功能增强

#### 镜像管理功能
- 镜像列表展示
- 标签管理
- 构建历史查看
- 拉取和推送命令生成
- 权限控制

#### 项目管理功能
- 项目CRUD操作
- 项目成员管理
- 基于项目的权限控制

#### 用户管理功能
- 用户CRUD操作
- 角色管理
- 密码重置

#### 审计日志功能
- 操作记录
- 日志查询和过滤
- 统计分析
- 日志导出

### 5. 安全性增强

#### 认证和授权
- JWT令牌认证
- Docker客户端Basic认证
- 基于角色的访问控制(RBAC)
- 请求频率限制

#### 数据保护
- 密码哈希存储
- SQL注入防护
- CORS配置
- 安全头设置

### 6. 环境配置支持

#### 环境变量
- `PORT` - 服务端口
- `DB_PATH` - 数据库路径
- `JWT_SECRET` - JWT密钥
- `REGISTRY_URL` - Docker Registry URL
- `ALLOW_USER_REGISTRATION` - 是否允许用户注册

## 部署说明

### 开发环境
1. 安装依赖
```bash
# 服务端
cd idocker-registry-server
npm install

# 前端
cd idocker-registry-ui
npm install
```

2. 配置环境变量
```bash
# 复制环境变量模板
cp idocker-registry-server/.env.example idocker-registry-server/.env

# 编辑环境变量
vim idocker-registry-server/.env
```

3. 初始化数据库
```bash
cd idocker-registry-server
npm run init-db
```

4. 启动开发服务器
```bash
# 同时启动前后端开发服务器
cd idocker-registry-ui
npm run dev

# 或分别启动
npm run dev:client  # 前端
npm run dev:server  # 后端
```

### 生产环境
1. 构建前端
```bash
cd idocker-registry-ui
npm run build
```

2. 使用Docker部署
```bash
docker build -t idocker-registry .
docker run -p 8030:8030 -p 8031:8031 idocker-registry
```

## 技术栈

### 后端
- Node.js (>= 22.5)
- Express
- SQLite
- JWT
- bcryptjs
- Winston

### 前端
- Vue 3
- TypeScript
- Vite
- Pinia
- Vuetify
- Sass

## 升级注意事项

1. 数据库结构有重大变化，需要重新初始化数据库
2. API接口有较大调整，前端需要相应更新
3. 配置方式改为使用环境变量
4. 新增了基于项目的权限控制，需要配置项目权限

## 后续计划

1. 添加镜像扫描和安全检查功能
2. 支持镜像复制和同步
3. 添加更多统计和监控功能
4. 支持LDAP和OAuth认证
5. 添加Webhook支持
6. 优化UI/UX体验

## 联系方式

如有问题或建议，请联系项目维护团队。
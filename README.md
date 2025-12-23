
<div align="center" style="margin-top: 50px">
<img src="./idocker-registry-ui/src/assets/logo.png" alt="idocker-registry" width="400" >
</div>

# iDocker Registry

这是一个使用 Vue 3、TypeScript 和 Vite 重写的 Docker Registry Web UI 界面。原项目使用 Riot.js，此版本提供了现代化的 Vue 3 替代方案。


## 功能特性

- 📦 浏览 Docker Registry 中的仓库和标签
- 🔍 搜索和过滤仓库和标签
- 📊 查看镜像标签的历史记录
- 🗑️ 删除镜像标签（如果启用）
- 🌙 支持明暗主题切换
- 📱 响应式设计，适配各种屏幕尺寸
- 🔐 支持 Basic 认证
- 🌐 支持多架构镜像
- 📋 复制 docker pull 命令
- 🏷️ 查看镜像标签的摘要和大小
- 📅 显示镜像创建日期
- 🎨 Material Design 风格界面
- 🔒 支持 LDAP 认证
- 🔒 支持基于角色的访问控制
- 🔒 支持基于镜像的复制策略
- 🔒 支持 AD/LDAP 支持
- 🔒 支持审计管理
- 🔒 支持图形化用户界面



## 🏗️ 技术栈

- **容器化部署** - 提供完整的Dockerfile支持单容器部署
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - JavaScript 的超集，提供类型支持
- **Vite** - 现代前端构建工具
- **Pinia** - Vue 的状态管理库
- **Vue Router** - Vue 的官方路由管理器
- **Sass** - CSS 预处理器
- **Axios** - HTTP 客户端
- **Express** - Node.js 的 Web 框架

## 🛠️ 技术特点

### 1. **安全设计**
   - JWT令牌认证
   - 密码哈希存储
   - CSRF和CORS保护
   - 请求频率限制

### 2. **高性能架构**
   - SQLite轻量级数据库
   - API响应缓存
   - 懒加载数据
   - 优化的数据库索引

### 3. **用户体验优化**
   - 响应式设计
   - 直观的操作流程
   - 清晰的权限提示
   - 实时状态反馈


## ✨ 实现的功能

### 1. 基于角色的访问控制
- 用户和仓库通过"项目"组织管理
- 三级权限体系：所有者(Owner)、维护者(Maintainer)、成员(Member)
- 支持LDAP集成认证

### 2. 基于镜像的复制策略
- 支持多个Registry实例间的镜像复制
- 灵活的调度策略（手动、每小时、每天、每周）
- 适用于负载均衡和高可用场景

### 3. 图形化用户界面
- 现代化的项目管理界面
- 直观的Registry管理功能
- 清晰的权限分配界面

### 4. AD/LDAP支持
- 完整的LDAP集成模块
- 自动用户同步
- 本地和LDAP用户并存

### 5. 镜像删除和垃圾回收
- 镜像生命周期管理
- 批量删除功能
- 自动垃圾回收机制

### 6. 审计管理
- 全面的操作日志记录
- 可追溯的审计跟踪
- 灵活的日志查询和统计


## 📦 部署方式


### 1. **环境要求**

- Node.js >= 22.5
- npm >= 7 或 yarn >= 1.22

### 2. **开发环境**
   ```bash
   npm run dev              # 同时启动前后端开发服务器
   npm run dev:client       # 仅启动前端开发服务器
   npm run dev:server       # 仅启动后端开发服务器
   ```

### 3. **生产环境**
   ```bash
   docker build -t idocker-registry .
   docker run -p 8030:8030 -p 8031:8031 idocker-registry
   ```

### 4. **配置说明**

- **环境变量配置**：通过`.env`文件配置数据库连接、LDAP设置等
- **默认管理员账号**：用户名`admin`，密码`admin123`
- **自动数据库初始化**：首次运行时自动创建表结构和初始数据

### 5. **配置参数**

应用支持通过环境变量进行配置：

| 变量名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `VITE_REGISTRY_URL` | string | - | 默认的 Docker Registry URL |
| `VITE_REGISTRY_TITLE` | string | - | 自定义注册表标题 |
| `VITE_PULL_URL` | string | - | docker pull 命令中使用的 URL |
| `VITE_DELETE_IMAGES` | boolean | false | 是否允许删除镜像 |
| `VITE_SHOW_CONTENT_DIGEST` | boolean | false | 是否显示内容摘要 |
| `VITE_CATALOG_ELEMENTS_LIMIT` | number | 1000 | 目录页面显示的最大元素数 |
| `VITE_SINGLE_REGISTRY` | boolean | false | 是否为单注册表模式 |
| `VITE_DEFAULT_REGISTRIES` | string[] | [] | 默认注册表列表 |
| `VITE_READ_ONLY_REGISTRIES` | boolean | false | 是否为只读注册表 |
| `VITE_SHOW_CATALOG_NB_TAGS` | boolean | false | 是否显示仓库的标签数量 |
| `VITE_HISTORY_CUSTOM_LABELS` | string[] | [] | 历史页面显示的自定义标签 |
| `VITE_USE_CONTROL_CACHE_HEADER` | boolean | false | 是否使用缓存控制头 |
| `VITE_THEME` | string | auto | 主题 (light/dark/auto) |
| `VITE_TAGLIST_ORDER` | string | alpha-asc;num-desc | 标签列表排序方式 |
| `VITE_CATALOG_DEFAULT_EXPANDED` | boolean | false | 目录默认是否展开 |
| `VITE_CATALOG_MIN_BRANCHES` | number | 1 | 目录最小分支数 |
| `VITE_CATALOG_MAX_BRANCHES` | number | 1 | 目录最大分支数 |
| `VITE_TAGLIST_PAGE_SIZE` | number | 100 | 标签列表每页显示数 |
| `VITE_REGISTRY_SECURED` | boolean | false | 注册表是否安全 |
| `VITE_SHOW_TAG_HISTORY` | boolean | true | 是否显示标签历史 |



## 贡献

### 开发

欢迎提交 Pull Request 和 Issue请确保:

1. 代码符合项目风格
2. 提交前通过所有测试
3. 添加必要的类型注解
4. 更新相关文档

### 项目结构

```
vue/
├── public/                 # 静态资源
├── server/                 # 后端服务
│   ├── config/            # 数据库配置
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── models/          # 数据模型
│   ├── routes/          # API路由
│   └── utils/           # 工具函数
├── src/
│   ├── assets/           # 资源文件
│   ├── components/       # Vue 组件
│   │   ├── catalog/     # 仓库目录组件
│   │   ├── dialogs/     # 对话框组件
│   │   ├── tag-list/    # 标签列表组件
│   │   └── tag-history/ # 标签历史组件
│   ├── stores/          # Pinia 状态管理
│   ├── styles/          # 样式文件
│   ├── types/           # TypeScript 类型定义
│   ├── utils/           # 工具函数
│   ├── views/           # 页面视图
│   │   └── admin/       # 仓库目录组件
│   ├── App.vue          # 根组件
│   └── main.ts          # 应用入口
└── Dockerfile           # 容器化配置
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```



## 相关链接

- [原项目](https://github.com/Joxit/docker-registry-ui)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)


## 许可证

MIT
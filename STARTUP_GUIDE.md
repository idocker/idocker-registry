# 启动指南 - iDocker Registry

## 修复总结

### 已修复的问题

1. **HTTP 服务导入错误**
   - 文件：`src/utils/http.ts`
   - 问题：缺少 `http` 命名导出
   - 修复：添加 `export const http = getHttpService()`

2. **Composables 导入错误**
   - 文件：`src/views/ImageView.vue`
   - 问题：导入目录而不是文件
   - 修复：分别导入具体的 composable 文件

3. **缺失组件和视图文件**
   - 已创建：ImageDetailDialog.vue
   - 已创建：TagDetailDialog.vue
   - 已创建：ImageDetailView.vue
   - 已创建：ImageTagDetailView.vue

## 启动步骤

### 方式 1：使用批处理脚本（推荐）

```bash
# Windows
cd idocker-registry-ui
run-dev.bat
```

这个脚本会：
1. 切换到正确的目录
2. 启动开发服务器
3. 显示当前目录信息

### 方式 2：使用 npm 命令

```bash
# Windows CMD
cd idocker-registry-ui
npm run dev:client

# Windows PowerShell
Set-Location idocker-registry-ui
npm run dev:client
```

### 方式 3：使用完整路径

```bash
# 确保在正确的目录中
cd /d D:\workspace\iDocker-Registry\idocker-registry-ui
npm run dev:client
```

## 验证启动

启动后，您应该看到：

```
  VITE v4.5.14  ready in XXX ms

  ➜  Local:   http://localhost:8030/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

然后在浏览器中打开：
```
http://localhost:8030/
```

## 故障排除

### 问题：npm 命令找不到 package.json

**原因**：当前工作目录不正确

**解决方案**：
```bash
# 使用完整的路径
cd /d D:\workspace\iDocker-Registry\idocker-registry-ui
dir package.json  # 验证文件存在
npm run dev:client
```

### 问题：端口 8030 已被占用

**检查命令**：
```bash
netstat -ano | findstr :8030
```

**解决方案**：
1. 停止占用端口的进程
2. 或修改 `.env` 文件中的端口配置

### 问题：依赖错误

**解决方案**：
```bash
cd idocker-registry-ui
# 删除 node_modules 和 package-lock.json
rmdir /s /q node_modules
del package-lock.json

# 重新安装依赖
npm install

# 启动服务器
npm run dev:client
```

### 问题：TypeScript 编译错误

**检查类型错误**：
```bash
npx tsc --noEmit
```

**解决方案**：
- 修复类型错误
- 更新类型定义
- 确保所有导入正确

### 问题：Vite 缓存问题

**清除 Vite 缓存**：
```bash
# 删除 node_modules/.vite 目录（如果存在）
rmdir /s /q node_modules\.vite

# 重新启动
npm run dev:client
```

## 同时启动前后端

### 前端 (UI)
```bash
cd idocker-registry-ui
npm run dev:client
# 访问 http://localhost:8030/
```

### 后端 (Server)
```bash
cd idocker-registry-server
npm install
npm start
# API 访问 http://localhost:8031/
```

## 开发工具

### 推荐的编辑器/IDE

- **Visual Studio Code**（推荐）
  - Volar 插件（Vue 3 支持）
  - TypeScript 支持
  - ESLint 支持

- **WebStorm**
  - Vue.js 插件
  - TypeScript 支持

### 浏览器开发工具

- **Vue DevTools**（Chrome/Firefox 扩展）
  - 调试 Vue 组件
  - 查看状态管理

- **网络检查**（Chrome 开发者工具）
  - 查看网络请求
  - 调试 API 调用

## 常用命令

### 安装依赖
```bash
npm install
```

### 添加新依赖
```bash
npm install <package-name>
```

### 开发模式启动
```bash
npm run dev:client
```

### 生产构建
```bash
npm run build
```

### 类型检查
```bash
npx tsc --noEmit
```

### Lint 检查
```bash
npm run lint
```

### 格式化代码
```bash
npm run format
```

## 项目结构

```
idocker-registry-ui/
├── public/              # 静态资源
├── src/
│   ├── assets/        # 资源文件
│   ├── components/    # Vue 组件
│   ├── composables/   # Vue Composables
│   ├── layouts/       # 布局组件
│   ├── router/        # 路由配置
│   ├── services/      # API 服务
│   ├── stores/        # 状态管理
│   ├── styles/        # 全局样式
│   ├── types/         # TypeScript 类型
│   ├── utils/         # 工具函数
│   ├── views/         # 页面组件
│   ├── App.vue        # 根组件
│   └── main.ts        # 入口文件
├── .env               # 环境变量
├── package.json       # 项目配置
├── tsconfig.json      # TypeScript 配置
├── vite.config.ts     # Vite 配置
└── index.html         # HTML 模板
```

## 下一步

启动成功后：

1. **检查登录功能**
   - 测试用户登录
   - 验证 JWT 令牌

2. **测试 API 集成**
   - 检查前端能否正确调用后端 API
   - 验证数据流

3. **完善组件功能**
   - 集成真实的 API 调用
   - 替换模拟数据

4. **添加错误处理**
   - 实现全局错误处理
   - 添加用户友好的错误提示

5. **性能优化**
   - 实现数据缓存
   - 优化列表渲染
   - 添加懒加载

## 文档参考

- `FINAL_FIX_SUMMARY.md` - 详细修复说明
- `UI_FIX_SUMMARY.md` - UI 修复总结
- `FIX_VERIFICATION.md` - 修复验证清单
- `SQLITE_MIGRATION.md` - 数据库迁移说明
- `DATABASE_MIGRATION_SUMMARY.md` - 数据库迁移总结

## 技术支持

如遇到问题，请检查：

1. **Node.js 版本**：建议 v18+（当前使用 v24.9.0）
2. **npm 版本**：建议 v9+（当前使用 v11.6.0）
3. **浏览器兼容性**：现代浏览器（Chrome、Firefox、Edge 最新版本）
4. **网络连接**：确保能访问 localhost 端口

祝开发顺利！🚀

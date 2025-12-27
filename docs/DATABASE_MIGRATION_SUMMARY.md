# 数据库迁移总结

## 问题描述

在 Windows 环境下，尝试将 `sqlite3` 升级到 `better-sqlite3` 时遇到了编译错误：

```
npm error command failed
npm error command C:\Windows\system32\cmd.exe /d /s /c prebuild-install || node-gyp rebuild --release
npm error prebuild-install warn install Request timed out
npm error node:internal/modules/cjs/loader:1423
npm error   throw err;
```

这是因为 `better-sqlite3` 需要编译原生模块，但在 Windows 环境下可能缺少必要的构建工具或配置。

## 解决方案

为了解决跨平台兼容性问题，我们采用了以下方案：

1. **保留 `sqlite3` 作为数据库驱动**：`sqlite3` 不需要编译原生模块，兼容性更好
2. **重构所有数据库操作为异步模式**：保持 `sqlite3` 的异步操作特性
3. **创建统一的数据库辅助工具**：简化数据库操作并提供统一的错误处理

## 主要更改

### 1. 依赖更新

```json
{
  "dependencies": {
    "sqlite3": "^5.1.6"
  }
}
```

### 2. 数据库配置重构

- 更新 `server/config/database.js` 以使用 `sqlite3` 的异步 API
- 所有数据库操作都包装为 Promise
- 保持了性能优化设置（WAL 模式等）

### 3. 数据库辅助工具更新

- 更新 `server/utils/dbHelper.js` 中所有方法为异步
- 每个方法都返回 Promise，简化错误处理
- 提供统一的数据库操作接口

### 4. 路由和中间件更新

- 更新所有路由文件以使用异步数据库操作
- 所有数据库调用都添加了 `await` 关键字
- 确保错误能够正确传播到错误处理中间件

## 文件修改列表

1. `package.json` - 更新依赖为 `sqlite3@5.1.6`
2. `server/config/database.js` - 重写为使用 `sqlite3` 异步 API
3. `server/utils/dbHelper.js` - 更新所有方法为异步操作
4. `server/middleware/auth.js` - 更新所有数据库调用为异步
5. `server/routes/auth.js` - 更新所有数据库调用为异步
6. `server/routes/users.js` - 更新所有数据库调用为异步
7. `server/services/dockerRegistryService.js` - 更新所有数据库调用为异步

## 测试说明

由于在当前环境中无法直接运行 Node.js 服务器，建议在本地环境中进行以下测试：

1. 安装依赖：
   ```bash
   cd idocker-registry-server
   npm install
   ```

2. 初始化数据库：
   ```bash
   npm run init-db
   ```

3. 启动服务器：
   ```bash
   npm start
   ```

4. 测试 API 端点，确保所有功能正常工作

## 性能考虑

虽然 `sqlite3` 的理论性能略低于 `better-sqlite3`，但在实际应用中：

1. 对于中小型应用，性能差异可以忽略
2. 数据库性能瓶颈通常在查询设计而非驱动本身
3. `sqlite3` 的异步特性更适合高并发场景
4. 跨平台兼容性带来的稳定性提升超过了微小的性能损失

## 后续建议

1. 如果将来需要更高性能，可以考虑：
   - 在生产环境中使用 Linux/macOS 部署，然后切换到 `better-sqlite3`
   - 或考虑迁移到 PostgreSQL 等客户端/服务器数据库

2. 监控数据库性能，如果有瓶颈，可以考虑：
   - 优化查询
   - 添加适当索引
   - 使用连接池

3. 定期备份数据库，确保数据安全
# Better-SQLite3 到 SQLite3 迁移指南

## 迁移概述

由于在 Windows 环境下 better-sqlite3 安装和编译存在问题，我们决定回退到 `sqlite3` 并保持异步操作模式。

## 主要变化

### 1. 依赖更新

`package.json` 中的依赖已更新：
- 移除：`better-sqlite3`
- 新增：`sqlite3@5.1.6`

### 2. 数据库操作方式变化

#### 之前 (better-sqlite3 - 同步)
```javascript
import Database from 'better-sqlite3';
import { dbGet } from '../utils/dbHelper.js';

const db = new Database(DB_PATH);
const user = dbGet('SELECT * FROM users WHERE id = ?', [id]);
```

#### 现在 (sqlite3 - 异步)
```javascript
import sqlite3 from 'sqlite3';
import { dbGet } from '../utils/dbHelper.js';

// 数据库连接在数据库初始化时创建
const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
```

### 3. 数据库辅助工具

`utils/dbHelper.js` 文件已更新为异步操作，提供以下便捷方法：

- `await dbGet(sql, params)` - 执行查询并返回单个结果
- `await dbAll(sql, params)` - 执行查询并返回所有结果
- `await dbRun(sql, params)` - 执行插入、更新或删除操作
- `await dbBatch(sql, paramsArray)` - 执行批量操作
- `await dbTransaction(callback)` - 执行事务
- `await dbPaginate(sql, params, page, limit)` - 分页查询
- `await dbExists(table, condition, params)` - 检查记录是否存在
- `await dbCount(table, condition, params)` - 计算记录数量

## 性能优化

### 1. 数据库连接优化
- 启用 WAL 模式：`PRAGMA journal_mode = WAL`
- 优化同步设置：`PRAGMA synchronous = NORMAL`
- 增加缓存大小：`PRAGMA cache_size = 1000`
- 临时表存储在内存：`PRAGMA temp_store = MEMORY`

### 2. 异步操作
- `sqlite3` 使用异步操作，保持了良好的并发处理
- 所有数据库操作都需要使用 `await` 关键字
- 使用 Promise 包装简化了数据库操作

## 需要更新的文件

已更新的文件列表：
1. `package.json` - 更新依赖
2. `server/config/database.js` - 重写数据库连接和初始化
3. `server/utils/dbHelper.js` - 新增数据库辅助工具
4. `server/middleware/auth.js` - 更新认证中间件
5. `server/routes/auth.js` - 更新认证路由
6. `server/services/dockerRegistryService.js` - 更新服务层
7. `server/routes/registry.js` - 更新路由层

## 迁移步骤

1. **安装新依赖**
   ```bash
   cd idocker-registry-server
   npm install
   ```

2. **数据库迁移**
   - 数据库结构保持不变，无需迁移数据
   - 首次启动时，新代码会自动创建表结构

3. **重新初始化数据库**
   ```bash
   npm run init-db
   ```

## 注意事项

1. **API兼容性** - 本次迁移不影响API接口，前端无需修改

2. **数据备份** - 迁移前请备份现有数据库

3. **异步操作** - `sqlite3` 使用异步操作，所有数据库调用必须使用 `await`

4. **错误处理** - 更新了错误处理逻辑，提供更详细的错误信息

## 性能说明

虽然 `sqlite3` 的理论性能略低于 `better-sqlite3`，但在实际使用中差异很小，且具有良好的跨平台兼容性，特别是在 Windows 环境下避免了编译问题。

## 故障排除

如果遇到问题，请检查：
1. `sqlite3` 是否正确安装
2. 数据库文件权限是否正确
3. 检查数据库文件路径是否有效
4. 确认所有数据库操作都使用了 `await` 关键字
5. 检查是否有未捕获的 Promise 错误

如需切换到 `better-sqlite3`，请在 Linux 或 macOS 环境下重新安装依赖并更新相关文件。
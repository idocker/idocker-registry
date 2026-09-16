---
name: idocker-dev
description: Use when reading or modifying iDocker Registry backend code (idocker-registry-server/, Node+Express+SQLite) — architecture layers, response format, route registration order, SQLite migrations, and the real commands to verify a change.
---

# iDocker 后端开发

## 作用域与坐标

- 工作空间根：`/workspace/idocker-registry`。注意 `AGENTS.md` 里写的 `/workspace/idocker`
  是**错误路径**，本机不存在。
- 后端：`idocker-registry-server/`（package version **1.1.0**，ESM，`"type": "module"`）。
- 前端见 skill `idocker-ui-dev`；部署见 `idocker-deploy`；`/v2` 代理与镜像权限见 `idocker-docker-authz`。
- 本机 Node 为 **v18.19.1**，而镜像构建用 `node:22-alpine`。改代码时避免依赖仅在 22 可用的新 API。
- 工作空间默认**没有 `node_modules`**：任何 `npm test` / `npm run dev` 之前先
  `cd idocker-registry-server && npm install`（需要网络）。

## 分层约定：Route → Model/Service

| 层 | 位置 | 职责 |
|----|------|------|
| Route | `routes/*.js` | 只做参数校验 → 调用 Model/Service → 统一响应 |
| Model | `models/*.js` | 继承 `BaseModel`（`get/all/run/paginate/findById/create/update/delete`） |
| Service | `services/*.js` | 复杂业务：认证、Docker 交互、同步 |
| Middleware | `middleware/auth.js`、`errorHandler.js` | 鉴权与统一错误 |
| Utils | `utils/` | `apiResponse`、`logger`、`dockerUtils`、`messages` |

- 全部 ESM（`import`/`export`），不要写 `require`。
- 异步路由一律用 `asyncHandler()` 包裹（来自 `middleware/errorHandler.js`），否则 Promise
  拒绝不会被统一错误处理接管。
- 已不再有 controllers 层，业务写在 route 里或下沉到 service。

## 统一响应格式（`utils/apiResponse.js`）

```javascript
success(data)             // { success: true, data }
successMessage('...')     // { success: true, message }
paginated(data, pagination) // { success: true, data, pagination:{page,limit,total,totalPages,hasNextPage,hasPrevPage} }
error(message, code)      // { success: false, message, error? }
validationError(errors)   // { success: false, message: 'Data validation failed', errors }
```

`utils/errorHandler.js` 另导出 `AppError(message, statusCode, errorCode)`。

## 路由注册顺序（`index.js`，改动必须保持）

```
helmet → cors → rateLimit(skip /v2) → express.json(10mb) → 日志中间件
  → /v2  dockerRegistryRoutes   (token 服务 + 鉴权 + 权限校验)
  → /v2  dockerRegistryProxy    (代理到内部 registry)
  → /api/auth        (无 authMiddleware)
  → /api/{users,namespaces,projects,repository,audit,sync}  (authMiddleware)
  → express.static(public/)
  → errorHandler
  → SPA fallback (非 /api、非 /v2、无文件扩展名 → index.html)
```

要记住的两个事实：

1. `/v2` 的自定义路由必须**先**于 proxy 注册，否则 token 服务会被代理吃掉。
2. `errorHandler` 注册在 SPA fallback **之前**，且项目里没有 404 handler。所以未匹配的
   `/api/*` 路径返回的是 Express 默认 404 HTML，而不是统一 JSON 错误体 —— 不要假设
   所有 API 错误都是 `{success:false}` 形状。
3. 新增 API 模块：`app.use('/api/xxx', authMiddleware, xxxRoutes)`，放在 `express.static` 之前。

## SQLite 与迁移

- `config/database.js`：`initDatabase()` 建表 + 索引 + 默认数据（admin/admin123、namespace `default`）。
- PRAGMA：`foreign_keys=ON`、`journal_mode=WAL`、`synchronous=NORMAL`。
- 迁移用 `PRAGMA user_version` 做一次性版本门控（当前已到版本 2：v1 角色体系、v2
  `repository_members`）。加 schema 变更时**追加新版本号分支**，不要改旧分支。
- 角色枚举（users.role，CHECK 约束）：`admin | project_manager | developer | operator`。
- 项目成员角色枚举：`project_manager | developer | operator`。

## 权限中间件

`middleware/auth.js` 导出：`authMiddleware`（JWT Bearer）、`requireRole(roles)`、
`requireAdmin`、`dockerAuthMiddleware`。

- `requireAdmin` 会再查一次 `req.user.role !== 'admin'`，与 `requireRole('admin')` 重复，用哪个都行。
- 路由内部用 `requireAdmin` 的例子：`routes/projects.js` 的 POST/PUT/DELETE 与 `/all`。

## 新增一个后端 API 的标准落点

1. `models/XxxModel.js`：`export class XxxModel extends BaseModel { constructor(){ super('table') } }`
2. `routes/xxx.js`：`express.Router()` + `asyncHandler` + `success/error/paginated`
3. `index.js`：`import xxxRoutes` 并 `app.use('/api/xxx', authMiddleware, xxxRoutes)`
4. 需要时同步前端 `services/*.service.ts`

## 验证一个后端改动（本工作空间实际可用的手段）

```bash
cd /workspace/idocker-registry/idocker-registry-server
node --check routes/xxx.js      # 语法自检，无需依赖，随时可用
npm install                     # 需要网络；无 node_modules 时后续命令都会失败
npm test                        # = node simple-test.js，冒烟测试
npm run init-db                 # = node config/database.js
```

- `npm test` 只覆盖 `utils/apiResponse.js` 与 `utils/messages.js` 两个**纯逻辑、不连数据库**
  的模块（98 行，`assert` 断言）。它不启动 HTTP、不碰 SQLite，**不能**当作 API 或权限行为的证据。
- 没有任何 lint 脚本；后端也没有端到端测试。改路由/权限后，真实验证需要在容器里跑起来
  （见 skill `idocker-deploy`）并用 curl / docker 打真实请求。

## 陷阱清单（均已核对代码）

- `utils/messages.js` 定义了集中式消息常量，但**全仓库 0 处引用**；各 route 实际是硬编码消息，
  中文英文混杂。改消息时跟随所在文件的既有风格，不要把整体迁移混进无关改动。
- `middleware/auth.js` 的 `requireProjectPermission` 引用了**未定义的 `dbGet`**，而且没有任何
  调用点 —— 死代码，别复用，也别"顺手修"进无关 PR。
- `middleware/auth.js` 的 `dockerAuthMiddleware` / `handleTokenService` 与
  `routes/dockerRegistry.js` 内的同名实现重复；`/v2` 实际生效的是 `routes/dockerRegistry.js` 那份。
- `index.js` 的请求日志中间件用 `res.statusCode !== 200` 判断错误，但它在请求**开始时**执行，
  此时 `statusCode` 恒为 200 —— 这个错误日志分支实际不会触发。
- 消息与注释混用中英文，属既有风格，不要为此做全局重写。

## 相关文档

`DEVELOPMENT_REFERENCE.md`（2026-07-29 生成）与 `AGENTS.md` 信息量大但**有过时与冲突**：
文档写 server 0.9.0（实际 1.1.0）、写 `/api/sync/all` 为 GET（实际是 `POST /api/sync/all`）、
把项目成员权限记作 `project_members`（实际代码走 `repository_members`）。以代码为准。

---
name: idocker-docker-authz
description: Use when working on Docker Registry v2 proxying, image push/pull authorization, repository naming, or the token service in iDocker (routes/dockerRegistry.js, services/dockerAuthzService.js, utils/dockerUtils.js).
---

# Docker Registry 代理与镜像权限

## 请求流转

`/v2/*` 在 `index.js` 里按顺序挂两组：

1. `routes/dockerRegistry.js` —— 自有中间件（鉴权 → 权限校验 → 响应计时）+ token 服务 + 两个占位 handler。
2. `http-proxy-middleware` 实例 —— 透传到内部 registry（`DOCKER_REGISTRY_URL`，默认
   `http://localhost:7519`）。

顺序不能反：反了 token 服务会被代理吞掉。

## 鉴权

`routes/dockerRegistry.js` 顶部中间件对除 `/token` 外的所有 `/v2` 请求：

- 无 `Authorization` → 返回带 `WWW-Authenticate` 的 401 挑战。
- `Basic` → `AuthService.verifyUser(username, password)`。
- `Bearer` → `AuthService.validateToken(token)`。
- 通过后写 `req.user` 与 `req.dockerAuth = { type, user }`。

**`GET /v2/` 故意不做匿名放行**：代码注释明确说明返回 401 是为了让 docker/podman/skopeo
在后续请求（包括 blob 的 HEAD 存在性检查）都带上凭证。不要"顺手"把根路径改成 200。

`middleware/auth.js` 里的 `dockerAuthMiddleware` 是同一逻辑的另一份实现，但 `/v2` 走的不是它。

## 仓库名解析规则

`utils/dockerUtils.js` 的 `extractRepositoryAndAction(req)` 从路径中切出仓库名与动作：

- API 分段（`manifests` / `blobs` / `tags`）之前的部分是仓库名，且**同时兼容**是否带 `/v2` 前缀
  （Express 在 router 内会剥掉挂载前缀）。
- 动作映射：`manifests` GET/HEAD→pull、PUT→push、DELETE→delete；`blobs/uploads` POST/PATCH/PUT→push，
  其他 blobs GET/HEAD→pull；`tags/list` GET→pull。

**命名空间不参与镜像路径**。`dockerAuthzService.js` 与生成 token 的逻辑都按同一规则切分：

- **单段名**（`idocker.vip/nginx`）→ 归属内置 `default` 项目，仓库名就是该单段。
- **多段名**（`idocker.vip/wvp/media-worker`）→ 首段是项目名，其余是仓库名。

## 权限判定顺序（`DockerAuthzService.checkRepositoryPermission`）

按代码实际顺序：

1. 仓库名拆不出段 → 拒绝。
2. 查项目：不存在或 `is_active` 为假 → 拒绝（`Project '<x>' not found or is inactive`）。
3. `user.role === 'admin'` → **直接放行**（不需要仓库已存在）。
4. 非 admin 一律要求仓库**已存在**于数据库，否则
   `Repository '<x>' not found — push requires an existing repository`。
5. 仓库 `is_public` 且动作是 pull → 放行。
6. 项目名是 `default` 且动作是 pull → 放行（default 项目对全体登录用户可拉）。
7. 否则查 `repository_members` 的成员角色，按角色表判权限；不是成员 → 拒绝。

> **最重要的业务约束**：非 admin 用户**不能靠 push 创建新仓库**。要先在 Web UI 里把仓库建出来，
> 再 docker push。注意 `routes/dockerRegistry.js` 里 `:name/manifests/:reference` 这类单段参数
> 路由**匹配不到** `project/repo` 这种多段名，所以 `createRepositoryIfNotExists` 那条路径实际
> 基本不会触发。

### 角色 → 动作表（`ROLE_HIERARCHY`）

| 角色 | pull | push | delete |
|------|------|------|--------|
| admin | ✅ | ✅ | ✅ |
| project_manager | ✅ | ✅ | ✅ |
| developer | ✅ | ✅ | ✅ |
| operator | ✅ | ❌ | ❌ |

注意这是**全系统角色**表。仓库级授权另存于 `repository_members`（角色 `project_manager` /
`developer` / `operator`），用同一个表判定。`AGENTS.md` 说项目权限存 `project_members` ——
那是 v2 迁移前的旧结构，当前代码只读 `repository_members`。

## Token 服务

`GET /v2/token?service=<svc>&scope=repository:<name>:pull,push`（凭证走 Basic）：

- scope 按 `repository:name:actions` 解析（`routes/dockerRegistry.js` 的 `handleTokenService`）。
- 交给 `DockerAuthzService.generateDockerToken()`，它会把用户的**实际角色**折算成有效动作：
  - admin 保持 admin；
  - 仓库 `is_public` 或属于 `default` 项目 → 降为 `operator`（只给 pull）；
  - 是 `repository_members` 成员 → 用其成员角色；
  - 否则保持 `user.role`。
- 返回体固定 `{ token, expires_in: 3600, issued_at }`。
- 无 scope 时生成 `{ type:'registry', name:service, actions:['*'] }`。

## 代理侧副作用（`index.js` 的 `createProxyMiddleware` 回调）

- `onProxyRes`：用 `req.user`/`req.dockerPermission` 记录操作（`DockerLogService` +
  `DockerAuthzService.logDockerOperation`，后者写 `audit_logs`，action 形如 `docker:push`）。
- **push manifest 成功后自动入库**：`PUT` + 2xx + 路径匹配 `^/v2/(.+)/manifests/[^/]+$` 时，
  异步调用 `dockerSyncService.processRepository()`，让新 tag 立刻出现在 Web UI（无需手动 sync）。
  这里也是从**原始路径正则**抓仓库名的，因为多段名走不到路由参数。
- `onError`：返回 502，body 是 Docker 风格 `{ errors: [{ code:'UNAVAILABLE', ... }] }`。

## 权限失败与错误响应

- 权限不通过：`DockerLogService.logOperation(status:'unauthorized')` 落库，然后返回
  **403**，`{ errors: [{ code: 'DENIED', message: <reason>, detail: null }] }`。
- 鉴权失败：401 + `WWW-Authenticate` 挑战。全部走 `utils/dockerUtils.js` 的
  `generateAuthChallenge` / `generateDockerError`，不要在 `/v2` 里返回 `{success:false}` 形状。

## 改这块时的验证

- `node --check routes/dockerRegistry.js`、`node --check services/dockerAuthzService.js` 做语法自检。
- 真正的证据只能来自运行中的实例：`docker login`、跨角色 push/pull、`curl /v2/token`、
  以及 Web UI 是否即时出现新 tag。启动方式见 skill `idocker-deploy`。
- 权限改动至少覆盖三种角色（admin / 项目成员 / 非成员）与两种仓库（default 单段、项目多段）。

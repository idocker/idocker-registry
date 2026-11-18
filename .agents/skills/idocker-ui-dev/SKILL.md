---
name: idocker-ui-dev
description: Use when reading or modifying the iDocker Registry frontend (idocker-registry-ui/, Vue 3 + TypeScript + Vite + Pinia) — build commands, HTTP/auth call chain, router guards, i18n, theming, and naming conventions.
---

# iDocker 前端开发

## 坐标与命令

- 前端根：`idocker-registry-ui/`（version 2.0.6，与镜像 tag 同步递增）。
  `node_modules` 已就位；只有在干净 clone 或依赖改动后才需要 `npm install`（需要网络）。
- 宿主 Node 为 v18.19.1；镜像内用 `node:22-alpine` 构建。

```bash
cd /workspace/idocker-registry/idocker-registry-ui
npm install
npm run build        # = vue-tsc --noEmit && vite build  ← 类型错误会直接让构建失败
npm run lint         # ⚠️ 当前跑不起来：.eslintrc.cjs 依赖 @rushstack/eslint-patch，实测该包不在 devDependencies
npm run format       # prettier --write src/
npm run dev:client   # vite dev server，端口 8030
```

- `npm run build` 的前半段是 `vue-tsc --noEmit`：**类型不通过就没有产物**。改完必须真跑一次。
- `npm run dev` / `npm run dev:server` 会 `cd idocker-registry-server`，但 UI 目录下**没有**这个
  子目录 —— 这两个脚本在本仓库布局下是失效的。开发时分别跑后端和 `npm run dev:client`。
- Vite 开发服务器：端口 8030，`@` 别名指向 `src/`，并把 `/api` 与 `/v2` 代理到
  `http://localhost:8031`（即后端开发端口，见 `idocker-registry-server/.env` 的 `PORT=8031`）。

## 调用链（照此分层，别跨层直连）

```
View (*.vue) → services/*.service.ts → utils/http.ts 的 http 单例 → 后端
```

- `utils/http.ts` 导出单例 `http`（`RegistryHttpService` 类）。service 文件统一
  `import { http } from '@/utils/http'`，方法里直接 `return http.get<T>('/api/...')`。
- **必须用具名导入**：该文件 `export default getHttpService`（默认导出是个函数）。写
  `import http from '@/utils/http'` 拿到的是函数而不是实例。
- ⚠️ **`composables/useApi.ts` 在整个前端零引用**（`useApi` / `usePaginatedApi` /
  `useConfirmAction` / `useSearchAndFilter` 均无调用点）。`docs/development-guide.md` 里
  "`services/*.service.ts` → `useApi<T>()`" 的调用链**在实际代码中不存在**，不要按它改造。
- service 的既有形状：`class XxxService { async getX() {...} }` + 文件末尾
  `export default new XxxService()`；组件里 `import projectService from '@/services/project.service'`。
  查询串是手写的 `new URLSearchParams()` + 逐字段 `append`。
- `stores/auth.ts` 里全部登录/登出/profile/改密请求直接 `import axios from 'axios'`，不经 `http`。
  两种写法并存，跟随所在文件的既有写法，不要顺手统一。

### HTTP 层行为（`utils/http.ts`）

- 请求拦截器注入两个来源的 token：`registryStore.authToken`（Registry），以及当
  `config.url` 以 `/api/` 开头时用 `authStore.token`（平台）。
- 响应 401 分两条路：`/api/` 的 401 → 清认证并跳登录；其余 401 → 解析
  `www-authenticate` 的 `Bearer realm/service/scope`，换 token 后重试一次。
- 响应缓存的现状（别被名字误导）：成功响应会写进模块级 `Map`（`CACHE_TTL = 5 分钟`），但读取缓存的
  `getCachedResponse()` **没有任何调用方** —— 缓存只写不读。`http.clearCache()` 因此不影响数据新鲜度，
  排查"改了数据看不到新值"时**不要**往缓存这条线上找。

## 认证状态

- `stores/auth.ts`（Pinia options 写法）：
  - 持久化 key：`localStorage['idocker_token']`、`localStorage['user_data']`（注意两者命名不统一）。
  - 全项目没有 pinia 持久化插件，全部手写裸 key：`registryServers`、`theme`（`stores/registry.ts`）、
    `locale`（`i18n/index.ts`）。
  - getter：`isAuthenticated`（`!!token`）、`isAdmin`（`user.role === 'admin'`）、`currentUser`。
  - `initAuth()` 负责把 localStorage 的 token 塞回 `axios.defaults.headers.common`。
  - 副作用：`login()` 里有遗留的 `console.log(token, user)`，不要照抄这种调试输出。
  - `fetchProfile()` 读的是 `response.data.user`，而多数接口是 `response.data.data` ——
    两者形状不一致，改这块前先确认后端 `/api/auth/profile` 的真实返回。

## 路由与守卫（`router/index.ts`）

- 守卫 `router.beforeEach`：
  1. 用 `to.meta.titleKey`（i18n key）或 `meta.title` 设置 `document.title`；
  2. `checkAuthRequired(to)` 为真时要求 `authStore.isAuthenticated`，否则只记
     `loginRedirectPath` 并跳 `/admin/login?redirect=<fullPath>`；
     **不**标记会话过期（首次访问不该在登录页报“登录已失效”）；
  3. 已登录再访问 `/admin/login` → 重定向 `/`（前端首页，不是管理页）；
  4. `meta.requiresAdmin` 且角色非 admin → 重定向 `/admin/profile`（不是 403 页）。
- 注意 `checkAuthRequired()` 只检查 `meta.requiresAuth`，其内部还有一个恒为空的
  `protectedRoutes` 数组 —— 新增页面必须显式写 `meta.requiresAuth: true`。
- 会话失效提示：`authStore.markSessionExpired()` 会在内存置 `sessionExpired` 并写
  `sessionStorage['idocker_session_expired']`（因为 `utils/http.ts` 的 401 分支用
  `window.location.href` 硬跳转，整页重载会清空 Pinia）。登录页 `onMounted` 读一次
  快照后调 `clearSessionExpired()`，所以提示只在被踢回那一次出现，刷新不再重复。
  触发点：令牌过期（`useAuthListener`）、`/api` 401 且**请求时持有 token**、
  其他标签页登出。未登录状态下的 401 不标记。
- 实际存在的视图：`views/{ImageView,ImageDetailView,NotFoundView}.vue` 与
  `views/admin/*`（含 `RepositoriesView.vue`、`PlaceholderView.vue`）。
  文档里的 `ImageTagDetailView.vue` 与 `/images/:imageId/tags/:tagId` 路由**在代码中不存在**。

## i18n

- `vue-i18n`，非 legacy 模式 + `globalInjection`；默认 `zh-CN`，fallback `en-US`。
- 语言包：`i18n/locales/zh-CN.ts`（约 1024 行）与 `en-US.ts`（约 1021 行）。
- **新增文案必须同时改这两个文件**，key 结构保持一致，否则英文界面会漏字。
- 组件内用 `$t('key')` 或 Composition API 的 `t()`。用户可见文本不要硬编码。

## 主题

- 三模式 `light` / `dark` / `auto`；切换靠给 `document.body.className` 整体赋值（`'dark-theme'` 或
  `''`），不是增删单个 class —— 别在里面塞其他 class。
- 颜色一律走 `styles/variables.scss` 里的 CSS 变量（如 `--primary-text`、`--background`、
  `--card-background`、`--border-color`、`--header-background`），不要在组件里写死色值。
- 样式分层：`variables`（变量）、`global`（全局）、`components`（组件）、`layout`、`typography`、`mixins`。
- `vite.config.ts` 里 sass 用 `api: 'legacy'`，这是既定配置，别顺手升级成 modern API。

## 命名约定

| 后缀 | 用途 | 示例 |
|------|------|------|
| `*View.vue` | 页面视图 | `LoginView.vue`、`views/admin/SyncView.vue` |
| `*Component.vue` | 通用组件 | `HeaderComponent.vue` |
| `dialogs/*.vue` | 对话框 | `dialogs/RegistryMenu.vue`、`UserMenu.vue` |
| `*.service.ts` | API 封装 | `repository.service.ts` |
| `use*.ts` | composable | `useApi.ts` |

- 所有 TS 类型集中在 `src/types/index.ts`，不要就地定义。
- 单文件组件顺序：`<template>` → `<script setup lang="ts">` → `<style lang="scss" scoped>`。

## 类型门禁的现状

- `tsconfig.json` 是 `"strict": false` —— 类型检查比想象中宽松，别假设严格模式在兜底。
- 有三处 `import type { ... } from 'vue-router/dist/router-CWoNjPRp.mjs'`（`types/index.ts`、
  `services/user.service.ts`、`services/sync.service.ts`）：路径指向 vue-router 构建产物的 hash 文件名，
  疑为 IDE 误自动导入，导入的 `P` / `A` 均未被使用。由于 `build` 会跑 `vue-tsc --noEmit`，
  这是最可能挡住构建的地方；动这三个文件时优先考虑删掉这几行伪导入。

## 已知死代码 / 未接线（别去"修复"，也别照抄）

- `stores/repository.ts`：零引用（只有自己的 `defineStore`），且引用了 `.env` 与 `env.d.ts` 中
  都不存在的 `VITE_REPOSITORY_*` / `VITE_SINGLE_REPOSITORY` 等变量，是 `registry.ts` 的改名副本。
- `composables/useApi.ts`、`composables/useAuthCheck.js`：零引用。
- `utils/helpers.ts` 的 `applyTheme()`：零引用。主题实际由 `App.vue` 直接改写
  `document.body.className`（**整体覆盖**，不是 classList 增删）。
- `views/admin/DashboardView.vue` 里链到 `/admin/repositories/${id}`，而路由表只有
  `/admin/repositories`（无 `:id`）—— 点击会落到 `not-found`。

## 改前改后

前端没有自动化测试兜底，唯一门槛是 `npm run build`（= `vue-tsc --noEmit && vite build`）。改完：
`npm run build` → 在真实运行的实例上刷新页面确认（启动方式见 skill `idocker-deploy`）。
不要只凭类型通过就宣称功能已验证。

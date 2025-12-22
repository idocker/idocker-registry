# 身份验证和授权指南

## 概述

本系统实现了完整的身份验证和授权机制，确保只有授权用户才能访问需要权限的页面。系统使用 JWT 令牌进行身份验证，并通过路由守卫实现权限控制。

## 身份验证机制

### 1. 用户登录

用户可以通过以下方式登录系统：
- 用户名/密码验证
- LDAP 认证（如果配置）

登录成功后，系统会：
1. 生成 JWT 令牌
2. 存储用户信息和令牌到本地存储
3. 设置 API 请求的授权头
4. 重定向到请求的页面

### 2. 令牌管理

- JWT 令牌存储在浏览器的 localStorage 中
- 令牌包含用户 ID、用户名和角色信息
- 所有 API 请求都会自动添加 `Authorization: Bearer <token>` 头

### 3. 用户登出

登出时，系统会：
1. 清除本地存储的令牌和用户信息
2. 调用后端登出接口（可选）
3. 清除 API 请求的授权头
4. 重定向到登录页面

## 权限控制

### 1. 路由级权限

系统使用 Vue Router 的导航守卫实现路由级权限控制：

```javascript
// 需要认证的路由标记
{
  path: '/admin/users',
  meta: { requiresAuth: true }
}

// 路由守卫检查
router.beforeEach((to, from, next) => {
  if (checkAuthRequired(to)) {
    if (!authStore.isAuthenticated) {
      // 重定向到登录页面
      return next({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      })
    }
  }
  next()
})
```

### 2. 受保护的页面

以下页面需要用户登录：

1. **管理页面**（明确标记需要认证）：
   - 个人资料
   - 密码修改
   - 用户管理
   - 审计日志
   - 仪表板
   - 项目管理

2. **功能页面**（通过路由名称检查）：
   - 标签列表 (`/taglist/:image`)
   - 标签历史 (`/taghistory/:image/:tag`)

3. **公开页面**（无需认证）：
   - 目录/仓库列表 (`/`)
   - 登录页面 (`/admin/login`)
   - 404 页面

## 授权提示系统

### 1. 登录提示组件

当用户尝试访问需要登录的页面时，系统会显示 `AuthPrompt` 组件：

- 显示友好的提示信息
- 提供"登录"和"取消"按钮
- 保存原始请求路径，登录后自动重定向

### 2. 交互流程

1. 用户尝试访问受保护的页面
2. 系统检查用户是否已认证
3. 如果未认证，显示登录提示
4. 用户点击"登录"：
   - 重定向到登录页面
   - 保存原始路径
   - 登录成功后自动重定向回原始页面
5. 用户点击"取消"：
   - 返回上一页
   - 不显示登录提示

## 权限级别

### 1. 用户角色

系统支持以下用户角色：

1. **管理员 (admin)**
   - 完全访问权限
   - 用户管理
   - 系统配置
   - 所有操作权限

2. **普通用户 (user)**
   - 基本访问权限
   - 查看仓库和标签
   - 有限的操作权限

### 2. 资源级权限

后端实现了基于资源的权限控制：

- **Registry 读取权限**：所有认证用户
- **Registry 删除权限**：仅管理员
- **系统管理权限**：仅管理员

## 使用指南

### 1. 开发者

如何在组件中使用权限检查：

```javascript
import { useAuthCheck } from '@/composables/useAuthCheck.js'

const { isAuthenticated, requiresLogin, showLoginPrompt } = useAuthCheck()

// 在模板中
<template>
  <div v-if="isAuthenticated">
    <!-- 受保护的内容 -->
  </div>
  
  <div v-else>
    <!-- 公开内容 -->
    <button @click="showLoginPrompt('/protected-route')">
      登录查看更多
    </button>
  </div>
</template>
```

### 2. 路由保护

添加新路由时，如果需要认证：

```javascript
{
  path: '/new-protected-route',
  name: 'protected-route',
  component: () => import('@/views/ProtectedView.vue'),
  meta: {
    title: 'Protected Page - Docker Registry Management',
    requiresAuth: true  // 添加此标记
  }
}
```

### 3. 管理员权限检查

```javascript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 在模板中
<template>
  <button v-if="authStore.isAdmin" @click="deleteItem">
    删除
  </button>
</template>
```

## 安全注意事项

1. **令牌安全**：
   - 使用强密钥签名 JWT
   - 设置合理的令牌过期时间
   - 在生产环境中使用 HTTPS

2. **会话管理**：
   - 登出时清除本地存储
   - 实现令牌自动刷新机制（可选）
   - 检测令牌过期并提示重新登录

3. **权限验证**：
   - 前端和后端双重验证
   - 关键操作需要额外权限检查
   - 记录权限违规尝试

## 故障排除

### 常见问题

1. **登录后仍然提示未认证**
   - 检查本地存储是否正确保存令牌
   - 检查 API 请求是否包含授权头
   - 验证令牌格式和有效性

2. **无法访问受保护页面**
   - 确认路由配置中是否添加了 `requiresAuth: true`
   - 检查用户角色是否具有相应权限
   - 检查路由守卫是否正确实现

3. **登录后重定向错误**
   - 检查 `loginRedirectPath` 是否正确保存
   - 确认重定向逻辑是否正确实现
   - 检查登录成功后的重定向代码

### 调试技巧

1. 使用浏览器开发工具检查：
   - localStorage 中的令牌
   - API 请求头
   - 控制台错误信息

2. 添加调试日志：
   ```javascript
   console.log('Auth state:', authStore.isAuthenticated)
   console.log('User role:', authStore.user?.role)
   console.log('Redirect path:', authStore.loginRedirectPath)
   ```

3. 检查网络请求：
   - 登录请求是否成功
   - API 响应状态码
   - 错误消息内容
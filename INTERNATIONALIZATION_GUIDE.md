# 国际化处理指南

## 概述

本文档提供了 iDocker Registry 项目国际化的完整指南和执行状态。

---

## 已完成的工作

### ✅ 后端基础设施

1. **创建了统一的消息文件**
   - 文件：`idocker-registry-server/utils/messages.js`
   - 内容：所有后端消息的英文字符串
   - 包含：数据库、认证、用户、项目、仓库、镜像标签等所有模块的消息

2. **核心文件处理完成**
   - `middleware/auth.js` - 认证中间件（注释和主要函数已改为英文）

---

## 待处理的内容

### 📝 后端国际化清单

根据检查，以下文件中的中文需要改为英文（共约200+处）：

#### 1. 核心配置文件

| 文件 | 优先级 | 主要中文内容 |
|------|---------|-------------|
| `config/database.js` | ⭐⭐⭐ | 日志消息、错误信息 |
| `utils/dbHelper.js` | ⭐⭐⭐ | 所有日志消息 |
| `utils/logger.js` | ⭐ | 部分注释 |

#### 2. 路由文件（Routes）

| 文件 | 优先级 | 中文数量 |
|------|---------|---------|
| `routes/auth.js` | ⭐⭐⭐ | 15+ |
| `routes/users.js` | ⭐⭐ | 10+ |
| `routes/projects.js` | ⭐⭐ | 20+ |
| `routes/repository.js` | ⭐⭐ | 30+ |
| `routes/audit.js` | ⭐ | 15+ |
| `routes/sync.js` | ⭐ | 10+ |

#### 3. 模型文件（Models）

| 文件 | 优先级 | 中文数量 |
|------|---------|---------|
| `models/AuthModel.js` | ⭐⭐⭐ | 30+ |
| `models/UserModel.js` | ⭐⭐ | 20+ |
| `models/ProjectModel.js` | ⭐⭐ | 25+ |
| `models/RepositoryModel.js` | ⭐⭐ | 30+ |
| `models/ImageTagModel.js` | ⭐⭐ | 20+ |
| `models/RegistryConfigModel.js` | ⭐⭐ | 20+ |
| `models/DockerRegistryModel.js` | ⭐ | 10+ |

#### 4. 服务文件（Services）

| 文件 | 优先级 | 中文数量 |
|------|---------|---------|
| `services/dockerRegistryService.js` | ⭐⭐⭐ | 20+ |
| `services/repositorySyncService.js` | ⭐⭐ | 30+ |

---

### 📝 前端国际化清单

#### 1. 已发现包含中文的文件（34个）

根据搜索，以下文件包含中文内容需要处理：

```
idocker-registry-ui/src/views/ImageView.vue
idocker-registry-ui/src/views/ImageTagDetailView.vue
idocker-registry-ui/src/views/ImageDetailView.vue
idocker-registry-ui/src/views/admin/UsersView.vue
idocker-registry-ui/src/views/admin/SyncView.vue
idocker-registry-ui/src/views/admin/ProjectsView.vue
idocker-registry-ui/src/views/admin/ProjectDetailView.vue
idocker-registry-ui/src/views/admin/ProfileView.vue
idocker-registry-ui/src/views/admin/PasswordView.vue
idocker-registry-ui/src/views/admin/LoginView.vue
idocker-registry-ui/src/views/admin/DashboardView.vue
idocker-registry-ui/src/views/admin/AuditView.vue
idocker-registry-ui/src/types/index.ts
idocker-registry-ui/src/stores/auth.ts
idocker-registry-ui/src/services/user.service.ts
idocker-registry-ui/src/services/sync.service.ts
idocker-registry-ui/src/services/repository.service.ts
idocker-registry-ui/src/services/project.service.ts
idocker-registry-ui/src/services/dashboard.service.ts
idocker-registry-ui/src/services/auth.service.ts
idocker-registry-ui/src/services/audit.service.ts
idocker-registry-ui/src/router/index.ts
idocker-registry-ui/src/composables/useNotifications.ts
idocker-registry-ui/src/composables/useAuthListener.ts
idocker-registry-ui/src/composables/useApi.ts
idocker-registry-ui/src/components/registry/TagDetailDialog.vue
idocker-registry-ui/src/components/registry/ImageDetailDialog.vue
idocker-registry-ui/src/components/LanguageSwitcher.vue
idocker-registry-ui/src/components/HeaderComponent.vue
idocker-registry-ui/src/components/dialogs/UserMenu.vue
idocker-registry-ui/src/components/admin/NavigationSidebar.vue
idocker-registry-ui/src/components/admin/ManagementLayout.vue
```

#### 2. 现有国际化支持

项目已经配置了 i18n：
- 配置文件：`src/i18n/index.ts`
- 语言包：`src/i18n/locales/zh-CN.ts` 和 `src/i18n/locales/en-US.ts`
- 支持语言：中文（zh-CN）、英文（en-US）

---

## 处理策略和建议

### 策略 1：批量替换（推荐用于后端）

**工具**: 使用 IDE 的全局搜索替换功能

**步骤**:
1. 在 IDE 中打开 `idocker-registry-server` 目录
2. 使用全局搜索（Ctrl+Shift+F 或 Cmd+Shift+F）
3. 搜索中文内容并逐个替换为英文

**常用替换模式**:

```
日志相关：
logger.error('数据库') → logger.error('Database')
logger.error('获取') → logger.error('Get')
logger.error('创建') → logger.error('Create')
logger.error('更新') → logger.error('Update')
logger.error('删除') → logger.error('Delete')

错误信息：
res.status(401).json({ message: '认证令牌缺失' })
→ res.status(401).json({ message: 'Authentication token missing' })

res.status(403).json({ message: '权限不足' })
→ res.status(403).json({ message: 'Insufficient permission' })

throw new Error('不能为空')
→ throw new Error('cannot be empty')
```

### 策略 2：使用 messages.js（推荐）

**步骤**:
1. 导入统一的消息文件
2. 使用 `messages.xxx.yyy` 替代硬编码字符串

**示例**:
```javascript
import { messages } from './utils/messages.js';

// 之前
logger.error('数据库连接错误:', error);

// 之后
logger.error(messages.database.connectionError, error);

// 之前
res.status(401).json({ message: '认证令牌缺失' });

// 之后
res.status(401).json({ message: messages.auth.tokenMissing });
```

### 策略 3：前端国际化处理

**步骤**:
1. 在 Vue 组件中使用 `$t()` 函数
2. 将硬编码的中文替换为翻译 key

**示例**:
```vue
<!-- 之前 -->
<v-btn>保存</v-btn>

<!-- 之后 -->
<v-btn>{{ $t('common.save') }}</v-btn>
```

**新增翻译 key 到语言包**:

```typescript
// src/i18n/locales/zh-CN.ts
export default {
  common: {
    save: '保存',
    // ...
  }
}

// src/i18n/locales/en-US.ts
export default {
  common: {
    save: 'Save',
    // ...
  }
}
```

---

## 快速参考：常用翻译对照

### 数据库相关

| 中文 | 英文 |
|------|------|
| 数据库连接成功 | Database connection established |
| 数据库连接错误 | Database connection error |
| 数据库查询错误 | Database query error |
| 数据库执行错误 | Database execute error |
| 提交事务错误 | Transaction commit error |
| 获取最后插入ID错误 | Get last insert ID error |
| 检查记录存在性错误 | Check record existence error |

### 认证相关

| 中文 | 英文 |
|------|------|
| 认证令牌缺失 | Authentication token missing |
| 用户不存在 | User not found |
| 用户账户已被禁用 | User account is disabled |
| 认证令牌已过期 | Authentication token expired |
| 无效的认证令牌 | Invalid authentication token |
| 用户名或密码错误 | Username or password incorrect |
| 账户已被禁用 | Account is disabled |
| 不支持的认证方式 | Unsupported authentication method |
| 令牌服务错误 | Token service error |

### API 响应

| 中文 | 英文 |
|------|------|
| 请先登录 | Please login first |
| 需要管理员权限 | Admin permission required |
| 权限不足 | Insufficient permission |
| 无权访问 | No permission to access |
| 项目不存在 | Project not found |
| 仓库不存在 | Repository not found |
| 镜像不存在 | Image not found |
| 操作失败 | Operation failed |

### 操作相关

| 中文 | 英文 |
|------|------|
| 创建 | Create |
| 更新 | Update |
| 删除 | Delete |
| 获取 | Get |
| 同步 | Synchronize |
| 添加 | Add |
| 移除 | Remove |
| 查找 | Find/Query |
| 检查 | Check |
| 验证 | Verify |

### 状态相关

| 中文 | 英文 |
|------|------|
| 成功 | Success |
| 失败 | Failed |
| 错误 | Error |
| 警告 | Warning |
| 信息 | Information |

---

## 执行检查清单

### 后端国际化进度

- [ ] `config/database.js` - 所有日志和错误消息
- [x] `middleware/auth.js` - 注释和主要函数
- [ ] `utils/dbHelper.js` - 所有日志消息
- [ ] `utils/logger.js` - 部分注释
- [ ] `routes/auth.js` - 所有响应消息
- [ ] `routes/users.js` - 所有响应消息
- [ ] `routes/projects.js` - 所有响应消息
- [ ] `routes/repository.js` - 所有响应消息
- [ ] `routes/audit.js` - 所有响应消息
- [ ] `routes/sync.js` - 所有响应消息
- [ ] `models/AuthModel.js` - 所有消息
- [ ] `models/UserModel.js` - 所有消息
- [ ] `models/ProjectModel.js` - 所有消息
- [ ] `models/RepositoryModel.js` - 所有消息
- [ ] `models/ImageTagModel.js` - 所有消息
- [ ] `models/RegistryConfigModel.js` - 所有消息
- [ ] `models/DockerRegistryModel.js` - 所有消息
- [ ] `services/dockerRegistryService.js` - 所有消息
- [ ] `services/repositorySyncService.js` - 所有消息

### 前端国际化进度

- [ ] 检查所有 `.vue` 文件中的硬编码中文
- [ ] 检查所有 `.ts` 文件中的硬编码中文
- [ ] 使用 `$t()` 函数替换硬编码文本
- [ ] 在语言包中添加缺失的翻译 key
- [ ] 验证所有页面的国际化效果
- [ ] 测试语言切换功能

---

## 优先级建议

### 高优先级（P0 - 必须完成）

1. **后端 API 响应消息** - 影响用户体验
   - `middleware/auth.js`
   - `routes/users.js`
   - `routes/projects.js`
   - `routes/repository.js`

2. **前端错误提示** - 影响用户体验
   - `LoginView.vue`
   - 主要错误提示组件

### 中优先级（P1 - 重要）

1. **后端日志消息** - 影响运维
   - `utils/dbHelper.js`
   - 所有 model 文件

2. **前端主要页面** - 影响国际化体验
   - `DashboardView.vue`
   - `UsersView.vue`
   - `ProjectsView.vue`

### 低优先级（P2 - 可选）

1. **后端注释** - 不影响功能
   - 所有文件的注释

2. **前端次要页面** - 使用频率较低
   - `SyncView.vue`
   - `AuditView.vue`

---

## 自动化建议

### 使用脚本批量处理

可以创建自动化脚本来批量处理：

```bash
#!/bin/bash
# 批量替换脚本示例
find . -name "*.js" -type f -exec sed -i 's/数据库连接成功/Database connection established/g' {} \;
find . -name "*.js" -type f -exec sed -i 's/认证令牌缺失/Authentication token missing/g' {} \;
```

### 使用 AI 辅助

可以继续使用 AI 来处理剩余文件：
- 每次处理 2-3 个文件
- 提供明确的中文→英文对照表
- 验证修改后的代码

---

## 质量保证

### 测试检查

国际化完成后，进行以下检查：

1. **功能测试**
   - [ ] 用户登录功能正常
   - [ ] API 响应正确
   - [ ] 错误提示清晰

2. **国际化测试**
   - [ ] 英文界面正常显示
   - [ ] 中文界面正常显示
   - [ ] 语言切换功能正常

3. **日志测试**
   - [ ] 所有日志为英文
   - [ ] 日志格式正确
   - [ ] 错误信息完整

### 代码审查

- [ ] 所有中文消息已替换
- [ ] 翻译准确且专业
- [ ] 代码格式正确
- [ ] 无语法错误

---

## 后续维护

### 新开发规范

1. **后端开发规范**
   - 所有日志消息必须使用英文
   - 所有用户提示消息必须使用英文
   - 所有 API 响应必须使用英文
   - 注释可以使用中文（开发团队使用）

2. **前端开发规范**
   - 所有 UI 文本必须使用 `$t()` 函数
   - 新增的翻译 key 必须同时添加到 zh-CN 和 en-US
   - 硬编码文本仅用于开发调试
   - 生产环境禁用硬编码

3. **定期检查**
   - 代码审查时检查国际化
   - 定期使用脚本扫描硬编码文本
   - 新功能开发时同步国际化

---

## 联系与支持

- 问题反馈：项目 Issue 跟踪
- 翻译建议：提交 Pull Request
- 文档更新：同步更新国际化文档

---

**文档版本**: 1.0.0
**更新日期**: 2024-01-XX
**负责人**: iDocker Registry Team

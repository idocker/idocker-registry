# 运行时错误修复 - apiCall is not a function

## 错误描述

```
Uncaught (in promise) TypeError: apiCall is not a function
    at loadPage (useApi.ts:104:28)
    at refresh (useApi.ts:134:12)
    at refreshImages (ImageView.vue:272:9)
```

## 问题分析

### 错误调用链

1. `ImageView.vue:272` - `refreshImages()` 调用 `refresh()`
2. `useApi.ts:134` - `refresh()` 调用 `loadPage()` 没有传递 `apiCall` 参数
3. `useApi.ts:104` - `loadPage()` 尝试调用 `apiCall(page, limit)` 但 `apiCall` 是 `undefined`

### 根本原因

在 `src/views/ImageView.vue` 中，`refreshImages` 函数调用了 `refresh()` 但没有传递 `apiCall` 参数：

```typescript
const refreshImages = async () => {
  await refresh()  // ❌ 缺少 apiCall 参数
  showSuccess('镜像列表已刷新')
}
```

而在 `src/composables/useApi.ts` 中，`refresh` 函数需要 `apiCall` 参数：

```typescript
const refresh = (apiCall: (page: number, limit: number) => Promise<any>) => {
  return loadPage(currentPage.value, pagination.value.limit, apiCall)
}
```

## 解决方案

修改 `refreshImages` 函数，直接调用 `loadPage` 并传递正确的 `apiCall`：

```typescript
// 修复前
const refreshImages = async () => {
  await refresh()  // ❌ 缺少 apiCall
  showSuccess('镜像列表已刷新')
}

// 修复后
const refreshImages = async () => {
  // 重新加载当前页的镜像列表
  const params = {
    page: currentPage.value,
    limit: pagination.value.limit
  }

  if (searchTerm.value) {
    params.search = searchTerm.value
  }

  if (selectedProject.value) {
    params.projectId = selectedProject.value
  }

  await loadPage(currentPage.value, params.limit, async (page, limit) => {
    const response = await registryService.getImages({ ...params, page, limit })
    if (response.success) {
      return {
        items: response.data.images,
        pagination: response.data.pagination
      }
    }
    throw new Error('获取镜像列表失败')
  })

  showSuccess('镜像列表已刷新')
}
```

## 为什么这样修复？

### 避免了参数传递问题
直接调用 `loadPage` 而不是 `refresh()`，避免了需要记住和传递原始的 `apiCall` 函数的问题。

### 保持了代码一致性
`loadPage` 的调用方式与 `loadImages` 函数中的调用方式完全一致，确保了代码的一致性。

### 保持了现有功能
修复后的代码仍然正确地：
- 使用当前的页码
- 保留搜索和过滤条件
- 更新分页状态
- 显示成功消息

## 其他可能的修复方案

### 方案 1：修改 useApi.ts 的 refresh 函数（更复杂）

```typescript
// 在 usePaginatedApi 内部保存原始的 apiCall
let lastApiCall: ((page: number, limit: number) => Promise<any>) | null = null

const loadPage = async (page: number, limit: number = pagination.value.limit, apiCall?: (page: number, limit: number) => Promise<any>) => {
  // 保存 apiCall 以便后续使用
  if (apiCall) {
    lastApiCall = apiCall
  }

  // ... 其余代码
}

const refresh = async () => {
  if (lastApiCall) {
    return loadPage(currentPage.value, pagination.value.limit, lastApiCall)
  }
  throw new Error('No API call available for refresh')
}
```

这个方案更复杂，但提供了更灵活的 `refresh` 功能。

### 方案 2：使用重构的 API（推荐长期）

考虑重构 `usePaginatedApi`，使其更符合 Vue 3 的最佳实践：

```typescript
export function usePaginatedApi<T>(apiFn: (params: any) => Promise<any>) {
  const data = ref<any>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const load = async (params: any = {}) => {
    isLoading.value = true
    try {
      const result = await apiFn(params)
      data.value = result
      error.value = null
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const refresh = () => load(data.value?.params || {})

  return {
    data,
    isLoading,
    error,
    load,
    refresh
  }
}
```

## 验证修复

修复后，刷新功能应该正常工作：

1. 点击刷新按钮
2. 调用 `refreshImages()` 函数
3. 重新加载当前页的数据
4. 不再出现 `apiCall is not a function` 错误

## 其他注意事项

### 检查其他视图

确保其他使用 `usePaginatedApi` 的视图也正确实现了刷新功能：

- `src/views/TagListView.vue` - 可能需要类似的修复
- `src/views/TagHistoryView.vue` - 可能需要类似的修复
- `src/views/admin/*.vue` - 可能需要类似的修复

### 单元测试

建议为 `useApi` 和 `usePaginatedApi` 添加单元测试，以捕获此类错误：

```typescript
describe('usePaginatedApi', () => {
  it('should handle refresh without apiCall parameter', async () => {
    const { refresh } = usePaginatedApi()

    // 测试不传递参数的情况
    await expect(refresh()).rejects.toThrow('No API call available')
  })

  it('should handle refresh with apiCall parameter', async () => {
    const apiCall = vi.fn().mockResolvedValue({ items: [], pagination: {} })
    const { refresh, load } = usePaginatedApi(apiCall)

    await load({}, apiCall)
    await refresh()

    expect(apiCall).toHaveBeenCalled()
  })
})
```

## 总结

✅ **已修复**：`refreshImages` 函数中的 API 调用问题
✅ **避免了**：`apiCall is not a function` 运行时错误
✅ **保持了**：代码的一致性和可维护性
✅ **建议了**：长期的改进方案和测试策略

现在刷新功能应该能够正常工作！

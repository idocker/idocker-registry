/**
 * API调用组合函数
 * 提供统一的API调用管理和状态处理
 */

import { ref, computed, type Ref } from 'vue'
import { showError, showSuccess } from '@/composables/useNotifications'

export interface ApiState<T = any> {
  data: Ref<T | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  isSuccess: Ref<boolean>
}

export interface PaginationOptions {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useApi<T = any>(initialData: T | null = null): ApiState<T> & {
  resetState: () => void
  setLoading: (loading: boolean) => void
  setError: (errorMessage: string) => void
  setSuccess: (responseData: T) => void
  execute: (apiCall: () => Promise<T>) => Promise<T | null>
} {
  const data = ref<T | null>(initialData) as Ref<T, T>
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isSuccess = ref(false)

  const resetState = () => {
    data.value = initialData
    isLoading.value = false
    error.value = null
    isSuccess.value = false
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
    error.value = null
  }

  const setError = (errorMessage: string) => {
    isLoading.value = false
    error.value = errorMessage
    isSuccess.value = false
  }

  const setSuccess = (responseData: T) => {
    isLoading.value = false
    data.value = responseData
    error.value = null
    isSuccess.value = true
  }

  const execute = async (apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      const result = await apiCall()
      setSuccess(result)
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '请求失败'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  return {
    data,
    isLoading,
    error,
    isSuccess,
    resetState,
    setLoading,
    setError,
    setSuccess,
    execute
  }
}

/**
 * 分页API调用组合函数
 */
export function usePaginatedApi<T = any>(initialData: any[] = [], initialPagination: PaginationOptions = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
}) {
  const apiState = useApi<{
    items: T[]
    pagination: PaginationOptions
  }>({ items: initialData, pagination: initialPagination })
  
  const { data, isLoading, error, isSuccess } = apiState

  const items = computed(() => data.value?.items || [])
  const pagination = computed(() => data.value?.pagination || initialPagination)
  const currentPage = computed(() => pagination.value.page)
  const totalItems = computed(() => pagination.value.total)
  const totalPages = computed(() => pagination.value.totalPages)

  const loadPage = async (page: number, limit: number = pagination.value.limit, apiCall: (page: number, limit: number) => Promise<any>) => {
    try {
      apiState.setLoading(true)
      const result = await apiCall(page, limit)
      apiState.setSuccess(result)
      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '加载失败'
      apiState.setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const nextPage = (apiCall: (page: number, limit: number) => Promise<any>) => {
    if (currentPage.value < totalPages.value) {
      return loadPage(currentPage.value + 1, pagination.value.limit, apiCall)
    }
  }

  const prevPage = (apiCall: (page: number, limit: number) => Promise<any>) => {
    if (currentPage.value > 1) {
      return loadPage(currentPage.value - 1, pagination.value.limit, apiCall)
    }
  }

  const goToPage = (page: number, apiCall: (page: number, limit: number) => Promise<any>) => {
    if (page >= 1 && page <= totalPages.value) {
      return loadPage(page, pagination.value.limit, apiCall)
    }
  }

  const refresh = (apiCall: (page: number, limit: number) => Promise<any>) => {
    return loadPage(currentPage.value, pagination.value.limit, apiCall)
  }

  return {
    data,
    items,
    isLoading,
    error,
    isSuccess,
    pagination,
    currentPage,
    totalItems,
    totalPages,
    resetState: apiState.resetState,
    setLoading: apiState.setLoading,
    setError: apiState.setError,
    setSuccess: apiState.setSuccess,
    execute: apiState.execute,
    loadPage,
    nextPage,
    prevPage,
    goToPage,
    refresh
  }
}

/**
 * 确认操作组合函数
 */
export function useConfirmAction() {
  const isLoading = ref(false)

  const confirmAction = async (
    title: string,
    message: string,
    confirmText: string = '确认',
    cancelText: string = '取消',
    action: () => Promise<any>,
    successMessage: string = '操作成功'
  ): Promise<boolean> => {
    // 这里应该显示一个确认对话框
    // 为了简化，使用原生的确认对话框
    if (confirm(`${title}\n\n${message}`)) {
      try {
        isLoading.value = true
        await action()
        showSuccess(successMessage)
        return true
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || '操作失败'
        showError(errorMessage)
        return false
      } finally {
        isLoading.value = false
      }
    }
    return false
  }

  return {
    isLoading,
    confirmAction
  }
}

/**
 * 搜索和过滤组合函数
 */
export function useSearchAndFilter(initialSearch: string = '', initialFilters: Record<string, any> = {}) {
  const search = ref(initialSearch)
  const filters = ref<Record<string, any>>(initialFilters)
  const isFilterChanged = ref(false)

  const updateSearch = (newSearch: string) => {
    search.value = newSearch
    isFilterChanged.value = true
  }

  const updateFilter = (key: string, value: any) => {
    filters.value[key] = value
    isFilterChanged.value = true
  }

  const updateFilters = (newFilters: Record<string, any>) => {
    filters.value = { ...filters.value, ...newFilters }
    isFilterChanged.value = true
  }

  const resetFilters = (defaultFilters: Record<string, any> = {}) => {
    search.value = initialSearch
    filters.value = defaultFilters
    isFilterChanged.value = true
  }

  const markApplied = () => {
    isFilterChanged.value = false
  }

  return {
    search,
    filters,
    isFilterChanged,
    updateSearch,
    updateFilter,
    updateFilters,
    resetFilters,
    markApplied
  }
}
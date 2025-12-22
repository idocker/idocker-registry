/**
 * 通知组合函数
 * 提供统一的通知显示和管理功能
 */

import { ref } from 'vue'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  timeout?: number
}

const notifications = ref<Notification[]>([])

/**
 * 显示通知
 * @param type 通知类型
 * @param title 通知标题
 * @param message 通知内容
 * @param timeout 显示时长（毫秒），0表示不自动关闭
 * @returns 通知ID
 */
export function showNotification(
  type: NotificationType,
  title: string,
  message?: string,
  timeout: number = 5000
): string {
  const id = Date.now().toString()
  
  notifications.value.push({
    id,
    type,
    title,
    message,
    timeout
  })
  
  // 自动关闭通知
  if (timeout > 0) {
    setTimeout(() => {
      removeNotification(id)
    }, timeout)
  }
  
  return id
}

/**
 * 显示成功通知
 */
export function showSuccess(title: string, message?: string, timeout?: number): string {
  return showNotification('success', title, message, timeout)
}

/**
 * 显示错误通知
 */
export function showError(title: string, message?: string, timeout?: number): string {
  return showNotification('error', title, message, timeout || 8000) // 错误通知显示更长时间
}

/**
 * 显示警告通知
 */
export function showWarning(title: string, message?: string, timeout?: number): string {
  return showNotification('warning', title, message, timeout)
}

/**
 * 显示信息通知
 */
export function showInfo(title: string, message?: string, timeout?: number): string {
  return showNotification('info', title, message, timeout)
}

/**
 * 移除通知
 * @param id 通知ID
 */
export function removeNotification(id: string): void {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.value.splice(index, 1)
  }
}

/**
 * 清空所有通知
 */
export function clearNotifications(): void {
  notifications.value = []
}

/**
 * 获取通知列表
 */
export function getNotifications(): Notification[] {
  return notifications.value
}

/**
 * 使用通知的组合函数
 */
export function useNotifications() {
  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearNotifications
  }
}
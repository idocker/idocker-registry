/**
 * 认证服务
 *
 * 目前只有「修改密码」与「读取本地令牌」两处能力被实际引用
 * （PasswordView、ImageView、ImageDetailView）。
 * 登录 / 登出 / 注册等流程由 stores/auth.ts 直接用 axios 处理。
 */

import { http } from '@/utils/http'
import type { ChangePasswordData } from '@/types'

class AuthService {
  /**
   * 参数验证辅助方法
   */
  private validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} 不能为空`);
    }
  }

  /**
   * 修改密码
   */
  async changePassword(passwordData: ChangePasswordData): Promise<{ success: boolean; message: string }> {
    this.validateRequired(passwordData, '密码数据');
    this.validateRequired(passwordData.currentPassword, '当前密码');
    this.validateRequired(passwordData.newPassword, '新密码');

    return http.put('/api/auth/change-password', passwordData);
  }

  /**
   * 获取当前登录用户的令牌
   *
   * 登录流程（stores/auth.ts）写入的键是 'idocker_token'；此前这里误读 'auth_token'，
   * 而全项目没有任何地方写入该键，导致恒为 null，进而使 ImageDetailView 的
   * hasPermission 始终判定为无权限（删除标签按钮不显示）。
   */
  getToken(): string | null {
    return localStorage.getItem('idocker_token');
  }
}

export default new AuthService()

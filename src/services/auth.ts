import api from '@/lib/axios'
import type { ApiResponse } from '@/types/whitelist'

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  username: string
  password: string
  displayName?: string
  token: string  // 注册令牌
}

/**
 * 用户信息
 */
export interface UserInfo {
  id: number
  username: string
  displayName: string
  email?: string
  isSuperAdmin: boolean
  isAdmin: boolean
}

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string
  user: UserInfo
}

/**
 * 健康检查响应
 */
export interface HealthResponse {
  status: string
  uptime: number
  version: string
  components: Record<string, string>
  timestamp: number
}

/**
 * 认证API服务
 */
export const authApi = {
  /**
   * 管理员登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/v1/admin/login', data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '登录失败')
  },

  /**
   * 管理员注册
   */
  async register(data: RegisterRequest): Promise<void> {
    const response = await api.post<ApiResponse<{ username: string; message: string }>>('/v1/admin/register', data)
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '注册失败')
    }
  },

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserInfo> {
    const response = await api.get<ApiResponse<UserInfo>>('/v1/admin/me')
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取用户信息失败')
  },

  /**
   * 健康检查（用于检测服务器连接）
   */
  async healthCheck(): Promise<HealthResponse> {
    const response = await api.get<ApiResponse<HealthResponse>>('/v1/health')
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '服务器连接失败')
  },

  /**
   * 登出（清除本地token）
   */
  logout(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
  },
}

export default authApi

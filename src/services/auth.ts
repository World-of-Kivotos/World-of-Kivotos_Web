import { isAxiosError } from 'axios'
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
 * 个人识别码状态。后端只存哈希, 因此这里永远拿不到完整明文 —— 明文仅在签发响应里出现一次。
 */
export interface PersonalCodeStatus {
  issued: boolean
  codeLength: number
  prefix?: string
  suffix?: string
  issuedAt?: string
  boundQq: string[]
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
    try {
      const response = await api.post<ApiResponse<{ username: string; message: string }>>('/v1/admin/register', data)
      if (!response.data.success) {
        throw new Error(response.data.error?.message || '注册失败')
      }
    } catch (err) {
      // 后端校验失败 (令牌不存在/已过期、用户名重复、格式不符等) 以 HTTP 400 返回, 经 axios 抛出。
      // mod 的 error 字段是字符串, 提取真实文案而非通用 "Request failed with status code 400"。
      if (isAxiosError(err)) {
        const e = err.response?.data?.error
        const msg = typeof e === 'string' ? e : e?.message
        if (msg) throw new Error(msg)
      }
      throw err
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
   * 生成管理员注册令牌 (用于邀请新管理员自助注册)
   */
  async generateRegistrationToken(expiryHours = 24): Promise<{ token: string; expiryHours: number }> {
    const response = await api.post<ApiResponse<{ token: string; expiryHours: number; message: string }>>(
      '/v1/admin/generate-token',
      { expiryHours }
    )
    if (response.data.success && response.data.data) {
      return { token: response.data.data.token, expiryHours: response.data.data.expiryHours }
    }
    throw new Error(response.data.error?.message || '生成注册令牌失败')
  },

  /**
   * 查询当前管理员的个人识别码状态 (掩码前后缀 + 已绑定的 QQ 号)
   */
  async getPersonalCode(): Promise<PersonalCodeStatus> {
    const response = await api.get<ApiResponse<PersonalCodeStatus>>('/v1/admin/personal-code')

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取个人识别码失败')
  },

  /**
   * 签发/重置个人识别码。明文只在这一次响应里出现, 之后无法再取回。
   */
  async issuePersonalCode(): Promise<{ code: string; codeLength: number }> {
    const response = await api.post<ApiResponse<{ code: string; codeLength: number; message: string }>>(
      '/v1/admin/personal-code'
    )
    if (response.data.success && response.data.data) {
      return { code: response.data.data.code, codeLength: response.data.data.codeLength }
    }
    throw new Error(response.data.error?.message || '签发个人识别码失败')
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

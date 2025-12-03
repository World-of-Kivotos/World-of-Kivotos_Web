import api from '@/lib/axios'
import type {
  ServerStatus,
  ServerPerformance,
  ServerInfo,
  OnlinePlayersCount,
  HealthCheck,
} from '@/types/server'

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    message: string
  }
}

/**
 * 服务器 API 服务
 */
export const serverApi = {
  /**
   * 获取服务器状态
   */
  async getStatus(): Promise<ServerStatus> {
    const response = await api.get<ApiResponse<ServerStatus>>('/v1/server/status')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取服务器状态失败')
  },

  /**
   * 获取服务器性能数据
   */
  async getPerformance(): Promise<ServerPerformance> {
    const response = await api.get<ApiResponse<ServerPerformance>>('/v1/server/performance')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取服务器性能数据失败')
  },

  /**
   * 获取服务器详细信息
   */
  async getInfo(): Promise<ServerInfo> {
    const response = await api.get<ApiResponse<ServerInfo>>('/v1/server/info')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取服务器信息失败')
  },

  /**
   * 获取在线玩家数量
   * 注意：API 路径是 /v1/players/online
   */
  async getOnlinePlayers(): Promise<OnlinePlayersCount> {
    const response = await api.get<ApiResponse<OnlinePlayersCount>>('/v1/players/online')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取在线玩家数量失败')
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheck> {
    const response = await api.get<ApiResponse<HealthCheck>>('/v1/health')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '健康检查失败')
  },
}

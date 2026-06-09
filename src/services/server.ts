import api from '@/lib/axios'
import type { ServerPerformance, OnlinePlayers } from '@/types/server'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { message: string }
}

/**
 * 服务器 API 服务 (对齐 v2: 仅 /server/performance 与 /server/players)。
 * v1 的 /server/status /server/info /players/online /health 在 v2 不存在, 已移除。
 */
export const serverApi = {
  /** 服务器性能 (TPS/MSPT/CPU spark + 内存/GC/线程 JVM)。 */
  async getPerformance(): Promise<ServerPerformance> {
    const response = await api.get<ApiResponse<ServerPerformance>>('/v1/server/performance')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取服务器性能数据失败')
  },

  /** 在线玩家列表。 */
  async getPlayers(): Promise<OnlinePlayers> {
    const response = await api.get<ApiResponse<OnlinePlayers>>('/v1/server/players')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取在线玩家失败')
  },
}

import api from '@/lib/axios'
import type { NetworkStatus } from '@/types/network'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { message: string }
}

export const networkApi = {
  /** 各接入线路的实时人数与连接地址。该端点公开, 无需登录。 */
  async getNodes(): Promise<NetworkStatus> {
    const response = await api.get<ApiResponse<NetworkStatus>>('/v1/net/nodes')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取线路状态失败')
  },
}

import api from '@/lib/axios'
import type {
  WhitelistEntry,
  PaginatedResponse,
  ApiPaginatedResponse,
  ApiResponse,
  WhitelistStats,
  AddWhitelistRequest,
  AddWhitelistResult,
  BatchOperationRequest,
  BatchOperationResponse,
  ResetAuthResult,
  WhitelistSource,
} from '@/types/whitelist'

/**
 * 获取白名单列表查询参数
 */
export type SearchType = 'name' | 'uuid'

export interface GetWhitelistParams {
  page?: number
  size?: number
  search?: string
  searchType?: SearchType
  source?: WhitelistSource
  sort?: string
  order?: 'asc' | 'desc'
  startDate?: string
  endDate?: string
}

/**
 * 白名单API服务
 */
export const whitelistApi = {
  /**
   * 获取白名单列表
   */
  async getWhitelist(params?: GetWhitelistParams): Promise<PaginatedResponse<WhitelistEntry>> {
    const response = await api.get<ApiResponse<ApiPaginatedResponse<WhitelistEntry>>>('/v1/whitelist', {
      params: {
        page: params?.page || 1,
        size: params?.size || 20,
        search: params?.search,
        search_type: params?.searchType || 'name',
        source: params?.source,
        sort: params?.sort,
        order: params?.order,
        start_date: params?.startDate,
        end_date: params?.endDate,
      },
    })
    
    if (response.data.success && response.data.data) {
      const data = response.data.data
      
      // API 直接返回 { items, page, size, total, pages }
      return {
        items: data.items || [],
        page: data.page || 1,
        size: data.size || 20,
        total: data.total || 0,
        total_pages: data.pages || Math.ceil((data.total || 0) / (data.size || 20)),
      }
    }
    throw new Error(response.data.error?.message || '获取白名单失败')
  },

  /**
   * 添加白名单条目
   */
  async addWhitelist(data: AddWhitelistRequest): Promise<AddWhitelistResult> {
    const response = await api.post<ApiResponse<AddWhitelistResult>>('/v1/whitelist', data)

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '添加白名单失败')
  },

  /**
   * 删除白名单条目（通过 name 删除）
   */
  async deleteWhitelist(name: string): Promise<void> {
    const response = await api.delete<ApiResponse<{ name: string; removed: boolean }>>(`/v1/whitelist/by-name/${encodeURIComponent(name)}`)
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '删除白名单失败')
    }
  },

  /**
   * 启用/禁用某条白名单 (按玩家名)。禁用后该玩家进服会被拒并提示"管理员已关闭访问权限"。
   */
  async setActive(name: string, isActive: boolean): Promise<void> {
    const response = await api.put<ApiResponse<{ name: string; is_active: boolean }>>(
      `/v1/whitelist/by-name/${encodeURIComponent(name)}/status`,
      { is_active: isActive }
    )
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '设置启用状态失败')
    }
  },

  /**
   * 重置玩家的密码与免密状态: 清除密码记录并吊销已登记的设备免密绑定。
   * 玩家须重新 /register 设置密码, 并重新 /enroll 才能恢复免密登录。白名单条目本身不受影响。
   * 走 POST 而非 DELETE: 后端 DELETE 路由按前缀截取玩家名, 会把子路径一起吞掉。
   */
  async resetAuth(name: string): Promise<ResetAuthResult> {
    const response = await api.post<ApiResponse<ResetAuthResult>>(
      `/v1/whitelist/by-name/${encodeURIComponent(name)}/reset-auth`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '重置认证失败')
  },

  /**
   * 批量操作白名单 (add/remove/enable/disable)。
   * 归一化后端字段: mod 端返回 failure_count, 前端契约用 failed_count; 同时兜底 details。
   */
  async batchOperation(data: BatchOperationRequest): Promise<BatchOperationResponse> {
    const response = await api.post<ApiResponse<Record<string, unknown>>>('/v1/whitelist/batch', data)

    if (response.data.success && response.data.data) {
      const d = response.data.data
      return {
        operation: String(d.operation ?? data.operation),
        total_requested: Number(d.total_requested ?? 0),
        success_count: Number(d.success_count ?? 0),
        failed_count: Number(d.failed_count ?? d.failure_count ?? 0),
        details: Array.isArray(d.details) ? (d.details as BatchOperationResponse['details']) : [],
      }
    }
    throw new Error(response.data.error?.message || '批量操作失败')
  },

  /**
   * 获取白名单统计信息
   */
  async getStats(): Promise<WhitelistStats> {
    const response = await api.get<ApiResponse<WhitelistStats>>('/v1/whitelist/stats')
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取统计信息失败')
  },

  /**
   * 触发同步
   */
  async triggerSync(): Promise<void> {
    const response = await api.post<ApiResponse<void>>('/v1/whitelist/sync')
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '触发同步失败')
    }
  },
}

export default whitelistApi

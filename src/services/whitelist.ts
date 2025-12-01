import api from '@/lib/axios'
import type {
  WhitelistEntry,
  PaginatedResponse,
  ApiPaginatedResponse,
  ApiResponse,
  WhitelistStats,
  AddWhitelistRequest,
  BatchOperationRequest,
  BatchOperationResponse,
  WhitelistSource,
} from '@/types/whitelist'

/**
 * 获取白名单列表查询参数
 */
export interface GetWhitelistParams {
  page?: number
  size?: number
  search?: string
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
  async addWhitelist(data: AddWhitelistRequest): Promise<WhitelistEntry> {
    const response = await api.post<ApiResponse<WhitelistEntry>>('/v1/whitelist', data)
    
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
   * 批量操作白名单
   */
  async batchOperation(data: BatchOperationRequest): Promise<BatchOperationResponse> {
    const response = await api.post<ApiResponse<BatchOperationResponse>>('/v1/whitelist/batch', data)
    
    if (response.data.success && response.data.data) {
      return response.data.data
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

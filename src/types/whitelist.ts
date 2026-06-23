/**
 * 白名单条目接口
 */
export interface WhitelistEntry {
  id: number
  uuid: string | null
  name: string
  addedByName?: string       // 添加者名称（驼峰）
  addedByUuid?: string       // 添加者UUID（驼峰）
  addedAt?: string           // 添加时间（驼峰）
  createdAt?: string         // 创建时间（驼峰）
  updatedAt?: string         // 更新时间（驼峰）
  source: WhitelistSource
  isActive: boolean          // 状态（驼峰）
  uuidPending?: boolean      // UUID待补充（驼峰）
  qq?: string | null         // 联系QQ (问卷审核加白带入, 可空)
}

/**
 * 白名单来源类型
 */
export type WhitelistSource = 'PLAYER' | 'ADMIN' | 'SYSTEM' | 'API'

/**
 * 分页信息
 */
export interface Pagination {
  page: number
  size: number
  total: number
  total_pages: number
}

/**
 * API分页查询响应（后端实际返回格式）
 */
export interface ApiPaginatedResponse<T> {
  items: T[]
  page: number
  size: number
  total: number
  pages: number  // 后端返回的是 pages 不是 total_pages
}

/**
 * 分页查询响应（前端使用格式）
 */
export interface PaginatedResponse<T> {
  items: T[]
  page: number
  size: number
  total: number
  total_pages: number
}

/**
 * API响应包装
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: number
    message: string
    details?: string
  }
  timestamp: number
}

/**
 * 白名单统计信息 (对齐 v2 mod WhitelistManager.getStats 实际返回)
 */
export interface WhitelistStats {
  totalPlayers: number
  activePlayers: number
  sourceCounts: Partial<Record<WhitelistSource, number>>
  recentAdditions: number
  growthTrend: string
}

/**
 * 添加白名单请求
 */
export interface AddWhitelistRequest {
  name: string
  source: WhitelistSource
  added_by_name?: string
  added_by_uuid?: string
  added_at?: string
  qq?: string | null  // 联系QQ (问卷审核加白带入)
}

/**
 * 添加白名单响应 (mod 端返回的 data 实为此结构, 非完整 WhitelistEntry)。
 * 玩家认证启用时附带绑定该用户名的一次性注册码, 由管理员转交玩家用于 /register。
 */
export interface AddWhitelistResult {
  name: string
  added: boolean
  uuid_pending?: boolean
  message?: string
  registration_code?: string
  code_expires_minutes?: number
}

/**
 * 批量操作请求
 */
export interface BatchOperationRequest {
  operation: 'add' | 'remove' | 'enable' | 'disable'
  source?: WhitelistSource
  added_by_name?: string
  added_by_uuid?: string
  added_at?: string
  players: Array<{
    name?: string
    uuid?: string
  }>
}

/**
 * 批量操作响应
 */
export interface BatchOperationResponse {
  operation: string
  total_requested: number
  success_count: number
  failed_count: number
  details: Array<{
    name?: string
    uuid?: string
    success: boolean
    message?: string
  }>
}

/**
 * 表格排序配置
 */
export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

/**
 * 表格筛选配置
 */
export interface FilterConfig {
  search?: string
  source?: WhitelistSource
  startDate?: string
  endDate?: string
}

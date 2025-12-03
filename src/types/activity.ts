/**
 * 操作日志/活动记录类型定义
 */

/**
 * 问卷系统活动类型
 */
export type SurveyActivityAction = 'submit' | 'approved' | 'rejected'

/**
 * 问卷系统活动日志
 */
export interface SurveyActivityLog {
  id: number
  action: SurveyActivityAction
  player_name: string
  operator: string | null
  submission_id: number | null
  note: string | null
  created_at: string
}

/**
 * 白名单系统操作类型
 */
export type OperationType = 'ADD' | 'REMOVE' | 'QUERY' | 'BATCH_ADD' | 'BATCH_REMOVE' | 'SYNC' | 'UNAUTHORIZED_ACCESS'

/**
 * 白名单系统操作日志
 */
export interface OperationLog {
  id: number
  operation_type: OperationType
  target_uuid: string | null
  target_name: string | null
  operator_ip: string | null
  operator_agent: string | null
  request_data: string | null
  response_status: number
  execution_time: number
  created_at: string
}

/**
 * 操作日志查询参数
 */
export interface GetOperationLogsParams {
  type?: OperationType
  target_uuid?: string
  target_name?: string
  operator_ip?: string
  start_time?: string
  end_time?: string
  limit?: number
  offset?: number
}

/**
 * 操作日志分页响应
 */
export interface OperationLogResponse {
  logs: OperationLog[]
  total: number
  limit: number
  offset: number
}

/**
 * 问卷活动查询参数
 */
export interface GetSurveyActivitiesParams {
  action?: SurveyActivityAction
  limit?: number
  offset?: number
}

/**
 * 问卷活动分页响应
 */
export interface SurveyActivityResponse {
  logs: SurveyActivityLog[]
  total: number
  limit: number
  offset: number
}

/**
 * 格式化后的活动记录（用于前端展示）
 */
export interface FormattedActivity {
  id: string  // 使用 source-id 格式避免冲突
  type: 'submit' | 'approved' | 'rejected' | 'add' | 'remove' | 'sync' | 'other'
  message: string
  time: string
  timestamp: number  // 用于排序
  icon: string
  color: string
}

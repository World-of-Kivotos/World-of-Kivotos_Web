/**
 * 提交状态
 */
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

/**
 * 问题选项
 */
export interface QuestionOption {
  label: string
  value: string
}

/**
 * 答案内容: 后端按题型存为对象 — single/boolean: {value}, multiple: {values},
 * text: {text}, image: {images}。保留扁平标量以兼容历史数据。
 */
export type AnswerContent =
  | {
      value?: string | boolean
      values?: string[]
      text?: string
      images?: string[]
    }
  | string
  | string[]
  | boolean

/**
 * 提交答案
 */
export interface SubmissionAnswer {
  id: number
  question_id: number
  question_title: string
  question_type: 'single' | 'multiple' | 'boolean' | 'text' | 'image'
  question_options?: QuestionOption[] | null  // 选项列表，用于渲染选择题
  question_role?: 'player_name' | 'qq' | null  // 语义标记, 供识别玩家名/QQ 行
  content: AnswerContent | null
}

/**
 * 提交列表项
 */
export interface SubmissionListItem {
  id: number
  survey_id: number
  survey_title: string
  player_name: string | null  // 匿名收集表可空
  qq?: string | null
  status: SubmissionStatus
  in_review_group?: boolean | null  // false=提交时不在审核群 (机器人无法 @ 通知, 面板标记)
  created_at: string
  reviewed_at: string | null
}

/**
 * 提交详情
 */
export interface SubmissionDetail {
  id: number
  survey_id: number
  survey_title: string
  survey_category?: string          // whitelist / collection
  survey_add_whitelist?: boolean    // 通过时是否加白 (收集表为 false)
  player_name: string | null        // 匿名收集表可空
  qq: string | null
  ip_address: string
  ip_location: string | null   // 离线 ip2region 解析的归属地, 无数据为 null
  fill_duration: number | null
  first_viewed_at: string | null
  status: SubmissionStatus
  review_note: string | null
  answers: SubmissionAnswer[]
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

/**
 * 提交统计
 */
export interface SubmissionStats {
  pending: number
  approved: number
  rejected: number
  total: number
}

/**
 * 清理结果
 */
export interface CleanupResult {
  submissions_cleaned: number
  answers_deleted: number
  files_deleted: number
  orphan_files_deleted: number
  space_freed: string
}

/**
 * 审核请求
 */
export interface ReviewSubmissionRequest {
  status: 'approved' | 'rejected'
  review_note?: string
}

/**
 * 获取提交列表参数
 */
export interface GetSubmissionsParams {
  page?: number
  size?: number
  status?: SubmissionStatus
  survey_id?: number
  player_name?: string
  category?: string  // whitelist=审核队列 / collection=收集表结果
}

/**
 * 分页响应
 */
export interface SubmissionPaginatedResponse {
  items: SubmissionListItem[]
  page: number
  size: number
  total: number
  pages: number
}

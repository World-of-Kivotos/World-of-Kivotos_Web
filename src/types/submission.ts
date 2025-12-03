/**
 * 提交状态
 */
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

/**
 * 提交答案
 */
export interface SubmissionAnswer {
  id: number
  question_id: number
  question_title: string
  question_type: 'single' | 'multiple' | 'boolean' | 'text' | 'image'
  content: string | string[] | boolean | null
}

/**
 * 提交列表项
 */
export interface SubmissionListItem {
  id: number
  survey_id: number
  survey_title: string
  player_name: string
  status: SubmissionStatus
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
  player_name: string
  ip_address: string
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

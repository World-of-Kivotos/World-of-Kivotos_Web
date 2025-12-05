/**
 * 问卷接口
 */
export interface Survey {
  id: number
  title: string
  description: string | null
  code: string
  is_active: boolean
  is_random: boolean
  random_count: number | null
  question_count: number
  submission_count: number
  created_at: string
  updated_at: string
}

/**
 * 问题选项
 */
export interface QuestionOption {
  value: string
  label: string
}

/**
 * 问题验证规则
 */
export interface QuestionValidation {
  min_length?: number
  max_length?: number
  max_images?: number
}

/**
 * 条件显示规则
 * 用于实现分支逻辑：根据某道题的答案决定是否显示当前题目
 */
export interface QuestionCondition {
  depends_on: number           // 依赖的问题 ID（或本地临时 ID 的索引）
  show_when: string | string[] // 触发显示的答案值（支持单值或多值）
}

/**
 * 问题类型
 */
export type QuestionType = 'single' | 'multiple' | 'boolean' | 'text' | 'image'

/**
 * 问题接口
 */
export interface Question {
  id: number
  title: string
  description: string | null
  type: QuestionType
  options: QuestionOption[] | null
  is_required: boolean
  is_pinned: boolean  // 是否保留（随机抽题时始终出现）
  order: number
  validation: QuestionValidation | null
  condition: QuestionCondition | null  // 条件显示规则
}

/**
 * 问卷详情（包含问题）
 */
export interface SurveyDetail extends Survey {
  questions: Question[]
}

/**
 * 创建问卷请求
 */
export interface CreateSurveyRequest {
  title: string
  description?: string
  is_random?: boolean
  random_count?: number
  questions?: CreateQuestionRequest[]
}

/**
 * 更新问卷请求
 */
export interface UpdateSurveyRequest {
  title?: string
  description?: string
  is_active?: boolean
  is_random?: boolean
  random_count?: number
}

/**
 * 创建问题请求
 */
export interface CreateQuestionRequest {
  title: string
  description?: string
  type: QuestionType
  options?: QuestionOption[]
  is_required?: boolean
  is_pinned?: boolean  // 是否保留
  order?: number
  validation?: QuestionValidation
  condition?: QuestionCondition  // 条件显示规则
}

/**
 * 更新问题请求
 */
export interface UpdateQuestionRequest {
  title?: string
  description?: string
  type?: QuestionType
  options?: QuestionOption[]
  is_required?: boolean
  order?: number
  validation?: QuestionValidation
  condition?: QuestionCondition  // 条件显示规则
}

/**
 * 分页响应
 */
export interface SurveyPaginatedResponse {
  items: Survey[]
  page: number
  size: number
  total: number
  pages: number
}

/**
 * API 响应
 */
export interface SurveyApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

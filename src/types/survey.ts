/**
 * 问卷接口
 */
// 栏目/场景: whitelist=MC白名单卷, collection=其它收集表
export type SurveyCategory = 'whitelist' | 'collection'

/**
 * 可填状态: 后端 compute_availability 的判定结果
 * inactive/unpublished 只会出现在管理端详情里 (公开列表已过滤掉这两种)
 */
export type AvailabilityState = 'open' | 'inactive' | 'unpublished' | 'not_started' | 'ended' | 'full'

export interface Availability {
  state: AvailabilityState
  message: string | null // open 时为 null; 其余优先取问卷自定义的 closed_message
}

export interface Survey {
  id: number
  title: string
  description: string | null
  code: string
  is_active: boolean
  is_random: boolean
  random_count: number | null
  // 门户编排
  sort_order: number
  is_pinned: boolean
  category: SurveyCategory
  visibility: string
  status: string
  cover_url: string | null
  icon: string | null
  theme_color: string | null
  summary: string | null
  estimated_minutes: number | null
  // 开放窗口与配额 (null=不限)
  starts_at: string | null
  ends_at: string | null
  max_submissions: number | null
  max_submissions_per_ip: number | null
  // 合规与文案
  require_consent: boolean
  privacy_notice: string | null
  closed_message: string | null
  success_message: string | null
  // 提交后动作: webhook 推送
  action_webhook: boolean
  webhook_url: string | null
  // 通知投递群号。null=默认审核群并 @ 提交者本人; 填了群号=纯文本播报到该群 (管理向)
  notify_group_id: number | null
  // 口令只回传"是否设置", 哈希绝不下发
  has_access_password: boolean
  // 列表接口不下发 availability, 仅详情有
  availability?: Availability
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
  min_value?: number   // number 题的取值下限 (闭区间)
  max_value?: number
  max_rating?: number  // rating 题的满分, 缺省 5
  min_date?: string    // date 题的可选起止, "YYYY-MM-DD"
  max_date?: string
}

/**
 * 条件规则的运算符, 与后端 conditions.py 一一对应
 * answered / not_answered 忽略 value
 */
export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'gt'
  | 'lt'
  | 'answered'
  | 'not_answered'

export interface ConditionRule {
  question_id: number // 依赖题的 question_id (稳定引用, 不随题序/编辑变化)
  operator: ConditionOperator
  value?: string | number | string[]
}

/**
 * 条件显示规则
 * 用于实现分支逻辑：根据某道题的答案决定是否显示当前题目
 *
 * 新旧两套形态并存: 存量库里全是 depends_on/show_when 的旧形态, 后端读取时归一化,
 * 但不回写, 所以前端读到的既有可能是新形态也有可能是旧形态。
 */
export interface QuestionCondition {
  // 新形态
  action?: 'show' | 'hide'  // 缺省 show
  match?: 'all' | 'any'     // 缺省 all
  rules?: ConditionRule[]
  // 旧形态 (存量数据, 只读兼容)
  depends_on?: number
  show_when?: string | string[]
}

/**
 * 问题类型
 */
export type QuestionType =
  | 'single'
  | 'select'
  | 'multiple'
  | 'boolean'
  | 'text'
  | 'short_text'
  | 'number'
  | 'date'
  | 'rating'
  | 'image'
  // 分节说明块: 只渲染标题与说明, 不收答案 (后端 QUESTION_TYPES 里 answerable=false)
  | 'section'

// 题目语义标记: 把某道题标记为系统字段, 后端据此抽取结构化字段 (玩家名/QQ)
export type QuestionRole = 'player_name' | 'qq'

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
  role: QuestionRole | null            // 语义标记 (玩家名/QQ)
}

/**
 * 问卷详情（包含问题）
 */
export interface SurveyDetail extends Survey {
  // 提交后动作开关: 只有详情接口下发
  review_required: boolean
  action_add_whitelist: boolean
  action_issue_code: boolean
  action_notify_group: boolean
  availability: Availability
  questions: Question[]
}

/**
 * 创建问卷请求
 *
 * 门户/动作/生命周期字段创建时可一并带上; 访问口令不在此处 —— 它不是 Survey 的列,
 * 后端只在 update_survey 里拦截并哈希, 故新建带口令要靠建完再 PATCH 一次。
 */
export interface CreateSurveyRequest {
  title: string
  description?: string
  is_random?: boolean
  random_count?: number
  category?: SurveyCategory // 建在哪个栏目 (缺省=whitelist)
  // 门户展示
  visibility?: string
  status?: string
  cover_url?: string | null
  icon?: string | null
  theme_color?: string | null
  summary?: string | null
  estimated_minutes?: number | null
  // 开放窗口与配额
  starts_at?: string | null
  ends_at?: string | null
  max_submissions?: number | null
  max_submissions_per_ip?: number | null
  // 合规与文案
  require_consent?: boolean
  privacy_notice?: string | null
  closed_message?: string | null
  success_message?: string | null
  // 提交后动作
  review_required?: boolean
  action_add_whitelist?: boolean
  action_issue_code?: boolean
  action_notify_group?: boolean
  action_webhook?: boolean
  webhook_url?: string | null
  notify_group_id?: number | null
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
  // 门户编排
  sort_order?: number
  is_pinned?: boolean
  category?: SurveyCategory
  visibility?: string
  status?: string
  cover_url?: string | null
  icon?: string | null
  theme_color?: string | null
  summary?: string | null
  estimated_minutes?: number | null
  // 开放窗口与配额
  starts_at?: string | null
  ends_at?: string | null
  max_submissions?: number | null
  max_submissions_per_ip?: number | null
  // 合规与文案
  require_consent?: boolean
  privacy_notice?: string | null
  closed_message?: string | null
  success_message?: string | null
  // 提交后动作
  review_required?: boolean
  action_add_whitelist?: boolean
  action_issue_code?: boolean
  action_notify_group?: boolean
  action_webhook?: boolean
  webhook_url?: string | null
  notify_group_id?: number | null
  // 非 Survey 列: 后端拦截后哈希入 access_password_hash。传 '' 或 null 清除口令, 省略=不改
  access_password?: string | null
}

/**
 * 批量重排问卷展示顺序
 */
export interface ReorderSurveyItem {
  id: number
  sort_order: number
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
  role?: QuestionRole            // 语义标记 (玩家名/QQ)
}

/**
 * 更新问题请求
 */
export interface UpdateQuestionRequest {
  title?: string
  // 可空字段: 传 null 显式清空该字段 (后端 exclude_unset, 省略=不改, null=清空)
  description?: string | null
  type?: QuestionType
  options?: QuestionOption[] | null
  is_required?: boolean
  is_pinned?: boolean            // 是否保留 (随机抽题时始终出现); 增量更新须能改此标记
  order?: number
  validation?: QuestionValidation | null
  condition?: QuestionCondition | null  // 条件显示规则; null=清除条件
  role?: QuestionRole | null            // 语义标记 (玩家名/QQ); null=解绑
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
 * 复制问卷的返回 (与创建问卷同形)
 */
export interface DuplicateSurveyResult {
  id: number
  code: string
  title: string
}

/**
 * 统计: 选项题的单项分布
 */
export interface AnalyticsDistributionItem {
  value: string
  label: string   // 选项 label; boolean 题为 "是"/"否"
  count: number
  percent: number // 1 位小数, 分母是该题 answered 数; answered 为 0 时记 0
}

/**
 * 统计: 数字/评分题的极值与均值
 */
export interface AnalyticsNumericSummary {
  min: number
  max: number
  avg: number
}

/**
 * 统计: 按审核状态的提交数
 */
export interface AnalyticsStatusCounts {
  pending: number
  approved: number
  rejected: number
}

/**
 * 统计: 单日提交量 (无提交的日期不补零)
 */
export interface AnalyticsDailyPoint {
  date: string // YYYY-MM-DD
  count: number
}

/**
 * 统计: 逐题聚合
 */
export interface AnalyticsQuestion {
  question_id: number
  title: string
  type: QuestionType
  answered: number
  distribution: AnalyticsDistributionItem[] // 仅 single/select/multiple/boolean 非空
  numeric: AnalyticsNumericSummary | null   // 仅 number/rating 有值
  samples: string[]                         // 仅 text/short_text 非空, 最近 5 条 (每条 80 字内)
}

/**
 * 问卷统计分析 (GET /surveys/{id}/analytics)
 */
export interface SurveyAnalytics {
  survey_id: number
  title: string
  total_submissions: number
  by_status: AnalyticsStatusCounts
  // 无有效耗时样本时后端给不出均值, 渲染前必须判空
  avg_fill_duration: number | null
  daily: AnalyticsDailyPoint[] // 最近 30 天, 按日期升序
  questions: AnalyticsQuestion[]
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

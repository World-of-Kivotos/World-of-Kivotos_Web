import api from '@/lib/axios'
import type {
  SurveyDetail,
  SurveyPaginatedResponse,
  SurveyApiResponse,
  CreateSurveyRequest,
  UpdateSurveyRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  Question,
  SurveyCategory,
  ReorderSurveyItem,
  DuplicateSurveyResult,
  SurveyAnalytics,
} from '@/types/survey'
import type {
  SubmissionPaginatedResponse,
  SubmissionDetail,
  SubmissionStats,
  CleanupResult,
  GetSubmissionsParams,
  GetSubmissionStatsParams,
  ReviewSubmissionRequest,
  SubmissionStatus,
  BulkReviewResponse,
} from '@/types/submission'

// 问卷系统的 API 基础路径（独立后端: questionnaire.mcwok.cn, 非 mod 的 api.mcwok.cn）
// 本地起后端开发时用 VITE_SURVEY_API_URL=http://localhost:8000/api/v1 覆盖
const SURVEY_API_BASE = import.meta.env.VITE_SURVEY_API_URL || 'https://questionnaire.mcwok.cn/api/v1'

// 问卷上传的图片以相对路径 (/uploads/xxx) 入库, 由问卷源站托管。面板在 panel.mcwok.cn,
// 与问卷不同域, 相对路径会指向面板自身而 404 -> 据 SURVEY_API_BASE 推出问卷源站补成绝对地址。
const SURVEY_ORIGIN = SURVEY_API_BASE.replace(/\/api\/v1\/?$/, '')

export function surveyImageUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${SURVEY_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * 获取问卷列表查询参数
 */
export interface GetSurveysParams {
  page?: number
  size?: number
  search?: string
  is_active?: boolean
  category?: SurveyCategory
}

/**
 * 问卷统计
 */
export interface SurveyStats {
  active: number
  inactive: number
  total: number
}

/**
 * 问卷 API 服务
 */
export const surveyApi = {
  /**
   * 获取问卷列表
   */
  async getSurveys(params?: GetSurveysParams): Promise<SurveyPaginatedResponse> {
    const response = await api.get<SurveyApiResponse<SurveyPaginatedResponse>>(
      `${SURVEY_API_BASE}/surveys`,
      {
        params: {
          page: params?.page || 1,
          size: params?.size || 20,
          search: params?.search,
          is_active: params?.is_active,
          category: params?.category,
        },
      }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取问卷列表失败')
  },

  /**
   * 批量重排问卷展示顺序 (拖拽排序落库)
   */
  async reorderSurveys(orders: ReorderSurveyItem[]): Promise<void> {
    const response = await api.patch<SurveyApiResponse<{ updated: number }>>(
      `${SURVEY_API_BASE}/surveys/reorder`,
      { orders }
    )
    if (!response.data.success) {
      throw new Error(response.data.error?.message || '重排问卷失败')
    }
  },

  /**
   * 获取问卷详情
   */
  async getSurvey(surveyId: number): Promise<SurveyDetail> {
    const response = await api.get<SurveyApiResponse<SurveyDetail>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取问卷详情失败')
  },

  /**
   * 创建问卷
   */
  async createSurvey(data: CreateSurveyRequest): Promise<{ id: number; code: string; title: string }> {
    const response = await api.post<SurveyApiResponse<{ id: number; code: string; title: string }>>(
      `${SURVEY_API_BASE}/surveys`,
      data
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '创建问卷失败')
  },

  /**
   * 更新问卷
   */
  async updateSurvey(surveyId: number, data: UpdateSurveyRequest): Promise<void> {
    const response = await api.patch<SurveyApiResponse<{ id: number; message: string }>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}`,
      data
    )

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '更新问卷失败')
    }
  },

  /**
   * 复制问卷 (深拷贝题目与条件分支, 不复制提交数据; 副本为草稿且未启用)
   */
  async duplicateSurvey(surveyId: number): Promise<DuplicateSurveyResult> {
    const response = await api.post<SurveyApiResponse<DuplicateSurveyResult>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}/duplicate`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '复制问卷失败')
  },

  /**
   * 获取问卷统计分析
   */
  async getAnalytics(surveyId: number): Promise<SurveyAnalytics> {
    const response = await api.get<SurveyApiResponse<SurveyAnalytics>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}/analytics`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取统计分析失败')
  },

  /**
   * 删除问卷
   */
  async deleteSurvey(surveyId: number): Promise<void> {
    const response = await api.delete<SurveyApiResponse<{ message: string }>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}`
    )

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '删除问卷失败')
    }
  },

  /**
   * 切换问卷启用状态
   */
  async toggleSurveyActive(surveyId: number, isActive: boolean): Promise<void> {
    await surveyApi.updateSurvey(surveyId, { is_active: isActive })
  },

  /**
   * 添加问题
   */
  async addQuestion(surveyId: number, data: CreateQuestionRequest): Promise<Question> {
    const response = await api.post<SurveyApiResponse<Question>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}/questions`,
      data
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '添加问题失败')
  },

  /**
   * 更新问题
   */
  async updateQuestion(surveyId: number, questionId: number, data: UpdateQuestionRequest): Promise<void> {
    const response = await api.patch<SurveyApiResponse<{ id: number; message: string }>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}/questions/${questionId}`,
      data
    )

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '更新问题失败')
    }
  },

  /**
   * 删除问题
   */
  async deleteQuestion(surveyId: number, questionId: number): Promise<void> {
    const response = await api.delete<SurveyApiResponse<{ message: string }>>(
      `${SURVEY_API_BASE}/surveys/${surveyId}/questions/${questionId}`
    )

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '删除问题失败')
    }
  },

  /**
   * 获取问卷统计
   */
  async getStats(): Promise<SurveyStats> {
    const response = await api.get<SurveyApiResponse<SurveyStats>>(
      `${SURVEY_API_BASE}/surveys/stats/overview`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取统计数据失败')
  },
}

/**
 * 提交管理 API 服务
 */
export const submissionApi = {
  /**
   * 获取提交列表
   */
  async getSubmissions(params?: GetSubmissionsParams): Promise<SubmissionPaginatedResponse> {
    const response = await api.get<SurveyApiResponse<SubmissionPaginatedResponse>>(
      `${SURVEY_API_BASE}/submissions`,
      {
        params: {
          page: params?.page || 1,
          size: params?.size || 20,
          status: params?.status,
          survey_id: params?.survey_id,
          player_name: params?.player_name,
          category: params?.category,
          review_required: params?.review_required,
        },
      }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取提交列表失败')
  },

  /**
   * 导出某问卷的提交为 CSV 并触发浏览器下载 (走带 JWT 的 api 实例)
   * status 省略时导出全部, 传入则只导出该审核状态的提交
   */
  async exportSurveyCsv(surveyId: number, surveyTitle?: string, status?: SubmissionStatus): Promise<void> {
    const response = await api.get(`${SURVEY_API_BASE}/surveys/${surveyId}/export`, {
      responseType: 'blob',
      params: { status },
    })
    const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${surveyTitle || `survey_${surveyId}`}_提交.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  /**
   * 获取提交详情
   */
  async getSubmission(submissionId: number): Promise<SubmissionDetail> {
    const response = await api.get<SurveyApiResponse<SubmissionDetail>>(
      `${SURVEY_API_BASE}/submissions/${submissionId}`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取提交详情失败')
  },

  /**
   * 审核提交
   */
  async reviewSubmission(submissionId: number, data: ReviewSubmissionRequest): Promise<void> {
    const response = await api.patch<SurveyApiResponse<{ id: number; status: string; message: string }>>(
      `${SURVEY_API_BASE}/submissions/${submissionId}/review`,
      data
    )

    if (!response.data.success) {
      throw new Error(response.data.error?.message || '审核提交失败')
    }
  },

  /**
   * 批量审核提交
   *
   * 后端逐条复用单条审核的完整逻辑 (含通知入队), 单条失败不中断整批, 失败原因随 results 返回。
   * 调用方必须检查 results 里的 ok, 只报 updated 会漏掉部分失败。
   */
  async bulkReview(
    ids: number[],
    reviewStatus: 'approved' | 'rejected',
    reviewNote?: string | null
  ): Promise<BulkReviewResponse> {
    const response = await api.patch<SurveyApiResponse<BulkReviewResponse>>(
      `${SURVEY_API_BASE}/submissions/bulk-review`,
      { ids, status: reviewStatus, review_note: reviewNote ?? null }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '批量审核失败')
  },

  /**
   * 获取统计概览 (审核页传 review_required=true, 与它的列表口径保持一致)
   */
  async getStats(params?: GetSubmissionStatsParams): Promise<SubmissionStats> {
    const response = await api.get<SurveyApiResponse<SubmissionStats>>(
      `${SURVEY_API_BASE}/submissions/stats/overview`,
      { params: { category: params?.category, review_required: params?.review_required } }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取统计数据失败')
  },

  /**
   * 手动触发清理
   */
  async triggerCleanup(): Promise<CleanupResult> {
    const response = await api.post<SurveyApiResponse<CleanupResult>>(
      `${SURVEY_API_BASE}/submissions/cleanup`
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '触发清理失败')
  },
}

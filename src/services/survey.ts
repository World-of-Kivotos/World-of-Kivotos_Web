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
} from '@/types/survey'
import type {
  SubmissionPaginatedResponse,
  SubmissionDetail,
  SubmissionStats,
  CleanupResult,
  GetSubmissionsParams,
  ReviewSubmissionRequest,
} from '@/types/submission'

// 问卷系统的 API 基础路径（使用不同的后端）
const SURVEY_API_BASE = import.meta.env.VITE_SURVEY_API_URL || 'http://localhost:8000/api/v1'

/**
 * 获取问卷列表查询参数
 */
export interface GetSurveysParams {
  page?: number
  size?: number
  search?: string
  is_active?: boolean
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
        },
      }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取问卷列表失败')
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
        },
      }
    )

    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error?.message || '获取提交列表失败')
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
   * 获取统计概览
   */
  async getStats(): Promise<SubmissionStats> {
    const response = await api.get<SurveyApiResponse<SubmissionStats>>(
      `${SURVEY_API_BASE}/submissions/stats/overview`
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

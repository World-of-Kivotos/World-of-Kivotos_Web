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

// 问卷系统的 API 基础路径（使用不同的后端）
const SURVEY_API_BASE = import.meta.env.VITE_SURVEY_API_URL || 'http://localhost:8000/api/v1'

/**
 * 获取问卷列表查询参数
 */
export interface GetSurveysParams {
  page?: number
  size?: number
  search?: string
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
}

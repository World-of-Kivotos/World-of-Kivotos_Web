import axios from 'axios'
import api from '@/lib/axios'
import type {
  OperationLog,
  GetOperationLogsParams,
  OperationLogResponse,
  SurveyActivityLog,
  GetSurveyActivitiesParams,
  SurveyActivityResponse,
} from '@/types/activity'

// Quick-Survey API 基础 URL
const SURVEY_API_URL = import.meta.env.VITE_SURVEY_API_URL || 'http://localhost:8000/api/v1'

// 创建 Quick-Survey axios 实例
const surveyApi = axios.create({
  baseURL: SURVEY_API_URL,
  timeout: 10000,
})

/**
 * 活动日志 API 服务
 */
export const activityApi = {
  /**
   * 获取白名单系统操作日志
   */
  async getOperationLogs(params?: GetOperationLogsParams): Promise<OperationLogResponse> {
    const response = await api.get<{
      success: boolean
      data: OperationLogResponse
    }>('/v1/logs/operations', {
      params: {
        type: params?.type,
        target_uuid: params?.target_uuid,
        target_name: params?.target_name,
        operator_ip: params?.operator_ip,
        start_time: params?.start_time,
        end_time: params?.end_time,
        limit: params?.limit || 10,
        offset: params?.offset || 0,
      },
    })

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error('获取操作日志失败')
  },

  /**
   * 获取问卷系统活动日志
   */
  async getSurveyActivities(params?: GetSurveyActivitiesParams): Promise<SurveyActivityResponse> {
    const response = await surveyApi.get<{
      success: boolean
      data: SurveyActivityResponse
    }>('/activities', {
      params: {
        action: params?.action,
        limit: params?.limit || 10,
        offset: params?.offset || 0,
      },
    })

    if (response.data.success && response.data.data) {
      return response.data.data
    }

    throw new Error('获取问卷活动日志失败')
  },

  /**
   * 获取最近白名单活动
   */
  async getRecentOperations(limit: number = 5): Promise<OperationLog[]> {
    try {
      const response = await this.getOperationLogs({ limit })
      return response.logs
    } catch {
      return []
    }
  },

  /**
   * 获取最近问卷活动
   */
  async getRecentSurveyActivities(limit: number = 10): Promise<SurveyActivityLog[]> {
    try {
      const response = await this.getSurveyActivities({ limit })
      return response.logs
    } catch {
      return []
    }
  },
}

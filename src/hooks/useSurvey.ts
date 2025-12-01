import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { surveyApi, type GetSurveysParams } from '@/services/survey'
import type { CreateSurveyRequest, UpdateSurveyRequest } from '@/types/survey'
import toast from 'react-hot-toast'

/**
 * 问卷查询 key
 */
export const surveyKeys = {
  all: ['surveys'] as const,
  lists: () => [...surveyKeys.all, 'list'] as const,
  list: (params: GetSurveysParams) => [...surveyKeys.lists(), params] as const,
  details: () => [...surveyKeys.all, 'detail'] as const,
  detail: (id: number) => [...surveyKeys.details(), id] as const,
}

/**
 * 获取问卷列表
 */
export function useSurveys(params?: GetSurveysParams) {
  return useQuery({
    queryKey: surveyKeys.list(params || {}),
    queryFn: () => surveyApi.getSurveys(params),
    staleTime: 30 * 1000, // 30秒内数据保持新鲜
  })
}

/**
 * 获取问卷详情
 */
export function useSurveyDetail(surveyId: number) {
  return useQuery({
    queryKey: surveyKeys.detail(surveyId),
    queryFn: () => surveyApi.getSurvey(surveyId),
    enabled: surveyId > 0,
    staleTime: 30 * 1000,
  })
}

/**
 * 创建问卷
 */
export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSurveyRequest) => surveyApi.createSurvey(data),
    onSuccess: (result) => {
      toast.success(`问卷「${result.title}」创建成功`)
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建问卷失败')
    },
  })
}

/**
 * 更新问卷
 */
export function useUpdateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: number; data: UpdateSurveyRequest }) =>
      surveyApi.updateSurvey(surveyId, data),
    onSuccess: () => {
      toast.success('问卷更新成功')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.details() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新问卷失败')
    },
  })
}

/**
 * 删除问卷
 */
export function useDeleteSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (surveyId: number) => surveyApi.deleteSurvey(surveyId),
    onSuccess: () => {
      toast.success('问卷删除成功')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除问卷失败')
    },
  })
}

/**
 * 切换问卷启用状态
 */
export function useToggleSurveyActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, isActive }: { surveyId: number; isActive: boolean }) =>
      surveyApi.toggleSurveyActive(surveyId, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? '问卷已启用' : '问卷已禁用')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.details() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '操作失败')
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionApi } from '@/services/survey'
import { whitelistKeys } from '@/hooks/useWhitelist'
import type { GetSubmissionsParams, ReviewSubmissionRequest } from '@/types/submission'
import { toast } from 'sonner'

/**
 * 审核查询 key
 */
export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (params: GetSubmissionsParams) => [...submissionKeys.lists(), params] as const,
  details: () => [...submissionKeys.all, 'detail'] as const,
  detail: (id: number) => [...submissionKeys.details(), id] as const,
  stats: () => [...submissionKeys.all, 'stats'] as const,
}

/**
 * 获取审核列表
 */
export function useSubmissions(params?: GetSubmissionsParams) {
  return useQuery({
    queryKey: submissionKeys.list(params || {}),
    queryFn: () => submissionApi.getSubmissions(params),
    staleTime: 15 * 1000, // 15秒内数据保持新鲜
  })
}

/**
 * 获取审核详情
 */
export function useSubmissionDetail(submissionId: number) {
  return useQuery({
    queryKey: submissionKeys.detail(submissionId),
    queryFn: () => submissionApi.getSubmission(submissionId),
    enabled: submissionId > 0,
    staleTime: 15 * 1000,
  })
}

/**
 * 获取统计概览
 */
export function useSubmissionStats(category?: string) {
  return useQuery({
    queryKey: [...submissionKeys.stats(), category],
    queryFn: () => submissionApi.getStats(category),
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
  })
}

/**
 * 审核提交
 *
 * 加白职责单点在面板侧 (ReviewDialog 复用 useAddWhitelist): 审核通过后由调用方在 onSuccess
 * 发起加白。此处不再内联加白, 否则会与面板侧对 mod 的 /v1/whitelist 重复写入 (第二次命中
 * "已存在" 记录会触发误导性失败 toast)。注意: 审核走问卷后端 (survey.ts 用 SURVEY_API_BASE
 * 绝对地址), 加白走 mod 后端 (默认 /api), 两者是同一 axios 实例但目标后端不同。
 */
export function useReviewSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      submissionId,
      data,
    }: {
      submissionId: number
      data: ReviewSubmissionRequest
      playerName: string
      reviewerName?: string
    }) => submissionApi.reviewSubmission(submissionId, data),
    onSuccess: (_, variables) => {
      if (variables.data.status === 'approved') {
        // 加白结果由面板侧 useAddWhitelist 单独 toast, 此处只确认审核动作本身,
        // 避免在加白真正完成前就谎报"已加入白名单"。
        toast.success(`审核通过: ${variables.playerName}`)
      } else {
        toast.success(`审核已拒绝`)
      }
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: submissionKeys.details() })
      queryClient.invalidateQueries({ queryKey: submissionKeys.stats() })
      // 刷新白名单数据
      queryClient.invalidateQueries({ queryKey: whitelistKeys.lists() })
      queryClient.invalidateQueries({ queryKey: whitelistKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '审核失败')
    },
  })
}

/**
 * 触发清理
 */
export function useTriggerCleanup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => submissionApi.triggerCleanup(),
    onSuccess: (result) => {
      toast.success(`清理完成，释放空间: ${result.space_freed}`)
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: submissionKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '清理失败')
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submissionApi } from '@/services/survey'
import { whitelistApi } from '@/services/whitelist'
import { whitelistKeys } from '@/hooks/useWhitelist'
import type { GetSubmissionsParams, ReviewSubmissionRequest } from '@/types/submission'
import toast from 'react-hot-toast'

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
export function useSubmissionStats() {
  return useQuery({
    queryKey: submissionKeys.stats(),
    queryFn: () => submissionApi.getStats(),
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
  })
}

/**
 * 审核提交（通过时自动添加白名单）
 */
export function useReviewSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      submissionId, 
      data,
      playerName,
      reviewerName,
    }: { 
      submissionId: number
      data: ReviewSubmissionRequest
      playerName: string
      reviewerName?: string
    }) => {
      // 先执行审核
      await submissionApi.reviewSubmission(submissionId, data)
      
      // 如果审核通过，自动添加白名单
      if (data.status === 'approved' && playerName) {
        try {
          await whitelistApi.addWhitelist({
            name: playerName,
            source: 'ADMIN',
            added_by_name: reviewerName || '审核系统',
          })
        } catch (error) {
          // 白名单添加失败不影响审核结果，但给出提示
          const message = error instanceof Error ? error.message : '添加白名单失败'
          // 如果是玩家已存在，不算错误
          if (!message.includes('已存在') && !message.includes('already exists')) {
            throw new Error(`审核通过但添加白名单失败: ${message}`)
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      if (variables.data.status === 'approved') {
        toast.success(`审核通过，玩家 ${variables.playerName} 已加入白名单`)
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

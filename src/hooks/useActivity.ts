import { useQuery } from '@tanstack/react-query'
import { activityApi } from '@/services/activity'
import type { 
  GetOperationLogsParams, 
  OperationLog, 
  SurveyActivityLog,
  FormattedActivity 
} from '@/types/activity'

/**
 * 活动日志查询 key
 */
export const activityKeys = {
  all: ['activity'] as const,
  logs: () => [...activityKeys.all, 'logs'] as const,
  logsList: (params?: GetOperationLogsParams) => [...activityKeys.logs(), params] as const,
  recent: (limit: number) => [...activityKeys.all, 'recent', limit] as const,
  survey: () => [...activityKeys.all, 'survey'] as const,
  combined: (limit: number) => [...activityKeys.all, 'combined', limit] as const,
}

/**
 * 格式化时间为相对时间
 * @param dateString - ISO 格式的时间字符串（可能是 UTC 时间）
 */
function formatRelativeTime(dateString: string): string {
  // 确保时间字符串被正确解析为 UTC 时间
  // 如果时间字符串没有时区信息，添加 Z 后缀表示 UTC
  let normalizedDateString = dateString
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
    normalizedDateString = dateString + 'Z'
  }
  
  const date = new Date(normalizedDateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return '刚刚'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }
}

/**
 * 格式化问卷系统活动
 */
function formatSurveyActivity(log: SurveyActivityLog): FormattedActivity {
  const playerName = log.player_name || '未知玩家'
  
  const actionConfig: Record<string, {
    type: FormattedActivity['type']
    getMessage: () => string
    icon: string
    color: string
  }> = {
    submit: {
      type: 'submit',
      getMessage: () => `新增 ${playerName} 问卷`,
      icon: 'ph:file-plus',
      color: 'text-[#0077b6]',
    },
    approved: {
      type: 'approved',
      getMessage: () => `${playerName} 问卷审核通过`,
      icon: 'ph:check-circle',
      color: 'text-[#38b000]',
    },
    rejected: {
      type: 'rejected',
      getMessage: () => `${playerName} 问卷审核拒绝`,
      icon: 'ph:x-circle',
      color: 'text-[#d62828]',
    },
  }

  const config = actionConfig[log.action] || {
    type: 'other' as const,
    getMessage: () => `${log.action} 操作`,
    icon: 'ph:circle',
    color: 'text-gray-500',
  }

  return {
    id: `survey-${log.id}`,
    type: config.type,
    message: config.getMessage(),
    time: formatRelativeTime(log.created_at),
    timestamp: new Date(log.created_at).getTime(),
    icon: config.icon,
    color: config.color,
  }
}

/**
 * 格式化白名单系统活动
 */
function formatOperationLog(log: OperationLog): FormattedActivity {
  const targetName = log.target_name || '未知玩家'
  
  const typeConfig: Record<string, {
    type: FormattedActivity['type']
    getMessage: () => string
    icon: string
    color: string
  }> = {
    ADD: {
      type: 'add',
      getMessage: () => `${targetName} 已记录到白名单`,
      icon: 'ph:user-plus',
      color: 'text-[#7209b7]',
    },
    REMOVE: {
      type: 'remove',
      getMessage: () => `${targetName} 已从白名单移除`,
      icon: 'ph:user-minus',
      color: 'text-[#d62828]',
    },
    SYNC: {
      type: 'sync',
      getMessage: () => '同步白名单到服务器',
      icon: 'ph:arrows-clockwise',
      color: 'text-[#f77f00]',
    },
  }

  const config = typeConfig[log.operation_type] || {
    type: 'other' as const,
    getMessage: () => `${log.operation_type} 操作`,
    icon: 'ph:circle',
    color: 'text-gray-500',
  }

  return {
    id: `whitelist-${log.id}`,
    type: config.type,
    message: config.getMessage(),
    time: formatRelativeTime(log.created_at),
    timestamp: new Date(log.created_at).getTime(),
    icon: config.icon,
    color: config.color,
  }
}

/**
 * 获取操作日志列表
 */
export function useOperationLogs(params?: GetOperationLogsParams) {
  return useQuery({
    queryKey: activityKeys.logsList(params),
    queryFn: () => activityApi.getOperationLogs(params),
    staleTime: 30 * 1000,
  })
}

/**
 * 获取最近活动（合并问卷系统和白名单系统的活动）
 */
export function useRecentActivities(limit: number = 5) {
  return useQuery({
    queryKey: activityKeys.combined(limit),
    queryFn: async () => {
      // 并行获取两个系统的活动日志
      const [surveyLogs, operationLogs] = await Promise.all([
        activityApi.getRecentSurveyActivities(limit * 2),
        activityApi.getRecentOperations(limit * 2),
      ])

      // 格式化并合并
      const surveyActivities = surveyLogs.map(formatSurveyActivity)
      const operationActivities = operationLogs
        .filter(log => ['ADD', 'REMOVE', 'SYNC'].includes(log.operation_type))  // 只显示相关操作
        .map(formatOperationLog)

      // 合并并按时间排序
      const combined = [...surveyActivities, ...operationActivities]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)

      return combined
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

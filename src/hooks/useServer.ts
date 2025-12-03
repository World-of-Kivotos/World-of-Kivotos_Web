import { useQuery } from '@tanstack/react-query'
import { serverApi } from '@/services/server'
import type { FormattedServerStatus } from '@/types/server'

/**
 * 服务器查询 key
 */
export const serverKeys = {
  all: ['server'] as const,
  status: () => [...serverKeys.all, 'status'] as const,
  performance: () => [...serverKeys.all, 'performance'] as const,
  info: () => [...serverKeys.all, 'info'] as const,
  players: () => [...serverKeys.all, 'players'] as const,
  health: () => [...serverKeys.all, 'health'] as const,
  dashboard: () => [...serverKeys.all, 'dashboard'] as const,
}

/**
 * 格式化运行时间
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return `${days}天 ${remainingHours}小时`
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}小时 ${remainingMinutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

/**
 * 获取服务器状态
 */
export function useServerStatus() {
  return useQuery({
    queryKey: serverKeys.status(),
    queryFn: () => serverApi.getStatus(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  })
}

/**
 * 获取服务器性能
 */
export function useServerPerformance() {
  return useQuery({
    queryKey: serverKeys.performance(),
    queryFn: () => serverApi.getPerformance(),
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  })
}

/**
 * 获取服务器信息
 */
export function useServerInfo() {
  return useQuery({
    queryKey: serverKeys.info(),
    queryFn: () => serverApi.getInfo(),
    staleTime: 60 * 1000,
  })
}

/**
 * 获取在线玩家
 */
export function useOnlinePlayers() {
  return useQuery({
    queryKey: serverKeys.players(),
    queryFn: () => serverApi.getOnlinePlayers(),
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  })
}

/**
 * 获取仪表板所需的服务器状态（合并多个 API 数据）
 */
export function useDashboardServerStatus() {
  return useQuery({
    queryKey: serverKeys.dashboard(),
    queryFn: async (): Promise<FormattedServerStatus> => {
      try {
        // 并行获取多个数据
        const [status, performance, players, health] = await Promise.all([
          serverApi.getStatus().catch(() => null),
          serverApi.getPerformance().catch(() => null),
          serverApi.getOnlinePlayers().catch(() => null),
          serverApi.healthCheck().catch(() => null),
        ])

        // 如果所有请求都失败，返回离线状态
        if (!status && !performance && !players && !health) {
          return {
            online: false,
            players: 0,
            maxPlayers: 0,
            tps: 0,
            memory: 0,
            maxMemory: 0,
            uptime: '离线',
          }
        }

        // 计算运行时间
        let uptime = '未知'
        if (health?.uptime) {
          const now = Date.now()
          const uptimeMs = now - health.uptime
          uptime = formatUptime(uptimeMs)
        }

        // 内存转换为 GB
        const memoryUsedGB = performance?.memory?.used 
          ? performance.memory.used / (1024 * 1024 * 1024) 
          : 0
        const memoryMaxGB = performance?.memory?.max 
          ? performance.memory.max / (1024 * 1024 * 1024) 
          : 0

        return {
          online: status?.online ?? true,
          players: players?.count ?? 0,
          maxPlayers: players?.max ?? 100,
          tps: performance?.tps?.values?.last_1m ?? 20,
          memory: Math.round(memoryUsedGB * 10) / 10,
          maxMemory: Math.round(memoryMaxGB * 10) / 10,
          uptime,
        }
      } catch {
        return {
          online: false,
          players: 0,
          maxPlayers: 0,
          tps: 0,
          memory: 0,
          maxMemory: 0,
          uptime: '离线',
        }
      }
    },
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  })
}

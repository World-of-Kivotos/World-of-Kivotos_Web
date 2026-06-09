import { useQuery } from '@tanstack/react-query'
import { serverApi } from '@/services/server'

export const serverKeys = {
  all: ['server'] as const,
  performance: () => [...serverKeys.all, 'performance'] as const,
  players: () => [...serverKeys.all, 'players'] as const,
}

/** 服务器性能, 10s 轮询。 */
export function useServerPerformance() {
  return useQuery({
    queryKey: serverKeys.performance(),
    queryFn: () => serverApi.getPerformance(),
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  })
}

/** 在线玩家, 15s 轮询。 */
export function useServerPlayers() {
  return useQuery({
    queryKey: serverKeys.players(),
    queryFn: () => serverApi.getPlayers(),
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  })
}

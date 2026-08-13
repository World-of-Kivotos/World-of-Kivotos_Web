import { useQuery } from '@tanstack/react-query'
import { networkApi } from '@/services/network'

export const networkKeys = {
  all: ['network'] as const,
  nodes: () => [...networkKeys.all, 'nodes'] as const,
}

/** 各线路人数, 15s 轮询。玩家自查页面会长时间停留, 轮询太密没有意义。 */
export function useNetworkNodes() {
  return useQuery({
    queryKey: networkKeys.nodes(),
    queryFn: () => networkApi.getNodes(),
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  })
}

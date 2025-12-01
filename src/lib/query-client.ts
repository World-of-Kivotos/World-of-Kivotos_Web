import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据过期时间：5分钟
      staleTime: 5 * 60 * 1000,
      // 缓存时间：30分钟
      gcTime: 30 * 60 * 1000,
      // 失败重试次数
      retry: 1,
      // 窗口聚焦时重新获取
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

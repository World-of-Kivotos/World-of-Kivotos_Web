import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whitelistApi, type GetWhitelistParams } from '@/services/whitelist'
import type {
  AddWhitelistRequest,
  BatchOperationRequest,
} from '@/types/whitelist'
import toast from 'react-hot-toast'

/**
 * 白名单查询 key
 */
export const whitelistKeys = {
  all: ['whitelist'] as const,
  lists: () => [...whitelistKeys.all, 'list'] as const,
  list: (params: GetWhitelistParams) => [...whitelistKeys.lists(), params] as const,
  stats: () => [...whitelistKeys.all, 'stats'] as const,
}

/**
 * 获取白名单列表
 */
export function useWhitelist(params?: GetWhitelistParams) {
  return useQuery({
    queryKey: whitelistKeys.list(params || {}),
    queryFn: () => whitelistApi.getWhitelist(params),
    staleTime: 30 * 1000, // 30秒内数据保持新鲜
  })
}

/**
 * 获取白名单统计信息
 */
export function useWhitelistStats() {
  return useQuery({
    queryKey: whitelistKeys.stats(),
    queryFn: () => whitelistApi.getStats(),
    staleTime: 60 * 1000, // 1分钟内数据保持新鲜
  })
}

/**
 * 添加白名单条目
 */
export function useAddWhitelist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: AddWhitelistRequest) => whitelistApi.addWhitelist(data),
    onSuccess: () => {
      toast.success('玩家添加成功')
      queryClient.invalidateQueries({ queryKey: whitelistKeys.lists() })
      queryClient.invalidateQueries({ queryKey: whitelistKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '添加失败')
    },
  })
}

/**
 * 删除白名单条目
 */
export function useDeleteWhitelist() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (name: string) => whitelistApi.deleteWhitelist(name),
    onSuccess: () => {
      toast.success('玩家删除成功')
      queryClient.invalidateQueries({ queryKey: whitelistKeys.lists() })
      queryClient.invalidateQueries({ queryKey: whitelistKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })
}

/**
 * 批量操作白名单
 */
export function useBatchOperation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: BatchOperationRequest) => whitelistApi.batchOperation(data),
    onSuccess: (result) => {
      if (result.failed_count === 0) {
        toast.success(`批量操作成功，共处理 ${result.success_count} 条记录`)
      } else {
        toast.success(`批量操作完成，成功 ${result.success_count} 条，失败 ${result.failed_count} 条`)
      }
      queryClient.invalidateQueries({ queryKey: whitelistKeys.lists() })
      queryClient.invalidateQueries({ queryKey: whitelistKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量操作失败')
    },
  })
}

/**
 * 触发同步
 */
export function useTriggerSync() {
  return useMutation({
    mutationFn: () => whitelistApi.triggerSync(),
    onSuccess: () => {
      toast.success('同步任务已触发')
    },
    onError: (error: Error) => {
      toast.error(error.message || '触发同步失败')
    },
  })
}

/**
 * 表格选择状态 Hook
 */
export function useTableSelection<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const isAllSelected = items.length > 0 && selectedIds.size === items.length
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const selectedItems = items.filter((item) => selectedIds.has(item.id))

  return {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  }
}

import { useState, useMemo } from 'react'
import type { SortConfig } from '@/types/whitelist'

/**
 * 表格排序和筛选 Hook
 */
export function useTableSort<T>(
  items: T[],
  defaultSort?: SortConfig
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(defaultSort)

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items

    return [...items].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key]
      const bValue = (b as Record<string, unknown>)[sortConfig.key]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison
    })
  }, [items, sortConfig])

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : undefined
      }
      return { key, direction: 'asc' }
    })
  }

  return {
    sortConfig,
    sortedItems,
    toggleSort,
    setSortConfig,
  }
}

/**
 * 客户端分页 Hook
 */
export function useTablePagination<T>(
  items: T[],
  defaultPageSize = 10
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalPages = Math.ceil(items.length / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = items.slice(startIndex, endIndex)

  const goToPage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)))
  }

  const nextPage = () => goToPage(page + 1)
  const prevPage = () => goToPage(page - 1)

  const changePageSize = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  return {
    page,
    pageSize,
    totalPages,
    totalItems: items.length,
    paginatedItems,
    startIndex,
    endIndex: Math.min(endIndex, items.length),
    goToPage,
    nextPage,
    prevPage,
    setPage,
    changePageSize,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

/**
 * 客户端搜索过滤 Hook
 */
export function useTableSearch<T>(
  items: T[],
  searchKeys: (keyof T)[]
) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items

    const lowerSearch = searchTerm.toLowerCase()
    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(lowerSearch)
      })
    )
  }, [items, searchTerm, searchKeys])

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch: () => setSearchTerm(''),
  }
}

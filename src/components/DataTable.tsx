import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { SortConfig } from '@/types/whitelist'

// ============================================================
// 类型定义
// ============================================================

export interface Column<T> {
  key: string
  title: string
  width?: string | number
  sortable?: boolean
  render?: (value: unknown, record: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: keyof T | ((record: T) => string | number)
  loading?: boolean
  emptyText?: string
  className?: string
  
  // 选择功能
  selectable?: boolean
  selectedKeys?: Set<string | number>
  onSelectChange?: (selectedKeys: Set<string | number>, selectedRows: T[]) => void
  
  // 排序功能
  sortConfig?: SortConfig
  onSortChange?: (config: SortConfig | undefined) => void
  
  // 分页功能
  pagination?: {
    page: number
    pageSize: number
    total: number
    pageSizeOptions?: number[]
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
  }
  
  // 行操作
  onRowClick?: (record: T, index: number) => void
  rowClassName?: (record: T, index: number) => string
}

// ============================================================
// 辅助组件
// ============================================================

/**
 * 复选框组件
 */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <label className={cn('relative flex items-center cursor-pointer', className)}>
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate
        }}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div
        className={cn(
          'w-4 h-4 rounded border-2 transition-all duration-200',
          'flex items-center justify-center',
          checked || indeterminate
            ? 'bg-indigo-600 border-indigo-600'
            : 'border-gray-300 bg-white hover:border-indigo-400'
        )}
      >
        {checked && !indeterminate && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {indeterminate && (
          <div className="w-2 h-0.5 bg-white rounded" />
        )}
      </div>
    </label>
  )
}

/**
 * 排序图标
 */
function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
  return (
    <div className="flex flex-col ml-1">
      <svg
        className={cn(
          'w-3 h-3 -mb-0.5 transition-colors',
          direction === 'asc' ? 'text-indigo-600' : 'text-gray-300'
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 8l-6 6h12z" />
      </svg>
      <svg
        className={cn(
          'w-3 h-3 -mt-0.5 transition-colors',
          direction === 'desc' ? 'text-indigo-600' : 'text-gray-300'
        )}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 16l-6-6h12z" />
      </svg>
    </div>
  )
}

/**
 * 加载骨架
 */
function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * 分页组件
 */
function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  // 生成页码按钮
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5
    const halfShow = Math.floor(showPages / 2)

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= halfShow + 1) {
        for (let i = 1; i <= showPages - 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (page >= totalPages - halfShow) {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = totalPages - showPages + 2; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
      {/* 左侧信息 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          显示 <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> 条，
          共 <span className="font-medium">{total}</span> 条
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} 条/页
            </option>
          ))}
        </select>
      </div>

      {/* 右侧分页按钮 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={cn(
            'p-2 rounded-lg transition-colors',
            page === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {getPageNumbers().map((pageNum, index) =>
          pageNum === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
              'min-w-8 h-8 px-2 rounded-lg text-sm font-medium transition-colors',
                page === pageNum
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {pageNum}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={cn(
            'p-2 rounded-lg transition-colors',
            page === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 主组件
// ============================================================

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  className,
  selectable = false,
  selectedKeys = new Set(),
  onSelectChange,
  sortConfig,
  onSortChange,
  pagination,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  // 获取行 key
  const getRowKey = (record: T): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return record[rowKey] as string | number
  }

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectChange) return

    if (checked) {
      const allKeys = new Set(data.map(getRowKey))
      onSelectChange(allKeys, data)
    } else {
      onSelectChange(new Set(), [])
    }
  }

  // 处理单行选择
  const handleSelectRow = (record: T, checked: boolean) => {
    if (!onSelectChange) return

    const key = getRowKey(record)
    const newSelected = new Set(selectedKeys)

    if (checked) {
      newSelected.add(key)
    } else {
      newSelected.delete(key)
    }

    const selectedRows = data.filter((item) => newSelected.has(getRowKey(item)))
    onSelectChange(newSelected, selectedRows)
  }

  // 处理排序
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return

    if (sortConfig?.key === column.key) {
      if (sortConfig.direction === 'asc') {
        onSortChange({ key: column.key, direction: 'desc' })
      } else {
        onSortChange(undefined)
      }
    } else {
      onSortChange({ key: column.key, direction: 'asc' })
    }
  }

  // 计算列宽
  const getColumnStyle = (column: Column<T>): React.CSSProperties => {
    if (column.width) {
      return {
        width: typeof column.width === 'number' ? `${column.width}px` : column.width,
        minWidth: typeof column.width === 'number' ? `${column.width}px` : column.width,
      }
    }
    return {}
  }

  // 计算全选状态
  const isAllSelected = data.length > 0 && data.every((item) => selectedKeys.has(getRowKey(item)))
  const isPartiallySelected = data.some((item) => selectedKeys.has(getRowKey(item))) && !isAllSelected

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col', className)}>
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={getColumnStyle(column)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer select-none hover:bg-gray-100',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.title}
                    {column.sortable && (
                      <SortIcon
                        direction={sortConfig?.key === column.key ? sortConfig.direction : undefined}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <TableSkeleton columns={columns.length + (selectable ? 1 : 0)} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span>{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record)
                const isSelected = selectedKeys.has(key)

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(record, index)}
                    className={cn(
                      'transition-colors',
                      isSelected && 'bg-indigo-50',
                      onRowClick && 'cursor-pointer hover:bg-gray-50',
                      rowClassName?.(record, index)
                    )}
                  >
                    {selectable && (
                      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleSelectRow(record, checked)}
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = (record as Record<string, unknown>)[column.key]
                      return (
                        <td
                          key={column.key}
                          style={getColumnStyle(column)}
                          className={cn(
                            'px-4 py-3 text-sm text-gray-900',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {column.render
                            ? column.render(value, record, index)
                            : (value as ReactNode) ?? '-'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="shrink-0">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            pageSizeOptions={pagination.pageSizeOptions}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        </div>
      )}
    </div>
  )
}

export default DataTable

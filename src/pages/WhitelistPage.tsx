import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { DataTable, type Column } from '@/components/DataTable'
import { AddWhitelistModal } from '@/components/AddWhitelistModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  useWhitelist,
  useDeleteWhitelist,
  useBatchOperation,
} from '@/hooks/useWhitelist'
import type { WhitelistEntry, WhitelistSource, SortConfig } from '@/types/whitelist'

/**
 * 来源标签颜色映射
 */
const sourceColors: Record<WhitelistSource, string> = {
  PLAYER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  SYSTEM: 'bg-gray-100 text-gray-700',
  API: 'bg-green-100 text-green-700',
}

/**
 * 来源中文名映射
 */
const sourceLabels: Record<WhitelistSource, string> = {
  PLAYER: '玩家',
  ADMIN: '管理员',
  SYSTEM: '系统',
  API: 'API',
}

/**
 * 格式化日期
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * 白名单管理页面
 */
export function WhitelistPage() {
  // 状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<WhitelistSource | ''>('')
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>()
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set())
  const [selectedRows, setSelectedRows] = useState<WhitelistEntry[]>([])
  
  // 弹窗状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WhitelistEntry | null>(null)

  // 数据获取
  const { data, isLoading, refetch } = useWhitelist({
    page,
    size: pageSize,
    search: searchTerm || undefined,
    source: sourceFilter || undefined,
    sort: sortConfig?.key,
    order: sortConfig?.direction,
  })
  
  const deleteMutation = useDeleteWhitelist()
  const batchMutation = useBatchOperation()

  // 处理选择变化
  const handleSelectChange = useCallback((keys: Set<string | number>, rows: WhitelistEntry[]) => {
    setSelectedKeys(keys)
    setSelectedRows(rows)
  }, [])

  // 处理排序变化
  const handleSortChange = useCallback((config: SortConfig | undefined) => {
    setSortConfig(config)
    setPage(1) // 排序变化时重置页码
  }, [])

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPage(1)
  }, [])

  // 处理删除单个
  const handleDelete = useCallback((entry: WhitelistEntry) => {
    setDeleteTarget(entry)
    setShowDeleteConfirm(true)
  }, [])

  // 确认删除
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.name) return
    
    await deleteMutation.mutateAsync(deleteTarget.name)
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }, [deleteTarget, deleteMutation])

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    const players = selectedRows
      .filter(row => row.name)
      .map(row => ({ name: row.name }))
    
    if (players.length === 0) return
    
    await batchMutation.mutateAsync({
      operation: 'remove',
      players,
    })
    
    setShowBatchDeleteConfirm(false)
    setSelectedKeys(new Set())
    setSelectedRows([])
  }, [selectedRows, batchMutation])

  // 表格列定义
  const columns: Column<WhitelistEntry>[] = useMemo(() => [
    {
      key: 'name',
      title: '玩家名称',
      sortable: true,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm shadow-sm">
            {record.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
            {record.uuidPending && (
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                UUID待补充
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'uuid',
      title: 'UUID',
      width: 320,
      render: (value) => (
        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
          {(value as string) || '待首次登录补充'}
        </code>
      ),
    },
    {
      key: 'source',
      title: '来源',
      width: 100,
      sortable: true,
      align: 'center',
      render: (value) => {
        const source = value as WhitelistSource
        return (
          <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            sourceColors[source]
          )}>
            {sourceLabels[source]}
          </span>
        )
      },
    },
    {
      key: 'addedByName',
      title: '添加者',
      width: 120,
      sortable: true,
      render: (_, record) => (
        <span className="text-gray-600">{record.addedByName || '-'}</span>
      ),
    },
    {
      key: 'addedAt',
      title: '添加时间',
      width: 160,
      sortable: true,
      render: (_, record) => (
        <span className="text-gray-500 text-sm">{formatDate(record.addedAt || record.createdAt)}</span>
      ),
    },
    {
      key: 'isActive',
      title: '状态',
      width: 80,
      align: 'center',
      render: (value) => (
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          value ? 'text-green-600' : 'text-gray-400'
        )}>
          <span className={cn(
            'w-2 h-2 rounded-full',
            value ? 'bg-green-500' : 'bg-gray-300'
          )} />
          {value ? '有效' : '无效'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(record)
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ),
    },
  ], [handleDelete])

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      {/* 页面标题 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">白名单管理</h1>
          <p className="text-gray-500 mt-1">管理服务器白名单玩家</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加玩家
        </button>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索玩家名或UUID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 来源筛选 */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as WhitelistSource | '')
              setPage(1)
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">全部来源</option>
            <option value="PLAYER">玩家</option>
            <option value="ADMIN">管理员</option>
            <option value="SYSTEM">系统</option>
            <option value="API">API</option>
          </select>
        </div>

        {/* 批量操作 */}
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              已选择 <span className="font-medium text-gray-900">{selectedRows.length}</span> 项
            </span>
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              批量删除
            </button>
            <button
              onClick={() => {
                setSelectedKeys(new Set())
                setSelectedRows([])
              }}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消选择
            </button>
          </div>
        )}

        {/* 刷新按钮 */}
        <button
          onClick={() => refetch()}
          className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          title="刷新"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey="id"
        loading={isLoading}
        selectable
        selectedKeys={selectedKeys}
        onSelectChange={handleSelectChange}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        emptyText="暂无白名单数据"
        className="flex-1 min-h-0"
        pagination={{
          page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
      />

      {/* 添加玩家弹窗 */}
      <AddWhitelistModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* 删除确认弹窗 */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="确认删除"
        message={`确定要删除玩家 "${deleteTarget?.name}" 吗？此操作不可撤销。`}
        confirmText="删除"
        confirmType="danger"
        loading={deleteMutation.isPending}
      />

      {/* 批量删除确认弹窗 */}
      <ConfirmModal
        open={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="确认批量删除"
        message={`确定要删除选中的 ${selectedRows.length} 个玩家吗？此操作不可撤销。`}
        confirmText="删除"
        confirmType="danger"
        loading={batchMutation.isPending}
      />
    </div>
  )
}

// ============================================================
export default WhitelistPage

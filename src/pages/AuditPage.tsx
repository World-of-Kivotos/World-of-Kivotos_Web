import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { animate, stagger } from 'animejs'
import { cn } from '@/lib/utils'
import { SubmissionDetailModal } from '@/components/SubmissionDetailModal'
import { FullscreenModal } from '@/components/FullscreenModal'
import { StatusTabs, type StatusTab } from '@/components/StatusTabs'
import {
  useSubmissions,
  useTriggerCleanup,
  useSubmissionStats,
} from '@/hooks/useSubmission'
import type { SubmissionStatus, SubmissionListItem } from '@/types/submission'

/**
 * 格式化日期
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * 状态配置
 */
const statusConfig: Record<SubmissionStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: {
    label: '待审核',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'ph:clock',
  },
  approved: {
    label: '已通过',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: 'ph:check-circle-fill',
  },
  rejected: {
    label: '已拒绝',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: 'ph:x-circle-fill',
  },
}

/**
 * 审核管理页面
 */
export function AuditPage() {
  // 状态
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null)
  const [showCleanupModal, setShowCleanupModal] = useState(false)

  // 数据获取
  const { data, isLoading, refetch } = useSubmissions({
    page,
    size: pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter,
    player_name: searchTerm || undefined,
  })

  const { data: stats, isLoading: statsLoading } = useSubmissionStats()
  const cleanupMutation = useTriggerCleanup()

  // 状态标签配置
  const statusTabs = useMemo<StatusTab[]>(() => [
    {
      value: 'pending',
      label: '待审核',
      icon: 'ph:clock',
      count: stats?.pending ?? 0,
      iconColor: 'text-amber-500',
    },
    {
      value: 'approved',
      label: '已通过',
      icon: 'ph:check-circle',
      count: stats?.approved ?? 0,
      iconColor: 'text-green-500',
    },
    {
      value: 'rejected',
      label: '已拒绝',
      icon: 'ph:x-circle',
      count: stats?.rejected ?? 0,
      iconColor: 'text-red-500',
    },
  ], [stats])

  // Refs for animations
  const containerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // 入场动画
  useEffect(() => {
    // 标题动画
    if (containerRef.current) {
      const titleElements = containerRef.current.querySelectorAll('.animate-title')
      animate(titleElements, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        delay: stagger(100),
        ease: 'out(3)',
      })
    }
  }, [])

  // 表格行动画 - 数据变化时触发
  useEffect(() => {
    if (data?.items && tableRef.current) {
      const rows = tableRef.current.querySelectorAll('.submission-row')
      animate(rows, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        delay: stagger(50, { start: 100 }),
        ease: 'out(2)',
      })
    }
  }, [data?.items])

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPage(1)
  }, [])

  // 处理状态筛选
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status as SubmissionStatus | 'all')
    setPage(1)
  }, [])

  // 处理清理
  const handleCleanup = useCallback(async () => {
    await cleanupMutation.mutateAsync()
    setShowCleanupModal(false)
  }, [cleanupMutation])

  // 分页信息
  const totalPages = data?.pages || 1
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="animate-title opacity-0 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          审核管理
        </h1>
        <p className="animate-title opacity-0 text-gray-500 dark:text-gray-400 mt-1">
          审核玩家提交的问卷，通过后自动加入白名单
        </p>
      </div>

      {/* 操作栏 */}
      <div className="animate-title opacity-0 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* 左侧：搜索框 + 状态切换 */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* 搜索框 */}
          <div className="relative w-full sm:w-64">
            <Icon
              icon="ph:magnifying-glass"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              type="text"
              placeholder="搜索玩家名称..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-xl',
                'bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl',
                'border border-gray-200/50 dark:border-gray-700/50',
                'text-gray-900 dark:text-white placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50',
                'transition-all duration-300'
              )}
            />
          </div>

          {/* 状态切换标签 */}
          <StatusTabs
            tabs={statusTabs}
            value={statusFilter}
            onChange={handleStatusFilter}
            loading={statsLoading}
          />
        </div>
        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => refetch()}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl',
              'border border-gray-200/50 dark:border-gray-700/50',
              'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              'transition-all duration-300 hover:shadow-lg'
            )}
          >
            <Icon icon="ph:arrows-clockwise" className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">刷新</span>
          </button>

          <button
            onClick={() => setShowCleanupModal(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-linear-to-r from-[#7209b7] to-[#b5179e]',
              'text-white font-medium',
              'shadow-lg shadow-[#7209b7]/30',
              'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]'
            )}
          >
            <Icon icon="ph:broom" className="w-5 h-5" />
            <span className="hidden sm:inline">清理数据</span>
          </button>
        </div>
      </div>

      {/* 提交列表 */}
      <div className="animate-title opacity-0 flex-1 overflow-hidden">
        <div
          ref={tableRef}
          className={cn(
            'h-full rounded-2xl overflow-hidden',
            'bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl',
            'border border-gray-200/50 dark:border-gray-700/50',
            'shadow-xl shadow-black/5'
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Icon icon="ph:spinner" className="w-8 h-8 text-[#0077b6] animate-spin" />
                <p className="text-gray-500">加载中...</p>
              </div>
            </div>
          ) : !data?.items?.length ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Icon icon="ph:clipboard-text" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">暂无提交记录</p>
                <p className="text-gray-400 text-sm mt-1">
                  {statusFilter !== 'all' ? '尝试切换筛选条件' : '等待用户提交问卷'}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 表头 */}
              <div className="sticky top-0 bg-gray-50/90 dark:bg-[#2c2c2e]/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="col-span-3">问卷信息</div>
                  <div className="col-span-2">玩家名称</div>
                  <div className="col-span-2 text-center">状态</div>
                  <div className="col-span-2">提交时间</div>
                  <div className="col-span-2">审核时间</div>
                  <div className="col-span-1 text-right">操作</div>
                </div>
              </div>

              {/* 表格内容 */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {data.items.map((submission) => (
                  <SubmissionRow
                    key={submission.id}
                    submission={submission}
                    onView={() => setSelectedSubmission(submission.id)}
                  />
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-[#2c2c2e]/50">
                  <p className="text-sm text-gray-500">
                    共 {data.total} 条记录，第 {page}/{totalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        'transition-all duration-200',
                        hasPrev
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={!hasNext}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        'transition-all duration-200',
                        hasNext
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 提交详情模态框 */}
      {selectedSubmission && (
        <SubmissionDetailModal
          open={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          submissionId={selectedSubmission}
        />
      )}

      {/* 清理确认模态框 */}
      <FullscreenModal
        open={showCleanupModal}
        onClose={() => setShowCleanupModal(false)}
        title="清理数据"
        subtitle="清理已审核提交的答案数据和上传的图片文件"
        icon="ph:broom"
        className="max-w-lg"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30">
            <Icon icon="ph:warning" className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">注意事项</p>
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• 只会清理已审核（通过/拒绝）的提交</li>
                <li>• 删除答案详情和上传的图片文件</li>
                <li>• 保留提交记录元数据（统计用）</li>
                <li>• 此操作不可撤销</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowCleanupModal(false)}
              className={cn(
                'px-4 py-2.5 rounded-xl font-medium',
                'text-gray-600 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-all duration-200'
              )}
            >
              取消
            </button>
            <button
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium',
                'bg-linear-to-r from-[#7209b7] to-[#b5179e] text-white',
                'shadow-lg shadow-[#7209b7]/30',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {cleanupMutation.isPending ? (
                <>
                  <Icon icon="ph:spinner" className="w-5 h-5 animate-spin" />
                  清理中...
                </>
              ) : (
                <>
                  <Icon icon="ph:broom" className="w-5 h-5" />
                  确认清理
                </>
              )}
            </button>
          </div>
        </div>
      </FullscreenModal>
    </div>
  )
}

/**
 * 提交行组件
 */
function SubmissionRow({
  submission,
  onView,
}: {
  submission: SubmissionListItem
  onView: () => void
}) {
  const config = statusConfig[submission.status]

  return (
    <div
      className={cn(
        'submission-row opacity-0 grid grid-cols-12 gap-4 px-6 py-4 items-center',
        'border-b border-gray-100/50 dark:border-gray-700/30',
        'hover:bg-gray-50/50 dark:hover:bg-gray-800/30',
        'transition-colors duration-200 cursor-pointer'
      )}
      onClick={onView}
    >
      {/* 问卷信息 */}
      <div className="col-span-3">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {submission.survey_title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ID: {submission.survey_id}
        </p>
      </div>

      {/* 玩家名称 */}
      <div className="col-span-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#0077b6]/10 to-[#00b4d8]/10 dark:from-[#0077b6]/20 dark:to-[#00b4d8]/20 flex items-center justify-center">
            <Icon icon="ph:user" className="w-4 h-4 text-[#0077b6] dark:text-[#00b4d8]" />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {submission.player_name}
          </span>
        </div>
      </div>

      {/* 状态 */}
      <div className="col-span-2 flex justify-center">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
          config.bgColor,
          config.color
        )}>
          <Icon icon={config.icon} className="w-3.5 h-3.5" />
          {config.label}
        </span>
      </div>

      {/* 提交时间 */}
      <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
        {formatDate(submission.created_at)}
      </div>

      {/* 审核时间 */}
      <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">
        {formatDate(submission.reviewed_at)}
      </div>

      {/* 操作 */}
      <div className="col-span-1 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView()
          }}
          className={cn(
            'p-2 rounded-lg',
            'text-gray-400 hover:text-[#0077b6] dark:hover:text-[#00b4d8]',
            'hover:bg-[#0077b6]/10 dark:hover:bg-[#00b4d8]/10',
            'transition-all duration-200'
          )}
        >
          <Icon icon="ph:eye" className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

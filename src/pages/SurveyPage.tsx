import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { animate, stagger } from 'animejs'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ConfirmModal'
import { StatusTabs, type StatusTab } from '@/components/StatusTabs'
import { SurveyEditModal } from '@/components/SurveyEditModal'
import {
  useSurveys,
  useCreateSurvey,
  useDeleteSurvey,
  useToggleSurveyActive,
  useSurveyStats,
  useSurveyDetail,
  useUpdateSurveyWithQuestions,
} from '@/hooks/useSurvey'
import type { Survey, CreateSurveyRequest } from '@/types/survey'

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
 * 问卷管理页面
 */
export function SurveyPage() {
  // 状态
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null)
  const [editTarget, setEditTarget] = useState<Survey | null>(null)

  // 数据获取
  const { data, isLoading, refetch } = useSurveys({
    page,
    size: pageSize,
    search: searchTerm || undefined,
    is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
  })

  const { data: stats, isLoading: statsLoading } = useSurveyStats()
  const createMutation = useCreateSurvey()
  const deleteMutation = useDeleteSurvey()
  const toggleActiveMutation = useToggleSurveyActive()
  const updateMutation = useUpdateSurveyWithQuestions()
  
  // 获取编辑问卷的详情
  const { data: editSurveyDetail, isLoading: editDetailLoading } = useSurveyDetail(editTarget?.id ?? 0)

  // 状态标签配置
  const statusTabs = useMemo<StatusTab[]>(() => [
    {
      value: 'all',
      label: '全部',
      icon: 'ph:list',
      count: stats?.total ?? 0,
    },
    {
      value: 'active',
      label: '启用中',
      icon: 'ph:check-circle',
      count: stats?.active ?? 0,
      iconColor: 'text-green-500',
    },
    {
      value: 'inactive',
      label: '已停用',
      icon: 'ph:pause-circle',
      count: stats?.inactive ?? 0,
      iconColor: 'text-gray-500',
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
      const rows = tableRef.current.querySelectorAll('.survey-row')
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
  const handleActiveFilter = useCallback((value: string) => {
    setActiveFilter(value as 'all' | 'active' | 'inactive')
    setPage(1)
  }, [])

  // 处理删除
  const handleDelete = useCallback((survey: Survey) => {
    setDeleteTarget(survey)
    setShowDeleteConfirm(true)
  }, [])

  // 确认删除
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }, [deleteTarget, deleteMutation])

  // 处理切换状态
  const handleToggleActive = useCallback(
    async (survey: Survey) => {
      await toggleActiveMutation.mutateAsync({
        surveyId: survey.id,
        isActive: !survey.is_active,
      })
    },
    [toggleActiveMutation]
  )

  // 处理创建问卷
  const handleCreateSurvey = useCallback(async (surveyData: CreateSurveyRequest) => {
    await createMutation.mutateAsync(surveyData)
    setShowCreateModal(false)
  }, [createMutation])

  // 处理编辑问卷
  const handleEdit = useCallback((survey: Survey) => {
    setEditTarget(survey)
  }, [])

  // 处理更新问卷
  const handleUpdateSurvey = useCallback(async (surveyData: CreateSurveyRequest) => {
    if (!editTarget) return
    await updateMutation.mutateAsync({
      surveyId: editTarget.id,
      data: surveyData,
    })
    setEditTarget(null)
  }, [editTarget, updateMutation])

  // 分页信息
  const totalPages = data?.pages || 1
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="animate-title opacity-0 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          问卷管理
        </h1>
        <p className="animate-title opacity-0 text-gray-500 dark:text-gray-400 mt-1">
          管理问卷系统，创建和启用问卷
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
              placeholder="搜索问卷标题..."
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
            value={activeFilter}
            onChange={handleActiveFilter}
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
            <span className="font-medium">刷新</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-linear-to-r from-[#0077b6] to-[#00b4d8]',
              'text-white font-medium',
              'shadow-lg shadow-[#0077b6]/30',
              'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]'
            )}
          >
            <Icon icon="ph:plus-bold" className="w-5 h-5" />
            <span>创建问卷</span>
          </button>
        </div>
      </div>

      {/* 问卷列表 */}
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
                <p className="text-gray-500 text-lg">暂无问卷</p>
                <p className="text-gray-400 text-sm mt-1">点击上方按钮创建第一个问卷</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50/90 dark:bg-[#2c2c2e]/90 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      问卷信息
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      问卷码
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      题目数
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      提交数
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {data.items.map((survey) => (
                    <tr
                      key={survey.id}
                      className="survey-row opacity-0 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {survey.title}
                          </div>
                          {survey.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {survey.description}
                            </div>
                          )}
                          {survey.is_random && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md">
                                <Icon icon="ph:shuffle" className="w-3 h-3" />
                                随机抽题 {survey.random_count && `(${survey.random_count}题)`}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 text-sm font-mono bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded">
                          {survey.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700 dark:text-gray-300">
                          {survey.question_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700 dark:text-gray-300">
                          {survey.submission_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(survey)}
                          disabled={toggleActiveMutation.isPending}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300',
                            survey.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50'
                          )}
                        >
                          <Icon
                            icon={survey.is_active ? 'ph:check-circle-fill' : 'ph:x-circle'}
                            className="w-4 h-4"
                          />
                          {survey.is_active ? '已启用' : '已禁用'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(survey.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(survey)}
                            disabled={editTarget?.id === survey.id && editDetailLoading}
                            className={cn(
                              'p-2 rounded-lg',
                              'text-gray-400 hover:text-[#0077b6] hover:bg-[#0077b6]/10',
                              'transition-all duration-200',
                              'disabled:opacity-50'
                            )}
                            title="编辑问卷"
                          >
                            {editTarget?.id === survey.id && editDetailLoading ? (
                              <Icon icon="ph:spinner" className="w-5 h-5 animate-spin" />
                            ) : (
                              <Icon icon="ph:pencil-simple" className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(survey)}
                            className={cn(
                              'p-2 rounded-lg',
                              'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                              'transition-all duration-200'
                            )}
                            title="删除问卷"
                          >
                            <Icon icon="ph:trash" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 分页 */}
      {data && data.total > 0 && (
        <div className="animate-title opacity-0 flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            共 {data.total} 条记录，第 {page} / {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                hasPrev
                  ? 'bg-white dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              )}
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasNext}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                hasNext
                  ? 'bg-white dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              )}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 创建问卷弹窗 */}
      <SurveyEditModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSurvey}
        loading={createMutation.isPending}
        mode="create"
      />

      {/* 编辑问卷弹窗 */}
      <SurveyEditModal
        open={!!editTarget && !editDetailLoading}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdateSurvey}
        loading={updateMutation.isPending}
        mode="edit"
        initialData={editSurveyDetail}
      />

      {/* 删除确认弹窗 */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="确认删除"
        message={`确定要删除问卷「${deleteTarget?.title}」吗？此操作不可撤销。`}
        confirmText="删除"
        confirmType="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

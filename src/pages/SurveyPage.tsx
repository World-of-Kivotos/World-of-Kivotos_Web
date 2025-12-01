import { useState, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  useSurveys,
  useCreateSurvey,
  useDeleteSurvey,
  useToggleSurveyActive,
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null)

  // 创建问卷表单状态
  const [newSurvey, setNewSurvey] = useState<CreateSurveyRequest>({
    title: '',
    description: '',
    is_random: false,
    random_count: undefined,
  })

  // 数据获取
  const { data, isLoading, refetch } = useSurveys({
    page,
    size: pageSize,
    search: searchTerm || undefined,
  })

  const createMutation = useCreateSurvey()
  const deleteMutation = useDeleteSurvey()
  const toggleActiveMutation = useToggleSurveyActive()

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
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
  const handleCreateSurvey = useCallback(async () => {
    if (!newSurvey.title.trim()) return
    await createMutation.mutateAsync(newSurvey)
    setShowCreateModal(false)
    setNewSurvey({
      title: '',
      description: '',
      is_random: false,
      random_count: undefined,
    })
  }, [newSurvey, createMutation])

  // 分页信息
  const totalPages = data?.pages || 1
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="h-full flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6 animate-slide-down">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          问卷管理
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          管理问卷系统，创建和启用问卷
        </p>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between gap-4 mb-6 animate-slide-down" style={{ animationDelay: '0.1s' }}>
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
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

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
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
      <div className="flex-1 overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div
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
                      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
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
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="flex items-center justify-between mt-4 px-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div
            className={cn(
              'relative w-full max-w-lg p-6 rounded-2xl',
              'bg-white dark:bg-[#1c1c1e]',
              'border border-gray-200/50 dark:border-gray-700/50',
              'shadow-2xl animate-scale-in'
            )}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              创建新问卷
            </h2>

            <div className="space-y-4">
              {/* 问卷标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  问卷标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSurvey.title}
                  onChange={(e) => setNewSurvey((s) => ({ ...s, title: e.target.value }))}
                  placeholder="请输入问卷标题"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-gray-50 dark:bg-gray-800/50',
                    'border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50',
                    'transition-all duration-300'
                  )}
                />
              </div>

              {/* 问卷描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  问卷描述
                </label>
                <textarea
                  value={newSurvey.description || ''}
                  onChange={(e) => setNewSurvey((s) => ({ ...s, description: e.target.value }))}
                  placeholder="请输入问卷描述（可选）"
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl resize-none',
                    'bg-gray-50 dark:bg-gray-800/50',
                    'border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50',
                    'transition-all duration-300'
                  )}
                />
              </div>

              {/* 随机抽题 */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSurvey.is_random || false}
                    onChange={(e) =>
                      setNewSurvey((s) => ({
                        ...s,
                        is_random: e.target.checked,
                        random_count: e.target.checked ? s.random_count : undefined,
                      }))
                    }
                    className="w-4 h-4 rounded text-[#0077b6] focus:ring-[#0077b6]/50"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">启用随机抽题</span>
                </label>

                {newSurvey.is_random && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">抽取</span>
                    <input
                      type="number"
                      min={1}
                      value={newSurvey.random_count || ''}
                      onChange={(e) =>
                        setNewSurvey((s) => ({
                          ...s,
                          random_count: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      className={cn(
                        'w-20 px-3 py-1.5 rounded-lg text-center',
                        'bg-gray-50 dark:bg-gray-800/50',
                        'border border-gray-200 dark:border-gray-700',
                        'text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50'
                      )}
                    />
                    <span className="text-sm text-gray-500">题</span>
                  </div>
                )}
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className={cn(
                  'px-4 py-2.5 rounded-xl font-medium',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'transition-all duration-200'
                )}
              >
                取消
              </button>
              <button
                onClick={handleCreateSurvey}
                disabled={!newSurvey.title.trim() || createMutation.isPending}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-medium',
                  'bg-linear-to-r from-[#0077b6] to-[#00b4d8]',
                  'text-white shadow-lg shadow-[#0077b6]/30',
                  'transition-all duration-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'hover:shadow-xl hover:scale-[1.02]'
                )}
              >
                {createMutation.isPending ? '创建中...' : '创建问卷'}
              </button>
            </div>
          </div>
        </div>
      )}

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

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { animate, stagger } from 'animejs'
import { cn } from '@/lib/utils'
import { FullscreenModal, ModalEmptyState } from './FullscreenModal'
import { useSubmissionDetail, useReviewSubmission } from '@/hooks/useSubmission'
import type { SubmissionAnswer, SubmissionStatus } from '@/types/submission'

interface SubmissionDetailModalProps {
  open: boolean
  onClose: () => void
  submissionId: number
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
    second: '2-digit',
  }).format(date)
}

/**
 * 格式化填写耗时
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes} 分 ${remainingSeconds} 秒`
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
 * 提交详情模态框
 */
export function SubmissionDetailModal({
  open,
  onClose,
  submissionId,
}: SubmissionDetailModalProps) {
  const { data: submission, isLoading } = useSubmissionDetail(submissionId)
  const reviewMutation = useReviewSubmission()
  const [reviewNote, setReviewNote] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const answersRef = useRef<HTMLDivElement>(null)

  // 答案卡片入场动画
  useEffect(() => {
    if (submission && answersRef.current) {
      const cards = answersRef.current.querySelectorAll('.answer-card')
      animate(cards, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 400,
        delay: stagger(50, { start: 100 }),
        easing: 'easeOutCubic',
      })
    }
  }, [submission])

  // 处理审核
  const handleReview = useCallback(async (status: 'approved' | 'rejected') => {
    if (!submission) return
    await reviewMutation.mutateAsync({
      submissionId,
      data: {
        status,
        review_note: reviewNote || undefined,
      },
      playerName: submission.player_name,
    })
    setShowReviewForm(false)
    setReviewNote('')
    onClose()
  }, [submissionId, reviewNote, reviewMutation, onClose, submission])

  // API 基础路径
  const apiBase = import.meta.env.VITE_SURVEY_API_URL || 'http://localhost:8000'

  return (
    <>
      <FullscreenModal
        open={open}
        onClose={onClose}
        title={submission?.survey_title || '审核详情'}
        subtitle={submission ? `来自玩家：${submission.player_name}` : undefined}
        icon="ph:clipboard-text"
        actions={
          submission?.status === 'pending' && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                'bg-linear-to-r from-[#0077b6] to-[#00b4d8]',
                'text-white font-medium text-sm',
                'shadow-lg shadow-[#0077b6]/30',
                'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]'
              )}
            >
              <Icon icon="ph:check-circle" className="w-4 h-4" />
              审核
            </button>
          )
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icon icon="ph:spinner" className="w-8 h-8 text-[#0077b6] animate-spin" />
          </div>
        ) : !submission ? (
          <ModalEmptyState
            icon="ph:warning"
            title="提交不存在"
            description="可能已被删除或 ID 无效"
          />
        ) : (
          <div className="space-y-6">
            {/* 基本信息卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard
                icon="ph:user"
                label="玩家名称"
                value={submission.player_name}
              />
              <InfoCard
                icon="ph:globe"
                label="IP 地址"
                value={submission.ip_address || '-'}
              />
              <InfoCard
                icon="ph:timer"
                label="填写耗时"
                value={formatDuration(submission.fill_duration)}
              />
              <InfoCard
                icon="ph:calendar"
                label="提交时间"
                value={formatDate(submission.created_at)}
              />
            </div>

            {/* 状态信息 */}
            <div className={cn(
              'flex items-center justify-between p-4 rounded-2xl',
              statusConfig[submission.status].bgColor
            )}>
              <div className="flex items-center gap-3">
                <Icon
                  icon={statusConfig[submission.status].icon}
                  className={cn('w-6 h-6', statusConfig[submission.status].color)}
                />
                <div>
                  <span className={cn('font-medium', statusConfig[submission.status].color)}>
                    {statusConfig[submission.status].label}
                  </span>
                  {submission.reviewed_at && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      审核于 {formatDate(submission.reviewed_at)}
                    </p>
                  )}
                </div>
              </div>
              {submission.review_note && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  备注：{submission.review_note}
                </p>
              )}
            </div>

            {/* 审核表单 */}
            {showReviewForm && submission.status === 'pending' && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 space-y-4 animate-scale-in">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    审核备注（可选）
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="输入审核备注..."
                    rows={3}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl',
                      'bg-white dark:bg-[#2c2c2e]',
                      'border border-gray-200 dark:border-gray-700',
                      'text-gray-900 dark:text-white placeholder-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50',
                      'transition-all duration-200 resize-none'
                    )}
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl font-medium text-sm',
                      'text-gray-600 dark:text-gray-300',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'transition-all duration-200'
                    )}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={reviewMutation.isPending}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
                      'bg-red-500 hover:bg-red-600 text-white',
                      'shadow-lg shadow-red-500/30',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {reviewMutation.isPending ? (
                      <Icon icon="ph:spinner" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon icon="ph:x-circle" className="w-4 h-4" />
                    )}
                    拒绝
                  </button>
                  <button
                    onClick={() => handleReview('approved')}
                    disabled={reviewMutation.isPending}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
                      'bg-green-500 hover:bg-green-600 text-white',
                      'shadow-lg shadow-green-500/30',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {reviewMutation.isPending ? (
                      <Icon icon="ph:spinner" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon icon="ph:check-circle" className="w-4 h-4" />
                    )}
                    通过
                  </button>
                </div>
              </div>
            )}

            {/* 答案列表 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                答案详情
              </h3>
              <div ref={answersRef} className="space-y-4">
                {submission.answers.map((answer, index) => (
                  <AnswerCard
                    key={answer.id}
                    answer={answer}
                    index={index + 1}
                    apiBase={apiBase}
                    onImageClick={setPreviewImage}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </FullscreenModal>

      {/* 图片预览 */}
      <ImagePreviewModal
        open={!!previewImage}
        imageUrl={previewImage || ''}
        onClose={() => setPreviewImage(null)}
      />
    </>
  )
}

/**
 * 信息卡片
 */
function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className={cn(
      'p-4 rounded-2xl',
      'bg-gray-50 dark:bg-gray-800/50',
      'border border-gray-100 dark:border-gray-700/50'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon icon={icon} className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {value}
      </p>
    </div>
  )
}

/**
 * 答案卡片
 */
/**
 * 解析答案内容
 * 后端返回的 content 格式：
 * - 单选: { value: "A" }
 * - 多选: { values: ["A", "B"] }
 * - 判断: { value: true/false }
 * - 文本: { text: "..." }
 * - 图片: { images: ["upload/xxx.jpg", ...] }
 */
function parseAnswerContent(content: SubmissionAnswer['content'], questionType: string): {
  displayValue: string | string[] | boolean | null
  images?: string[]
} {
  // 如果 content 已经是基础类型，直接返回
  if (content === null || content === undefined) {
    return { displayValue: null }
  }
  
  if (typeof content !== 'object') {
    return { displayValue: content }
  }
  
  // 如果是数组（兼容旧数据格式），根据类型处理
  if (Array.isArray(content)) {
    if (questionType === 'image') {
      return { displayValue: null, images: content as string[] }
    }
    if (questionType === 'multiple') {
      return { displayValue: content as string[] }
    }
    return { displayValue: content.join(', ') }
  }
  
  // content 是对象，根据类型解析
  const obj = content as Record<string, unknown>
  
  switch (questionType) {
    case 'boolean':
      return { displayValue: obj.value as boolean }
    case 'single':
      return { displayValue: (obj.value as string) || null }
    case 'multiple':
      return { displayValue: (obj.values as string[]) || [] }
    case 'text':
      return { displayValue: (obj.text as string) || null }
    case 'image':
      return { displayValue: null, images: (obj.images as string[]) || [] }
    default:
      // 兜底：尝试获取 value 或 text
      return { displayValue: (obj.value as string) || (obj.text as string) || null }
  }
}

function AnswerCard({
  answer,
  index,
  apiBase,
  onImageClick,
}: {
  answer: SubmissionAnswer
  index: number
  apiBase: string
  onImageClick: (url: string) => void
}) {
  const renderContent = () => {
    const { content, question_type } = answer
    const parsed = parseAnswerContent(content, question_type)

    // 布尔类型
    if (question_type === 'boolean') {
      const boolValue = parsed.displayValue as boolean
      return (
        <span className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
          boolValue ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        )}>
          <Icon icon={boolValue ? 'ph:check' : 'ph:x'} className="w-4 h-4" />
          {boolValue ? '是' : '否'}
        </span>
      )
    }

    // 图片类型
    if (question_type === 'image' && parsed.images && parsed.images.length > 0) {
      return (
        <div className="flex flex-wrap gap-3">
          {parsed.images.map((url, i) => {
            const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`
            return (
              <button
                key={i}
                onClick={() => onImageClick(fullUrl)}
                className={cn(
                  'relative group w-24 h-24 rounded-xl overflow-hidden',
                  'bg-gray-100 dark:bg-gray-800',
                  'border border-gray-200 dark:border-gray-700',
                  'hover:ring-2 hover:ring-[#0077b6]/50',
                  'transition-all duration-200'
                )}
              >
                <img
                  src={fullUrl}
                  alt={`图片 ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className={cn(
                  'absolute inset-0 bg-black/50 flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity'
                )}>
                  <Icon icon="ph:magnifying-glass-plus" className="w-6 h-6 text-white" />
                </div>
              </button>
            )
          })}
        </div>
      )
    }

    // 多选类型
    if (question_type === 'multiple') {
      const values = Array.isArray(parsed.displayValue) ? parsed.displayValue : []
      if (values.length === 0) {
        return <p className="text-gray-400 dark:text-gray-500">-</p>
      }
      return (
        <div className="flex flex-wrap gap-2">
          {values.map((item, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full text-sm bg-[#0077b6]/10 dark:bg-[#00b4d8]/10 text-[#0077b6] dark:text-[#00b4d8]"
            >
              {item}
            </span>
          ))}
        </div>
      )
    }

    // 文本或单选
    const displayText = typeof parsed.displayValue === 'string' ? parsed.displayValue : null
    return (
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {displayText || '-'}
      </p>
    )
  }

  // 问题类型图标
  const typeIcons: Record<string, string> = {
    single: 'ph:radio-button',
    multiple: 'ph:check-square',
    boolean: 'ph:toggle-left',
    text: 'ph:text-aa',
    image: 'ph:image',
  }

  return (
    <div className={cn(
      'answer-card opacity-0 p-5 rounded-2xl',
      'bg-white dark:bg-[#2c2c2e]',
      'border border-gray-100 dark:border-gray-700/50',
      'shadow-sm'
    )}>
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium text-sm shrink-0">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Icon
              icon={typeIcons[answer.question_type] || 'ph:question'}
              className="w-4 h-4 text-gray-400"
            />
            <h4 className="font-medium text-gray-900 dark:text-white">
              {answer.question_title}
            </h4>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

/**
 * 图片预览模态框
 */
function ImagePreviewModal({
  open,
  imageUrl,
  onClose,
}: {
  open: boolean
  imageUrl: string
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (open && overlayRef.current && imageRef.current) {
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 200,
        easing: 'easeOutCubic',
      })
      animate(imageRef.current, {
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 300,
        easing: 'easeOutBack',
      })
    }
  }, [open])

  const handleClose = useCallback(() => {
    if (overlayRef.current && imageRef.current) {
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 200,
        easing: 'easeInCubic',
      })
      animate(imageRef.current, {
        opacity: [1, 0],
        scale: [1, 0.9],
        duration: 200,
        easing: 'easeInCubic',
        complete: onClose,
      })
    } else {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      <img
        ref={imageRef}
        src={imageUrl}
        alt="预览"
        className="relative max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <Icon icon="ph:x-bold" className="w-6 h-6" />
      </button>
    </div>,
    document.body
  )
}

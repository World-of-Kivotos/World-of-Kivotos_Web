import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { animate } from 'animejs'
import { cn } from '@/lib/utils'

interface FullscreenModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
}

/**
 * 全屏模态框组件
 * 使用透明毛玻璃遮罩和 anime.js 动画
 */
export function FullscreenModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions,
  className,
  contentClassName,
}: FullscreenModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const isClosingRef = useRef(false)

  // 入场动画
  useEffect(() => {
    if (open && overlayRef.current && modalRef.current) {
      isClosingRef.current = false
      
      // 遮罩层淡入
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutCubic',
      })

      // 模态框缩放+淡入
      animate(modalRef.current, {
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 400,
        easing: 'easeOutBack',
      })
    }
  }, [open])

  // 关闭动画
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true

    if (overlayRef.current && modalRef.current) {
      // 遮罩层淡出
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInCubic',
      })

      // 模态框缩放+淡出
      animate(modalRef.current, {
        opacity: [1, 0],
        scale: [1, 0.95],
        duration: 250,
        easing: 'easeInCubic',
        complete: () => {
          onClose()
        },
      })
    } else {
      onClose()
    }
  }, [onClose])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  // 阻止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* 透明毛玻璃遮罩 */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/10 dark:bg-black/20 backdrop-blur-xl backdrop-saturate-150"
        onClick={handleClose}
      />

      {/* 模态框容器 */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-4xl max-h-[90vh] flex flex-col',
          'bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl backdrop-saturate-200',
          'rounded-3xl shadow-2xl shadow-black/20',
          'border border-white/30 dark:border-gray-700/30',
          'overflow-hidden',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-[#0077b6]/10 to-[#00b4d8]/10 dark:from-[#0077b6]/20 dark:to-[#00b4d8]/20">
                <Icon
                  icon={icon}
                  className="w-5 h-5 text-[#0077b6] dark:text-[#00b4d8]"
                />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <button
              onClick={handleClose}
              className={cn(
                'p-2.5 rounded-xl',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-100/80 dark:hover:bg-gray-700/50',
                'transition-all duration-200'
              )}
            >
              <Icon icon="ph:x-bold" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin',
            'p-6',
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * 空状态组件
 */
export function ModalEmptyState({
  icon = 'ph:clock',
  title,
  description,
}: {
  icon?: string
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon icon={icon} className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">{title}</p>
      {description && (
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

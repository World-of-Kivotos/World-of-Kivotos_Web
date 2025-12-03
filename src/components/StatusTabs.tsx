import { useEffect, useRef, useLayoutEffect } from 'react'
import { Icon } from '@iconify/react'
import { animate } from 'animejs'
import { cn } from '@/lib/utils'

export interface StatusTab {
  /** 唯一标识 */
  value: string
  /** 显示标签 */
  label: string
  /** 图标名称 (iconify) */
  icon: string
  /** 计数 */
  count?: number
  /** 图标颜色类名 */
  iconColor?: string
}

interface StatusTabsProps {
  /** 标签列表 */
  tabs: StatusTab[]
  /** 当前选中值 */
  value: string
  /** 选中变化回调 */
  onChange: (value: string) => void
  /** 是否加载中 */
  loading?: boolean
  /** 额外样式 */
  className?: string
}

/**
 * GitHub 风格的状态切换标签组件
 */
export function StatusTabs({
  tabs,
  value,
  onChange,
  loading = false,
  className,
}: StatusTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // 更新指示器位置的函数
  const updateIndicator = (animated: boolean = true) => {
    if (!containerRef.current || !indicatorRef.current) return

    const activeButton = containerRef.current.querySelector(
      `[data-value="${value}"]`
    ) as HTMLButtonElement

    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()

      if (!animated) {
        indicatorRef.current.style.left = `${buttonRect.left - containerRect.left}px`
        indicatorRef.current.style.width = `${buttonRect.width}px`
      } else {
        animate(indicatorRef.current, {
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
          duration: 300,
          easing: 'easeOutCubic',
        })
      }
    }
  }

  // 首次渲染时立即设置位置（同步）
  useLayoutEffect(() => {
    if (!initializedRef.current) {
      // 使用 requestAnimationFrame 确保 DOM 已完成布局
      requestAnimationFrame(() => {
        updateIndicator(false)
        initializedRef.current = true
      })
    }
  }, [tabs])

  // 值变化时使用动画更新位置
  useEffect(() => {
    if (initializedRef.current) {
      updateIndicator(true)
    }
  }, [value])

  // 入场动画
  useEffect(() => {
    if (containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('button')
      animate(buttons, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400,
        delay: (_, i) => i * 50,
        easing: 'easeOutCubic',
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center gap-1 p-1 rounded-xl',
        'bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm',
        'border border-gray-200/50 dark:border-gray-700/50',
        className
      )}
    >
      {/* 滑动指示器 */}
      <div
        ref={indicatorRef}
        className={cn(
          'absolute top-1 h-[calc(100%-0.5rem)] rounded-lg',
          'bg-white dark:bg-gray-700',
          'shadow-sm',
          'transition-opacity duration-200',
          loading ? 'opacity-50' : 'opacity-100'
        )}
        style={{ left: 0, width: 0 }}
      />

      {/* 标签按钮 */}
      {tabs.map((tab) => {
        const isActive = tab.value === value

        return (
          <button
            key={tab.value}
            data-value={tab.value}
            onClick={() => onChange(tab.value)}
            disabled={loading}
            className={cn(
              'relative z-10 flex items-center gap-2 px-3 py-2 rounded-lg',
              'text-sm font-medium whitespace-nowrap',
              'transition-all duration-200',
              'disabled:cursor-not-allowed',
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Icon
              icon={tab.icon}
              className={cn(
                'w-4 h-4 transition-colors duration-200',
                isActive && tab.iconColor ? tab.iconColor : ''
              )}
            />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold',
                  'flex items-center justify-center',
                  'transition-all duration-200',
                  isActive
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    : 'bg-gray-200/60 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400'
                )}
              >
                {loading ? (
                  <Icon icon="ph:spinner" className="w-3 h-3 animate-spin" />
                ) : (
                  tab.count
                )}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { animate, stagger } from 'animejs'
import { cn } from '@/lib/utils'

// 统计卡片数据
const statsData = [
  {
    id: 'total',
    label: '总玩家数',
    value: 1234,
    icon: 'ph:users-three-fill',
    gradient: 'from-[#0077b6] to-[#00b4d8]',
    iconBg: 'bg-[#0077b6]/10',
    iconColor: 'text-[#0077b6]',
    trend: '+12%',
    trendUp: true,
  },
  {
    id: 'approved',
    label: '已审核',
    value: 856,
    icon: 'ph:check-circle-fill',
    gradient: 'from-[#38b000] to-[#70e000]',
    iconBg: 'bg-[#38b000]/10',
    iconColor: 'text-[#38b000]',
    trend: '+8%',
    trendUp: true,
  },
  {
    id: 'pending',
    label: '待审核',
    value: 23,
    icon: 'ph:clock-fill',
    gradient: 'from-[#f77f00] to-[#fcbf49]',
    iconBg: 'bg-[#f77f00]/10',
    iconColor: 'text-[#f77f00]',
    trend: '-3%',
    trendUp: false,
  },
  {
    id: 'rejected',
    label: '已拒绝',
    value: 12,
    icon: 'ph:x-circle-fill',
    gradient: 'from-[#d62828] to-[#f77f00]',
    iconBg: 'bg-[#d62828]/10',
    iconColor: 'text-[#d62828]',
    trend: '+2%',
    trendUp: true,
  },
]

// 快捷操作数据
const quickActions = [
  {
    id: 'add-whitelist',
    label: '添加白名单',
    description: '快速添加新玩家',
    icon: 'ph:user-plus-fill',
    gradient: 'from-[#0077b6] to-[#00b4d8]',
  },
  {
    id: 'batch-import',
    label: '批量导入',
    description: '从文件批量导入',
    icon: 'ph:upload-simple-fill',
    gradient: 'from-[#7209b7] to-[#b5179e]',
  },
  {
    id: 'export-data',
    label: '导出数据',
    description: '导出白名单列表',
    icon: 'ph:download-simple-fill',
    gradient: 'from-[#38b000] to-[#70e000]',
  },
  {
    id: 'sync-server',
    label: '同步服务器',
    description: '同步到游戏服务器',
    icon: 'ph:arrows-clockwise-fill',
    gradient: 'from-[#f77f00] to-[#fcbf49]',
  },
]

// 最近活动数据
const recentActivities = [
  {
    id: 1,
    type: 'add',
    message: '添加了玩家 Steve_2024',
    time: '5分钟前',
    icon: 'ph:user-plus',
    color: 'text-[#38b000]',
  },
  {
    id: 2,
    type: 'approve',
    message: '审核通过了 Alex_MC',
    time: '15分钟前',
    icon: 'ph:check-circle',
    color: 'text-[#0077b6]',
  },
  {
    id: 3,
    type: 'reject',
    message: '拒绝了 TestUser123',
    time: '1小时前',
    icon: 'ph:x-circle',
    color: 'text-[#d62828]',
  },
  {
    id: 4,
    type: 'sync',
    message: '同步白名单到服务器',
    time: '2小时前',
    icon: 'ph:arrows-clockwise',
    color: 'text-[#7209b7]',
  },
  {
    id: 5,
    type: 'add',
    message: '添加了玩家 Notch',
    time: '3小时前',
    icon: 'ph:user-plus',
    color: 'text-[#38b000]',
  },
]

// 服务器状态数据
const serverStatus = {
  online: true,
  players: 42,
  maxPlayers: 100,
  tps: 19.8,
  memory: 4.2,
  maxMemory: 8,
  uptime: '3天 12小时',
}

export function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // 入场动画
  useEffect(() => {
    setMounted(true)

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

    // 统计卡片动画
    if (statsRef.current) {
      const cards = statsRef.current.querySelectorAll('.stat-card')
      animate(cards, {
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.95, 1],
        duration: 500,
        delay: stagger(80, { start: 200 }),
        ease: 'out(2)',
      })
    }

    // 快捷操作动画
    if (actionsRef.current) {
      const actions = actionsRef.current.querySelectorAll('.action-card')
      animate(actions, {
        opacity: [0, 1],
        translateX: [-20, 0],
        duration: 400,
        delay: stagger(60, { start: 500 }),
        ease: 'out(2)',
      })
    }
  }, [])

  // 数字滚动动画
  const AnimatedNumber = ({ value, delay = 0 }: { value: number; delay?: number }) => {
    const [displayValue, setDisplayValue] = useState(0)
    const numberRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
      if (!mounted) return

      const timer = setTimeout(() => {
        const obj = { val: 0 }
        animate(obj, {
          val: value,
          duration: 1200,
          ease: 'out(3)',
          onUpdate: () => {
            setDisplayValue(Math.round(obj.val))
          },
        })
      }, delay)

      return () => clearTimeout(timer)
    }, [value, delay, mounted])

    return <span ref={numberRef}>{displayValue.toLocaleString()}</span>
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden pr-2 space-y-6">
      {/* 页面标题 */}
      <div className="space-y-1">
        <h1 className="animate-title opacity-0 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          仪表板
        </h1>
        <p className="animate-title opacity-0 text-gray-500 dark:text-gray-400">
          欢迎回来，这是您的管理概览
        </p>
      </div>

      {/* 统计卡片 */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <div
            key={stat.id}
            className="stat-card opacity-0 group relative overflow-hidden bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm hover:shadow-xl border border-white/50 dark:border-gray-700/50 transition-all duration-500 ease-out hover:-translate-y-1 cursor-pointer"
          >
            {/* 装饰背景 */}
            <div
              className={cn(
                'absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700',
                `bg-linear-to-br ${stat.gradient}`
              )}
            />

            {/* 内容 */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl transition-transform duration-300 group-hover:scale-110',
                    stat.iconBg
                  )}
                >
                  <Icon icon={stat.icon} className={cn('w-5 h-5', stat.iconColor)} />
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                    stat.trendUp
                      ? 'text-[#38b000] bg-[#38b000]/10'
                      : 'text-[#d62828] bg-[#d62828]/10'
                  )}
                >
                  <Icon
                    icon={stat.trendUp ? 'ph:trend-up' : 'ph:trend-down'}
                    className="w-3 h-3"
                  />
                  {stat.trend}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber value={stat.value} delay={index * 80 + 300} />
                </p>
              </div>

              {/* 底部进度条装饰 */}
              <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full bg-linear-to-r transition-all duration-1000 ease-out',
                    stat.gradient
                  )}
                  style={{
                    width: mounted ? `${Math.min((stat.value / 1500) * 100, 100)}%` : '0%',
                    transitionDelay: `${index * 100 + 500}ms`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：快捷操作 + 服务器状态 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 快捷操作 */}
          <div
            ref={actionsRef}
            className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-white/50 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="ph:lightning-fill" className="w-5 h-5 text-[#f77f00]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">快捷操作</h2>
            </div>

            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className="action-card opacity-0 w-full group flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
                      action.gradient
                    )}
                  >
                    <Icon icon={action.icon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                  </div>
                  <Icon
                    icon="ph:caret-right"
                    className="w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 服务器状态 */}
          <ServerStatusCard status={serverStatus} />
        </div>

        {/* 右侧：最近活动 */}
        <div className="lg:col-span-2">
          <RecentActivityCard activities={recentActivities} />
        </div>
      </div>
    </div>
  )
}

// 服务器状态卡片
function ServerStatusCard({ status }: { status: typeof serverStatus }) {
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseKey((prev) => prev + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-white/50 dark:border-gray-700/50 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="ph:game-controller-fill" className="w-5 h-5 text-[#0077b6]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">服务器状态</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            key={pulseKey}
            className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              status.online
                ? 'bg-[#38b000] shadow-[0_0_8px_rgba(56,176,0,0.6)]'
                : 'bg-[#d62828] shadow-[0_0_8px_rgba(214,40,40,0.6)]'
            )}
          />
          <span
            className={cn(
              'text-xs font-medium',
              status.online ? 'text-[#38b000]' : 'text-[#d62828]'
            )}
          >
            {status.online ? '在线' : '离线'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 玩家数量 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">在线玩家</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {status.players} / {status.maxPlayers}
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#0077b6] to-[#00b4d8] rounded-full transition-all duration-1000"
              style={{ width: `${(status.players / status.maxPlayers) * 100}%` }}
            />
          </div>
        </div>

        {/* TPS */}
        <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Icon icon="ph:cpu-fill" className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">TPS</span>
          </div>
          <span
            className={cn(
              'font-medium',
              status.tps >= 19 ? 'text-[#38b000]' : status.tps >= 15 ? 'text-[#f77f00]' : 'text-[#d62828]'
            )}
          >
            {status.tps.toFixed(1)}
          </span>
        </div>

        {/* 内存 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon icon="ph:memory-fill" className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">内存使用</span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              {status.memory}GB / {status.maxMemory}GB
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#7209b7] to-[#b5179e] rounded-full transition-all duration-1000"
              style={{ width: `${(status.memory / status.maxMemory) * 100}%` }}
            />
          </div>
        </div>

        {/* 运行时间 */}
        <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Icon icon="ph:timer-fill" className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">运行时间</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{status.uptime}</span>
        </div>
      </div>
    </div>
  )
}

// 最近活动卡片
function RecentActivityCard({ activities }: { activities: typeof recentActivities }) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('.activity-item')
      animate(items, {
        opacity: [0, 1],
        translateX: [20, 0],
        duration: 400,
        delay: stagger(60, { start: 600 }),
        ease: 'out(2)',
      })
    }
  }, [])

  return (
    <div className="h-full bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-white/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="ph:clock-countdown-fill" className="w-5 h-5 text-[#7209b7]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近活动</h2>
        </div>
        <button className="text-sm text-[#0077b6] hover:text-[#00b4d8] font-medium transition-colors flex items-center gap-1 group">
          查看全部
          <Icon
            icon="ph:arrow-right"
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
          />
        </button>
      </div>

      <div ref={listRef} className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="activity-item opacity-0 group flex items-center gap-4 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-300 cursor-pointer"
          >
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-transform duration-300 group-hover:scale-110',
                activity.color
              )}
            >
              <Icon icon={activity.icon} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {activity.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
            </div>
            <Icon
              icon="ph:dots-three"
              className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
      </div>

      {/* 底部装饰 */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Icon icon="ph:info" className="w-4 h-4" />
          <span className="text-xs">显示最近 5 条活动记录</span>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

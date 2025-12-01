import { useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { animate, stagger } from 'animejs'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

interface SidebarProps {
  className?: string
  activePage: string
  onPageChange: (page: string) => void
  onLogout?: () => void
}

// 菜单项配置 - 使用 Phosphor 图标
const menuItems = [
  {
    id: 'dashboard',
    label: '仪表板',
    icon: 'ph:house-line',
    activeIcon: 'ph:house-line-fill',
  },
  {
    id: 'whitelist',
    label: '白名单管理',
    icon: 'ph:clipboard-text',
    activeIcon: 'ph:clipboard-text-fill',
  },
  {
    id: 'audit',
    label: '审核管理',
    icon: 'ph:check-circle',
    activeIcon: 'ph:check-circle-fill',
  },
  {
    id: 'survey',
    label: '问卷管理',
    icon: 'ph:note-pencil',
    activeIcon: 'ph:note-pencil-fill',
  },
  {
    id: 'logs',
    label: '日志监控',
    icon: 'ph:chart-line-up',
    activeIcon: 'ph:chart-line-up-fill',
  },
]

// 底部菜单项
const bottomMenuItems = [
  {
    id: 'notifications',
    label: '通知',
    icon: 'ph:bell',
    activeIcon: 'ph:bell-fill',
    badge: 3,
  },
  {
    id: 'settings',
    label: '设置',
    icon: 'ph:gear-six',
    activeIcon: 'ph:gear-six-fill',
  },
]

export function Sidebar({ className, activePage, onPageChange, onLogout }: SidebarProps) {
  const user = useAuthStore((state) => state.user)
  const sidebarRef = useRef<HTMLElement>(null)

  // 入场动画
  useEffect(() => {
    if (sidebarRef.current) {
      // Logo 动画
      const logo = sidebarRef.current.querySelector('.sidebar-logo')
      if (logo) {
        animate(logo, {
          opacity: [0, 1],
          translateX: [-20, 0],
          duration: 500,
          ease: 'out(3)',
        })
      }

      // 菜单项动画
      const menuItemElements = sidebarRef.current.querySelectorAll('.menu-item')
      animate(menuItemElements, {
        opacity: [0, 1],
        translateX: [-15, 0],
        duration: 400,
        delay: stagger(50, { start: 200 }),
        ease: 'out(2)',
      })

      // 用户信息动画
      const userInfo = sidebarRef.current.querySelector('.user-info')
      if (userInfo) {
        animate(userInfo, {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 400,
          delay: 500,
          ease: 'out(2)',
        })
      }
    }
  }, [])

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex flex-col w-64 h-[calc(100vh-2rem)] my-4 ml-4 rounded-3xl',
        'bg-white/70 dark:bg-[#1c1c1e]/80 backdrop-blur-xl backdrop-saturate-150',
        'border border-white/50 dark:border-gray-700/50',
        'shadow-xl shadow-black/5',
        'transition-all duration-500',
        className
      )}
    >
      {/* Logo 区域 */}
      <div className="sidebar-logo opacity-0 flex items-center gap-3 px-5 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-[#0077b6] to-[#00b4d8] text-white shadow-lg shadow-[#0077b6]/30 transition-transform duration-300 hover:scale-105">
          <Icon icon="ph:game-controller-fill" className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
            World of Kivotos
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">管理控制台</span>
        </div>
      </div>

      {/* 主菜单 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item, index) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={cn(
                'menu-item opacity-0 group relative flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-300 ease-out',
                isActive
                  ? 'bg-[#0077b6]/10 dark:bg-[#00b4d8]/10 text-[#0077b6] dark:text-[#00b4d8]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {/* 左侧指示器 */}
              <div
                className={cn(
                  'absolute left-0 w-1 h-6 rounded-r-full transition-all duration-300',
                  isActive
                    ? 'bg-[#0077b6] dark:bg-[#00b4d8] opacity-100'
                    : 'bg-transparent opacity-0'
                )}
              />

              {/* 图标容器 */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
                  isActive
                    ? 'bg-[#0077b6]/10 dark:bg-[#00b4d8]/10'
                    : 'group-hover:bg-gray-200/50 dark:group-hover:bg-gray-700/50'
                )}
              >
                <Icon
                  icon={isActive ? item.activeIcon : item.icon}
                  className={cn(
                    'w-[18px] h-[18px] transition-all duration-300',
                    isActive
                      ? 'text-[#0077b6] dark:text-[#00b4d8]'
                      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  )}
                />
              </div>

              <span className="flex-1 text-left">{item.label}</span>

              {/* 悬停箭头 */}
              <Icon
                icon="ph:caret-right"
                className={cn(
                  'w-4 h-4 transition-all duration-300',
                  isActive
                    ? 'opacity-100 translate-x-0 text-[#0077b6] dark:text-[#00b4d8]'
                    : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-gray-400'
                )}
              />
            </button>
          )
        })}
      </nav>

      {/* 底部菜单 */}
      <div className="px-3 py-3 border-t border-gray-200/50 dark:border-gray-700/50 space-y-1">
        {bottomMenuItems.map((item, index) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'menu-item opacity-0 group relative flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-300 ease-out',
                isActive
                  ? 'bg-[#0077b6]/10 dark:bg-[#00b4d8]/10 text-[#0077b6] dark:text-[#00b4d8]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
              )}
              style={{ animationDelay: `${(menuItems.length + index) * 50}ms` }}
            >
              {/* 图标容器 */}
              <div
                className={cn(
                  'relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300',
                  isActive
                    ? 'bg-[#0077b6]/10 dark:bg-[#00b4d8]/10'
                    : 'group-hover:bg-gray-200/50 dark:group-hover:bg-gray-700/50'
                )}
              >
                <Icon
                  icon={isActive ? item.activeIcon : item.icon}
                  className={cn(
                    'w-[18px] h-[18px] transition-all duration-300',
                    isActive
                      ? 'text-[#0077b6] dark:text-[#00b4d8]'
                      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  )}
                />
                {/* 通知徽章 */}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-[#d62828] rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="flex-1 text-left">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* 用户信息和登出 */}
      <div className="user-info opacity-0 px-3 py-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
          {/* 用户头像 */}
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-[#7209b7] to-[#b5179e] text-white text-sm font-bold shadow-lg shadow-[#7209b7]/20">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            {/* 在线状态指示器 */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#38b000] border-2 border-white dark:border-[#1c1c1e] rounded-full" />
          </div>

          {/* 用户信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.username || '管理员'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              超级管理员
            </p>
          </div>

          {/* 登出按钮 */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="group flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-[#d62828] hover:bg-[#d62828]/10 transition-all duration-300"
              title="退出登录"
            >
              <Icon
                icon="ph:sign-out"
                className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

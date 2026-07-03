import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Users,
  ClipboardList,
  ClipboardCheck,
  FileStack,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AppPath =
  | '/dashboard'
  | '/whitelist'
  | '/monitor'
  | '/players'
  | '/survey'
  | '/forms'
  | '/review'
  | '/logs'
  | '/settings'

interface NavItem {
  to: AppPath
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '概览', icon: LayoutDashboard },
  { to: '/whitelist', label: '白名单', icon: ShieldCheck },
  { to: '/monitor', label: '服务器监控', icon: Activity },
  { to: '/players', label: '在线玩家', icon: Users },
  { to: '/survey', label: '问卷管理', icon: ClipboardList },
  { to: '/forms', label: '其他问卷', icon: FileStack },
  { to: '/review', label: '问卷审核', icon: ClipboardCheck },
  { to: '/logs', label: '操作日志', icon: ScrollText },
  { to: '/settings', label: '设置', icon: Settings },
]

export function AppSidebar() {
  return (
    <aside className="glass flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">
          K
        </div>
        <span className="font-semibold text-sidebar-foreground">Kivotos 控制台</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              activeProps={{
                className: 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
              }}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

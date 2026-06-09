import { Outlet, useNavigate } from '@tanstack/react-router'
import { Moon, Sun, LogOut } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/auth'

export function AppShell() {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-screen text-foreground">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="glass sticky top-0 z-10 flex h-14 shrink-0 items-center justify-end gap-2 border-b border-sidebar-border bg-card px-6">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="切换主题">
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.displayName || user.username}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="登出">
            <LogOut />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

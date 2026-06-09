import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sun, Moon, Copy, KeyRound } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/auth'

export function SettingsPage() {
  const { theme, toggle } = useTheme()
  const user = useAuthStore((s) => s.user)
  const [token, setToken] = useState('')

  const gen = useMutation({
    mutationFn: () => authApi.generateRegistrationToken(24),
    onSuccess: (data) => {
      setToken(data.token)
      toast.success('注册令牌已生成')
    },
    onError: (e: Error) => toast.error(e.message || '生成失败'),
  })

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('已复制'),
      () => toast.error('复制失败')
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">账户、外观与管理员邀请</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前管理员</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                {(user.displayName || user.username).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.displayName || user.username}</span>
                  {user.isSuperAdmin && <Badge>超级管理员</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">未登录</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">外观</CardTitle>
          <CardDescription>切换浅色 / 深色主题</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={toggle}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            {theme === 'dark' ? '切换到浅色' : '切换到深色'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" /> 管理员注册令牌</CardTitle>
          <CardDescription>生成一次性令牌, 供新管理员自助注册 (24 小时有效)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? '生成中…' : '生成注册令牌'}
          </Button>
          {token && (
            <div className="flex items-center gap-2">
              <Input readOnly value={token} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(token)} aria-label="复制"><Copy /></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

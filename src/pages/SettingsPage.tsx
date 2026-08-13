import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sun, Moon, Copy, KeyRound, Fingerprint } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/auth'

/** 后端下发的是 ISO_LOCAL_DATE_TIME (无时区), 按本地时间解析即可; 与站内其它页面的格式保持一致。 */
function formatTime(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

export function SettingsPage() {
  const { theme, toggle } = useTheme()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [token, setToken] = useState('')
  // 明文识别码只在签发响应里出现一次, 刷新页面即消失 —— 后端只留哈希, 拿不回来
  const [personalCode, setPersonalCode] = useState('')

  const gen = useMutation({
    mutationFn: () => authApi.generateRegistrationToken(24),
    onSuccess: (data) => {
      setToken(data.token)
      toast.success('注册令牌已生成')
    },
    onError: (e: Error) => toast.error(e.message || '生成失败'),
  })

  const codeStatus = useQuery({
    queryKey: ['personal-code'],
    queryFn: () => authApi.getPersonalCode(),
  })

  const issueCode = useMutation({
    mutationFn: () => authApi.issuePersonalCode(),
    onSuccess: (data) => {
      setPersonalCode(data.code)
      queryClient.invalidateQueries({ queryKey: ['personal-code'] })
      toast.success('个人识别码已签发')
    },
    onError: (e: Error) => toast.error(e.message || '签发失败'),
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
        <p className="mt-1 text-sm text-muted-foreground">账户、外观、识别码与管理员邀请</p>
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
          <CardTitle className="flex items-center gap-2 text-base"><Fingerprint className="size-4" /> 个人识别码</CardTitle>
          <CardDescription>
            私聊 QQ 机器人发送 <code className="font-mono">#绑定 &lt;识别码&gt;</code> 完成认领, 之后即可在任意群内用 #加白 / #say 等命令
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {personalCode ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input readOnly value={personalCode} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(personalCode)} aria-label="复制"><Copy /></Button>
              </div>
              <p className="text-xs text-warning">识别码只显示这一次, 请立即复制。离开本页后只能重新生成。</p>
            </div>
          ) : codeStatus.isLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : codeStatus.isError ? (
            <p className="text-sm text-destructive">状态获取失败: {(codeStatus.error as Error).message}</p>
          ) : codeStatus.data?.issued ? (
            <div className="space-y-1">
              <div className="rounded-md border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                {codeStatus.data.prefix}
                <span className="mx-1 tracking-widest">············</span>
                {codeStatus.data.suffix}
              </div>
              <p className="text-xs text-muted-foreground">签发于 {formatTime(codeStatus.data.issuedAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">尚未签发识别码</p>
          )}

          {codeStatus.data && codeStatus.data.boundQq.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">已绑定 QQ</span>
              {codeStatus.data.boundQq.map((qq) => (
                <Badge key={qq} variant="secondary" className="font-mono">{qq}</Badge>
              ))}
            </div>
          )}

          <Button
            onClick={() => issueCode.mutate()}
            disabled={issueCode.isPending}
            variant={codeStatus.data?.issued ? 'outline' : 'default'}
          >
            {issueCode.isPending
              ? '生成中…'
              : codeStatus.data?.issued
                ? '重新生成 (旧码立即失效)'
                : '生成识别码'}
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

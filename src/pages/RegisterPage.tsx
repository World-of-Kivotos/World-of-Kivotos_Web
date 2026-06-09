import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authApi } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function RegisterPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password || !token.trim()) {
      toast.error('请填写用户名、密码和注册令牌')
      return
    }
    setLoading(true)
    try {
      await authApi.register({
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        token: token.trim(),
      })
      toast.success('注册成功，请用新账号登录')
      navigate({ to: '/login' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/50 shadow-2xl dark:border-white/10">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
            K
          </div>
          <CardTitle className="text-2xl">注册管理员</CardTitle>
          <CardDescription>需要超级管理员发放的注册令牌</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
                placeholder="3-20 位字母、数字或下划线"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">显示名称（可选）</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                placeholder="留空则用用户名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                placeholder="6-50 位"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">注册令牌</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                placeholder="向超级管理员索取"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中…' : '注册'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账号？
              <Link to="/login" className="text-primary hover:underline">
                去登录
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

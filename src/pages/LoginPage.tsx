import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { authApi } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import toast from 'react-hot-toast'

interface LoginPageProps {
  onLoginSuccess: () => void
}

type AuthMode = 'login' | 'register'

/**
 * 登录/注册页面
 */
export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  
  // 表单状态
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [registerToken, setRegisterToken] = useState('')
  
  const setAuth = useAuthStore((state) => state.setAuth)

  // 检查服务器状态
  useEffect(() => {
    checkServerStatus()
  }, [])

  const checkServerStatus = async () => {
    setServerStatus('checking')
    try {
      await authApi.healthCheck()
      setServerStatus('online')
    } catch {
      setServerStatus('offline')
    }
  }

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || !password) {
      toast.error('请输入用户名和密码')
      return
    }

    setIsLoading(true)
    try {
      const result = await authApi.login({ username: username.trim(), password })
      setAuth(result.token, result.user)
      toast.success('登录成功')
      onLoginSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || !password || !registerToken.trim()) {
      toast.error('请填写所有必填项')
      return
    }

    if (username.length < 3 || username.length > 20) {
      toast.error('用户名长度必须在3-20位之间')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('用户名只能包含字母、数字和下划线')
      return
    }

    if (password.length < 6) {
      toast.error('密码长度至少6位')
      return
    }

    setIsLoading(true)
    try {
      await authApi.register({
        username: username.trim(),
        password,
        displayName: displayName.trim() || username.trim(),
        token: registerToken.trim(),
      })
      toast.success('注册成功，请登录')
      setMode('login')
      setPassword('')
      setRegisterToken('')
      setDisplayName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '注册失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920)',
          filter: 'brightness(0.7)',
        }}
      />
      
      {/* 背景渐变叠加 */}
      <div className="absolute inset-0 bg-linear-to-br from-indigo-900/30 via-purple-900/20 to-pink-900/30" />

      {/* 顶部导航 */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg">
            W
          </div>
          <span className="text-white text-xl font-semibold">World of Kivotos</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-white/80 hover:text-white transition-colors">官网</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </header>

      {/* 主内容区 - 登录框在右侧 */}
      <main className="relative z-10 flex items-center justify-end min-h-[calc(100vh-88px)] px-8 md:px-16 lg:px-24">
        {/* 登录卡片 */}
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            {/* 标题 */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">World of Kivotos Panel</h1>
              <p className="text-white/60 text-sm">请选择登录方式</p>
              
              {/* 服务器状态 */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  serverStatus === 'online' && 'bg-green-400',
                  serverStatus === 'offline' && 'bg-red-400',
                  serverStatus === 'checking' && 'bg-yellow-400 animate-pulse'
                )} />
                <span className={cn(
                  'text-sm',
                  serverStatus === 'online' && 'text-green-400',
                  serverStatus === 'offline' && 'text-red-400',
                  serverStatus === 'checking' && 'text-yellow-400'
                )}>
                  {serverStatus === 'online' && '服务器已连接'}
                  {serverStatus === 'offline' && '服务器离线'}
                  {serverStatus === 'checking' && '检测中...'}
                </span>
                {serverStatus !== 'checking' && (
                  <button
                    onClick={checkServerStatus}
                    className="text-white/40 hover:text-white/60 text-xs transition-colors"
                  >
                    重新检查
                  </button>
                )}
              </div>
            </div>

            {/* 模式切换 */}
            <div className="flex bg-white/10 rounded-xl p-1 mb-6">
              <button
                onClick={() => setMode('login')}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'login'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white/70 hover:text-white'
                )}
              >
                登录
              </button>
              <button
                onClick={() => setMode('register')}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'register'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white/70 hover:text-white'
                )}
              >
                注册
              </button>
            </div>

            {/* 登录表单 */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="玩家名称"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || serverStatus === 'offline'}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    'bg-linear-to-r from-blue-500 to-blue-600 text-white',
                    'hover:from-blue-600 hover:to-blue-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'shadow-lg shadow-blue-500/30'
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      登录中...
                    </span>
                  ) : '登录'}
                </button>
              </form>
            )}

            {/* 注册表单 */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="玩家名称"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={registerToken}
                    onChange={(e) => setRegisterToken(e.target.value)}
                    placeholder="注册令牌"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || serverStatus === 'offline'}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    'bg-linear-to-r from-purple-500 to-purple-600 text-white',
                    'hover:from-purple-600 hover:to-purple-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'shadow-lg shadow-purple-500/30'
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      注册中...
                    </span>
                  ) : '注册白名单'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default LoginPage

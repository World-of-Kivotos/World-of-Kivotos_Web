import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { QueryProvider } from '@/providers/QueryProvider'
import { Sidebar } from '@/components/Sidebar'
import { WhitelistPage } from '@/pages/WhitelistPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { SurveyPage } from '@/pages/SurveyPage'
import { AuditPage } from '@/pages/AuditPage'
import { useAuthStore } from '@/stores/auth'
import { Icon } from '@iconify/react'

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const { isAuthenticated, checkAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // 检查认证状态
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
      setIsLoading(false)
    }
    initAuth()
  }, [checkAuth])

  // 处理登录成功
  const handleLoginSuccess = () => {
    setActivePage('dashboard')
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#caf0f8] via-white to-[#ade8f4]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#0077b6] to-[#00b4d8] flex items-center justify-center shadow-lg shadow-[#0077b6]/30 animate-pulse">
              <Icon icon="ph:game-controller-fill" className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-[#0077b6] to-[#00b4d8] blur-xl opacity-50 animate-pulse" />
          </div>
          <p className="text-gray-500 font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录时显示登录页
  if (!isAuthenticated) {
    return (
      <QueryProvider>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#333',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
            },
          }}
        />
      </QueryProvider>
    )
  }

  return (
    <QueryProvider>
      <div className="flex h-screen bg-[#F5F5F7] dark:bg-[#000000] overflow-hidden relative transition-colors duration-500">
        {/* 液态流动背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* 蓝色光斑 */}
          <div 
            className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#0077b6]/15 dark:bg-[#0077b6]/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob" 
          />
          {/* 紫色光斑 */}
          <div 
            className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#7209b7]/15 dark:bg-[#7209b7]/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-60 animate-blob animation-delay-2000" 
          />
          {/* 青色光斑 */}
          <div 
            className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-[#00b4d8]/10 dark:bg-[#00b4d8]/15 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob animation-delay-4000" 
          />
        </div>

        {/* 侧边栏 */}
        <Sidebar activePage={activePage} onPageChange={setActivePage} onLogout={logout} />

        {/* 主要内容区域 */}
        <main className="flex-1 p-8 overflow-hidden relative z-10">
          <div className="h-full max-w-7xl mx-auto">
            {activePage === 'dashboard' && <DashboardPage />}
            {activePage === 'whitelist' && <WhitelistPage />}
            {activePage === 'audit' && <AuditPage />}
            {activePage === 'survey' && <SurveyPage />}
            {activePage === 'logs' && <PlaceholderContent title="日志监控" icon="ph:chart-line-up" />}
            {activePage === 'notifications' && <PlaceholderContent title="通知中心" icon="ph:bell" />}
            {activePage === 'settings' && <PlaceholderContent title="系统设置" icon="ph:gear-six" />}
          </div>
        </main>

        {/* Toast 通知 */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              color: '#333',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
      </div>
    </QueryProvider>
  )
}

/**
 * 占位内容组件 - MaiLauncher 风格
 */
function PlaceholderContent({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-8 animate-slide-down">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">功能开发中...</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-3xl p-16 shadow-sm border border-white/50 dark:border-gray-700/50 text-center animate-scale-in">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center animate-float">
              <Icon icon={icon} className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#f77f00] flex items-center justify-center animate-bounce-in" style={{ animationDelay: '0.3s' }}>
              <Icon icon="ph:wrench-fill" className="w-3 h-3 text-white" />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">该功能正在开发中</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">敬请期待...</p>
        </div>
      </div>
    </div>
  )
}

export default App

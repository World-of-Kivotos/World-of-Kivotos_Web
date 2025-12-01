import { Toaster } from 'react-hot-toast'
import { QueryProvider } from '@/providers/QueryProvider'

function App() {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-background">
        {/* 主要内容区域 */}
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
            <h1 className="text-4xl font-bold text-foreground">
              World of Kivotos
            </h1>
            <p className="text-lg text-muted-foreground">
              白名单管理系统
            </p>
            <div className="flex gap-4">
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition-opacity">
                开始使用
              </button>
              <button className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-secondary transition-colors">
                了解更多
              </button>
            </div>
          </div>
        </main>

        {/* Toast 通知 */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--color-card)',
              color: 'var(--color-card-foreground)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
      </div>
    </QueryProvider>
  )
}

export default App

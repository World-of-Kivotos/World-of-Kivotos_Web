import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmType?: 'primary' | 'danger'
  loading?: boolean
}

/**
 * 确认弹窗组件
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmType = 'primary',
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null

  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm transform rounded-2xl bg-white p-6 shadow-xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 图标 */}
          <div className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            confirmType === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
          )}>
            {confirmType === 'danger' ? (
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* 标题和消息 */}
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl font-medium transition-all',
                confirmType === 'danger'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700',
                loading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  处理中...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

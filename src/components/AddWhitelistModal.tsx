import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAddWhitelist, useBatchOperation } from '@/hooks/useWhitelist'
import { useAuthStore } from '@/stores/auth'

interface AddWhitelistModalProps {
  open: boolean
  onClose: () => void
}

type AddMode = 'single' | 'batch'

/**
 * 添加白名单弹窗组件
 */
export function AddWhitelistModal({ open, onClose }: AddWhitelistModalProps) {
  const [mode, setMode] = useState<AddMode>('single')
  const [name, setName] = useState('')
  const [batchNames, setBatchNames] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 获取当前登录用户信息
  const user = useAuthStore((state) => state.user)
  
  const addMutation = useAddWhitelist()
  const batchMutation = useBatchOperation()

  // 验证单个玩家名
  const validateSingle = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!name.trim()) {
      newErrors.name = '请输入玩家名称'
    } else if (name.length < 3) {
      newErrors.name = '玩家名称至少3个字符'
    } else if (name.length > 16) {
      newErrors.name = '玩家名称最多16个字符'
    } else if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      newErrors.name = '玩家名称只能包含字母、数字和下划线'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 验证批量玩家名
  const validateBatch = (): boolean => {
    const newErrors: Record<string, string> = {}
    const names = batchNames.split('\n').map(n => n.trim()).filter(n => n)
    
    if (names.length === 0) {
      newErrors.batch = '请输入至少一个玩家名称'
    } else {
      const invalidNames = names.filter(n => 
        n.length < 3 || n.length > 16 || !/^[a-zA-Z0-9_]+$/.test(n)
      )
      if (invalidNames.length > 0) {
        newErrors.batch = `以下玩家名无效: ${invalidNames.slice(0, 3).join(', ')}${invalidNames.length > 3 ? '...' : ''}`
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (mode === 'single') {
      if (!validateSingle()) return
      
      try {
        await addMutation.mutateAsync({
          name: name.trim(),
          source: 'ADMIN',
          added_by_name: user?.displayName || user?.username || 'Unknown',
        })
        handleClose()
      } catch {
        // 错误已在 hook 中处理
      }
    } else {
      if (!validateBatch()) return
      
      const names = batchNames.split('\n').map(n => n.trim()).filter(n => n)
      
      try {
        await batchMutation.mutateAsync({
          operation: 'add',
          source: 'ADMIN',
          added_by_name: user?.displayName || user?.username || 'Unknown',
          players: names.map(n => ({ name: n })),
        })
        handleClose()
      } catch {
        // 错误已在 hook 中处理
      }
    }
  }

  // 关闭弹窗时重置
  const handleClose = () => {
    setName('')
    setBatchNames('')
    setErrors({})
    setMode('single')
    onClose()
  }

  if (!open) return null

  const isPending = addMutation.isPending || batchMutation.isPending

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">添加玩家到白名单</h3>
              <p className="text-sm text-gray-500 mt-0.5">UUID将在玩家首次登录时自动补充</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 模式切换 */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
            <button
              type="button"
              onClick={() => { setMode('single'); setErrors({}) }}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                mode === 'single'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              单个添加
            </button>
            <button
              type="button"
              onClick={() => { setMode('batch'); setErrors({}) }}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                mode === 'batch'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              批量添加
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'single' ? (
              /* 单个玩家输入 */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  玩家名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors({})
                  }}
                  placeholder="输入 Minecraft 玩家名"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    errors.name
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  )}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.name}
                  </p>
                )}
              </div>
            ) : (
              /* 批量玩家输入 */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  玩家名称列表 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={batchNames}
                  onChange={(e) => {
                    setBatchNames(e.target.value)
                    if (errors.batch) setErrors({})
                  }}
                  placeholder="每行一个玩家名&#10;例如:&#10;Player1&#10;Player2&#10;Player3"
                  rows={6}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl border transition-all resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    errors.batch
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  )}
                />
                <p className="mt-1 text-xs text-gray-500">
                  共 {batchNames.split('\n').map(n => n.trim()).filter(n => n).length} 个玩家
                </p>
                {errors.batch && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.batch}
                  </p>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl font-medium transition-all',
                  'bg-indigo-600 text-white shadow-lg shadow-indigo-200',
                  isPending
                    ? 'opacity-70 cursor-not-allowed'
                    : 'hover:bg-indigo-700'
                )}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    添加中...
                  </span>
                ) : (
                  mode === 'single' ? '添加玩家' : '批量添加'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddWhitelistModal

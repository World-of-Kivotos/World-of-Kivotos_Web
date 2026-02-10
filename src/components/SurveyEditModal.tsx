import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react'
import { animate, stagger } from 'animejs'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type {
  QuestionType,
  QuestionOption,
  QuestionValidation,
  QuestionCondition,
  CreateQuestionRequest,
  CreateSurveyRequest,
  SurveyDetail,
} from '@/types/survey'

// ============================================
// 类型定义
// ============================================

interface SurveyEditModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (survey: CreateSurveyRequest) => Promise<void>
  loading?: boolean
  /** 编辑模式：传入已有问卷数据 */
  initialData?: SurveyDetail | null
  /** 是否为编辑模式 */
  mode?: 'create' | 'edit'
}

interface LocalQuestion extends Omit<CreateQuestionRequest, 'order'> {
  _id: string // 本地临时ID
  order: number
  condition?: QuestionCondition  // 条件显示配置
}

// 题目类型配置
const QUESTION_TYPES: {
  value: QuestionType
  label: string
  icon: string
  description: string
}[] = [
  { value: 'single', label: '单选题', icon: 'ph:radio-button', description: '选择一个答案' },
  { value: 'multiple', label: '多选题', icon: 'ph:check-square', description: '选择多个答案' },
  { value: 'boolean', label: '判断题', icon: 'ph:toggle-left', description: '是/否判断' },
  { value: 'text', label: '文本题', icon: 'ph:textbox', description: '填写文字内容' },
  { value: 'image', label: '图片题', icon: 'ph:image', description: '上传图片' },
]

// 生成唯一ID
const generateId = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ============================================
// 可排序问题卡片组件
// ============================================

interface SortableQuestionCardProps {
  question: LocalQuestion
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (question: LocalQuestion) => void
  onDelete: () => void
  onDuplicate: () => void
  allQuestions: LocalQuestion[]  // 所有题目列表，用于条件配置
}

function SortableQuestionCard({
  question,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
  allQuestions,
}: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const typeConfig = QUESTION_TYPES.find((t) => t.value === question.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'question-card rounded-2xl border transition-all duration-300',
        isDragging
          ? 'bg-white dark:bg-[#2c2c2e] border-[#0077b6]/50 shadow-2xl shadow-[#0077b6]/20 scale-[1.02]'
          : 'bg-white/60 dark:bg-[#1c1c1e]/60 border-gray-200/50 dark:border-gray-700/50 hover:border-[#0077b6]/30'
      )}
    >
      {/* 卡片头部 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 拖拽手柄 */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'p-1.5 rounded-lg cursor-grab active:cursor-grabbing',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-100/80 dark:hover:bg-gray-700/50',
            'transition-all duration-200'
          )}
        >
          <Icon icon="ph:dots-six-vertical-bold" className="w-4 h-4" />
        </button>

        {/* 题号 */}
        <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-[#0077b6]/10 dark:bg-[#0077b6]/20 text-[#0077b6] dark:text-[#00b4d8] rounded-lg">
          {index + 1}
        </span>

        {/* 题目类型图标 */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-100/80 dark:bg-gray-700/50">
          <Icon icon={typeConfig?.icon || 'ph:question'} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{typeConfig?.label}</span>
        </div>

        {/* 题目标题预览 */}
        <div className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
          {question.title || <span className="text-gray-400 italic">未设置标题</span>}
        </div>

        {/* 保留标识 */}
        {question.is_pinned && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
            <Icon icon="ph:push-pin-fill" className="w-3 h-3" />
            保留
          </span>
        )}

        {/* 条件显示标识 */}
        {question.condition && (
          <span className="flex items-center gap-1 text-xs font-medium text-purple-500">
            <Icon icon="ph:git-branch" className="w-3 h-3" />
            条件
          </span>
        )}

        {/* 必填标识 */}
        {question.is_required && (
          <span className="text-xs font-medium text-red-500">必填</span>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            className={cn(
              'p-1.5 rounded-lg',
              'text-gray-400 hover:text-[#0077b6] hover:bg-[#0077b6]/10',
              'transition-all duration-200'
            )}
            title="复制题目"
          >
            <Icon icon="ph:copy" className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className={cn(
              'p-1.5 rounded-lg',
              'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
              'transition-all duration-200'
            )}
            title="删除题目"
          >
            <Icon icon="ph:trash" className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className={cn(
              'p-1.5 rounded-lg',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-100/80 dark:hover:bg-gray-700/50',
              'transition-all duration-200'
            )}
          >
            <Icon
              icon={isExpanded ? 'ph:caret-up' : 'ph:caret-down'}
              className="w-4 h-4"
            />
          </button>
        </div>
      </div>

      {/* 展开的编辑区域 */}
      {isExpanded && (
        <div className="overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 pt-0 space-y-4 border-t border-gray-200/50 dark:border-gray-700/50">
            {/* 题目标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                题目标题 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question.title}
                onChange={(e) => onUpdate({ ...question, title: e.target.value })}
                placeholder="请输入题目标题"
                rows={2}
                className={cn(
                  'w-full px-4 py-3 rounded-xl resize-none',
                  'bg-gray-50 dark:bg-gray-800/50',
                  'border border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-white placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50 focus:border-transparent',
                  'transition-all duration-300'
                )}
              />
            </div>

            {/* 题目描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                题目说明 <span className="text-gray-400 text-xs">(可选)</span>
              </label>
              <input
                type="text"
                value={question.description || ''}
                onChange={(e) => onUpdate({ ...question, description: e.target.value || undefined })}
                placeholder="为题目添加额外说明"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl',
                  'bg-gray-50 dark:bg-gray-800/50',
                  'border border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-white placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50 focus:border-transparent',
                  'transition-all duration-300'
                )}
              />
            </div>

            {/* 题目类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                题目类型
              </label>
              <div className="grid grid-cols-5 gap-2">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => onUpdate({ 
                      ...question, 
                      type: type.value,
                      options: ['single', 'multiple'].includes(type.value) 
                        ? question.options?.length ? question.options : [{ value: 'A', label: '选项A' }]
                        : undefined,
                      validation: type.value === 'text' 
                        ? { min_length: 1, max_length: 500 }
                        : type.value === 'image'
                        ? { max_images: 3 }
                        : undefined
                    })}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200',
                      question.type === type.value
                        ? 'bg-[#0077b6]/10 dark:bg-[#0077b6]/20 border-[#0077b6]/50 text-[#0077b6] dark:text-[#00b4d8]'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Icon icon={type.icon} className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 选项编辑器 - 单选/多选 */}
            {['single', 'multiple'].includes(question.type) && (
              <OptionsEditor
                options={question.options || []}
                onChange={(options) => onUpdate({ ...question, options })}
              />
            )}

            {/* 文本验证配置 */}
            {question.type === 'text' && (
              <TextValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {/* 图片验证配置 */}
            {question.type === 'image' && (
              <ImageValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {/* 必填设置 */}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-all duration-300',
                    question.is_required
                      ? 'bg-[#0077b6]'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                  onClick={() => onUpdate({ ...question, is_required: !question.is_required })}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300',
                      question.is_required ? 'left-5' : 'left-1'
                    )}
                  />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">必填题目</span>
              </label>

              {/* 保留题目设置 */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-all duration-300',
                    question.is_pinned
                      ? 'bg-amber-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                  onClick={() => onUpdate({ ...question, is_pinned: !question.is_pinned })}
                >
                  <div
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300',
                      question.is_pinned ? 'left-5' : 'left-1'
                    )}
                  />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Icon icon="ph:push-pin-fill" className={cn('w-3.5 h-3.5', question.is_pinned ? 'text-amber-500' : 'text-gray-400')} />
                  保留题目
                </span>
              </label>
            </div>

            {/* 条件显示配置 */}
            <ConditionEditor
              question={question}
              allQuestions={allQuestions}
              currentIndex={index}
              onChange={(condition) => onUpdate({ ...question, condition })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// 选项编辑器
// ============================================

interface OptionsEditorProps {
  options: QuestionOption[]
  onChange: (options: QuestionOption[]) => void
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const addOption = () => {
    const nextValue = String.fromCharCode(65 + options.length) // A, B, C, ...
    onChange([...options, { value: nextValue, label: `选项${nextValue}` }])
  }

  const updateOption = (index: number, label: string) => {
    const updated = [...options]
    updated[index] = { ...updated[index], label }
    onChange(updated)
  }

  const removeOption = (index: number) => {
    if (options.length <= 1) return
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        选项列表
      </label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2 option-item">
            <span className="flex items-center justify-center w-7 h-7 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg">
              {option.value}
            </span>
            <input
              type="text"
              value={option.label}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`选项${option.value}内容`}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg',
                'bg-gray-50 dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white placeholder-gray-400 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50 focus:border-transparent',
                'transition-all duration-200'
              )}
            />
            <button
              onClick={() => removeOption(index)}
              disabled={options.length <= 1}
              className={cn(
                'p-2 rounded-lg transition-all duration-200',
                options.length <= 1
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              )}
            >
              <Icon icon="ph:x" className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addOption}
        disabled={options.length >= 10}
        className={cn(
          'flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-medium',
          'border-2 border-dashed transition-all duration-200',
          options.length >= 10
            ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
            : 'border-[#0077b6]/30 text-[#0077b6] dark:text-[#00b4d8] hover:border-[#0077b6] hover:bg-[#0077b6]/5'
        )}
      >
        <Icon icon="ph:plus" className="w-4 h-4" />
        添加选项
      </button>
    </div>
  )
}

// ============================================
// 文本验证编辑器
// ============================================

interface TextValidationEditorProps {
  validation: QuestionValidation
  onChange: (validation: QuestionValidation) => void
}

function TextValidationEditor({ validation, onChange }: TextValidationEditorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        文本限制
      </label>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">最少</span>
          <input
            type="number"
            min={0}
            value={validation.min_length ?? ''}
            onChange={(e) => onChange({ ...validation, min_length: e.target.value ? parseInt(e.target.value) : undefined })}
            className={cn(
              'w-20 px-3 py-1.5 rounded-lg text-center text-sm',
              'bg-gray-50 dark:bg-gray-800/50',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50'
            )}
          />
          <span className="text-sm text-gray-500">字</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">最多</span>
          <input
            type="number"
            min={1}
            value={validation.max_length ?? ''}
            onChange={(e) => onChange({ ...validation, max_length: e.target.value ? parseInt(e.target.value) : undefined })}
            className={cn(
              'w-20 px-3 py-1.5 rounded-lg text-center text-sm',
              'bg-gray-50 dark:bg-gray-800/50',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50'
            )}
          />
          <span className="text-sm text-gray-500">字</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 图片验证编辑器
// ============================================

interface ImageValidationEditorProps {
  validation: QuestionValidation
  onChange: (validation: QuestionValidation) => void
}

function ImageValidationEditor({ validation, onChange }: ImageValidationEditorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        图片限制
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">最多上传</span>
        <input
          type="number"
          min={1}
          max={9}
          value={validation.max_images ?? 3}
          onChange={(e) => onChange({ ...validation, max_images: parseInt(e.target.value) || 3 })}
          className={cn(
            'w-16 px-3 py-1.5 rounded-lg text-center text-sm',
            'bg-gray-50 dark:bg-gray-800/50',
            'border border-gray-200 dark:border-gray-700',
            'text-gray-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50'
          )}
        />
        <span className="text-sm text-gray-500">张图片</span>
      </div>
    </div>
  )
}

// ============================================
// 条件显示编辑器
// ============================================

interface ConditionEditorProps {
  question: LocalQuestion
  allQuestions: LocalQuestion[]
  currentIndex: number
  onChange: (condition: QuestionCondition | undefined) => void
}

function ConditionEditor({ question, allQuestions, currentIndex, onChange }: ConditionEditorProps) {
  // 只显示当前题目之前且有选项的题目（单选/多选/判断）
  const availableQuestions = allQuestions.filter((q, idx) => {
    if (idx >= currentIndex) return false
    // 必须是单选/多选/判断类型
    if (!['single', 'multiple', 'boolean'].includes(q.type)) return false
    // 单选/多选需要有选项
    if (['single', 'multiple'].includes(q.type)) {
      return q.options && q.options.length > 0
    }
    return true // 判断题默认有是/否选项
  })

  const hasCondition = !!question.condition
  const selectedQuestion = question.condition
    ? allQuestions.find((_, idx) => idx === question.condition!.depends_on)
    : null

  // 获取选中题目的可选答案值
  const getAvailableOptions = () => {
    if (!selectedQuestion) return []
    if (selectedQuestion.type === 'boolean') {
      return [
        { value: 'true', label: '是' },
        { value: 'false', label: '否' },
      ]
    }
    return selectedQuestion.options || []
  }

  const availableOptions = getAvailableOptions()

  // 当前选中的触发值
  const selectedValues = question.condition?.show_when
    ? Array.isArray(question.condition.show_when)
      ? question.condition.show_when
      : [question.condition.show_when]
    : []

  const handleToggleCondition = () => {
    if (hasCondition) {
      onChange(undefined)
    } else if (availableQuestions.length > 0) {
      // 默认依赖第一个可用题目
      const firstAvailable = availableQuestions[0]
      const firstIndex = allQuestions.findIndex(q => q._id === firstAvailable._id)
      onChange({
        depends_on: firstIndex,
        show_when: '',
      })
    }
  }

  const handleQuestionChange = (questionIndex: number) => {
    onChange({
      depends_on: questionIndex,
      show_when: '',
    })
  }

  const handleValueToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    
    onChange({
      depends_on: question.condition!.depends_on,
      show_when: newValues.length === 1 ? newValues[0] : newValues,
    })
  }

  // 当前题目是第一题时不能设置条件
  if (currentIndex === 0) {
    return null
  }

  // 没有可用的前置题目时显示提示
  if (availableQuestions.length === 0) {
    // 检查是否有前置题目但没有选项
    const hasQuestionWithoutOptions = allQuestions.some((q, idx) => {
      if (idx >= currentIndex) return false
      if (!['single', 'multiple', 'boolean'].includes(q.type)) return false
      if (['single', 'multiple'].includes(q.type)) {
        return !q.options || q.options.length === 0
      }
      return false
    })
    
    return (
      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <Icon icon="ph:git-branch" className="w-4 h-4" />
          <span>
            条件显示：
            {hasQuestionWithoutOptions 
              ? '前面的单选/多选题需要先添加选项'
              : '前面没有可作为条件的题目（需要单选/多选/判断题）'
            }
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
      {/* 启用条件显示开关 */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          className={cn(
            'relative w-10 h-6 rounded-full transition-all duration-300',
            hasCondition
              ? 'bg-purple-500'
              : 'bg-gray-300 dark:bg-gray-600'
          )}
          onClick={handleToggleCondition}
        >
          <div
            className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300',
              hasCondition ? 'left-5' : 'left-1'
            )}
          />
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Icon icon="ph:git-branch" className={cn('w-4 h-4', hasCondition ? 'text-purple-500' : 'text-gray-400')} />
          条件显示
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">（根据前面题目的答案决定是否显示此题）</span>
      </label>

      {/* 条件配置 */}
      {hasCondition && (
        <div className="pl-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* 选择依赖题目 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">当</span>
            <select
              value={question.condition?.depends_on ?? ''}
              onChange={(e) => handleQuestionChange(parseInt(e.target.value))}
              className={cn(
                'px-3 py-2 rounded-xl text-sm',
                'bg-gray-50 dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent',
                'transition-all duration-200'
              )}
            >
              {availableQuestions.map((q, _) => {
                const realIndex = allQuestions.findIndex(aq => aq._id === q._id)
                return (
                  <option key={q._id} value={realIndex}>
                    第{realIndex + 1}题: {q.title.slice(0, 20)}{q.title.length > 20 ? '...' : ''}
                  </option>
                )
              })}
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">的答案为以下值时显示：</span>
          </div>

          {/* 选择触发值 */}
          {availableOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <button
                    key={option.value}
                    onClick={() => handleValueToggle(option.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                      'border',
                      isSelected
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/50 text-purple-600 dark:text-purple-400'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-500/30'
                    )}
                  >
                    {isSelected && <Icon icon="ph:check" className="w-3.5 h-3.5 inline mr-1.5" />}
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* 提示 */}
          {selectedValues.length === 0 && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <Icon icon="ph:warning" className="w-3.5 h-3.5" />
              请至少选择一个触发值
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// 添加题目选择器
// ============================================

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType) => void
  onClose: () => void
}

function QuestionTypeSelector({ onSelect, onClose }: QuestionTypeSelectorProps) {
  const selectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectorRef.current) {
      const items = selectorRef.current.querySelectorAll('.type-item')
      animate(items, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 300,
        delay: stagger(50),
        ease: 'out(3)',
      })
    }
  }, [])

  return (
    <div
      ref={selectorRef}
      className={cn(
        'absolute bottom-full left-0 right-0 mb-2 p-4',
        'bg-white dark:bg-[#2c2c2e] rounded-2xl',
        'border border-gray-200/50 dark:border-gray-700/50',
        'shadow-2xl shadow-black/10'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">选择题目类型</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icon icon="ph:x" className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {QUESTION_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              onSelect(type.value)
              onClose()
            }}
            className={cn(
              'type-item opacity-0 flex flex-col items-center gap-2 p-4 rounded-xl',
              'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700',
              'hover:bg-[#0077b6]/10 dark:hover:bg-[#0077b6]/20 hover:border-[#0077b6]/50',
              'transition-all duration-200 group'
            )}
          >
            <Icon
              icon={type.icon}
              className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-[#0077b6] dark:group-hover:text-[#00b4d8] transition-colors"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-[#0077b6] dark:group-hover:text-[#00b4d8]">
              {type.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{type.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// 主模态框组件
// ============================================

export function SurveyEditModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialData = null,
  mode = 'create',
}: SurveyEditModalProps) {
  // 问卷基本信息
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isRandom, setIsRandom] = useState(false)
  const [randomCount, setRandomCount] = useState<number | undefined>(undefined)

  // 题目列表
  const [questions, setQuestions] = useState<LocalQuestion[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showTypeSelector, setShowTypeSelector] = useState(false)

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isClosingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  // 初始化编辑数据
  useEffect(() => {
    if (open && initialData && mode === 'edit' && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      setTitle(initialData.title)
      setDescription(initialData.description || '')
      setIsRandom(initialData.is_random)
      setRandomCount(initialData.random_count ?? undefined)
      
      // 转换已有问题为本地格式
      const localQuestions: LocalQuestion[] = initialData.questions
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          _id: `existing_${q.id}`,
          title: q.title,
          description: q.description ?? undefined,
          type: q.type,
          options: q.options ?? undefined,
          is_required: q.is_required,
          is_pinned: q.is_pinned ?? false,
          order: q.order,
          validation: q.validation ?? undefined,
          condition: q.condition ?? undefined,
        }))
      setQuestions(localQuestions)
    }
  }, [open, initialData, mode])

  // 重置初始化标记
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false
    }
  }, [open])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 计算保留题目数量
  const pinnedCount = useMemo(() => {
    return questions.filter((q) => q.is_pinned).length
  }, [questions])

  // 表单验证
  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (questions.length === 0) return false
    if (questions.some((q) => !q.title.trim())) return false
    if (isRandom && (!randomCount || randomCount > questions.length)) return false
    // 保留题目数量不能超过随机抽题数量
    if (isRandom && randomCount && pinnedCount > randomCount) return false
    return true
  }, [title, questions, isRandom, randomCount, pinnedCount])

  // 入场动画
  useEffect(() => {
    if (open && overlayRef.current && modalRef.current) {
      isClosingRef.current = false

      // 遮罩层淡入
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutCubic',
      })

      // 模态框缩放+淡入
      animate(modalRef.current, {
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 400,
        easing: 'easeOutBack',
      })

      // 内容区域滑入
      setTimeout(() => {
        if (contentRef.current) {
          const items = contentRef.current.querySelectorAll('.animate-item')
          animate(items, {
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 400,
            delay: stagger(60),
            ease: 'out(3)',
          })
        }
      }, 200)
    }
  }, [open])

  // 关闭动画
  const handleClose = useCallback(() => {
    if (isClosingRef.current || loading) return
    isClosingRef.current = true

    if (overlayRef.current && modalRef.current) {
      animate(overlayRef.current, {
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInCubic',
      })

      animate(modalRef.current, {
        opacity: [1, 0],
        scale: [1, 0.95],
        duration: 250,
        easing: 'easeInCubic',
        onComplete: () => {
          // 重置状态
          setTitle('')
          setDescription('')
          setIsRandom(false)
          setRandomCount(undefined)
          setQuestions([])
          setExpandedIds(new Set())
          setShowTypeSelector(false)
          onClose()
        },
      })
    } else {
      onClose()
    }
  }, [onClose, loading])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose, loading])

  // 阻止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // 添加题目
  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: LocalQuestion = {
      _id: generateId(),
      title: '',
      type,
      is_required: true,
      is_pinned: false,
      order: questions.length,
      options: ['single', 'multiple'].includes(type)
        ? [{ value: 'A', label: '选项A' }, { value: 'B', label: '选项B' }]
        : undefined,
      validation: type === 'text'
        ? { min_length: 1, max_length: 500 }
        : type === 'image'
        ? { max_images: 3 }
        : undefined,
    }
    setQuestions((prev) => [...prev, newQuestion])
    setExpandedIds((prev) => new Set([...prev, newQuestion._id]))

    // 添加动画
    setTimeout(() => {
      if (contentRef.current) {
        const cards = contentRef.current.querySelectorAll('.question-card')
        const lastCard = cards[cards.length - 1]
        if (lastCard) {
          animate(lastCard, {
            opacity: [0, 1],
            translateY: [30, 0],
            scale: [0.98, 1],
            duration: 400,
            easing: 'easeOutBack',
          })
        }
      }
    }, 50)
  }, [questions.length])

  // 更新题目
  const updateQuestion = useCallback((updated: LocalQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q._id === updated._id ? updated : q))
    )
  }, [])

  // 删除题目
  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q._id !== id))
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // 复制题目
  const duplicateQuestion = useCallback((question: LocalQuestion) => {
    const duplicated: LocalQuestion = {
      ...question,
      _id: generateId(),
      title: `${question.title} (副本)`,
      order: questions.length,
    }
    setQuestions((prev) => [...prev, duplicated])
    setExpandedIds((prev) => new Set([...prev, duplicated._id]))
  }, [questions.length])

  // 切换展开
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestions((prev) => {
        const oldIndex = prev.findIndex((q) => q._id === active.id)
        const newIndex = prev.findIndex((q) => q._id === over.id)
        return arrayMove(prev, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }))
      })
    }
  }, [])

  // 提交
  const handleSubmit = useCallback(async () => {
    if (!isValid) return

    // DEBUG: 打印每个问题的 is_pinned 状态
    console.log('[DEBUG] questions before submit:', questions.map(q => ({ title: q.title, is_pinned: q.is_pinned })))

    const surveyData: CreateSurveyRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      is_random: isRandom,
      random_count: isRandom ? randomCount : undefined,
      questions: questions.map((q, index) => ({
        title: q.title.trim(),
        description: q.description,
        type: q.type,
        options: q.options,
        is_required: q.is_required ?? true,
        is_pinned: q.is_pinned ?? false,
        order: index,
        validation: q.validation,
        condition: q.condition,
      })),
    }

    console.log('[DEBUG] surveyData.questions:', surveyData.questions?.map(q => ({ title: q.title, is_pinned: q.is_pinned })))

    await onSubmit(surveyData)
  }, [isValid, title, description, isRandom, randomCount, questions, onSubmit])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* 透明毛玻璃遮罩 */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-xl backdrop-saturate-150"
        onClick={handleClose}
      />

      {/* 模态框容器 - 80% 视口 */}
      <div
        ref={modalRef}
        className={cn(
          'relative flex flex-col',
          'w-[90vw] max-w-5xl h-[85vh]',
          'bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl backdrop-saturate-200',
          'rounded-3xl shadow-2xl shadow-black/20',
          'border border-white/30 dark:border-gray-700/30',
          'overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-linear-to-br from-[#0077b6]/10 to-[#00b4d8]/10 dark:from-[#0077b6]/20 dark:to-[#00b4d8]/20">
              <Icon
                icon="ph:clipboard-text-fill"
                className="w-6 h-6 text-[#0077b6] dark:text-[#00b4d8]"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {mode === 'edit' ? '编辑问卷' : '创建新问卷'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {mode === 'edit' ? '修改问卷内容和题目设置' : '设计问卷并添加题目，完成后一键保存'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={loading}
            className={cn(
              'p-2.5 rounded-xl',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-100/80 dark:hover:bg-gray-700/50',
              'transition-all duration-200',
              'disabled:opacity-50'
            )}
          >
            <Icon icon="ph:x-bold" className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6"
        >
          {/* 基本信息卡片 */}
          <div className="animate-item opacity-0 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Icon icon="ph:info" className="w-4 h-4" />
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 问卷标题 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  问卷标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入问卷标题"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-white dark:bg-gray-800/50',
                    'border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50 focus:border-transparent',
                    'transition-all duration-300'
                  )}
                />
              </div>

              {/* 问卷描述 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  问卷描述 <span className="text-gray-400 text-xs">(可选)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入问卷描述"
                  rows={2}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl resize-none',
                    'bg-white dark:bg-gray-800/50',
                    'border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white placeholder-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50 focus:border-transparent',
                    'transition-all duration-300'
                  )}
                />
              </div>

              {/* 随机抽题 */}
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-all duration-300',
                      isRandom
                        ? 'bg-[#0077b6]'
                        : 'bg-gray-300 dark:bg-gray-600'
                    )}
                    onClick={() => setIsRandom(!isRandom)}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300',
                        isRandom ? 'left-6' : 'left-1'
                      )}
                    />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">启用随机抽题</span>
                </label>

                {isRandom && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-sm text-gray-500">抽取</span>
                    <input
                      type="number"
                      min={1}
                      max={questions.length || 99}
                      value={randomCount ?? ''}
                      onChange={(e) => setRandomCount(e.target.value ? parseInt(e.target.value) : undefined)}
                      className={cn(
                        'w-20 px-3 py-1.5 rounded-lg text-center',
                        'bg-white dark:bg-gray-800/50',
                        'border border-gray-200 dark:border-gray-700',
                        'text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-[#0077b6]/50'
                      )}
                    />
                    <span className="text-sm text-gray-500">/ {questions.length} 题</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 题目列表 */}
          <div className="animate-item opacity-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Icon icon="ph:list-numbers" className="w-4 h-4" />
                题目列表
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">
                  {questions.length} 题
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedIds(new Set(questions.map((q) => q._id)))}
                  className="text-xs text-gray-500 hover:text-[#0077b6] transition-colors"
                >
                  全部展开
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={() => setExpandedIds(new Set())}
                  className="text-xs text-gray-500 hover:text-[#0077b6] transition-colors"
                >
                  全部收起
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Icon icon="ph:clipboard-text" className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">暂无题目</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">点击下方按钮添加第一道题</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <SortableQuestionCard
                        key={question._id}
                        question={question}
                        index={index}
                        isExpanded={expandedIds.has(question._id)}
                        onToggleExpand={() => toggleExpand(question._id)}
                        onUpdate={updateQuestion}
                        onDelete={() => deleteQuestion(question._id)}
                        onDuplicate={() => duplicateQuestion(question)}
                        allQuestions={questions}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* 添加题目按钮 */}
            <div className="relative mt-4">
              {showTypeSelector && (
                <QuestionTypeSelector
                  onSelect={addQuestion}
                  onClose={() => setShowTypeSelector(false)}
                />
              )}
              <button
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-4 rounded-xl',
                  'border-2 border-dashed transition-all duration-300',
                  showTypeSelector
                    ? 'border-[#0077b6] bg-[#0077b6]/5 text-[#0077b6]'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-[#0077b6] hover:text-[#0077b6] hover:bg-[#0077b6]/5'
                )}
              >
                <Icon icon={showTypeSelector ? 'ph:x' : 'ph:plus'} className="w-5 h-5" />
                <span className="font-medium">{showTypeSelector ? '取消' : '添加题目'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Icon icon="ph:info" className="w-4 h-4" />
            <span>
              {!title.trim()
                ? '请填写问卷标题'
                : questions.length === 0
                ? '请至少添加一道题目'
                : questions.some((q) => !q.title.trim())
                ? '请完善所有题目的标题'
                : isRandom && (!randomCount || randomCount > questions.length)
                ? '请设置有效的随机抽题数量'
                : isRandom && randomCount && pinnedCount > randomCount
                ? `保留题目(${pinnedCount})不能超过抽题数量(${randomCount})`
                : isRandom && pinnedCount > 0
                ? `共 ${questions.length} 道题目（${pinnedCount} 题保留），准备就绪`
                : `共 ${questions.length} 道题目，准备就绪`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className={cn(
                'px-5 py-2.5 rounded-xl font-medium',
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                'transition-all duration-200',
                'disabled:opacity-50'
              )}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium',
                'bg-linear-to-r from-[#0077b6] to-[#00b4d8]',
                'text-white shadow-lg shadow-[#0077b6]/30',
                'transition-all duration-300',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                'enabled:hover:shadow-xl enabled:hover:scale-[1.02]'
              )}
            >
              {loading ? (
                <>
                  <Icon icon="ph:spinner" className="w-5 h-5 animate-spin" />
                  {mode === 'edit' ? '保存中...' : '创建中...'}
                </>
              ) : (
                <>
                  <Icon icon="ph:check-bold" className="w-5 h-5" />
                  {mode === 'edit' ? '保存修改' : '创建问卷'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

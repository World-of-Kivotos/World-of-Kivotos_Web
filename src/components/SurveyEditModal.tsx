import { useState, useCallback, useMemo } from 'react'
import {
  CircleDot,
  SquareCheck,
  ToggleLeft,
  Type,
  Image as ImageIcon,
  GripVertical,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Check,
  Pin,
  GitBranch,
  AlertTriangle,
  Info,
  Loader2,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useSurveyDetail, useSaveSurveyWithQuestions } from '@/hooks/useSurvey'
import type {
  QuestionType,
  QuestionOption,
  QuestionValidation,
  CreateQuestionRequest,
  SurveyDetail,
  SurveyCategory,
} from '@/types/survey'

// ============================================
// 类型定义
// ============================================

interface SurveyEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 编辑模式传入问卷 ID；新建模式传 null */
  surveyId: number | null
  /** 新建时把问卷归入的栏目 (whitelist / collection)，编辑模式忽略 */
  defaultCategory?: SurveyCategory
}

// 编辑器内条件用目标题的本地 _id 引用(拖拽/重排都不失效); 保存时两段式解析为服务端 question_id
interface LocalCondition {
  depends_on: string // 目标依赖题的本地 _id
  show_when: string | string[]
}

interface LocalQuestion extends Omit<CreateQuestionRequest, 'order' | 'condition'> {
  _id: string // 本地临时 ID
  order: number
  condition?: LocalCondition // 条件显示配置 (depends_on = 目标题本地 _id)
}

// 题目类型配置（图标全部迁移到 lucide-react）
const QUESTION_TYPES: {
  value: QuestionType
  label: string
  icon: LucideIcon
  description: string
}[] = [
  { value: 'single', label: '单选题', icon: CircleDot, description: '选择一个答案' },
  { value: 'multiple', label: '多选题', icon: SquareCheck, description: '选择多个答案' },
  { value: 'boolean', label: '判断题', icon: ToggleLeft, description: '是/否判断' },
  { value: 'text', label: '文本题', icon: Type, description: '填写文字内容' },
  { value: 'image', label: '图片题', icon: ImageIcon, description: '上传图片' },
]

// 生成唯一 ID
const generateId = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ============================================
// 选项编辑器（单选 / 多选）
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
      <Label className="mb-2 block">选项列表</Label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="secondary" className="w-7 justify-center font-bold">
              {option.value}
            </Badge>
            <Input
              value={option.label}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`选项${option.value}内容`}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(index)}
              disabled={options.length <= 1}
              className="text-muted-foreground hover:text-destructive"
              title="删除选项"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addOption}
        disabled={options.length >= 10}
        className="mt-3 border-dashed"
      >
        <Plus />
        添加选项
      </Button>
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
      <Label className="mb-2 block">文本限制</Label>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">最少</span>
          <Input
            type="number"
            min={0}
            value={validation.min_length ?? ''}
            onChange={(e) =>
              onChange({ ...validation, min_length: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-20 text-center"
          />
          <span className="text-sm text-muted-foreground">字</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">最多</span>
          <Input
            type="number"
            min={1}
            value={validation.max_length ?? ''}
            onChange={(e) =>
              onChange({ ...validation, max_length: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-20 text-center"
          />
          <span className="text-sm text-muted-foreground">字</span>
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
      <Label className="mb-2 block">图片限制</Label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">最多上传</span>
        <Input
          type="number"
          min={1}
          max={9}
          value={validation.max_images ?? 3}
          onChange={(e) => onChange({ ...validation, max_images: parseInt(e.target.value) || 3 })}
          className="w-16 text-center"
        />
        <span className="text-sm text-muted-foreground">张图片</span>
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
  onChange: (condition: LocalCondition | undefined) => void
}

function ConditionEditor({ question, allQuestions, currentIndex, onChange }: ConditionEditorProps) {
  // 只显示当前题目之前且可作条件的题目（单选 / 多选 / 判断）
  const availableQuestions = allQuestions.filter((q, idx) => {
    if (idx >= currentIndex) return false
    if (!['single', 'multiple', 'boolean'].includes(q.type)) return false
    if (['single', 'multiple'].includes(q.type)) {
      return q.options && q.options.length > 0
    }
    return true // 判断题默认有是 / 否选项
  })

  const hasCondition = !!question.condition
  const selectedQuestion = question.condition
    ? allQuestions.find((q) => q._id === question.condition!.depends_on)
    : null

  // 获取选中题目的可选答案值
  const getAvailableOptions = (): QuestionOption[] => {
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

  const handleToggleCondition = (checked: boolean) => {
    if (!checked) {
      onChange(undefined)
    } else if (availableQuestions.length > 0) {
      // 默认依赖第一个可用题目（depends_on 存的是目标题的本地 _id）
      onChange({ depends_on: availableQuestions[0]._id, show_when: '' })
    }
  }

  const handleQuestionChange = (targetLocalId: string) => {
    onChange({ depends_on: targetLocalId, show_when: '' })
  }

  const handleValueToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]

    onChange({
      depends_on: question.condition!.depends_on,
      show_when: newValues.length === 1 ? newValues[0] : newValues,
    })
  }

  // 第一题不能设置条件
  if (currentIndex === 0) {
    return null
  }

  // 没有可用的前置题目时显示提示
  if (availableQuestions.length === 0) {
    const hasQuestionWithoutOptions = allQuestions.some((q, idx) => {
      if (idx >= currentIndex) return false
      if (!['single', 'multiple', 'boolean'].includes(q.type)) return false
      if (['single', 'multiple'].includes(q.type)) {
        return !q.options || q.options.length === 0
      }
      return false
    })

    return (
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="size-4" />
          <span>
            条件显示：
            {hasQuestionWithoutOptions
              ? '前面的单选 / 多选题需要先添加选项'
              : '前面没有可作为条件的题目（需要单选 / 多选 / 判断题）'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {/* 启用条件显示开关 */}
      <div className="flex flex-wrap items-center gap-2">
        <Switch checked={hasCondition} onCheckedChange={handleToggleCondition} id={`cond-${question._id}`} />
        <Label htmlFor={`cond-${question._id}`} className="flex cursor-pointer items-center gap-1.5">
          <GitBranch className={cn('size-4', hasCondition ? 'text-foreground' : 'text-muted-foreground')} />
          条件显示
        </Label>
        <span className="text-xs text-muted-foreground">（根据前面题目的答案决定是否显示此题）</span>
      </div>

      {/* 条件配置 */}
      {hasCondition && (
        <div className="animate-in slide-in-from-top-2 space-y-3 pl-4 duration-200">
          {/* 选择依赖题目 */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">当</span>
            <Select
              value={question.condition?.depends_on ?? undefined}
              onValueChange={(v) => handleQuestionChange(v)}
            >
              <SelectTrigger className="w-auto min-w-56">
                <SelectValue placeholder="选择依赖题目" />
              </SelectTrigger>
              <SelectContent>
                {availableQuestions.map((q) => {
                  const realIndex = allQuestions.findIndex((aq) => aq._id === q._id)
                  return (
                    <SelectItem key={q._id} value={q._id}>
                      第{realIndex + 1}题: {q.title.slice(0, 20)}
                      {q.title.length > 20 ? '...' : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">的答案为以下值时显示：</span>
          </div>

          {/* 选择触发值 */}
          {availableOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleValueToggle(option.value)}
                  >
                    {isSelected && <Check />}
                    {option.label}
                  </Button>
                )
              })}
            </div>
          )}

          {/* 提示 */}
          {selectedValues.length === 0 && (
            <p className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="size-3.5" />
              请至少选择一个触发值
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// 可排序题目卡片
// ============================================

interface SortableQuestionCardProps {
  question: LocalQuestion
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (question: LocalQuestion) => void
  onDelete: () => void
  onDuplicate: () => void
  allQuestions: LocalQuestion[]
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question._id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const typeConfig = QUESTION_TYPES.find((t) => t.value === question.type)
  const TypeIcon = typeConfig?.icon ?? Type

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden transition-all duration-200',
        isDragging ? 'shadow-lg ring-1 ring-ring' : 'hover:border-ring/40'
      )}
    >
      {/* 卡片头部 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 拖拽手柄 */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
          title="拖拽排序"
        >
          <GripVertical className="size-4" />
        </button>

        {/* 题号 */}
        <Badge variant="secondary" className="size-6 justify-center rounded-full p-0 font-bold">
          {index + 1}
        </Badge>

        {/* 题目类型 */}
        <Badge variant="outline" className="gap-1.5">
          <TypeIcon className="size-3.5" />
          {typeConfig?.label}
        </Badge>

        {/* 题目标题预览 */}
        <div className="flex-1 truncate text-sm text-foreground">
          {question.title || <span className="italic text-muted-foreground">未设置标题</span>}
        </div>

        {/* 保留标识 */}
        {question.is_pinned && (
          <Badge variant="warning" className="gap-1">
            <Pin className="size-3" />
            保留
          </Badge>
        )}

        {/* 条件显示标识 */}
        {question.condition && (
          <Badge variant="secondary" className="gap-1">
            <GitBranch className="size-3" />
            条件
          </Badge>
        )}

        {/* 必填标识 */}
        {question.is_required && (
          <Badge variant="destructive" className="px-1.5">
            必填
          </Badge>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} title="复制题目">
            <Copy />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
            title="删除题目"
          >
            <Trash2 />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onToggleExpand} title={isExpanded ? '收起' : '展开'}>
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </div>

      {/* 展开的编辑区域 */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 overflow-hidden duration-200">
          <div className="space-y-4 border-t border-border p-4">
            {/* 题目标题 */}
            <div>
              <Label className="mb-2 block">
                题目标题 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={question.title}
                onChange={(e) => onUpdate({ ...question, title: e.target.value })}
                placeholder="请输入题目标题"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* 题目说明 */}
            <div>
              <Label className="mb-2 block">
                题目说明 <span className="text-xs text-muted-foreground">(可选)</span>
              </Label>
              <Input
                value={question.description || ''}
                onChange={(e) => onUpdate({ ...question, description: e.target.value || undefined })}
                placeholder="为题目添加额外说明"
              />
            </div>

            {/* 题目类型 */}
            <div>
              <Label className="mb-2 block">题目类型</Label>
              <div className="grid grid-cols-5 gap-2">
                {QUESTION_TYPES.map((type) => {
                  const Icon = type.icon
                  const selected = question.type === type.value
                  return (
                    <Button
                      key={type.value}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      onClick={() =>
                        onUpdate({
                          ...question,
                          type: type.value,
                          options: ['single', 'multiple'].includes(type.value)
                            ? question.options?.length
                              ? question.options
                              : [{ value: 'A', label: '选项A' }]
                            : undefined,
                          validation:
                            type.value === 'text'
                              ? { min_length: 1, max_length: 500 }
                              : type.value === 'image'
                                ? { max_images: 3 }
                                : undefined,
                        })
                      }
                      className="h-auto flex-col gap-1.5 py-3"
                    >
                      <Icon className="size-5" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* 选项编辑器 - 单选 / 多选 */}
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

            {/* 必填 / 保留设置 */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id={`req-${question._id}`}
                  checked={question.is_required ?? true}
                  onCheckedChange={(checked) => onUpdate({ ...question, is_required: checked })}
                />
                <Label htmlFor={`req-${question._id}`} className="cursor-pointer">
                  必填题目
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id={`pin-${question._id}`}
                  checked={question.is_pinned ?? false}
                  onCheckedChange={(checked) => onUpdate({ ...question, is_pinned: checked })}
                  className="data-[state=checked]:bg-warning"
                />
                <Label htmlFor={`pin-${question._id}`} className="flex cursor-pointer items-center gap-1">
                  <Pin className={cn('size-3.5', question.is_pinned ? 'text-warning' : 'text-muted-foreground')} />
                  保留题目
                </Label>
              </div>

              {/* 语义标记: 把本题标记为玩家名/QQ, 提交时后端抽取到结构化字段 (建议用文本题) */}
              <div className="flex items-center gap-2">
                <Label htmlFor={`role-${question._id}`} className="cursor-pointer">绑定字段</Label>
                <select
                  id={`role-${question._id}`}
                  value={question.role ?? ''}
                  onChange={(e) => onUpdate({ ...question, role: (e.target.value || undefined) as LocalQuestion['role'] })}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">无</option>
                  <option value="player_name">玩家名</option>
                  <option value="qq">QQ</option>
                </select>
              </div>
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
    </Card>
  )
}

// ============================================
// 主模态框组件
// ============================================

export function SurveyEditModal({ open, onOpenChange, surveyId, defaultCategory }: SurveyEditModalProps) {
  const mode: 'create' | 'edit' = surveyId != null ? 'edit' : 'create'

  // 编辑模式拉取详情；新建模式 enabled=false（surveyId 传 0）
  const detailQuery = useSurveyDetail(surveyId ?? 0)
  const initialData: SurveyDetail | null = mode === 'edit' ? detailQuery.data ?? null : null

  const saveMutation = useSaveSurveyWithQuestions()
  const loading = saveMutation.isPending

  // 问卷基本信息
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isRandom, setIsRandom] = useState(false)
  const [randomCount, setRandomCount] = useState<number | undefined>(undefined)

  // 题目列表
  const [questions, setQuestions] = useState<LocalQuestion[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // 本次会话身份: 关闭=closed; 新建=create; 编辑=edit-<id>-<是否已加载到详情>。
  // 身份变化时在渲染期同步重置/灌入草稿, 避免在 effect 内 setState 引发级联渲染
  // (React 官方推荐的 "渲染期根据 prop 调整 state" 模式)。
  const sessionKey = !open
    ? 'closed'
    : mode === 'edit'
      ? `edit-${surveyId}-${initialData ? 'ready' : 'pending'}`
      : 'create'
  const [seededKey, setSeededKey] = useState(sessionKey)

  if (seededKey !== sessionKey) {
    setSeededKey(sessionKey)
    if (open && mode === 'edit' && initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description || '')
      setIsRandom(initialData.is_random)
      setRandomCount(initialData.random_count ?? undefined)
      setQuestions(
        initialData.questions
          .slice()
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
            // 服务端 condition.depends_on 是 question_id; 现有题本地 _id = existing_<id>
            condition: q.condition
              ? { depends_on: `existing_${q.condition.depends_on}`, show_when: q.condition.show_when }
              : undefined,
            role: q.role ?? undefined,
          }))
      )
      setExpandedIds(new Set())
    } else {
      // 新建模式打开, 或关闭后复位
      setTitle('')
      setDescription('')
      setIsRandom(false)
      setRandomCount(undefined)
      setQuestions([])
      setExpandedIds(new Set())
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 保留题目数量
  const pinnedCount = useMemo(() => questions.filter((q) => q.is_pinned).length, [questions])

  // 表单验证
  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (questions.length === 0) return false
    if (questions.some((q) => !q.title.trim())) return false
    if (isRandom && (!randomCount || randomCount > questions.length)) return false
    if (isRandom && randomCount && pinnedCount > randomCount) return false
    return true
  }, [title, questions, isRandom, randomCount, pinnedCount])

  // 添加题目
  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: LocalQuestion = {
      _id: generateId(),
      title: '',
      type,
      is_required: true,
      is_pinned: false,
      order: 0, // 占位，setQuestions 时按数组位置重排
      options: ['single', 'multiple'].includes(type)
        ? [
            { value: 'A', label: '选项A' },
            { value: 'B', label: '选项B' },
          ]
        : undefined,
      validation:
        type === 'text' ? { min_length: 1, max_length: 500 } : type === 'image' ? { max_images: 3 } : undefined,
    }
    setQuestions((prev) => [...prev, { ...newQuestion, order: prev.length }])
    setExpandedIds((prev) => new Set([...prev, newQuestion._id]))
  }, [])

  // 更新题目
  const updateQuestion = useCallback((updated: LocalQuestion) => {
    setQuestions((prev) => prev.map((q) => (q._id === updated._id ? updated : q)))
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
    const newId = generateId()
    setQuestions((prev) => [
      ...prev,
      { ...question, _id: newId, title: `${question.title} (副本)`, order: prev.length },
    ])
    setExpandedIds((prev) => new Set([...prev, newId]))
  }, [])

  // 切换展开
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  // 提交: 增量保存 (新建时 surveyId=null)。题目增删改与条件的 本地_id->question_id
  // 解析都在 useSaveSurveyWithQuestions 内两段式完成, 这里只把编辑器状态原样交给它。
  const handleSubmit = useCallback(async () => {
    if (!isValid) return
    await saveMutation.mutateAsync({
      surveyId: surveyId ?? null,
      base: {
        title: title.trim(),
        description: description.trim() || undefined,
        is_random: isRandom,
        random_count: isRandom ? randomCount : undefined,
        // 仅新建时指定栏目; 编辑时不传, 避免改动已有归属
        category: surveyId == null ? defaultCategory : undefined,
      },
      questions,
    })
    onOpenChange(false)
  }, [isValid, title, description, isRandom, randomCount, questions, surveyId, defaultCategory, saveMutation, onOpenChange])

  const isDetailLoading = mode === 'edit' && detailQuery.isLoading

  const statusMessage = !title.trim()
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
              : `共 ${questions.length} 道题目，准备就绪`

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onOpenChange(false)}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {/* 头部 */}
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <ClipboardList className="size-6 text-muted-foreground" />
            {mode === 'edit' ? '编辑问卷' : '创建新问卷'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? '修改问卷内容和题目设置' : '设计问卷并添加题目，完成后一键保存'}
          </DialogDescription>
        </DialogHeader>

        {/* 内容区域 */}
        <div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin px-6 py-4">
          {isDetailLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载问卷详情中…
            </div>
          ) : (
            <>
              {/* 基本信息卡片 */}
              <Card>
                <CardContent className="space-y-4 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Info className="size-4" />
                    基本信息
                  </h3>

                  <div>
                    <Label htmlFor="survey-title" className="mb-2 block">
                      问卷标题 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="survey-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="请输入问卷标题"
                    />
                  </div>

                  <div>
                    <Label htmlFor="survey-desc" className="mb-2 block">
                      问卷描述 <span className="text-xs text-muted-foreground">(可选)</span>
                    </Label>
                    <Textarea
                      id="survey-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="请输入问卷描述"
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch id="survey-random" checked={isRandom} onCheckedChange={setIsRandom} />
                      <Label htmlFor="survey-random" className="cursor-pointer">
                        启用随机抽题
                      </Label>
                    </div>

                    {isRandom && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">抽取</span>
                        <Input
                          type="number"
                          min={1}
                          max={questions.length || 99}
                          value={randomCount ?? ''}
                          onChange={(e) => setRandomCount(e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground">/ {questions.length} 题</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 题目列表 */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    题目列表
                    <Badge variant="secondary">{questions.length} 题</Badge>
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setExpandedIds(new Set(questions.map((q) => q._id)))}
                    >
                      全部展开
                    </Button>
                    <span className="text-border">|</span>
                    <Button type="button" variant="link" size="sm" onClick={() => setExpandedIds(new Set())}>
                      全部收起
                    </Button>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                      <ClipboardList className="size-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">暂无题目</p>
                    <p className="mt-1 text-sm text-muted-foreground">点击下方按钮添加第一道题</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={questions.map((q) => q._id)} strategy={verticalListSortingStrategy}>
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

                {/* 添加题目 - 五种题型横排，免新增 dropdown wrapper */}
                <div className="mt-4 rounded-xl border-2 border-dashed border-border p-3">
                  <p className="mb-2 text-center text-xs text-muted-foreground">添加题目</p>
                  <div className="grid grid-cols-5 gap-2">
                    {QUESTION_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant="outline"
                          onClick={() => addQuestion(type.value)}
                          className="h-auto flex-col gap-1.5 py-3"
                          title={type.description}
                        >
                          <Icon className="size-5" />
                          <span className="text-xs font-medium">{type.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部操作栏 */}
        <DialogFooter className="shrink-0 items-center justify-between border-t border-border bg-card/50 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="size-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!isValid || loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {mode === 'edit' ? '保存中...' : '创建中...'}
                </>
              ) : (
                <>
                  <Check />
                  {mode === 'edit' ? '保存修改' : '创建问卷'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

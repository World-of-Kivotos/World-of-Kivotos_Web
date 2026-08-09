import { useState, useCallback, useMemo } from 'react'
import {
  CircleDot,
  ChevronsUpDown,
  SquareCheck,
  ToggleLeft,
  Type,
  TextCursorInput,
  Heading,
  Hash,
  Calendar,
  Star,
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
  Send,
  Clock,
  KeyRound,
  Palette,
  LayoutTemplate,
  CalendarCheck,
  MessageSquareHeart,
  Vote,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useSurveyDetail, useSaveSurveyWithQuestions } from '@/hooks/useSurvey'
import type { SaveCondition, SaveConditionRule, SaveSurveyBase } from '@/hooks/useSurvey'
import type {
  QuestionType,
  QuestionOption,
  QuestionValidation,
  QuestionCondition,
  ConditionOperator,
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

/**
 * 编辑器里的一道题。
 * condition 直接复用保存层的 SaveCondition，差别只在 rules[].question_id 存的是目标题的
 * 本地 _id(新题此刻还没有服务端 id)，保存时由 useSaveSurveyWithQuestions 两段式解析回 question_id。
 */
interface LocalQuestion extends Omit<CreateQuestionRequest, 'order' | 'condition'> {
  _id: string // 本地临时 ID
  order: number
  condition?: SaveCondition
}

/**
 * 「设置」tab 的全部字段。
 * 数字与时间一律用字符串存: 输入框存在"清空重填""只敲了一个负号"这类中间态，
 * 用 number 存就得往 state 里塞 NaN，保存时再统一归一化成后端要的形态。
 */
interface SurveySettingsState {
  status: string
  visibility: string
  startsAt: string
  endsAt: string
  maxSubmissions: string
  maxSubmissionsPerIp: string
  closedMessage: string
  reviewRequired: boolean
  actionAddWhitelist: boolean
  actionIssueCode: boolean
  actionNotifyGroup: boolean
  actionWebhook: boolean
  webhookUrl: string
  icon: string
  themeColor: string
  summary: string
  estimatedMinutes: string
  coverUrl: string
  requireConsent: boolean
  privacyNotice: string
  successMessage: string
  /** 明文口令; 空串表示"不修改" */
  accessPassword: string
  /** 保存时把口令清空 (提交 access_password: '') */
  clearAccessPassword: boolean
}

// ============================================
// 常量表
// ============================================

// 题目类型配置（图标全部迁移到 lucide-react）
const QUESTION_TYPES: {
  value: QuestionType
  label: string
  icon: LucideIcon
  description: string
}[] = [
  { value: 'single', label: '单选题', icon: CircleDot, description: '选择一个答案' },
  { value: 'select', label: '下拉单选', icon: ChevronsUpDown, description: '选项多时用下拉框收纳' },
  { value: 'multiple', label: '多选题', icon: SquareCheck, description: '选择多个答案' },
  { value: 'boolean', label: '判断题', icon: ToggleLeft, description: '是 / 否判断' },
  { value: 'text', label: '多行文本', icon: Type, description: '填写成段文字' },
  { value: 'short_text', label: '单行文本', icon: TextCursorInput, description: '填写一行短文本' },
  { value: 'number', label: '数字题', icon: Hash, description: '填写数字' },
  { value: 'date', label: '日期题', icon: Calendar, description: '选择一个日期' },
  { value: 'rating', label: '评分题', icon: Star, description: '按星级打分' },
  { value: 'image', label: '图片题', icon: ImageIcon, description: '上传图片' },
  { value: 'section', label: '分节说明', icon: Heading, description: '只显示标题与说明, 不收答案' },
]

// 必须配选项的题型 (与后端 question_types.needs_options 对齐)
const OPTION_TYPES: QuestionType[] = ['single', 'select', 'multiple']

// 可绑定系统字段的题型，与后端 surveys.py::_ROLE_EXTRACTABLE_TYPES 一致:
// 后端只从答案的 text/value 键取字符串标量，多选(values)/图片(images)/判断(布尔)/数字
// 绑了必然抽不出值，玩家会在提交最后一步吃 400。
const ROLE_BINDABLE_TYPES: QuestionType[] = ['single', 'select', 'text', 'short_text']

const ROLE_LABELS: Record<'player_name' | 'qq', string> = {
  player_name: '玩家名',
  qq: 'QQ',
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: '等于',
  neq: '不等于',
  in: '是其中之一',
  not_in: '不是其中之一',
  contains: '包含',
  gt: '大于',
  lt: '小于',
  answered: '已作答',
  not_answered: '未作答',
}

/**
 * 每种依赖题题型允许的运算符。
 *
 * 按题型收窄是为了挡住"配得出来但后端永远判 false"的组合: gt/lt 要求两边都能转 float，
 * 配在文本题和日期题上恒不成立; contains 是子串匹配，对选项题没有意义。
 * image 不能作条件依赖(后端 condition_source=False)，故为空数组。
 */
const OPERATORS_BY_TYPE: Record<QuestionType, ConditionOperator[]> = {
  single: ['eq', 'neq', 'in', 'not_in', 'answered', 'not_answered'],
  select: ['eq', 'neq', 'in', 'not_in', 'answered', 'not_answered'],
  multiple: ['in', 'not_in', 'eq', 'neq', 'answered', 'not_answered'],
  boolean: ['eq', 'neq', 'answered', 'not_answered'],
  text: ['contains', 'eq', 'neq', 'answered', 'not_answered'],
  short_text: ['contains', 'eq', 'neq', 'answered', 'not_answered'],
  number: ['gt', 'lt', 'eq', 'neq', 'answered', 'not_answered'],
  date: ['eq', 'neq', 'answered', 'not_answered'],
  rating: ['gt', 'lt', 'eq', 'neq', 'answered', 'not_answered'],
  image: [],
  // 分节说明块没有答案可比, 不能当条件依赖题 (候选表按运算符非空过滤, 空数组即排除)
  section: [],
}

// 只判"答没答"的运算符，不需要填比较值
const VALUELESS_OPERATORS: ConditionOperator[] = ['answered', 'not_answered']
// 比较值是数组的运算符
const MULTI_VALUE_OPERATORS: ConditionOperator[] = ['in', 'not_in']

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
]

const VISIBILITY_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'public', label: '公开', hint: '出现在玩家端的问卷列表里' },
  { value: 'unlisted', label: '仅链接', hint: '不进列表，拿到链接的人仍能填' },
  { value: 'private', label: '私有', hint: '不进列表，仅作内部标记（后端当前不拦直链）' },
]

// ============================================
// 纯函数工具
// ============================================

// 生成唯一 ID
const generateId = () => `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

/**
 * ISO 字符串 -> <input type="datetime-local"> 的值。
 *
 * 后端把 starts_at/ends_at 按 naive UTC 存，isoformat 出来的串不带时区标记，
 * 而 JS 的 Date 会把不带时区的串当"本地时间"解析 —— 直接塞进输入框等于把 UTC 当本地时间显示，
 * 保存时再原样回传，每存一次就整体偏移一个时区。故读的时候补 Z 强制按 UTC 解析再取本地字段。
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`
  const parsed = new Date(zoned)
  if (Number.isNaN(parsed.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

/**
 * <input type="datetime-local"> 的值 -> UTC ISO 字符串。
 * 管理员敲的是本地时间，后端比较窗口用的是 UTC，不转就等于把时区差直接写进开放窗口。
 */
function localInputToIso(local: string): string | null {
  if (!local) return null
  // 不带时区标记的串按本地时区解析，这正是 datetime-local 的语义
  const parsed = new Date(local)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

// 空串 = 不限/不设，统一落 null。后端这几列都是 ge=1，0 与负数会被 422 打回
function toPositiveInt(raw: string): number | null {
  const parsed = Number.parseInt(raw.trim(), 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

function trimToNull(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

function defaultOptionsFor(type: QuestionType, existing?: QuestionOption[]): QuestionOption[] | undefined {
  if (!OPTION_TYPES.includes(type)) return undefined
  if (existing && existing.length > 0) return existing
  return [
    { value: 'A', label: '选项A' },
    { value: 'B', label: '选项B' },
  ]
}

function defaultValidationFor(type: QuestionType): QuestionValidation | undefined {
  switch (type) {
    case 'text':
      return { min_length: 1, max_length: 500 }
    case 'short_text':
      return { max_length: 50 }
    case 'image':
      return { max_images: 3 }
    case 'rating':
      return { max_rating: 5 }
    default:
      return undefined
  }
}

// 依赖题的可选答案值。判断题没有 options 列，但答案被后端归一化成 "true"/"false"
function conditionOptionsOf(question: LocalQuestion): QuestionOption[] {
  if (question.type === 'boolean') {
    return [
      { value: 'true', label: '是' },
      { value: 'false', label: '否' },
    ]
  }
  if (OPTION_TYPES.includes(question.type)) return question.options ?? []
  return []
}

function defaultRuleValue(operator: ConditionOperator): SaveConditionRule['value'] {
  if (VALUELESS_OPERATORS.includes(operator)) return undefined
  return MULTI_VALUE_OPERATORS.includes(operator) ? [] : ''
}

function isRuleIncomplete(rule: SaveConditionRule): boolean {
  if (VALUELESS_OPERATORS.includes(rule.operator)) return false
  if (Array.isArray(rule.value)) return rule.value.length === 0
  return rule.value == null || String(rule.value).trim() === ''
}

/**
 * 服务端 condition -> 编辑器形态。
 *
 * 新形态只需把 question_id 换成本地 _id 引用; 旧形态 {depends_on, show_when} 是存量库里
 * 全部条件的写法，按后端 conditions.py 的归一化规则转成"任一命中"的单条 in 规则，语义等价。
 */
function toLocalCondition(condition: QuestionCondition | null): SaveCondition | undefined {
  if (!condition) return undefined

  if (condition.rules && condition.rules.length > 0) {
    return {
      action: condition.action ?? 'show',
      match: condition.match ?? 'all',
      rules: condition.rules.map((rule) => ({
        question_id: `existing_${rule.question_id}`,
        operator: rule.operator,
        value: rule.value,
      })),
    }
  }

  if (condition.depends_on != null && condition.show_when != null) {
    const values = Array.isArray(condition.show_when) ? condition.show_when : [condition.show_when]
    return {
      action: 'show',
      match: 'any',
      rules: [{ question_id: `existing_${condition.depends_on}`, operator: 'in', value: values }],
    }
  }

  return undefined
}

/**
 * 新建时的动作默认值必须与后端 create_survey 的按栏目播种一致(收集表全关、白名单卷全开)，
 * 否则面板上显示的开关状态跟实际落库的对不上。
 */
function defaultSettings(category: SurveyCategory): SurveySettingsState {
  const whitelist = category !== 'collection'
  return {
    status: 'published',
    visibility: 'public',
    startsAt: '',
    endsAt: '',
    maxSubmissions: '',
    maxSubmissionsPerIp: '',
    closedMessage: '',
    reviewRequired: whitelist,
    actionAddWhitelist: whitelist,
    actionIssueCode: whitelist,
    actionNotifyGroup: whitelist,
    actionWebhook: false,
    webhookUrl: '',
    icon: '',
    themeColor: '',
    summary: '',
    estimatedMinutes: '',
    coverUrl: '',
    requireConsent: false,
    privacyNotice: '',
    successMessage: '',
    accessPassword: '',
    clearAccessPassword: false,
  }
}

function settingsFromDetail(detail: SurveyDetail): SurveySettingsState {
  return {
    status: detail.status,
    visibility: detail.visibility,
    startsAt: isoToLocalInput(detail.starts_at),
    endsAt: isoToLocalInput(detail.ends_at),
    maxSubmissions: detail.max_submissions == null ? '' : String(detail.max_submissions),
    maxSubmissionsPerIp: detail.max_submissions_per_ip == null ? '' : String(detail.max_submissions_per_ip),
    closedMessage: detail.closed_message ?? '',
    reviewRequired: detail.review_required,
    actionAddWhitelist: detail.action_add_whitelist,
    actionIssueCode: detail.action_issue_code,
    actionNotifyGroup: detail.action_notify_group,
    actionWebhook: detail.action_webhook,
    webhookUrl: detail.webhook_url ?? '',
    icon: detail.icon ?? '',
    themeColor: detail.theme_color ?? '',
    summary: detail.summary ?? '',
    estimatedMinutes: detail.estimated_minutes == null ? '' : String(detail.estimated_minutes),
    coverUrl: detail.cover_url ?? '',
    requireConsent: detail.require_consent,
    privacyNotice: detail.privacy_notice ?? '',
    successMessage: detail.success_message ?? '',
    // 口令永远从空开始: 后端只回传 has_access_password，原文与哈希都不下发
    accessPassword: '',
    clearAccessPassword: false,
  }
}

// ============================================
// 模板预设
// ============================================

type TemplateQuestion = Omit<LocalQuestion, '_id' | 'order'>

interface SurveyTemplate {
  key: string
  label: string
  icon: LucideIcon
  hint: string
  questions: TemplateQuestion[]
}

const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    key: 'signup',
    label: '活动报名',
    icon: CalendarCheck,
    hint: '收集参与者、场次与日期',
    questions: [
      { title: '参与者昵称', type: 'short_text', is_required: true, is_pinned: false, validation: { max_length: 30 } },
      { title: '联系方式 (QQ)', type: 'short_text', is_required: true, is_pinned: false, validation: { max_length: 20 } },
      {
        title: '希望参加的场次',
        type: 'select',
        is_required: true,
        is_pinned: false,
        options: [
          { value: 'A', label: '上午场' },
          { value: 'B', label: '下午场' },
          { value: 'C', label: '晚间场' },
        ],
      },
      { title: '期望参加的日期', type: 'date', is_required: true, is_pinned: false },
      { title: '同行人数', type: 'number', is_required: false, is_pinned: false, validation: { min_value: 0, max_value: 10 } },
      { title: '备注与特殊需求', type: 'text', is_required: false, is_pinned: false, validation: { max_length: 200 } },
    ],
  },
  {
    key: 'feedback',
    label: '反馈收集',
    icon: MessageSquareHeart,
    hint: '满意度打分加开放式建议',
    questions: [
      { title: '总体满意度', type: 'rating', is_required: true, is_pinned: false, validation: { max_rating: 5 } },
      {
        title: '你最常使用的功能',
        type: 'single',
        is_required: true,
        is_pinned: false,
        options: [
          { value: 'A', label: '服务器联机' },
          { value: 'B', label: '活动与副本' },
          { value: 'C', label: '社区交流' },
          { value: 'D', label: '其它' },
        ],
      },
      {
        title: '希望优先改进的方面',
        type: 'multiple',
        is_required: false,
        is_pinned: false,
        options: [
          { value: 'A', label: '稳定性' },
          { value: 'B', label: '玩法内容' },
          { value: 'C', label: '管理与秩序' },
          { value: 'D', label: '新手引导' },
        ],
      },
      { title: '是否愿意推荐给朋友', type: 'boolean', is_required: true, is_pinned: false },
      { title: '详细建议', type: 'text', is_required: false, is_pinned: false, validation: { max_length: 500 } },
    ],
  },
  {
    key: 'vote',
    label: '投票',
    icon: Vote,
    hint: '单选表决加意愿回收',
    questions: [
      {
        title: '你支持的方案',
        type: 'single',
        is_required: true,
        is_pinned: false,
        options: [
          { value: 'A', label: '方案 A' },
          { value: 'B', label: '方案 B' },
          { value: 'C', label: '方案 C' },
          { value: 'D', label: '弃权' },
        ],
      },
      { title: '对该方案的期待程度', type: 'rating', is_required: false, is_pinned: false, validation: { max_rating: 5 } },
      { title: '投票人昵称', type: 'short_text', is_required: true, is_pinned: false, validation: { max_length: 30 } },
      { title: '是否愿意参与后续讨论', type: 'boolean', is_required: false, is_pinned: false },
      { title: '补充说明', type: 'text', is_required: false, is_pinned: false, validation: { max_length: 200 } },
    ],
  },
]

// ============================================
// 选项编辑器（单选 / 下拉 / 多选）
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
// 各题型的 validation 编辑器
// ============================================

interface ValidationEditorProps {
  validation: QuestionValidation
  onChange: (validation: QuestionValidation) => void
}

function TextValidationEditor({ validation, onChange }: ValidationEditorProps) {
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
      <p className="mt-2 text-xs text-muted-foreground">后端按去掉首尾空白后的长度校验，留空表示不限。</p>
    </div>
  )
}

function ImageValidationEditor({ validation, onChange }: ValidationEditorProps) {
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

function NumberValidationEditor({ validation, onChange }: ValidationEditorProps) {
  // 空串与非法输入都落 undefined: 后端把 min_value/max_value 当"配了就校验"，写进 0 会变成硬下限
  const parse = (raw: string): number | undefined => {
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return (
    <div>
      <Label className="mb-2 block">数值范围</Label>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">不小于</span>
          <Input
            type="number"
            value={validation.min_value ?? ''}
            onChange={(e) => onChange({ ...validation, min_value: parse(e.target.value) })}
            className="w-24 text-center"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">不大于</span>
          <Input
            type="number"
            value={validation.max_value ?? ''}
            onChange={(e) => onChange({ ...validation, max_value: parse(e.target.value) })}
            className="w-24 text-center"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">闭区间，留空表示不限；超范围的答案会被后端 400 打回。</p>
    </div>
  )
}

function RatingValidationEditor({ validation, onChange }: ValidationEditorProps) {
  return (
    <div>
      <Label className="mb-2 block">评分满分</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={2}
          max={10}
          value={validation.max_rating ?? 5}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10)
            // 满分决定玩家端画几颗星，落非法值会让整题渲染不出来，故夹在 2..10 并回退 5 分制
            const clamped = Number.isInteger(parsed) ? Math.min(10, Math.max(2, parsed)) : 5
            onChange({ ...validation, max_rating: clamped })
          }}
          className="w-20 text-center"
        />
        <span className="text-sm text-muted-foreground">分（玩家端按 1 到满分显示星级）</span>
      </div>
    </div>
  )
}

function DateValidationEditor({ validation, onChange }: ValidationEditorProps) {
  return (
    <div>
      <Label className="mb-2 block">可选日期范围</Label>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">最早</span>
          <Input
            type="date"
            value={validation.min_date ?? ''}
            onChange={(e) => onChange({ ...validation, min_date: e.target.value || undefined })}
            className="w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">最晚</span>
          <Input
            type="date"
            value={validation.max_date ?? ''}
            onChange={(e) => onChange({ ...validation, max_date: e.target.value || undefined })}
            className="w-44"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">留空表示不限；玩家端的日期选择器会按这里的范围禁选。</p>
    </div>
  )
}

// ============================================
// 条件显示编辑器 v2（多规则 / 全部或任一 / 显示或隐藏）
// ============================================

interface ConditionRuleRowProps {
  rule: SaveConditionRule
  index: number
  currentIndex: number
  allQuestions: LocalQuestion[]
  availableQuestions: LocalQuestion[]
  onChange: (rule: SaveConditionRule) => void
  onRemove: () => void
}

function ConditionRuleRow({
  rule,
  index,
  currentIndex,
  allQuestions,
  availableQuestions,
  onChange,
  onRemove,
}: ConditionRuleRowProps) {
  const targetIndex = allQuestions.findIndex((q) => q._id === rule.question_id)
  const target = targetIndex >= 0 ? allQuestions[targetIndex] : undefined
  const operators = target ? OPERATORS_BY_TYPE[target.type] : []
  const options = target ? conditionOptionsOf(target) : []
  const needsValue = !VALUELESS_OPERATORS.includes(rule.operator)
  const multiValue = MULTI_VALUE_OPERATORS.includes(rule.operator)
  const selected = Array.isArray(rule.value)
    ? rule.value.map(String)
    : rule.value == null
      ? []
      : [String(rule.value)]

  // 依赖题失效的三种情况都得说清楚: 静默保存出去只会得到一道永远不显示的题
  const targetIssue = !target
    ? '依赖题已被删除，保存时这条规则会被丢弃'
    : operators.length === 0
      ? '依赖题已改成图片题，不能再作为条件依赖，请换一道'
      : targetIndex >= currentIndex
        ? '依赖题排在本题之后，玩家答到本题时它还没作答，规则不会成立'
        : null

  const handleTargetChange = (nextId: string) => {
    const nextTarget = allQuestions.find((q) => q._id === nextId)
    // 换依赖题必须重置运算符与值: 上一道题的运算符/选项放到新题上多半非法
    const operator = nextTarget && OPERATORS_BY_TYPE[nextTarget.type].length > 0 ? OPERATORS_BY_TYPE[nextTarget.type][0] : 'eq'
    onChange({ question_id: nextId, operator, value: defaultRuleValue(operator) })
  }

  const handleOperatorChange = (next: string) => {
    const operator = next as ConditionOperator
    // 无值/单值/多值三种形态互不兼容，换运算符时按新形态搬运已选的值，尽量不让管理员重填
    const value = VALUELESS_OPERATORS.includes(operator)
      ? undefined
      : MULTI_VALUE_OPERATORS.includes(operator)
        ? selected
        : (selected[0] ?? '')
    onChange({ ...rule, operator, value })
  }

  const handleOptionToggle = (value: string) => {
    if (!multiValue) {
      onChange({ ...rule, value })
      return
    }
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    onChange({ ...rule, value: next })
  }

  const freeInputType =
    target?.type === 'number' || target?.type === 'rating' ? 'number' : target?.type === 'date' ? 'date' : 'text'

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="shrink-0">
          规则 {index + 1}
        </Badge>

        <Select value={rule.question_id} onValueChange={handleTargetChange}>
          <SelectTrigger className="w-auto min-w-52">
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

        <Select value={rule.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="w-auto min-w-28">
            <SelectValue placeholder="运算符" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          title="删除这条规则"
        >
          <X />
        </Button>
      </div>

      {needsValue &&
        (options.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const isSelected = selected.includes(option.value)
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => handleOptionToggle(option.value)}
                >
                  {isSelected && <Check />}
                  {option.label}
                </Button>
              )
            })}
          </div>
        ) : (
          <Input
            type={freeInputType}
            value={Array.isArray(rule.value) ? rule.value.join(',') : (rule.value ?? '')}
            onChange={(e) => onChange({ ...rule, value: e.target.value })}
            placeholder="填写比较值"
            className="max-w-64"
          />
        ))}

      {targetIssue && (
        <p className="flex items-center gap-1 text-xs text-warning">
          <AlertTriangle className="size-3.5" />
          {targetIssue}
        </p>
      )}

      {!targetIssue && needsValue && isRuleIncomplete(rule) && (
        <p className="flex items-center gap-1 text-xs text-warning">
          <AlertTriangle className="size-3.5" />
          请填写比较值
        </p>
      )}
    </div>
  )
}

interface ConditionEditorProps {
  question: LocalQuestion
  allQuestions: LocalQuestion[]
  currentIndex: number
  onChange: (condition: SaveCondition | undefined) => void
}

function ConditionEditor({ question, allQuestions, currentIndex, onChange }: ConditionEditorProps) {
  // 只有排在本题之前、且能作条件依赖的题可选(图片题没有可比较的标量，后端也不认)
  const availableQuestions = allQuestions.filter(
    (q, idx) => idx < currentIndex && OPERATORS_BY_TYPE[q.type].length > 0
  )
  const condition = question.condition

  const makeRule = (targetId: string): SaveConditionRule => {
    const target = allQuestions.find((q) => q._id === targetId)
    const operator = target && OPERATORS_BY_TYPE[target.type].length > 0 ? OPERATORS_BY_TYPE[target.type][0] : 'eq'
    return { question_id: targetId, operator, value: defaultRuleValue(operator) }
  }

  const handleToggleCondition = (checked: boolean) => {
    if (!checked) {
      onChange(undefined)
      return
    }
    if (availableQuestions.length === 0) return
    onChange({ action: 'show', match: 'all', rules: [makeRule(availableQuestions[0]._id)] })
  }

  const updateRule = (index: number, next: SaveConditionRule) => {
    if (!condition) return
    onChange({ ...condition, rules: condition.rules.map((r, i) => (i === index ? next : r)) })
  }

  const removeRule = (index: number) => {
    if (!condition) return
    const rules = condition.rules.filter((_, i) => i !== index)
    // 删到一条不剩等于没配条件: 后端 QuestionConditionSchema 对空 rules 直接 422，必须落 undefined
    if (rules.length === 0) {
      onChange(undefined)
      return
    }
    onChange({ ...condition, rules })
  }

  const addRule = () => {
    if (!condition || availableQuestions.length === 0) return
    onChange({ ...condition, rules: [...condition.rules, makeRule(availableQuestions[0]._id)] })
  }

  // 第一题前面没有任何题，配不了条件
  if (currentIndex === 0) {
    return null
  }

  if (availableQuestions.length === 0) {
    return (
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="size-4" />
          <span>条件显示：前面没有可作为条件的题目（图片题不能作依赖）</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Switch checked={!!condition} onCheckedChange={handleToggleCondition} id={`cond-${question._id}`} />
        <Label htmlFor={`cond-${question._id}`} className="flex cursor-pointer items-center gap-1.5">
          <GitBranch className={cn('size-4', condition ? 'text-foreground' : 'text-muted-foreground')} />
          条件显示
        </Label>
        <span className="text-xs text-muted-foreground">（按前面题目的答案决定本题显示还是隐藏）</span>
      </div>

      {condition && (
        <div className="animate-in slide-in-from-top-2 space-y-3 pl-4 duration-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>当</span>
            <Select
              value={condition.match}
              onValueChange={(v) => onChange({ ...condition, match: v as SaveCondition['match'] })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部满足</SelectItem>
                <SelectItem value="any">任一满足</SelectItem>
              </SelectContent>
            </Select>
            <span>以下规则时</span>
            <Select
              value={condition.action}
              onValueChange={(v) => onChange({ ...condition, action: v as SaveCondition['action'] })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show">显示</SelectItem>
                <SelectItem value="hide">隐藏</SelectItem>
              </SelectContent>
            </Select>
            <span>本题</span>
          </div>

          {condition.rules.map((rule, i) => (
            <ConditionRuleRow
              key={i}
              rule={rule}
              index={i}
              currentIndex={currentIndex}
              allQuestions={allQuestions}
              availableQuestions={availableQuestions}
              onChange={(next) => updateRule(i, next)}
              onRemove={() => removeRule(i)}
            />
          ))}

          <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={addRule}>
            <Plus />
            添加规则
          </Button>
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

  const isSection = question.type === 'section'
  const roleBindable = ROLE_BINDABLE_TYPES.includes(question.type)
  // 同一 role 全卷唯一: 后端按题序遍历、后者覆盖前者, 重复绑定会静默取错题的答案
  const isRoleTakenElsewhere = (role: 'player_name' | 'qq') =>
    allQuestions.some((q) => q._id !== question._id && q.role === role)

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
            条件 {question.condition.rules.length}
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
                {isSection ? '章节标题' : '题目标题'} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={question.title}
                onChange={(e) => onUpdate({ ...question, title: e.target.value })}
                placeholder={isSection ? '例: 第二部分 · AI 使用情况' : '请输入题目标题'}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* 题目说明。分节块的说明是整段引导文字, 给多行输入并保留换行 */}
            <div>
              <Label className="mb-2 block">
                {isSection ? '章节说明' : '题目说明'} <span className="text-xs text-muted-foreground">(可选)</span>
              </Label>
              {isSection ? (
                <Textarea
                  value={question.description || ''}
                  onChange={(e) => onUpdate({ ...question, description: e.target.value || undefined })}
                  placeholder="这一节要问什么、希望对方怎么作答; 换行会原样展示给玩家"
                  rows={4}
                />
              ) : (
                <Input
                  value={question.description || ''}
                  onChange={(e) => onUpdate({ ...question, description: e.target.value || undefined })}
                  placeholder="为题目添加额外说明"
                />
              )}
            </div>

            {/* 题目类型 */}
            <div>
              <Label className="mb-2 block">题目类型</Label>
              <div className="grid grid-cols-6 gap-2">
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
                          options: defaultOptionsFor(type.value, question.options),
                          validation: defaultValidationFor(type.value),
                          // 改成抽不出文本的题型时顺手解绑, 否则会留下一个后端永远抽不到值的绑定
                          role: ROLE_BINDABLE_TYPES.includes(type.value) ? question.role : undefined,
                          // 分节说明块不收答案, 标成必填会让必填计数虚高; 后端也按 answerable 忽略它
                          is_required: type.value === 'section' ? false : question.is_required,
                        })
                      }
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

            {/* 选项编辑器 - 单选 / 下拉 / 多选 */}
            {OPTION_TYPES.includes(question.type) && (
              <OptionsEditor
                options={question.options || []}
                onChange={(options) => onUpdate({ ...question, options })}
              />
            )}

            {/* 各题型的 validation 配置 */}
            {(question.type === 'text' || question.type === 'short_text') && (
              <TextValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {question.type === 'number' && (
              <NumberValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {question.type === 'rating' && (
              <RatingValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {question.type === 'date' && (
              <DateValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {question.type === 'image' && (
              <ImageValidationEditor
                validation={question.validation || {}}
                onChange={(validation) => onUpdate({ ...question, validation })}
              />
            )}

            {/* 必填 / 保留设置。分节说明块不收答案, 这三项对它都没有意义, 整块隐藏而不是置灰,
                免得让人以为"配了没生效" */}
            <div className={cn('flex flex-wrap items-center gap-6 pt-2', isSection && 'hidden')}>
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

              {/* 语义标记: 把本题标记为玩家名/QQ, 提交时后端抽取到结构化字段 */}
              <div className="flex items-center gap-2">
                <Label htmlFor={`role-${question._id}`} className="cursor-pointer">绑定字段</Label>
                <select
                  id={`role-${question._id}`}
                  value={question.role ?? ''}
                  onChange={(e) => onUpdate({ ...question, role: (e.target.value || undefined) as LocalQuestion['role'] })}
                  className="h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
                  disabled={!roleBindable}
                >
                  <option value="">无</option>
                  <option value="player_name" disabled={isRoleTakenElsewhere('player_name')}>
                    {ROLE_LABELS.player_name}
                    {isRoleTakenElsewhere('player_name') ? ' (已被其它题绑定)' : ''}
                  </option>
                  <option value="qq" disabled={isRoleTakenElsewhere('qq')}>
                    {ROLE_LABELS.qq}
                    {isRoleTakenElsewhere('qq') ? ' (已被其它题绑定)' : ''}
                  </option>
                </select>
                {!roleBindable && (
                  <span className="text-xs text-muted-foreground">仅单选 / 下拉 / 文本题可绑定</span>
                )}
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
// 设置 tab
// ============================================

interface SettingRowProps {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** 动作开关统一带一句"关掉/打开之后实际会发生什么"，光看开关名猜不出后果 */
function SettingSwitchRow({ id, label, hint, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

interface SettingsPanelProps {
  settings: SurveySettingsState
  onPatch: (patch: Partial<SurveySettingsState>) => void
  /** 后端已存有口令 (has_access_password) */
  hasStoredPassword: boolean
  isCreate: boolean
}

function SettingsPanel({ settings, onPatch, hasStoredPassword, isCreate }: SettingsPanelProps) {
  const visibilityHint = VISIBILITY_OPTIONS.find((v) => v.value === settings.visibility)?.hint ?? ''

  return (
    <>
      {/* 1. 提交后动作 */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Send className="size-4" />
            提交后动作
          </h3>

          <SettingSwitchRow
            id="set-review"
            label="需要人工审核"
            hint="关闭后提交即视为完成, 不进审核队列, 后续动作立刻执行。"
            checked={settings.reviewRequired}
            onCheckedChange={(v) => onPatch({ reviewRequired: v })}
          />
          <SettingSwitchRow
            id="set-whitelist"
            label="通过后自动加白名单"
            hint="按绑定的玩家名调 MC 服务端加白; 没有玩家名题时这一步必然失败。"
            checked={settings.actionAddWhitelist}
            onCheckedChange={(v) => onPatch({ actionAddWhitelist: v })}
          />
          <SettingSwitchRow
            id="set-code"
            label="通过后可领取注册码"
            hint="关闭后玩家在结果页看不到领码入口, 也发不出码。"
            checked={settings.actionIssueCode}
            onCheckedChange={(v) => onPatch({ actionIssueCode: v })}
          />
          <SettingSwitchRow
            id="set-notify"
            label="推送审核群通知"
            hint="关闭后新提交与审核结果都不进通知队列, 群里完全静默。"
            checked={settings.actionNotifyGroup}
            onCheckedChange={(v) => onPatch({ actionNotifyGroup: v })}
          />
          <SettingSwitchRow
            id="set-webhook"
            label="提交后推送 Webhook"
            hint="每条提交以 JSON POST 到下方地址; 推送失败只记日志, 不影响玩家提交。"
            checked={settings.actionWebhook}
            onCheckedChange={(v) => onPatch({ actionWebhook: v })}
          />

          {settings.actionWebhook && (
            <div className="pl-11">
              <Label htmlFor="set-webhook-url" className="mb-2 block">
                Webhook 地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="set-webhook-url"
                value={settings.webhookUrl}
                onChange={(e) => onPatch({ webhookUrl: e.target.value })}
                placeholder="https://example.com/hooks/survey"
                maxLength={512}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                只接受 http / https; 内网与环回地址会被后端直接拒绝 (防 SSRF)。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 开放与限制 */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="size-4" />
            开放与限制
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">发布状态</Label>
              <Select value={settings.status} onValueChange={(v) => onPatch({ status: v })} disabled={isCreate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {isCreate
                  ? '新建的问卷后端一律按「已发布」落库, 需要草稿请先创建再进编辑改状态。'
                  : '草稿与已归档的问卷玩家端一律打不开, 也不出现在列表里。'}
              </p>
            </div>

            <div>
              <Label className="mb-2 block">可见范围</Label>
              <Select value={settings.visibility} onValueChange={(v) => onPatch({ visibility: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{visibilityHint}</p>
            </div>

            <div>
              <Label htmlFor="set-starts" className="mb-2 block">
                开放开始时间
              </Label>
              <Input
                id="set-starts"
                type="datetime-local"
                value={settings.startsAt}
                onChange={(e) => onPatch({ startsAt: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">留空表示立即开放; 开始前玩家只能看到「未开始」。</p>
            </div>

            <div>
              <Label htmlFor="set-ends" className="mb-2 block">
                截止时间
              </Label>
              <Input
                id="set-ends"
                type="datetime-local"
                value={settings.endsAt}
                onChange={(e) => onPatch({ endsAt: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">留空表示不截止; 到点后提交一律被拒。</p>
            </div>

            <div>
              <Label htmlFor="set-max" className="mb-2 block">
                总提交上限
              </Label>
              <Input
                id="set-max"
                type="number"
                min={1}
                value={settings.maxSubmissions}
                onChange={(e) => onPatch({ maxSubmissions: e.target.value })}
                placeholder="留空 = 不限"
              />
              <p className="mt-1 text-xs text-muted-foreground">累计提交达到上限后问卷自动变成「名额已满」。</p>
            </div>

            <div>
              <Label htmlFor="set-max-ip" className="mb-2 block">
                每个 IP 提交上限
              </Label>
              <Input
                id="set-max-ip"
                type="number"
                min={1}
                value={settings.maxSubmissionsPerIp}
                onChange={(e) => onPatch({ maxSubmissionsPerIp: e.target.value })}
                placeholder="留空 = 不限"
              />
              <p className="mt-1 text-xs text-muted-foreground">同一 IP 超出次数后提交返回 429; 同一宿舍/网吧会被误伤。</p>
            </div>
          </div>

          <div>
            <Label htmlFor="set-closed-msg" className="mb-2 block">
              不可填时的提示文案
            </Label>
            <Textarea
              id="set-closed-msg"
              value={settings.closedMessage}
              onChange={(e) => onPatch({ closedMessage: e.target.value })}
              placeholder="留空则用系统默认文案"
              rows={2}
              maxLength={500}
              className="resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">未开始 / 已截止 / 名额已满共用这一句, 覆盖系统默认文案。</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. 访问控制 */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="size-4" />
            访问控制
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {hasStoredPassword && !settings.clearAccessPassword && (
              <Badge variant="success" className="gap-1">
                <KeyRound className="size-3" />
                已设置口令
              </Badge>
            )}
            {settings.clearAccessPassword && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="size-3" />
                保存后将清除口令
              </Badge>
            )}
            {hasStoredPassword && !settings.clearAccessPassword && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPatch({ accessPassword: '', clearAccessPassword: true })}
              >
                清除口令
              </Button>
            )}
            {settings.clearAccessPassword && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onPatch({ clearAccessPassword: false })}>
                取消清除
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor="set-password" className="mb-2 block">
              访问口令
            </Label>
            <Input
              id="set-password"
              type="password"
              autoComplete="new-password"
              value={settings.accessPassword}
              onChange={(e) => onPatch({ accessPassword: e.target.value, clearAccessPassword: false })}
              placeholder={hasStoredPassword ? '留空则不修改' : '留空表示不设口令'}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              设了口令后玩家必须先输对口令才能看到题目。后端只存哈希, 原文与哈希都不会回传到面板, 忘了只能重设。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. 外观与合规 */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Palette className="size-4" />
            外观与合规
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="set-icon" className="mb-2 block">
                图标
              </Label>
              <Input
                id="set-icon"
                value={settings.icon}
                onChange={(e) => onPatch({ icon: e.target.value })}
                placeholder="单个字符, 显示在玩家端卡片上"
                maxLength={64}
              />
            </div>

            <div>
              <Label htmlFor="set-theme" className="mb-2 block">
                主题色
              </Label>
              <div className="flex items-center gap-2">
                {/* 取色器只认 #RRGGBB, 喂它空串或半截色值会被浏览器静默改成黑色并回写进表单,
                    故未设/非法时给取色器一个展示用的兜底值, 真正落库的是右侧文本框的原文 */}
                <input
                  id="set-theme"
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(settings.themeColor) ? settings.themeColor : '#4f46e5'}
                  onChange={(e) => onPatch({ themeColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
                />
                <Input
                  value={settings.themeColor}
                  onChange={(e) => onPatch({ themeColor: e.target.value })}
                  placeholder="#4F46E5, 留空用默认配色"
                  maxLength={16}
                  className="flex-1"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">玩家端拿它当标题与进度条的强调色。</p>
            </div>

            <div>
              <Label htmlFor="set-minutes" className="mb-2 block">
                预计耗时（分钟）
              </Label>
              <Input
                id="set-minutes"
                type="number"
                min={1}
                value={settings.estimatedMinutes}
                onChange={(e) => onPatch({ estimatedMinutes: e.target.value })}
                placeholder="留空 = 不展示"
              />
            </div>

            <div>
              <Label htmlFor="set-cover" className="mb-2 block">
                封面图地址
              </Label>
              <Input
                id="set-cover"
                value={settings.coverUrl}
                onChange={(e) => onPatch({ coverUrl: e.target.value })}
                placeholder="https://..."
                maxLength={512}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="set-summary" className="mb-2 block">
              一句话简介
            </Label>
            <Input
              id="set-summary"
              value={settings.summary}
              onChange={(e) => onPatch({ summary: e.target.value })}
              placeholder="展示在问卷卡片上的短介绍"
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="set-success" className="mb-2 block">
              提交成功文案
            </Label>
            <Textarea
              id="set-success"
              value={settings.successMessage}
              onChange={(e) => onPatch({ successMessage: e.target.value })}
              placeholder="留空则按是否需要审核自动选文案"
              rows={2}
              maxLength={500}
              className="resize-none"
            />
          </div>

          <SettingSwitchRow
            id="set-consent"
            label="填写前需勾选同意声明"
            hint="打开后玩家要先读完下面的声明并勾选才能开始答题, 没勾选提交会被 400 拒绝。"
            checked={settings.requireConsent}
            onCheckedChange={(v) => onPatch({ requireConsent: v })}
          />

          {settings.requireConsent && (
            <div className="pl-11">
              <Label htmlFor="set-privacy" className="mb-2 block">
                声明正文 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="set-privacy"
                value={settings.privacyNotice}
                onChange={(e) => onPatch({ privacyNotice: e.target.value })}
                placeholder="说明会收集哪些信息、用于什么、保存多久"
                rows={4}
                className="resize-none"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
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

  // 后端 category 缺省即 whitelist, 前端做默认值与校验判定时要跟它对齐
  const effectiveCategory: SurveyCategory = (mode === 'edit' ? initialData?.category : defaultCategory) ?? 'whitelist'

  // 问卷基本信息
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isRandom, setIsRandom] = useState(false)
  const [randomCount, setRandomCount] = useState<number | undefined>(undefined)

  // 设置 tab 的全部字段
  const [settings, setSettings] = useState<SurveySettingsState>(() => defaultSettings(effectiveCategory))

  // 题目列表
  const [questions, setQuestions] = useState<LocalQuestion[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('questions')

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
    setActiveTab('questions')
    if (open && mode === 'edit' && initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description || '')
      setIsRandom(initialData.is_random)
      setRandomCount(initialData.random_count ?? undefined)
      setSettings(settingsFromDetail(initialData))
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
            // 服务端条件里的 question_id 是数字; 现有题的本地 _id 恒为 existing_<id>
            condition: toLocalCondition(q.condition),
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
      setSettings(defaultSettings(effectiveCategory))
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

  // 只有白名单卷、以及显式开了自动加白的收集表才真的需要玩家名 —— 加白必须拿到游戏 ID。
  // 普通收集表(报名/反馈/投票)没有这个前提, 一刀切强制会把它们卡死在保存这一步。
  const requiresPlayerName = effectiveCategory === 'whitelist' || settings.actionAddWhitelist

  // 绑定字段配置校验, 与后端 surveys.py 的启用校验、public.py 的抽取规则保持一致。
  // 公开端提交时已不再单独收集玩家名, 绑定配错等于整卷提交不了, 必须在保存这一步拦住。
  const roleIssue = useMemo(() => {
    const badType = questions.find((q) => q.role && !ROLE_BINDABLE_TYPES.includes(q.type))
    if (badType) {
      const typeLabel = QUESTION_TYPES.find((t) => t.value === badType.type)?.label ?? badType.type
      return `「${badType.title.trim() || '未命名题目'}」是${typeLabel}, 抽不出文本, 不能绑定字段`
    }

    for (const role of ['player_name', 'qq'] as const) {
      const bound = questions.filter((q) => q.role === role)
      if (bound.length > 1) return `有 ${bound.length} 道题都绑定了${ROLE_LABELS[role]}, 请只保留一道`
    }

    const nameQuestion = questions.find((q) => q.role === 'player_name')
    if (!nameQuestion) {
      return requiresPlayerName
        ? '请把一道题的绑定字段设为「玩家名」, 否则玩家提交时会取不到玩家名'
        : null
    }
    const nameLabel = nameQuestion.title.trim() || '未命名题目'
    if (nameQuestion.is_required === false) return `玩家名题「${nameLabel}」必须设为必填`
    if (nameQuestion.condition) return `玩家名题「${nameLabel}」不能配条件显示, 被隐藏时答案不会随提交上传`

    return null
  }, [questions, requiresPlayerName])

  // 设置 tab 的校验: 这两条配错都会让问卷"看着正常, 实际永远填不了/推不出去"
  const settingsIssue = useMemo(() => {
    if (settings.actionWebhook && !settings.webhookUrl.trim()) return '开启了 Webhook 推送, 请填写推送地址'
    if (settings.requireConsent && !settings.privacyNotice.trim()) return '开启了同意声明, 请填写声明正文'
    const startsAt = localInputToIso(settings.startsAt)
    const endsAt = localInputToIso(settings.endsAt)
    if (startsAt && endsAt && endsAt <= startsAt) return '截止时间必须晚于开放开始时间'
    return null
  }, [settings])

  // 表单验证
  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (questions.length === 0) return false
    if (questions.some((q) => !q.title.trim())) return false
    if (isRandom && (!randomCount || randomCount > questions.length)) return false
    if (isRandom && randomCount && pinnedCount > randomCount) return false
    if (roleIssue) return false
    if (settingsIssue) return false
    return true
  }, [title, questions, isRandom, randomCount, pinnedCount, roleIssue, settingsIssue])

  const patchSettings = useCallback((patch: Partial<SurveySettingsState>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // 添加题目
  const addQuestion = useCallback((type: QuestionType) => {
    const newQuestion: LocalQuestion = {
      _id: generateId(),
      title: '',
      type,
      is_required: true,
      is_pinned: false,
      order: 0, // 占位，setQuestions 时按数组位置重排
      options: defaultOptionsFor(type),
      validation: defaultValidationFor(type),
    }
    setQuestions((prev) => [...prev, { ...newQuestion, order: prev.length }])
    setExpandedIds((prev) => new Set([...prev, newQuestion._id]))
  }, [])

  // 套用模板: 只在新建且一道题都没有时可用, 直接整体替换题目列表
  const applyTemplate = useCallback((template: SurveyTemplate) => {
    setQuestions(template.questions.map((q, index) => ({ ...q, _id: generateId(), order: index })))
    setExpandedIds(new Set())
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
      // 副本必须解绑: role 全卷唯一, 两道题同 role 时后端后者覆盖前者, 会静默取错题的答案
      { ...question, _id: newId, title: `${question.title} (副本)`, order: prev.length, role: undefined },
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

    // 有新口令就改口令; 只按了"清除口令"就发空串清掉; 都没有则整个键不发 = 不修改
    const accessPassword = settings.accessPassword
      ? settings.accessPassword
      : settings.clearAccessPassword
        ? ''
        : undefined

    const base: SaveSurveyBase = {
      title: title.trim(),
      description: description.trim() || undefined,
      is_random: isRandom,
      random_count: isRandom ? randomCount : undefined,
      // 仅新建时指定栏目; 编辑时不传, 避免改动已有归属
      category: surveyId == null ? defaultCategory : undefined,
      status: settings.status,
      visibility: settings.visibility,
      starts_at: localInputToIso(settings.startsAt),
      ends_at: localInputToIso(settings.endsAt),
      max_submissions: toPositiveInt(settings.maxSubmissions),
      max_submissions_per_ip: toPositiveInt(settings.maxSubmissionsPerIp),
      closed_message: trimToNull(settings.closedMessage),
      success_message: trimToNull(settings.successMessage),
      require_consent: settings.requireConsent,
      privacy_notice: trimToNull(settings.privacyNotice),
      icon: trimToNull(settings.icon),
      theme_color: trimToNull(settings.themeColor),
      summary: trimToNull(settings.summary),
      estimated_minutes: toPositiveInt(settings.estimatedMinutes),
      cover_url: trimToNull(settings.coverUrl),
      review_required: settings.reviewRequired,
      action_add_whitelist: settings.actionAddWhitelist,
      action_issue_code: settings.actionIssueCode,
      action_notify_group: settings.actionNotifyGroup,
      action_webhook: settings.actionWebhook,
      // 关掉推送时顺手清空地址, 免得留个"关着但填着"的悬空配置
      webhook_url: settings.actionWebhook ? trimToNull(settings.webhookUrl) : null,
      access_password: accessPassword,
    }

    await saveMutation.mutateAsync({ surveyId: surveyId ?? null, base, questions })
    onOpenChange(false)
  }, [
    isValid,
    title,
    description,
    isRandom,
    randomCount,
    settings,
    questions,
    surveyId,
    defaultCategory,
    saveMutation,
    onOpenChange,
  ])

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
            : roleIssue
              ? roleIssue
              : settingsIssue
                ? settingsIssue
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

        {isDetailLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载问卷详情中…
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border px-6 py-3">
              <TabsList>
                <TabsTrigger value="questions">题目</TabsTrigger>
                <TabsTrigger value="settings">设置</TabsTrigger>
              </TabsList>
            </div>

            {/* 题目 tab */}
            <TabsContent
              value="questions"
              className="mt-0 min-h-0 flex-1 space-y-6 overflow-y-auto scrollbar-thin px-6 py-4"
            >
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
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-10">
                      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                        <ClipboardList className="size-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground">暂无题目</p>
                      <p className="mt-1 text-sm text-muted-foreground">点击下方按钮添加第一道题</p>
                    </div>

                    {/* 模板起步: 只在新建且题目为空时出现, 点一下灌入整套预设题 */}
                    {mode === 'create' && (
                      <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                          <LayoutTemplate className="size-4" />
                          或者从模板开始
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {SURVEY_TEMPLATES.map((template) => {
                            const Icon = template.icon
                            return (
                              <Button
                                key={template.key}
                                type="button"
                                variant="outline"
                                onClick={() => applyTemplate(template)}
                                className="h-auto flex-col items-start gap-1 py-3 text-left"
                              >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                  <Icon className="size-4" />
                                  {template.label}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {template.questions.length} 题 · {template.hint}
                                </span>
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
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

                {/* 添加题目 - 十种题型两行排布，免新增 dropdown wrapper */}
                <div className="mt-4 rounded-xl border-2 border-dashed border-border p-3">
                  <p className="mb-2 text-center text-xs text-muted-foreground">添加题目</p>
                  <div className="grid grid-cols-6 gap-2">
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
            </TabsContent>

            {/* 设置 tab */}
            <TabsContent
              value="settings"
              className="mt-0 min-h-0 flex-1 space-y-6 overflow-y-auto scrollbar-thin px-6 py-4"
            >
              <SettingsPanel
                settings={settings}
                onPatch={patchSettings}
                hasStoredPassword={initialData?.has_access_password ?? false}
                isCreate={mode === 'create'}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* 底部操作栏: 两个 tab 共用 */}
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

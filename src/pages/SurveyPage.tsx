import { useState } from 'react'
import { Plus, Pencil, Pin, GripVertical, FileText } from 'lucide-react'
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
import { SurveyEditModal } from '@/components/SurveyEditModal'
import { SurveyResultsModal } from '@/components/SurveyResultsModal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  useSurveys,
  useToggleSurveyActive,
  useToggleSurveyTop,
  useReorderSurveys,
} from '@/hooks/useSurvey'
import type { Survey, SurveyCategory, ReorderSurveyItem } from '@/types/survey'

interface SurveyPageProps {
  /** 栏目: whitelist=问卷管理, collection=其他问卷; 不传则显示全部 */
  category?: SurveyCategory
}

interface SortableSurveyRowProps {
  survey: Survey
  onEdit: (id: number) => void
  onResults: (survey: Survey) => void
  onToggleActive: (survey: Survey) => void
  onTogglePin: (survey: Survey) => void
  actionsDisabled: boolean
}

function SortableSurveyRow({ survey, onEdit, onResults, onToggleActive, onTogglePin, actionsDisabled }: SortableSurveyRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: survey.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && 'relative z-10 bg-muted/60')}>
      <TableCell className="w-8 pr-0">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-1.5">
          {survey.is_pinned ? <Pin className="size-3.5 text-primary" /> : null}
          {survey.title}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{survey.code}</TableCell>
      <TableCell className="font-mono tabular-nums">{survey.question_count}</TableCell>
      <TableCell className="font-mono tabular-nums">{survey.submission_count}</TableCell>
      <TableCell>
        {survey.is_active ? <Badge variant="success">启用</Badge> : <Badge variant="secondary">停用</Badge>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant={survey.is_pinned ? 'default' : 'outline'}
            size="sm"
            disabled={actionsDisabled}
            onClick={() => onTogglePin(survey)}
            title={survey.is_pinned ? '取消置顶' : '置顶'}
          >
            <Pin />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onResults(survey)} title="查看结果 / 导出 CSV">
            <FileText /> 结果
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(survey.id)}>
            <Pencil /> 编辑
          </Button>
          <Button variant="outline" size="sm" disabled={actionsDisabled} onClick={() => onToggleActive(survey)}>
            {survey.is_active ? '停用' : '启用'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// 问卷管理: 仅负责问卷本身的增改/启停/置顶/排序; 玩家提交审核在「问卷审核」页 (ReviewPage)。
export function SurveyPage({ category }: SurveyPageProps) {
  const surveys = useSurveys({ size: 50, category })
  const toggle = useToggleSurveyActive()
  const togglePin = useToggleSurveyTop()
  const reorder = useReorderSurveys()
  const [editorOpen, setEditorOpen] = useState(false)
  // null = 新建模式; number = 编辑该问卷。
  const [editingId, setEditingId] = useState<number | null>(null)
  // 打开某问卷的"结果"(提交列表 + 导出); null=未打开
  const [resultsSurvey, setResultsSurvey] = useState<Survey | null>(null)
  // 本地有序副本: 支撑拖拽的乐观更新。用查询数据签名做 key, 数据变化时在渲染期同步,
  // 避免 effect 内 setState 的级联渲染 (与 SurveyEditModal 的 seededKey 同一模式)。
  const [rows, setRows] = useState<Survey[]>([])
  const dataSig =
    surveys.data?.items.map((s) => `${s.id}:${s.sort_order}:${s.is_pinned}:${s.is_active}`).join(',') ?? ''
  const [syncedSig, setSyncedSig] = useState('')
  if (dataSig !== syncedSig) {
    setSyncedSig(dataSig)
    setRows(surveys.data?.items ?? [])
  }

  const isCollection = category === 'collection'
  const heading = isCollection ? '其他问卷' : '问卷管理'
  const subtitle = isCollection ? '面向报名 / 反馈 / 投票等的通用收集表' : '编辑、启停、置顶与排序问卷'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const openCreate = () => {
    setEditingId(null)
    setEditorOpen(true)
  }
  const openEdit = (id: number) => {
    setEditingId(id)
    setEditorOpen(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(rows, oldIndex, newIndex)
    setRows(next) // 乐观更新
    const orders: ReorderSurveyItem[] = next.map((r, i) => ({ id: r.id, sort_order: i }))
    reorder.mutate(orders)
  }

  const busy = toggle.isPending || togglePin.isPending || reorder.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus /> 新建{isCollection ? '收集表' : '问卷'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>标题</TableHead>
                  <TableHead>识别码</TableHead>
                  <TableHead>题数</TableHead>
                  <TableHead>提交数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
                ) : surveys.isError ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">加载失败 (问卷服务未连接?)</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">暂无{isCollection ? '收集表' : '问卷'}</TableCell></TableRow>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                      {rows.map((sv) => (
                        <SortableSurveyRow
                          key={sv.id}
                          survey={sv}
                          onEdit={openEdit}
                          onResults={setResultsSurvey}
                          onToggleActive={(s) => toggle.mutate({ surveyId: s.id, isActive: !s.is_active })}
                          onTogglePin={(s) => togglePin.mutate({ surveyId: s.id, isPinned: !s.is_pinned })}
                          actionsDisabled={busy}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <SurveyEditModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        surveyId={editingId}
        defaultCategory={category ?? 'whitelist'}
      />
      {resultsSurvey && (
        <SurveyResultsModal
          surveyId={resultsSurvey.id}
          surveyTitle={resultsSurvey.title}
          onClose={() => setResultsSurvey(null)}
        />
      )}
    </div>
  )
}

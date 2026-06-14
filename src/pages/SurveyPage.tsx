import { useState } from 'react'
import { Check, X, Plus, Pencil } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { SurveyEditModal } from '@/components/SurveyEditModal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSubmissions, useSubmissionStats, useSubmissionDetail, useReviewSubmission } from '@/hooks/useSubmission'
import { useSurveys, useToggleSurveyActive } from '@/hooks/useSurvey'
import { useAddWhitelist } from '@/hooks/useWhitelist'
import { useAuthStore } from '@/stores/auth'
import type { SubmissionStatus, SubmissionAnswer, QuestionOption } from '@/types/submission'

function statusBadge(s: SubmissionStatus) {
  if (s === 'approved') return <Badge variant="success">已通过</Badge>
  if (s === 'rejected') return <Badge variant="destructive">已拒绝</Badge>
  return <Badge variant="warning">待审核</Badge>
}

function fmt(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

// 选择题存的是选项 value, 映射回 label 让审核可读; 无匹配则原样显示
function optionLabel(value: string, options?: QuestionOption[] | null): string {
  return options?.find((o) => o.value === value)?.label ?? value
}

// 答案 content 实际形态: single/boolean -> {value}, multiple -> {values}, text -> {text}, image -> {images}。
// 旧逻辑对对象直接 String() 得到 "[object Object]"; 这里按形态解包, 并兼容历史扁平标量。
function renderAnswer(a: SubmissionAnswer): string {
  const c = a.content
  if (c == null) return '—'
  if (typeof c === 'boolean') return c ? '是' : '否'
  if (typeof c === 'string') return c.trim() || '—'
  if (Array.isArray(c)) {
    return c.length ? c.map((v) => optionLabel(String(v), a.question_options)).join('、') : '—'
  }
  if (typeof c.value === 'boolean') return c.value ? '是' : '否'
  if (Array.isArray(c.values)) {
    return c.values.length ? c.values.map((v) => optionLabel(String(v), a.question_options)).join('、') : '—'
  }
  if (c.value != null && c.value !== '') return optionLabel(String(c.value), a.question_options)
  if (typeof c.text === 'string') return c.text.trim() || '—'
  if (Array.isArray(c.images)) return c.images.length ? `${c.images.length} 张图片` : '—'
  return '—'
}

function ReviewDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const detail = useSubmissionDetail(id)
  const review = useReviewSubmission()
  const addWhitelist = useAddWhitelist()
  const reviewer = useAuthStore((s) => s.user)
  const [note, setNote] = useState('')
  const d = detail.data

  const act = (status: 'approved' | 'rejected') => {
    if (!d) return
    const playerName = d.player_name
    review.mutate(
      { submissionId: d.id, data: { status, review_note: note || undefined }, playerName, reviewerName: reviewer?.displayName },
      {
        onSuccess: () => {
          // 审核通过后由面板侧发起加白, source 固定 ADMIN (mod Source 枚举不接受 API)。
          // useAddWhitelist 自带成功/失败 toast, 拒绝时不加白。
          if (status === 'approved') {
            addWhitelist.mutate({ name: playerName, qq: d.qq, source: 'ADMIN' })
          }
          onClose()
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {d ? d.player_name : '提交详情'}
            {d && statusBadge(d.status)}
          </DialogTitle>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : !d ? (
          <p className="text-sm text-muted-foreground">加载失败</p>
        ) : (
          <div className="space-y-4">
            {d.qq && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">QQ: </span>
                <span className="font-medium">{d.qq}</span>
              </div>
            )}
            <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin pr-1">
              {d.answers.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{a.question_title}</p>
                  <p className="mt-1 text-sm">{renderAnswer(a)}</p>
                </div>
              ))}
            </div>
            {d.status === 'pending' && (
              <div className="space-y-3 border-t pt-3">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="审核备注 (拒绝时建议填写)" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="text-destructive" disabled={review.isPending} onClick={() => act('rejected')}>
                    <X /> 拒绝
                  </Button>
                  <Button disabled={review.isPending} onClick={() => act('approved')}>
                    <Check /> 通过并加白名单
                  </Button>
                </div>
              </div>
            )}
            {d.review_note && <p className="text-sm text-muted-foreground">审核备注: {d.review_note}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SubmissionsTab() {
  const [status, setStatus] = useState<SubmissionStatus | 'ALL'>('pending')
  const [reviewId, setReviewId] = useState<number | null>(null)
  const stats = useSubmissionStats()
  const subs = useSubmissions({ status: status === 'ALL' ? undefined : status, size: 50 })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="待审核" value={stats.data?.pending ?? '—'} status="warning" loading={stats.isLoading} />
        <StatCard label="已通过" value={stats.data?.approved ?? '—'} status="success" loading={stats.isLoading} />
        <StatCard label="已拒绝" value={stats.data?.rejected ?? '—'} status="danger" loading={stats.isLoading} />
        <StatCard label="总计" value={stats.data?.total ?? '—'} loading={stats.isLoading} />
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={status} onValueChange={(v) => setStatus(v as SubmissionStatus | 'ALL')}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
              <SelectItem value="ALL">全部</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead>问卷</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
                ) : subs.isError ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">加载失败 (问卷服务未连接?)</TableCell></TableRow>
                ) : !subs.data || subs.data.items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">暂无提交</TableCell></TableRow>
                ) : (
                  subs.data.items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.player_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.survey_title}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">{fmt(s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setReviewId(s.id)}>查看</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {reviewId != null && <ReviewDialog id={reviewId} onClose={() => setReviewId(null)} />}
    </div>
  )
}

function SurveysTab() {
  const surveys = useSurveys({ size: 50 })
  const toggle = useToggleSurveyActive()
  const [editorOpen, setEditorOpen] = useState(false)
  // null = 新建模式; number = 编辑该问卷。编辑器自带详情拉取与保存, 这里只管开关与目标 id。
  const [editingId, setEditingId] = useState<number | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setEditorOpen(true)
  }
  const openEdit = (id: number) => {
    setEditingId(id)
    setEditorOpen(true)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus /> 新建问卷
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
              ) : surveys.isError ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">加载失败 (问卷服务未连接?)</TableCell></TableRow>
              ) : !surveys.data || surveys.data.items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">暂无问卷</TableCell></TableRow>
              ) : (
                surveys.data.items.map((sv) => (
                  <TableRow key={sv.id}>
                    <TableCell className="font-medium">{sv.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{sv.code}</TableCell>
                    <TableCell className="font-mono tabular-nums">{sv.question_count}</TableCell>
                    <TableCell className="font-mono tabular-nums">{sv.submission_count}</TableCell>
                    <TableCell>{sv.is_active ? <Badge variant="success">启用</Badge> : <Badge variant="secondary">停用</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(sv.id)}>
                          <Pencil /> 编辑
                        </Button>
                        <Button variant="outline" size="sm" disabled={toggle.isPending} onClick={() => toggle.mutate({ surveyId: sv.id, isActive: !sv.is_active })}>
                          {sv.is_active ? '停用' : '启用'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <SurveyEditModal open={editorOpen} onOpenChange={setEditorOpen} surveyId={editingId} />
    </Card>
  )
}

export function SurveyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">问卷管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">提交审核与问卷启停</p>
      </div>
      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">提交审核</TabsTrigger>
          <TabsTrigger value="surveys">问卷</TabsTrigger>
        </TabsList>
        <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
        <TabsContent value="surveys"><SurveysTab /></TabsContent>
      </Tabs>
    </div>
  )
}

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSubmissions, useSubmissionStats, useSubmissionDetail, useReviewSubmission } from '@/hooks/useSubmission'
import { useAddWhitelist } from '@/hooks/useWhitelist'
import { useAuthStore } from '@/stores/auth'
import type { SubmissionStatus, SubmissionAnswer, QuestionOption } from '@/types/submission'
import { surveyImageUrl } from '@/services/survey'

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

// 填写耗时: 后端存秒数 (float|null)
function fmtDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const sec = Math.round(seconds)
  if (sec < 60) return `${sec}秒`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}分${sec % 60}秒`
  return `${Math.floor(m / 60)}小时${m % 60}分`
}

// 选择题存的是选项 value, 映射回 label 让审核可读; 无匹配则原样显示
function optionLabel(value: string, options?: QuestionOption[] | null): string {
  return options?.find((o) => o.value === value)?.label ?? value
}

// 答案 content 实际形态: single/boolean -> {value}, multiple -> {values}, text -> {text}, image -> {images}。
// 按形态解包, 兼容历史扁平标量; 否则会渲染成 "[object Object]"。
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

// 图片题单独渲染缩略图 (renderAnswer 只产文本)。仅当 content.images 含非空路径时返回列表, 否则 null。
function answerImages(a: SubmissionAnswer): string[] | null {
  const c = a.content
  if (c && typeof c === 'object' && !Array.isArray(c) && Array.isArray(c.images)) {
    const imgs = c.images.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    return imgs.length ? imgs : null
  }
  return null
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
      <DialogContent className="max-w-3xl">
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <div><span className="text-muted-foreground">QQ: </span><span className="font-medium">{d.qq || '—'}</span></div>
              <div><span className="text-muted-foreground">IP: </span><span className="font-mono text-xs">{d.ip_address || '—'}</span>{d.ip_location && <span className="ml-1 text-muted-foreground">· {d.ip_location}</span>}</div>
              <div><span className="text-muted-foreground">提交时间: </span><span className="font-medium">{fmt(d.created_at)}</span></div>
              <div><span className="text-muted-foreground">填写耗时: </span><span className="font-medium">{fmtDuration(d.fill_duration)}</span></div>
              <div><span className="text-muted-foreground">首次查看: </span><span className="font-medium">{fmt(d.first_viewed_at)}</span></div>
              {d.reviewed_at && (
                <div><span className="text-muted-foreground">审核时间: </span><span className="font-medium">{fmt(d.reviewed_at)}</span></div>
              )}
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto scrollbar-thin pr-1">
              {d.answers.map((a) => {
                const imgs = answerImages(a)
                return (
                  <div key={a.id} className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">{a.question_title}</p>
                    {imgs ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {imgs.map((src, i) => (
                          <a key={i} href={surveyImageUrl(src)} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={surveyImageUrl(src)}
                              alt={`${a.question_title} 图片 ${i + 1}`}
                              loading="lazy"
                              className="h-28 w-28 rounded-md border object-cover transition-opacity hover:opacity-80"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm">{renderAnswer(a)}</p>
                    )}
                  </div>
                )
              })}
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

// Tab 标签里的计数: 统计未就绪时不占位, 就绪后以弱化样式跟在标签后
function TabCount({ n }: { n?: number }) {
  if (n == null) return null
  return <span className="ml-1.5 text-xs tabular-nums opacity-70">{n}</span>
}

export function ReviewPage() {
  const [status, setStatus] = useState<SubmissionStatus | 'ALL'>('pending')
  const [reviewId, setReviewId] = useState<number | null>(null)
  const stats = useSubmissionStats()
  const subs = useSubmissions({ status: status === 'ALL' ? undefined : status, size: 50 })
  const c = stats.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">问卷审核</h1>
        <p className="mt-1 text-sm text-muted-foreground">玩家提交审核与加白</p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as SubmissionStatus | 'ALL')}>
        <TabsList>
          <TabsTrigger value="pending">待审核<TabCount n={c?.pending} /></TabsTrigger>
          <TabsTrigger value="approved">已通过<TabCount n={c?.approved} /></TabsTrigger>
          <TabsTrigger value="rejected">已拒绝<TabCount n={c?.rejected} /></TabsTrigger>
          <TabsTrigger value="ALL">全部<TabCount n={c?.total} /></TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border">
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
                      <TableCell className="font-medium">
                        {s.player_name}
                        {s.status === 'pending' && s.in_review_group === false && (
                          <Badge variant="warning" className="ml-2 font-normal">未在审核群</Badge>
                        )}
                      </TableCell>
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

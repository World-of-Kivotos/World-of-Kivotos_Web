import { useState } from 'react'
import { Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useSubmissions, useSubmissionDetail } from '@/hooks/useSubmission'
import { useSurveyAnalytics } from '@/hooks/useSurvey'
import { submissionApi, surveyImageUrl } from '@/services/survey'
import { answerAttachments } from '@/lib/attachments'
import { AttachmentList } from '@/components/AttachmentList'
import type { SubmissionAnswer, QuestionOption } from '@/types/submission'
import type { AnalyticsDailyPoint, AnalyticsQuestion, QuestionType, SurveyAnalytics } from '@/types/survey'
import { toast } from 'sonner'

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

function optionLabel(value: string, options?: QuestionOption[] | null): string {
  return options?.find((o) => o.value === value)?.label ?? value
}

// 答案 content 形态: single/boolean -> {value}, multiple -> {values}, text -> {text},
// image -> {images}, file -> {files: [{url,name,size}]}
function renderAnswer(a: SubmissionAnswer): string {
  const c = a.content
  if (c == null) return '—'
  if (typeof c === 'boolean') return c ? '是' : '否'
  if (typeof c === 'string') return c.trim() || '—'
  if (Array.isArray(c)) return c.length ? c.map((v) => optionLabel(String(v), a.question_options)).join('、') : '—'
  if (typeof c.value === 'boolean') return c.value ? '是' : '否'
  if (Array.isArray(c.values)) return c.values.length ? c.values.map((v) => optionLabel(String(v), a.question_options)).join('、') : '—'
  if (c.value != null && c.value !== '') return optionLabel(String(c.value), a.question_options)
  if (typeof c.text === 'string') return c.text.trim() || '—'
  if (Array.isArray(c.images)) return c.images.length ? `${c.images.length} 张图片` : '—'
  if (Array.isArray(c.files)) return c.files.length ? `${c.files.length} 个文件` : '—'
  return '—'
}

function answerImages(a: SubmissionAnswer): string[] | null {
  const c = a.content
  if (c && typeof c === 'object' && !Array.isArray(c) && Array.isArray(c.images)) {
    const imgs = c.images.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    return imgs.length ? imgs : null
  }
  return null
}

function AnswersDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const detail = useSubmissionDetail(id)
  const d = detail.data
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d?.player_name || `提交 #${id}`}</DialogTitle>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : !d ? (
          <p className="text-sm text-muted-foreground">加载失败</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto scrollbar-thin pr-1">
            <p className="text-xs text-muted-foreground">提交时间 {fmt(d.created_at)}</p>
            {d.answers.map((a) => {
              const imgs = answerImages(a)
              const files = answerAttachments(a)
              return (
                <div key={a.id} className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{a.question_title}</p>
                  {files ? (
                    <AttachmentList files={files} />
                  ) : imgs ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {imgs.map((src, i) => (
                        <a key={i} href={surveyImageUrl(src)} target="_blank" rel="noreferrer">
                          <img
                            src={surveyImageUrl(src)}
                            alt={`${a.question_title} 图片 ${i + 1}`}
                            loading="lazy"
                            className="h-24 w-24 rounded-md border object-cover transition-opacity hover:opacity-80"
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
        )}
      </DialogContent>
    </Dialog>
  )
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  select: '下拉单选',
  multiple: '多选题',
  boolean: '判断题',
  text: '文本题',
  short_text: '单行文本',
  number: '数字题',
  date: '日期题',
  rating: '评分题',
  image: '图片题',
  file: '文件题',
  // 分节说明块不收答案, 后端统计已把它整行排除; 这里保留标签只是为了类型完备
  section: '分节说明',
}

// 后端对这些题型不产出任何可聚合结构 (distribution/numeric/samples 全空), 直接给出去处而非空白
function noAggregateHint(type: QuestionType): string {
  if (type === 'image') return '图片题不做聚合统计, 请在「提交列表」里逐份查看'
  if (type === 'file') return '文件题不做聚合统计, 请在「提交列表」里逐份下载查看'
  if (type === 'date') return '日期题不做聚合统计, 可导出 CSV 后自行分析'
  return '暂无有效作答'
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/**
 * 单条占比横条。
 * 面板没有图表库且本次不新增依赖, 全部用 div 宽度百分比手绘。
 * 计数为正但占比极低时给 2% 的最小可视宽度, 否则条会缩成看不见的一条线, 让人误以为是 0。
 */
function BarRow({ label, count, percent }: { label: string; count: number; percent: number }) {
  const width = count > 0 ? Math.max(2, Math.min(100, percent)) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {count} · {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

/**
 * 每日提交趋势。
 * 后端不给无提交日期补零, 所以柱子之间不是等距日历刻度 —— 用等宽柱 + 首尾日期标注表达"最近若干个有提交的日子",
 * 悬停 title 给出确切日期与份数。
 */
function DailyTrend({ daily }: { daily: AnalyticsDailyPoint[] }) {
  if (daily.length === 0) {
    return <p className="text-sm text-muted-foreground">最近 30 天没有提交</p>
  }
  const max = Math.max(...daily.map((d) => d.count))
  return (
    <div className="space-y-2">
      <div className="flex h-28 items-end gap-1">
        {daily.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
            style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
            title={`${d.date} · ${d.count} 份`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{daily[0].date}</span>
        <span>峰值 {max} 份/天</span>
        <span>{daily[daily.length - 1].date}</span>
      </div>
    </div>
  )
}

function QuestionStats({ q }: { q: AnalyticsQuestion }) {
  const hasContent = q.distribution.length > 0 || q.numeric != null || q.samples.length > 0
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">{q.title}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="font-normal">{QUESTION_TYPE_LABELS[q.type]}</Badge>
          <span className="text-xs text-muted-foreground tabular-nums">已答 {q.answered}</span>
        </div>
      </div>

      {q.distribution.length > 0 && (
        <div className="space-y-2">
          {q.distribution.map((d) => (
            <BarRow key={d.value} label={d.label} count={d.count} percent={d.percent} />
          ))}
        </div>
      )}

      {q.numeric && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="最小" value={String(q.numeric.min)} />
          <StatTile label="平均" value={q.numeric.avg.toFixed(1)} />
          <StatTile label="最大" value={String(q.numeric.max)} />
        </div>
      )}

      {q.samples.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">最近 {q.samples.length} 条作答</p>
          {q.samples.map((s, i) => (
            <p key={i} className="rounded-md bg-muted/40 px-2 py-1.5 text-sm">{s}</p>
          ))}
        </div>
      )}

      {!hasContent && <p className="text-sm text-muted-foreground">{noAggregateHint(q.type)}</p>}
    </div>
  )
}

function AnalyticsPanel({ data }: { data: SurveyAnalytics }) {
  const { by_status: status } = data
  return (
    <div className="max-h-[60vh] space-y-5 overflow-y-auto scrollbar-thin pr-1">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="总提交" value={String(data.total_submissions)} />
        <StatTile label="待审核" value={String(status.pending)} />
        <StatTile label="已通过" value={String(status.approved)} />
        <StatTile label="已拒绝" value={String(status.rejected)} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <StatTile label="平均填写耗时" value={fmtDuration(data.avg_fill_duration)} />
        <StatTile label="有作答的题目" value={`${data.questions.filter((q) => q.answered > 0).length} / ${data.questions.length}`} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">每日提交趋势 (最近 30 天)</p>
        <DailyTrend daily={data.daily} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">逐题统计</p>
        {data.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">该问卷还没有题目</p>
        ) : (
          <div className="space-y-3">
            {data.questions.map((q) => (
              <QuestionStats key={q.question_id} q={q} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 收集表结果: 列出某问卷的全部提交, 可查看答案与导出 CSV (免审收集表的"展示 + 导出"), 并给出聚合统计。
export function SurveyResultsModal({
  surveyId,
  surveyTitle,
  onClose,
}: {
  surveyId: number
  surveyTitle: string
  onClose: () => void
}) {
  const [tab, setTab] = useState('list')
  const subs = useSubmissions({ survey_id: surveyId, size: 100 })
  // 逐题聚合在后端是全量扫答案的重查询, 只在真正切到统计页时才拉
  const analytics = useSurveyAnalytics(surveyId, tab === 'stats')
  const [viewId, setViewId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const items = subs.data?.items ?? []

  const doExport = async () => {
    setExporting(true)
    try {
      await submissionApi.exportSurveyCsv(surveyId, surveyTitle)
      toast.success('已导出 CSV')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-6">
            <span className="truncate">结果 · {surveyTitle}</span>
            <Button size="sm" variant="outline" disabled={exporting || items.length === 0} onClick={doExport}>
              <Download /> 导出 CSV
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="list">提交列表</TabsTrigger>
            <TabsTrigger value="stats">统计</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>提交人</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.isLoading ? (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
                  ) : subs.isError ? (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">加载失败 (问卷服务未连接?)</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">暂无提交</TableCell></TableRow>
                  ) : (
                    items.map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{s.player_name || <span className="text-muted-foreground">匿名</span>}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">{fmt(s.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setViewId(s.id)}>查看</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            {analytics.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">统计生成中…</p>
            ) : analytics.isError ? (
              <p className="py-8 text-center text-sm text-muted-foreground">加载失败 (问卷服务未连接?)</p>
            ) : !analytics.data ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无统计数据</p>
            ) : analytics.data.total_submissions === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">还没有人提交, 收到第一份提交后这里会生成统计</p>
            ) : (
              <AnalyticsPanel data={analytics.data} />
            )}
          </TabsContent>
        </Tabs>

        {viewId != null && <AnswersDialog id={viewId} onClose={() => setViewId(null)} />}
      </DialogContent>
    </Dialog>
  )
}

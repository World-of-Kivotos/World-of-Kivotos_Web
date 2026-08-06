import { useState } from 'react'
import { Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useSubmissions, useSubmissionDetail } from '@/hooks/useSubmission'
import { submissionApi, surveyImageUrl } from '@/services/survey'
import type { SubmissionAnswer, QuestionOption } from '@/types/submission'
import { toast } from 'sonner'

function fmt(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

function optionLabel(value: string, options?: QuestionOption[] | null): string {
  return options?.find((o) => o.value === value)?.label ?? value
}

// 答案 content 形态: single/boolean -> {value}, multiple -> {values}, text -> {text}, image -> {images}
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
              return (
                <div key={a.id} className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{a.question_title}</p>
                  {imgs ? (
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

// 收集表结果: 列出某问卷的全部提交, 可查看答案与导出 CSV (免审收集表的"展示 + 导出")。
export function SurveyResultsModal({
  surveyId,
  surveyTitle,
  onClose,
}: {
  surveyId: number
  surveyTitle: string
  onClose: () => void
}) {
  const subs = useSubmissions({ survey_id: surveyId, size: 100 })
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
        {viewId != null && <AnswersDialog id={viewId} onClose={() => setViewId(null)} />}
      </DialogContent>
    </Dialog>
  )
}

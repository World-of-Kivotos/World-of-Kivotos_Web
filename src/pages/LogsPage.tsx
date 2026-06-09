import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { activityApi } from '@/services/activity'
import type { OperationType } from '@/types/activity'

const PAGE_SIZE = 20
const TYPES: { value: OperationType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部类型' },
  { value: 'ADD', label: '添加' },
  { value: 'REMOVE', label: '移除' },
  { value: 'BATCH_ADD', label: '批量添加' },
  { value: 'BATCH_REMOVE', label: '批量移除' },
  { value: 'SYNC', label: '同步' },
  { value: 'QUERY', label: '查询' },
  { value: 'UNAUTHORIZED_ACCESS', label: '未授权访问' },
]

function typeBadge(t: OperationType) {
  if (t === 'UNAUTHORIZED_ACCESS') return <Badge variant="destructive">未授权访问</Badge>
  if (t === 'ADD' || t === 'BATCH_ADD') return <Badge variant="success">{t}</Badge>
  if (t === 'REMOVE' || t === 'BATCH_REMOVE') return <Badge variant="warning">{t}</Badge>
  return <Badge variant="outline" className="font-normal">{t}</Badge>
}

function fmt(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

export function LogsPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<OperationType | 'ALL'>('ALL')

  const logs = useQuery({
    queryKey: ['oplogs', type, page],
    queryFn: () =>
      activityApi.getOperationLogs({
        type: type === 'ALL' ? undefined : type,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    staleTime: 15 * 1000,
  })

  const data = logs.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">操作日志</h1>
        <p className="mt-1 text-sm text-muted-foreground">白名单操作与未授权访问审计</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={(v) => { setType(v as OperationType | 'ALL'); setPage(1) }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => logs.refetch()} disabled={logs.isFetching}>
              {logs.isFetching ? '刷新中…' : '刷新'}
            </Button>
          </div>

          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>来源 IP</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
                ) : logs.isError ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">加载失败 (服务器未连接?)</TableCell></TableRow>
                ) : !data || data.logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">暂无日志</TableCell></TableRow>
                ) : (
                  data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{typeBadge(log.operation_type)}</TableCell>
                      <TableCell className="text-sm">{log.target_name || log.target_uuid || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.operator_ip || '—'}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">{log.response_status}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">{fmt(log.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">第 {page} / {totalPages} 页 · 共 {data.total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

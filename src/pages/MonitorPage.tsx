import { Activity, Timer, Cpu, MemoryStick, Layers } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useServerPerformance } from '@/hooks/useServer'

function tpsStatus(tps?: number) {
  if (tps == null) return 'default' as const
  if (tps >= 19) return 'success' as const
  if (tps >= 15) return 'warning' as const
  return 'danger' as const
}

function gb(n?: number) {
  return n != null ? (n / 1073741824).toFixed(2) : '—'
}

function pct(n?: number) {
  return n != null ? `${n.toFixed(1)}%` : '—'
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

export function MonitorPage() {
  const { data, isLoading, isError, refetch, isFetching } = useServerPerformance()

  const tps = data?.tps?.values?.last_1m
  const mspt = data?.mspt?.values?.last_1m?.mean
  const cpuProc = data?.cpu?.process?.last_1m
  const heap = data?.memory?.heap
  const memPct = heap?.usage_percent ?? (heap && heap.max > 0 ? (heap.used / heap.max) * 100 : undefined)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">服务器监控</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            实时性能 · 10s 刷新
            {data && (
              <Badge variant={data.sparkAvailable ? 'success' : 'secondary'}>
                {data.sparkAvailable ? 'Spark' : 'JVM 估算'}
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? '刷新中…' : '刷新'}
        </Button>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            无法获取性能数据 (服务器未连接?)
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="TPS" value={tps != null ? tps.toFixed(1) : '—'} icon={Activity} status={tpsStatus(tps)} loading={isLoading} hint="目标 20.0" />
            <StatCard label="MSPT" value={mspt != null ? mspt.toFixed(1) : '—'} unit="ms" icon={Timer} status={mspt != null && mspt > 50 ? 'danger' : mspt != null && mspt > 40 ? 'warning' : 'default'} loading={isLoading} hint="单 tick 耗时 · 阈值 50ms" />
            <StatCard label="进程 CPU" value={cpuProc != null ? (cpuProc * 100).toFixed(0) : '—'} unit={cpuProc != null ? '%' : undefined} icon={Cpu} loading={isLoading} hint={data?.sparkAvailable ? undefined : '需 Spark'} />
            <StatCard label="堆内存" value={memPct != null ? Math.round(memPct) : '—'} unit={memPct != null ? '%' : undefined} icon={MemoryStick} status={memPct != null && memPct >= 90 ? 'danger' : memPct != null && memPct >= 75 ? 'warning' : 'default'} loading={isLoading} hint={heap ? `${gb(heap.used)} / ${gb(heap.max)} GB` : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">TPS / MSPT</CardTitle></CardHeader>
              <CardContent>
                <Row label="TPS 10s" value={data?.tps?.values?.last_10s?.toFixed(2) ?? '—'} />
                <Row label="TPS 1m" value={data?.tps?.values?.last_1m?.toFixed(2) ?? '—'} />
                <Row label="TPS 5m" value={data?.tps?.values?.last_5m?.toFixed(2) ?? '—'} />
                <Row label="MSPT 均值" value={mspt != null ? `${mspt.toFixed(2)} ms` : '—'} />
                <Row label="MSPT 95分位" value={data?.mspt?.values?.last_1m?.percentile_95 != null ? `${data.mspt.values.last_1m.percentile_95.toFixed(2)} ms` : '—'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MemoryStick className="size-4" /> 内存</CardTitle></CardHeader>
              <CardContent>
                <Row label="堆 已用" value={`${gb(heap?.used)} GB`} />
                <Row label="堆 上限" value={`${gb(heap?.max)} GB`} />
                <Row label="堆 占用" value={pct(memPct)} />
                <Row label="非堆 已用" value={`${gb(data?.memory?.non_heap?.used)} GB`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers className="size-4" /> 线程</CardTitle></CardHeader>
              <CardContent>
                <Row label="活动线程" value={data?.threads?.current_thread_count ?? '—'} />
                <Row label="守护线程" value={data?.threads?.daemon_thread_count ?? '—'} />
                <Row label="峰值线程" value={data?.threads?.peak_thread_count ?? '—'} />
                <Row label="累计启动" value={data?.threads?.total_started_thread_count ?? '—'} />
                <Row label="死锁线程" value={data?.threads?.deadlocked_threads ?? 0} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

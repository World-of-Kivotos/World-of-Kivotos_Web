import { ShieldCheck, Users, Activity, MemoryStick } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWhitelistStats } from '@/hooks/useWhitelist'
import { useServerPerformance, useServerPlayers } from '@/hooks/useServer'

function tpsStatus(tps?: number) {
  if (tps == null) return 'default' as const
  if (tps >= 19) return 'success' as const
  if (tps >= 15) return 'warning' as const
  return 'danger' as const
}

export function DashboardPage() {
  const stats = useWhitelistStats()
  const perf = useServerPerformance()
  const players = useServerPlayers()

  const tps = perf.data?.tps?.values?.last_1m
  const heap = perf.data?.memory?.heap
  const memPercent =
    heap?.usage_percent ?? (heap && heap.max > 0 ? (heap.used / heap.max) * 100 : undefined)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">概览</h1>
        <p className="mt-1 text-sm text-muted-foreground">白名单、在线玩家与服务器性能一览</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="白名单"
          value={stats.data?.active_entries ?? '—'}
          icon={ShieldCheck}
          loading={stats.isLoading}
          hint={stats.data ? `共 ${stats.data.total_entries} 条 · 待补 UUID ${stats.data.uuid_pending_entries}` : undefined}
        />
        <StatCard
          label="在线玩家"
          value={players.data?.count ?? '—'}
          unit={players.data ? `/ ${players.data.maxPlayers}` : undefined}
          icon={Users}
          loading={players.isLoading}
        />
        <StatCard
          label="TPS"
          value={tps != null ? tps.toFixed(1) : '—'}
          icon={Activity}
          status={tpsStatus(tps)}
          loading={perf.isLoading}
          hint={perf.data?.sparkAvailable === false ? '估算值 (未装 spark)' : undefined}
        />
        <StatCard
          label="堆内存"
          value={memPercent != null ? Math.round(memPercent) : '—'}
          unit={memPercent != null ? '%' : undefined}
          icon={MemoryStick}
          status={memPercent != null && memPercent >= 90 ? 'danger' : memPercent != null && memPercent >= 75 ? 'warning' : 'default'}
          loading={perf.isLoading}
          hint={
            heap ? `${(heap.used / 1073741824).toFixed(1)} / ${(heap.max / 1073741824).toFixed(1)} GB` : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            在线玩家
            {players.data && (
              <Badge variant="secondary">{players.data.count}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.isLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : players.isError ? (
            <p className="text-sm text-muted-foreground">无法获取在线玩家 (服务器未连接?)</p>
          ) : !players.data || players.data.players.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无在线玩家</p>
          ) : (
            <div className="divide-y">
              {players.data.players.map((p) => (
                <div key={p.uuid} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="font-normal">{p.gameMode}</Badge>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground tabular-nums">
                    <span>{p.dimension.replace('minecraft:', '')}</span>
                    <span>{Math.round(p.x)}, {Math.round(p.y)}, {Math.round(p.z)}</span>
                    <span>{p.ping}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

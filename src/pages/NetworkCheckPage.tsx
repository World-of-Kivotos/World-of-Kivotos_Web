import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  Copy,
  Gauge,
  HelpCircle,
  Loader2,
  RefreshCw,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { classify, probeNode, score, type ProbeOutcome, type QualityLevel } from '@/lib/probe'
import { useNetworkNodes } from '@/hooks/useNetwork'
import type { NetworkNode } from '@/types/network'

/** 延迟条的满格基准。固定而非按当次最大值缩放 —— 相对基准会让最好的那条线永远铺满, 看不出它究竟好不好。 */
const LATENCY_FULL_SCALE_MS = 200

const qualityBadgeVariant: Record<QualityLevel, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  good: 'success',
  fair: 'warning',
  poor: 'destructive',
  unknown: 'secondary',
}

const qualityBarClass: Record<QualityLevel, string> = {
  good: 'bg-success',
  fair: 'bg-warning',
  poor: 'bg-destructive',
  unknown: 'bg-muted-foreground',
}

const qualityIcon: Record<QualityLevel, typeof CheckCircle2> = {
  good: CheckCircle2,
  fair: TriangleAlert,
  poor: XCircle,
  unknown: HelpCircle,
}

function formatMs(value: number | null): string {
  if (value === null) return '--'
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1)
}

/** 单条线路的延迟条。质量同时由颜色与文字档位表达, 色觉障碍下不丢信息。 */
function LatencyBar({ outcome, level }: { outcome: ProbeOutcome | undefined; level: QualityLevel }) {
  const value = outcome?.p50 ?? null
  const ratio = value === null ? 0 : Math.min(1, value / LATENCY_FULL_SCALE_MS)

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', qualityBarClass[level])}
        style={{ width: value === null ? '0%' : `${Math.max(3, ratio * 100)}%` }}
      />
    </div>
  )
}

function NodeCard({
  node,
  outcome,
  testing,
  recommended,
}: {
  node: NetworkNode
  outcome: ProbeOutcome | undefined
  testing: boolean
  recommended: boolean
}) {
  const quality = outcome ? classify(outcome) : { level: 'unknown' as QualityLevel, label: '待测' }
  const QualityIcon = qualityIcon[quality.level]
  const pending = testing && !outcome

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(node.endpoint)
      toast.success(`已复制 ${node.endpoint}`)
    } catch {
      toast.error('复制失败, 请手动选中地址')
    }
  }

  return (
    <Card className={cn('glass p-5', recommended && 'ring-2 ring-success')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{node.name}</h2>
            {recommended && <Badge variant="success">推荐</Badge>}
          </div>
          <button
            type="button"
            onClick={copyEndpoint}
            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="truncate font-mono">{node.endpoint}</span>
            <Copy className="size-3.5 shrink-0" />
          </button>
        </div>
        {pending ? (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Loader2 className="size-3 animate-spin" />
            测速中
          </Badge>
        ) : (
          <Badge variant={qualityBadgeVariant[quality.level]} className="shrink-0 gap-1">
            <QualityIcon className="size-3" />
            {quality.label}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-semibold tabular-nums leading-none">
          {pending ? '--' : formatMs(outcome?.p50 ?? null)}
        </span>
        <span className="text-sm text-muted-foreground">ms 延迟</span>
      </div>

      <div className="mt-3">
        <LatencyBar outcome={pending ? undefined : outcome} level={pending ? 'unknown' : quality.level} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">抖动</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {pending ? '--' : formatMs(outcome?.jitter ?? null)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">峰值</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {pending ? '--' : formatMs(outcome?.p95 ?? null)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">丢包</dt>
          <dd className="mt-0.5 font-mono tabular-nums">
            {pending || !outcome || outcome.status !== 'ok'
              ? '--'
              : `${Math.round(outcome.lossRate * 100)}%`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
        <Users className="size-3.5" />
        <span>
          当前 <span className="font-mono tabular-nums text-foreground">{node.online}</span> 人在这条线上
        </span>
        {node.connecting > 0 && <span>({node.connecting} 个连接中)</span>}
      </div>

      {outcome?.status === 'unreachable' && (
        <p className="mt-2 text-xs text-destructive">{outcome.error}</p>
      )}
      {outcome?.status === 'skipped' && (
        <p className="mt-2 text-xs text-muted-foreground">这条线路未配置探针, 无法测速</p>
      )}
    </Card>
  )
}

/**
 * 玩家线路自查页。公开访问, 不需要登录。
 *
 * 页面同时回答两个问题: 每条线路现在多少人, 以及从你这里连过去有多快。人数来自服务端按
 * 入口端口的统计, 延迟由浏览器现场对各线路探针实测 —— 后者必然因人而异, 所以只能在玩家
 * 自己的机器上测, 服务端算不出来。
 */
export function NetworkCheckPage() {
  const { data, isLoading, isError, refetch } = useNetworkNodes()
  const [results, setResults] = useState<Record<string, ProbeOutcome>>({})
  const [testing, setTesting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes])

  const runProbes = useCallback((targets: NetworkNode[]) => {
    abortRef.current?.abort()
    if (targets.length === 0) return
    const controller = new AbortController()
    abortRef.current = controller
    setResults({})
    setTesting(true)

    // 并行测: 探针消息只有几十字节, 几条线同时跑不会互相挤占带宽, 却能把等待从十几秒压到三秒
    Promise.all(
      targets.map(async (node) => {
        const outcome = await probeNode(node.probeUrl, { signal: controller.signal })
        if (controller.signal.aborted) return
        setResults((previous) => ({ ...previous, [node.id]: outcome }))
      })
    ).finally(() => {
      if (!controller.signal.aborted) setTesting(false)
    })
  }, [])

  // 只在线路定义本身变化时重测。人数轮询每 15 秒返回一次新对象, 若直接依赖 nodes 会没完没了地重测。
  const nodeSignature = useMemo(
    () => nodes.map((node) => `${node.id}:${node.probeUrl}`).join('|'),
    [nodes]
  )

  useEffect(() => {
    if (!nodeSignature) return
    runProbes(nodes)
    // nodes 由 nodeSignature 唯一决定, 单独列出会让轮询的新数组触发重测
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeSignature, runProbes])

  useEffect(() => () => abortRef.current?.abort(), [])

  const recommendedId = useMemo(() => {
    const ranked = nodes
      .map((node) => ({ id: node.id, outcome: results[node.id] }))
      .filter((entry): entry is { id: string; outcome: ProbeOutcome } => entry.outcome?.status === 'ok')
      .sort((a, b) => score(a.outcome) - score(b.outcome))
    return ranked[0]?.id ?? null
  }, [nodes, results])

  const allProbed = nodes.length > 0 && nodes.every((node) => results[node.id])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Gauge className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wide">线路自查</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">挑一条最适合你的线路</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          服务器提供多条接入线路, 内容完全相同, 进哪条都是同一个世界。下面的延迟是从你当前的网络
          实测出来的, 每个人的结果都不一样。选延迟低、抖动小的那条, 复制地址填进游戏即可。
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          {isLoading ? (
            <span>正在获取线路信息...</span>
          ) : (
            <span>
              全服在线{' '}
              <span className="font-mono tabular-nums text-foreground">{data?.totalOnline ?? 0}</span>
              {' / '}
              <span className="font-mono tabular-nums">{data?.maxPlayers ?? 0}</span>
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={testing || nodes.length === 0}
          onClick={() => runProbes(nodes)}
        >
          {testing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              测速中
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              重新测速
            </>
          )}
        </Button>
      </div>

      {isError && (
        <Card className="glass p-5">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="size-4" />
            <span>无法获取线路信息, 服务器可能正在维护</span>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            重试
          </Button>
        </Card>
      )}

      {!isError && !isLoading && nodes.length === 0 && (
        <Card className="glass p-5 text-sm text-muted-foreground">
          服务器尚未配置多线路接入, 请直接使用管理员给出的地址进服。
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            outcome={results[node.id]}
            testing={testing}
            recommended={allProbed && node.id === recommendedId}
          />
        ))}
      </div>

      <section className="mt-10 border-t border-border pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="size-4" />
          <h2 className="text-sm font-medium">这几个数字怎么看</h2>
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium">延迟</dt>
            <dd className="mt-1 text-muted-foreground">
              一次往返的耗时。80ms 以内基本感觉不到, 150ms 以上打怪放方块会明显滞后。
            </dd>
          </div>
          <div>
            <dt className="font-medium">抖动</dt>
            <dd className="mt-1 text-muted-foreground">
              延迟的波动幅度。它比延迟本身更影响手感 —— 稳定的 90ms 比在 40 和 120 之间反复横跳好玩得多。
            </dd>
          </div>
          <div>
            <dt className="font-medium">丢包</dt>
            <dd className="mt-1 text-muted-foreground">
              数据没能送达的比例。超过百分之一就可能出现动作丢失、方块放了又弹回来。
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

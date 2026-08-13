import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Loader2, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PROBE_TOTAL_MS,
  probeNode,
  score,
  type ProbeOutcome,
} from '@/lib/probe'
import { useNetworkNodes } from '@/hooks/useNetwork'
import type { NetworkNode } from '@/types/network'

type Phase = 'loading' | 'testing' | 'done'

interface LiveState {
  lastRtt: number | null
  received: number
}

/** 质量分档。黑白配色下不靠颜色区分, 用文字档位加灰阶深浅表达。 */
const GRADES = [
  { max: 50, label: '极佳', bar: 'bg-foreground' },
  { max: 100, label: '良好', bar: 'bg-foreground/70' },
  { max: 180, label: '一般', bar: 'bg-foreground/40' },
  { max: Infinity, label: '较差', bar: 'bg-foreground/20' },
] as const

function grade(outcome: ProbeOutcome | undefined) {
  if (!outcome || outcome.status !== 'ok' || outcome.p50 === null) {
    return { label: '不可用', bar: 'bg-foreground/10' }
  }
  // 丢包比延迟更致命: 超过 2% 直接压到最低档, 再低的平均延迟也救不回来
  if (outcome.lossRate > 0.02) return { label: '较差', bar: 'bg-foreground/20' }
  return GRADES.find((g) => (outcome.p50 as number) <= g.max) ?? GRADES[GRADES.length - 1]
}

function ms(value: number | null): string {
  if (value === null) return '--'
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1)
}

/** 延迟条。固定 200ms 满格而非按当次最大值缩放 —— 相对基准会让最快那条永远铺满, 看不出快到什么程度。 */
function Bar({ outcome }: { outcome: ProbeOutcome | undefined }) {
  const g = grade(outcome)
  const value = outcome?.p50 ?? null
  const ratio = value === null ? 0 : Math.min(1, value / 200)
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className={cn('h-full rounded-full transition-all duration-500', g.bar)}
        style={{ width: value === null ? '0%' : `${Math.max(4, ratio * 100)}%` }}
      />
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setCopied(false)
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-current/20 px-2.5 py-1 text-xs transition-opacity hover:opacity-70"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

/**
 * 玩家线路自查页。公开访问, 打开即自动测速。
 *
 * 延迟只能在玩家自己的机器上测 —— 服务端算不出每个人到各节点的往返, 所以这里由浏览器
 * 现场对每条线路的 WebSocket 探针实测 15 秒。
 */
export function NetworkCheckPage() {
  const { data, isLoading } = useNetworkNodes()
  const [results, setResults] = useState<Record<string, ProbeOutcome>>({})
  const [live, setLive] = useState<Record<string, LiveState>>({})
  const [phase, setPhase] = useState<Phase>('loading')
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes])

  const runProbes = useCallback((targets: NetworkNode[]) => {
    abortRef.current?.abort()
    if (tickRef.current) clearInterval(tickRef.current)
    if (targets.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller
    setResults({})
    setLive({})
    setElapsed(0)
    setPhase('testing')

    const startedAt = performance.now()
    tickRef.current = setInterval(() => {
      setElapsed(Math.min(PROBE_TOTAL_MS, performance.now() - startedAt))
    }, 100)

    // 并行测: 探针消息只有几十字节, 几条线同时跑不会互相挤占带宽,
    // 却能把等待从"线路数 x 15 秒"压到一个 15 秒
    Promise.all(
      targets.map(async (node) => {
        const outcome = await probeNode(node.probeUrl, {
          signal: controller.signal,
          onSample: (rtt, received) =>
            setLive((prev) => ({ ...prev, [node.id]: { lastRtt: rtt, received } })),
        })
        if (controller.signal.aborted) return
        setResults((prev) => ({ ...prev, [node.id]: outcome }))
      })
    ).finally(() => {
      if (controller.signal.aborted) return
      if (tickRef.current) clearInterval(tickRef.current)
      setElapsed(PROBE_TOTAL_MS)
      setPhase('done')
    })
  }, [])

  // 只在线路定义本身变化时自动开测。人数轮询每 15 秒返回一次新数组,
  // 若直接依赖 nodes 会没完没了地重测。
  const signature = useMemo(
    () => nodes.map((n) => `${n.id}:${n.probeUrl}`).join('|'),
    [nodes]
  )

  useEffect(() => {
    if (!signature) return
    runProbes(nodes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, runProbes])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (tickRef.current) clearInterval(tickRef.current)
    },
    []
  )

  /** 报告按综合得分排序: 抖动权重是延迟的两倍, 丢包再高一档 —— 稳定的 90ms 比在 40 与 120 之间反复横跳好玩得多。 */
  const ranked = useMemo(() => {
    return nodes
      .map((node) => ({ node, outcome: results[node.id] }))
      .sort((a, b) => {
        const sa = a.outcome ? score(a.outcome) : Number.POSITIVE_INFINITY
        const sb = b.outcome ? score(b.outcome) : Number.POSITIVE_INFINITY
        return sa - sb
      })
  }, [nodes, results])

  const best = phase === 'done' ? ranked.find((r) => r.outcome?.status === 'ok') : undefined
  const progress = Math.round((elapsed / PROBE_TOTAL_MS) * 100)
  const remaining = Math.max(0, Math.ceil((PROBE_TOTAL_MS - elapsed) / 1000))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-6">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">线路测速</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            服务器提供多条接入线路，内容完全相同，进哪条都是同一个世界。
            下面的结果是从你当前网络实测出来的，每个人都不一样。
          </p>
        </header>

        {/* 进度 */}
        <div className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm">
              {isLoading && '正在获取线路…'}
              {phase === 'testing' && (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  正在测试 {nodes.length} 条线路
                </span>
              )}
              {phase === 'done' && '测试完成'}
            </span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {phase === 'testing' ? `${remaining}s` : `${Math.round(PROBE_TOTAL_MS / 1000)}s`}
            </span>
          </div>
          <div className="h-0.5 w-full overflow-hidden bg-foreground/10">
            <div
              className="h-full bg-foreground transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 推荐 */}
        {best && (
          <section className="mb-10 rounded-xl bg-foreground p-6 text-background">
            <div className="text-xs uppercase tracking-widest opacity-60">推荐线路</div>
            <div className="mt-2 text-xl font-semibold">{best.node.name}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="font-mono text-sm">{best.node.endpoint}</code>
              <CopyButton text={best.node.endpoint} />
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-current/15 pt-4 text-sm">
              <div>
                <dt className="text-xs opacity-60">延迟</dt>
                <dd className="mt-1 font-mono text-lg tabular-nums">{ms(best.outcome!.p50)} ms</dd>
              </div>
              <div>
                <dt className="text-xs opacity-60">丢包</dt>
                <dd className="mt-1 font-mono text-lg tabular-nums">
                  {Math.round(best.outcome!.lossRate * 100)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs opacity-60">抖动</dt>
                <dd className="mt-1 font-mono text-lg tabular-nums">{ms(best.outcome!.jitter)} ms</dd>
              </div>
            </dl>
          </section>
        )}

        {/* 报告 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {phase === 'done' ? '完整报告' : '实时结果'}
            </h2>
            {phase === 'done' && (
              <button
                type="button"
                onClick={() => runProbes(nodes)}
                className="inline-flex items-center gap-1.5 rounded-md border border-foreground/15 px-3 py-1.5 text-xs transition-colors hover:bg-foreground/5"
              >
                <RotateCw className="size-3.5" />
                重新测试
              </button>
            )}
          </div>

          <div className="divide-y divide-foreground/10 border-y border-foreground/10">
            {nodes.length === 0 && !isLoading && (
              <div className="py-8 text-sm text-muted-foreground">
                服务器尚未配置多线路接入。
              </div>
            )}
            {ranked.map(({ node, outcome }) => {
              const g = grade(outcome)
              const state = live[node.id]
              const pending = phase === 'testing' && !outcome
              const value = outcome?.p50 ?? state?.lastRtt ?? null
              return (
                <div key={node.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex min-w-0 items-baseline gap-2.5">
                      <span className="truncate text-sm font-medium">{node.name}</span>
                      {best?.node.id === node.id && (
                        <span className="shrink-0 rounded border border-foreground/25 px-1.5 py-0.5 text-[10px] tracking-wide">
                          最佳
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {node.online} 人在线
                      </span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1.5">
                      <span className="font-mono text-lg tabular-nums">{ms(value)}</span>
                      <span className="text-xs text-muted-foreground">ms</span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <Bar outcome={outcome} />
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs tabular-nums text-muted-foreground">
                    <span className="font-sans">{pending ? '测试中…' : g.label}</span>
                    <span>丢包 {outcome?.status === 'ok' ? `${Math.round(outcome.lossRate * 100)}%` : '--'}</span>
                    <span>抖动 {ms(outcome?.jitter ?? null)} ms</span>
                    <span>峰值 {ms(outcome?.p95 ?? null)} ms</span>
                    <span className="font-sans">{node.endpoint}</span>
                  </div>

                  {outcome?.status === 'unreachable' && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      连接失败：{outcome.error}
                    </p>
                  )}
                  {outcome?.status === 'skipped' && (
                    <p className="mt-1.5 text-xs text-muted-foreground">这条线路未开放测速</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <footer className="mt-10 space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground">延迟</span> 一次往返的耗时，
            50ms 以内基本感觉不到，180ms 以上打怪放方块会明显滞后。
          </p>
          <p>
            <span className="text-foreground">丢包</span> 数据没能送达的比例，
            超过 2% 就会出现动作丢失、方块放了又弹回来，比延迟高更难受。
          </p>
          <p>
            <span className="text-foreground">抖动</span> 延迟的波动幅度，
            稳定的 90ms 比在 40 和 120 之间反复横跳好玩得多。
          </p>
        </footer>
      </div>
    </div>
  )
}

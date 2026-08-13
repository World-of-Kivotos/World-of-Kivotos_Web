import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Moon, RotateCw, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { RollingNumber } from '@/components/RollingNumber'
import { LatencySparkline } from '@/components/LatencySparkline'
import { PROBE_TOTAL_MS, probeNode, score, type ProbeOutcome } from '@/lib/probe'
import { useNetworkNodes } from '@/hooks/useNetwork'
import type { NetworkNode } from '@/types/network'

type Phase = 'loading' | 'testing' | 'done'

/** 每条线路要发多少个包, 与 probe 的 14000ms / 250ms 对齐 —— 波形图靠它决定槽位数。 */
const SLOTS = 56

/** 质量分档。黑白配色下不靠颜色区分, 用文字档位加灰阶深浅表达。 */
const GRADES = [
  { max: 50, label: '极佳' },
  { max: 100, label: '良好' },
  { max: 180, label: '一般' },
  { max: Infinity, label: '较差' },
] as const

function grade(outcome: ProbeOutcome | undefined): string {
  if (!outcome || outcome.status !== 'ok' || outcome.p50 === null) return '不可用'
  // 丢包比延迟更致命: 超过 2% 直接压到最低档, 再低的平均延迟也救不回动作丢失的手感
  if (outcome.lossRate > 0.02) return '较差'
  return (GRADES.find((g) => (outcome.p50 as number) <= g.max) ?? GRADES[3]).label
}

function ms(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1)
}

/**
 * 测量途中的即时读数取已采样本的中位数, 而不是最后一次往返。
 *
 * 单次往返本身就抖, 直接显示会让数字每 250ms 乱跳一次, 既读不出来也没法做翻页动画;
 * 中位数随样本增加平缓收敛, 而且它就是最终要给出的那个指标 —— 玩家看到的数字一路
 * 逼近终值, 不会在结束瞬间突变。
 */
function runningMedian(wave: (number | undefined)[]): number | null {
  const values = wave.filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const CARD =
  'rounded-2xl border border-black/[0.07] bg-white/55 backdrop-blur-xl backdrop-saturate-150 ' +
  'dark:border-white/[0.08] dark:bg-white/[0.045]'

function CopyButton({ text, tone = 'default' }: { text: string; tone?: 'default' | 'invert' }) {
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
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all duration-200 active:scale-95',
        tone === 'invert'
          ? 'border-current/25 hover:bg-current/10'
          : 'border-black/10 hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/10'
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

/**
 * 玩家线路自查页。公开访问, 打开即自动测速 15 秒。
 *
 * 延迟只能在玩家自己的机器上测 —— 服务端算不出每个人到各节点的往返, 所以这里由浏览器
 * 现场对每条线路的 WebSocket 探针实测。
 */
export function NetworkCheckPage() {
  const { data, isLoading } = useNetworkNodes()
  const { theme, toggle } = useTheme()
  const [results, setResults] = useState<Record<string, ProbeOutcome>>({})
  const [waves, setWaves] = useState<Record<string, (number | undefined)[]>>({})
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
    setWaves({})
    setElapsed(0)
    setPhase('testing')

    const startedAt = performance.now()
    tickRef.current = setInterval(() => {
      setElapsed(Math.min(PROBE_TOTAL_MS, performance.now() - startedAt))
    }, 80)

    // 并行测: 探针消息只有几十字节, 几条线同时跑不会互相挤占带宽,
    // 却能把等待从"线路数 x 15 秒"压到一个 15 秒
    Promise.all(
      targets.map(async (node) => {
        const outcome = await probeNode(node.probeUrl, {
          signal: controller.signal,
          onSample: ({ seq, rtt }) =>
            setWaves((prev) => {
              const next = (prev[node.id] ?? []).slice()
              next[seq] = rtt
              return { ...prev, [node.id]: next }
            }),
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
  const signature = useMemo(() => nodes.map((n) => `${n.id}:${n.probeUrl}`).join('|'), [nodes])

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

  /** 排序: 抖动权重是延迟的两倍, 丢包再高一档 —— 稳定的 90ms 比在 40 与 120 之间横跳好玩得多。 */
  const ranked = useMemo(
    () =>
      nodes
        .map((node) => ({ node, outcome: results[node.id] }))
        .sort((a, b) => {
          const sa = a.outcome ? score(a.outcome) : Number.POSITIVE_INFINITY
          const sb = b.outcome ? score(b.outcome) : Number.POSITIVE_INFINITY
          return sa - sb
        }),
    [nodes, results]
  )

  const best = phase === 'done' ? ranked.find((r) => r.outcome?.status === 'ok') : undefined
  const progress = (elapsed / PROBE_TOTAL_MS) * 100
  const remaining = Math.max(0, Math.ceil((PROBE_TOTAL_MS - elapsed) / 1000))

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 毛玻璃需要底下有东西可以模糊, 所以铺一层极淡的灰度光晕 —— 保持黑白, 不引入色相 */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-neutral-100 dark:bg-neutral-950">
        <div className="absolute -left-[15%] -top-[10%] size-[55vw] rounded-full bg-white/70 blur-[110px] dark:bg-white/[0.045]" />
        <div className="absolute -right-[10%] top-[30%] size-[45vw] rounded-full bg-neutral-400/25 blur-[120px] dark:bg-white/[0.03]" />
        <div className="absolute bottom-[-15%] left-[20%] size-[50vw] rounded-full bg-neutral-300/30 blur-[130px] dark:bg-white/[0.025]" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-6">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">线路测速</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              服务器提供多条接入线路，内容完全相同，进哪条都是同一个世界。
              下面的结果是从你当前网络实测出来的，每个人都不一样。
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="切换主题"
            className={cn(
              CARD,
              'shrink-0 rounded-xl p-2.5 transition-all duration-200 hover:scale-105 active:scale-95'
            )}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>

        {/* 进度 */}
        <div className={cn(CARD, 'mb-8 px-5 py-4 animate-in fade-in duration-500')}>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm">
              {isLoading && '正在获取线路…'}
              {phase === 'testing' && (
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/40" />
                    <span className="relative inline-flex size-2 rounded-full bg-foreground/70" />
                  </span>
                  正在测试 {nodes.length} 条线路
                </span>
              )}
              {phase === 'done' && '测试完成'}
            </span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {phase === 'testing' ? `${remaining}s` : `${Math.round(PROBE_TOTAL_MS / 1000)}s`}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
            <div
              className="h-full rounded-full bg-foreground/80 transition-[width] duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 推荐 */}
        {best && (
          <section
            className={cn(
              'mb-8 overflow-hidden rounded-2xl p-6 shadow-xl backdrop-blur-2xl',
              'border border-white/10 bg-neutral-900/90 text-neutral-50',
              'dark:border-white/[0.12] dark:bg-white/[0.07] dark:text-white',
              'animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-700'
            )}
          >
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-55">推荐线路</div>
            <div className="mt-2 text-xl font-semibold">{best.node.name}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="font-mono text-sm opacity-90">{best.node.endpoint}</code>
              <CopyButton text={best.node.endpoint} tone="invert" />
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-current/15 pt-5">
              <div>
                <dt className="text-[11px] uppercase tracking-wider opacity-55">延迟</dt>
                <dd className="mt-1.5 font-mono text-2xl leading-none">
                  <RollingNumber value={ms(best.outcome!.p50)} />
                  <span className="ml-1 text-sm opacity-55">ms</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider opacity-55">丢包</dt>
                <dd className="mt-1.5 font-mono text-2xl leading-none">
                  <RollingNumber value={Math.round(best.outcome!.lossRate * 100).toString()} />
                  <span className="ml-1 text-sm opacity-55">%</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider opacity-55">抖动</dt>
                <dd className="mt-1.5 font-mono text-2xl leading-none">
                  <RollingNumber value={ms(best.outcome!.jitter)} />
                  <span className="ml-1 text-sm opacity-55">ms</span>
                </dd>
              </div>
            </dl>
          </section>
        )}

        {/* 报告 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">{phase === 'done' ? '完整报告' : '实时波形'}</h2>
            {phase === 'done' && (
              <button
                type="button"
                onClick={() => runProbes(nodes)}
                className={cn(
                  CARD,
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all duration-200 hover:scale-[1.03] active:scale-95'
                )}
              >
                <RotateCw className="size-3.5" />
                重新测试
              </button>
            )}
          </div>

          {nodes.length === 0 && !isLoading && (
            <div className={cn(CARD, 'px-5 py-8 text-sm text-muted-foreground')}>
              服务器尚未配置多线路接入。
            </div>
          )}

          <div className="space-y-3">
            {ranked.map(({ node, outcome }, i) => {
              const wave = waves[node.id] ?? []
              const value = outcome?.p50 ?? runningMedian(wave)
              const isBest = best?.node.id === node.id
              return (
                <article
                  key={node.id}
                  className={cn(
                    CARD,
                    'px-5 py-4 transition-all duration-500',
                    isBest && 'ring-1 ring-foreground/20',
                    'animate-in fade-in slide-in-from-bottom-2'
                  )}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex min-w-0 items-baseline gap-2.5">
                      <span className="truncate text-sm font-medium">{node.name}</span>
                      {isBest && (
                        <span className="shrink-0 rounded-md border border-foreground/20 px-1.5 py-0.5 text-[10px] tracking-wide">
                          最佳
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {node.online} 人在线
                      </span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1">
                      <span className="font-mono text-xl leading-none">
                        {/* 测量途中缩短滚动时长: 采样间隔 250ms, 用终值那套 620ms 会让上一次还没
                            滚完下一个值就来了, 数字一直悬在中间读不出来 */}
                        <RollingNumber value={ms(value)} duration={phase === 'done' ? 620 : 260} />
                      </span>
                      <span className="text-xs text-muted-foreground">ms</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <LatencySparkline samples={wave} slots={SLOTS} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span>{phase === 'testing' && !outcome ? '测试中…' : grade(outcome)}</span>
                    <span className="font-mono tabular-nums">
                      丢包 {outcome?.status === 'ok' ? `${Math.round(outcome.lossRate * 100)}%` : '--'}
                    </span>
                    <span className="font-mono tabular-nums">抖动 {ms(outcome?.jitter)} ms</span>
                    <span className="font-mono tabular-nums">峰值 {ms(outcome?.p95)} ms</span>
                    <span className="font-mono">{node.endpoint}</span>
                  </div>

                  {outcome?.status === 'unreachable' && (
                    <p className="mt-2 text-xs text-muted-foreground">连接失败：{outcome.error}</p>
                  )}
                  {outcome?.status === 'skipped' && (
                    <p className="mt-2 text-xs text-muted-foreground">这条线路未开放测速</p>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <footer className="mt-10 space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground">延迟</span> 一次往返的耗时，50ms
            以内基本感觉不到，180ms 以上打怪放方块会明显滞后。
          </p>
          <p>
            <span className="text-foreground">丢包</span> 数据没能送达的比例，超过 2%
            就会出现动作丢失、方块放了又弹回来，比延迟高更难受。
          </p>
          <p>
            <span className="text-foreground">抖动</span> 延迟的波动幅度，稳定的 90ms 比在 40 和
            120 之间反复横跳好玩得多。上面的波形图画的就是每一次往返。
          </p>
        </footer>
      </div>
    </div>
  )
}

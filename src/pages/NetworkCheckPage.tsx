import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Moon, RotateCw, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { RollingNumber } from '@/components/RollingNumber'
import { LatencySparkline } from '@/components/LatencySparkline'
import {
  PROBE_TOTAL_MS,
  PROBE_WARMUP_MS,
  probeNode,
  score,
  summarizeLive,
  type ProbeOutcome,
} from '@/lib/probe'
import { useFlipReorder } from '@/lib/useFlipReorder'
import { useNetworkNodes } from '@/hooks/useNetwork'
import type { NetworkNode } from '@/types/network'

type Phase = 'loading' | 'testing' | 'done'

/** 每条线路要发多少个包, 与 probe 的 11000ms / 250ms 对齐 —— 波形图靠它决定槽位数。 */
const SLOTS = 44

/**
 * 波形与数字的刷新节拍。
 *
 * 采样回调本身绝不能直接 setState: 七条线各自每 250ms 回来一个样本, 就是每秒二十多次
 * 全量重渲染 (七张波形图各 44 个格子)。主线程一直在 React 里忙, WebSocket 的 message
 * 事件只能在队列里排队, 而排队时间会被算进往返耗时 —— 测出来的就成了自己的渲染开销。
 * 所以采样只记账, 渲染按这个固定节拍统一刷。
 */
const FLUSH_MS = 150

/**
 * 重新排序的节拍。
 *
 * 比卡片位移动画 (520ms) 慢, 否则上一次还没滑到位就被下一次打断, 看起来是抖不是滑。
 */
const REORDER_MS = 900

/**
 * 暂时下线的线路。
 *
 * 上海节点的 frp 隧道于 2026-09-01 停用, 但线路仍留在服务端的 network 配置里 —— 照常
 * 探测只会得到一条测不通的线, 玩家分不清是自己的网络坏了还是服务器没了。挂在这里的线路
 * 不发探测包, 卡片灰显并直说暂时下线。节点恢复后把 id 从这里删掉即可, 不必改动别处。
 */
const OFFLINE_NODE_IDS: ReadonlySet<string> = new Set(['shanghai'])

/** 一条线在测量途中攒下的波形。 */
interface LiveWave {
  timeline: (number | undefined)[]
  probed: number
}

/** 把记账用的可变对象拷成不可变快照再交给 React, 否则 state 与 ref 指向同一份, 渲染看不到变化。 */
function snapshotWaves(live: Record<string, LiveWave>): Record<string, LiveWave> {
  const out: Record<string, LiveWave> = {}
  for (const [id, wave] of Object.entries(live)) {
    out[id] = { timeline: wave.timeline.slice(), probed: wave.probed }
  }
  return out
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/** 质量分档。黑白配色下不靠颜色区分, 用文字档位加灰阶深浅表达。 */
const GRADES = [
  { max: 50, label: '极佳' },
  { max: 100, label: '良好' },
  { max: 180, label: '一般' },
  { max: Infinity, label: '较差' },
] as const

function grade(outcome: ProbeOutcome | undefined): string {
  if (!outcome || outcome.status !== 'ok' || outcome.average === null) return '不可用'
  // 丢包比延迟更致命: 超过 2% 直接压到最低档, 再低的平均延迟也救不回动作丢失的手感
  if (outcome.lossRate > 0.02) return '较差'
  return (GRADES.find((g) => (outcome.average as number) <= g.max) ?? GRADES[3]).label
}

function ms(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1)
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
  const [waves, setWaves] = useState<Record<string, LiveWave>>({})
  const [order, setOrder] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flushRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /** 采样落在这里, 不进 state —— 每个样本触发一次渲染会把测量本身做脏, 见 FLUSH_MS。 */
  const liveRef = useRef<Record<string, LiveWave>>({})

  const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes])
  /** 真正要发包的线路。下线的线路仍要出现在列表里, 但不参与测量。 */
  const probeTargets = useMemo(() => nodes.filter((node) => !OFFLINE_NODE_IDS.has(node.id)), [nodes])

  const runProbes = useCallback((targets: NetworkNode[]) => {
    abortRef.current?.abort()
    if (tickRef.current) clearInterval(tickRef.current)
    if (flushRef.current) clearInterval(flushRef.current)
    if (targets.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller
    liveRef.current = {}
    setResults({})
    setWaves({})
    setOrder(targets.map((node) => node.id))
    setElapsed(0)
    setPhase('testing')

    const startedAt = performance.now()
    tickRef.current = setInterval(() => {
      setElapsed(Math.min(PROBE_TOTAL_MS, performance.now() - startedAt))
    }, 80)

    flushRef.current = setInterval(() => setWaves(snapshotWaves(liveRef.current)), FLUSH_MS)

    // 并行测: 探针消息只有几十字节, 几条线同时跑不会互相挤占带宽,
    // 却能把等待从"线路数 x 15 秒"压到一个 15 秒
    Promise.all(
      targets.map(async (node) => {
        const outcome = await probeNode(node.probeUrl, {
          signal: controller.signal,
          // 只记账, 一行渲染都不做: 这个回调跑在 WebSocket 的 message 事件里,
          // 在这里多花的每一毫秒都会被算进下一个样本的往返耗时
          onSample: ({ slot, rtt, probed }) => {
            const wave = liveRef.current[node.id] ?? { timeline: [], probed: 0 }
            wave.timeline[slot] = rtt
            wave.probed = probed
            liveRef.current[node.id] = wave
          },
        })
        if (controller.signal.aborted) return
        setResults((prev) => ({ ...prev, [node.id]: outcome }))
      })
    ).finally(() => {
      if (controller.signal.aborted) return
      if (tickRef.current) clearInterval(tickRef.current)
      if (flushRef.current) clearInterval(flushRef.current)
      // 补最后一帧: 定时刷新已经停了, 不补的话末尾几个样本永远画不出来
      setWaves(snapshotWaves(liveRef.current))
      setElapsed(PROBE_TOTAL_MS)
      setPhase('done')
    })
  }, [])

  // 只在线路定义本身变化时自动开测。人数轮询每 15 秒返回一次新数组,
  // 若直接依赖 nodes 会没完没了地重测。
  const signature = useMemo(
    () => probeTargets.map((n) => `${n.id}:${n.probeUrl}`).join('|'),
    [probeTargets]
  )

  useEffect(() => {
    if (!signature) return
    runProbes(probeTargets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, runProbes])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (tickRef.current) clearInterval(tickRef.current)
      if (flushRef.current) clearInterval(flushRef.current)
    },
    []
  )

  /**
   * 每条线当前的结算: 测完的用最终结果, 还在测的用同口径的即时结算。
   *
   * 途中和最终必须是同一套算法, 否则测完那一刻会毫无道理地重排一次。
   */
  const measured = useMemo(() => {
    const map: Record<string, ProbeOutcome | undefined> = {}
    for (const node of nodes) {
      const settled = results[node.id]
      if (settled) {
        map[node.id] = settled
        continue
      }
      const live = waves[node.id]
      map[node.id] = live ? summarizeLive(live.timeline, live.probed) ?? undefined : undefined
    }
    return map
  }, [nodes, results, waves])

  const measuredRef = useRef(measured)
  measuredRef.current = measured

  /** 排序: 抖动权重是延迟的两倍, 丢包再高一档 —— 稳定的 90ms 比在 40 与 120 之间横跳好玩得多。 */
  const reorder = useCallback(() => {
    const current = measuredRef.current
    setOrder((prev) => {
      const next = [...nodes]
        .sort((a, b) => {
          // 下线的线路没有测量结果, 与"测不通"同为无穷分, 显式压到最后免得两者混排
          const offline = Number(OFFLINE_NODE_IDS.has(a.id)) - Number(OFFLINE_NODE_IDS.has(b.id))
          if (offline !== 0) return offline
          const sa = current[a.id] ? score(current[a.id] as ProbeOutcome) : Number.POSITIVE_INFINITY
          const sb = current[b.id] ? score(current[b.id] as ProbeOutcome) : Number.POSITIVE_INFINITY
          return sa - sb
        })
        .map((node) => node.id)
      // 顺序没变就保持原引用: 换了引用会白白触发一次位移动画的计算
      return sameOrder(prev, next) ? prev : next
    })
  }, [nodes])

  // 测量途中按固定节拍重排, 而不是每来一个样本就重排 —— 见 REORDER_MS
  useEffect(() => {
    if (phase !== 'testing') return
    const timer = setInterval(reorder, REORDER_MS)
    return () => clearInterval(timer)
  }, [phase, reorder])

  // 结果逐条落地, 每落一条都要把终序再定一次
  useEffect(() => {
    if (phase !== 'done') return
    reorder()
  }, [phase, measured, reorder])

  const ordered = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const sorted = order
      .map((id) => byId.get(id))
      .filter((node): node is NetworkNode => node !== undefined)
    // 排序表里还没有的线路 (刚上线的) 先垫在后面, 下一拍重排时自然归位
    const rest = nodes.filter((node) => !order.includes(node.id))
    return [...sorted, ...rest]
  }, [nodes, order])

  const registerCard = useFlipReorder(order)

  const best = phase === 'done' ? ordered.find((node) => results[node.id]?.status === 'ok') : undefined
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
                  {/* 预热那几秒一个样本都没有, 不点破的话页面看起来是卡住了 */}
                  {elapsed < PROBE_WARMUP_MS
                    ? '正在建立连接…'
                    : `正在测试 ${probeTargets.length} 条线路`}
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
            <div className="mt-2 text-xl font-semibold">{best.name}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="font-mono text-sm opacity-90">{best.endpoint}</code>
              <CopyButton text={best.endpoint} tone="invert" />
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-current/15 pt-5">
              <div>
                <dt className="text-[11px] uppercase tracking-wider opacity-55">延迟</dt>
                <dd className="mt-1.5 font-mono text-2xl leading-none">
                  <RollingNumber value={ms(results[best.id]?.average)} />
                  <span className="ml-1 text-sm opacity-55">ms</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider opacity-55">丢包</dt>
                <dd className="mt-1.5 font-mono text-2xl leading-none">
                  <RollingNumber
                    value={Math.round((results[best.id]?.lossRate ?? 0) * 100).toString()}
                  />
                  <span className="ml-1 text-sm opacity-55">%</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider opacity-55">抖动</dt>
                <dd className="mt-1.5 font-mono text-2xl leading-none">
                  <RollingNumber value={ms(results[best.id]?.jitter)} />
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
                onClick={() => runProbes(probeTargets)}
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
            {ordered.map((node, i) => {
              const outcome = measured[node.id]
              const settled = results[node.id]
              const live = waves[node.id]
              // 测完以结算结果为准, 与丢包率同源; 测量途中才用实时波形
              const timeline = settled?.timeline ?? live?.timeline ?? []
              const probed = settled?.probed ?? live?.probed ?? 0
              const isBest = best?.id === node.id
              const offline = OFFLINE_NODE_IDS.has(node.id)
              return (
                <article
                  key={node.id}
                  ref={registerCard(node.id)}
                  className={cn(
                    CARD,
                    'px-5 py-4',
                    // 只让描边过渡, 不写 transition-all: 卡片换位由 useFlipReorder 用 transform 驱动,
                    // 让 CSS transition 也去插值 transform 会和它抢同一个属性
                    'transition-[box-shadow,border-color] duration-500',
                    isBest && 'ring-1 ring-foreground/20',
                    // 灰显而不是移除: 玩家要能看出这条线还在, 只是暂时进不去
                    offline && 'opacity-50',
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
                      {offline && (
                        <span className="shrink-0 rounded-md border border-foreground/20 px-1.5 py-0.5 text-[10px] tracking-wide">
                          暂时下线
                        </span>
                      )}
                      {/* 下线线路的人数恒为 0, 照报只会让人以为是没人玩 */}
                      {!offline && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {node.online} 人在线
                        </span>
                      )}
                    </div>
                    {!offline && (
                      <div className="flex shrink-0 items-baseline gap-1">
                        <span className="font-mono text-xl leading-none">
                          {/* 测量途中缩短滚动时长: 采样间隔 250ms, 用终值那套 620ms 会让上一次还没
                              滚完下一个值就来了, 数字一直悬在中间读不出来 */}
                          <RollingNumber
                            value={ms(outcome?.average)}
                            duration={phase === 'done' ? 620 : 260}
                          />
                        </span>
                        <span className="text-xs text-muted-foreground">ms</span>
                      </div>
                    )}
                  </div>

                  {offline ? (
                    // 没有采样就不画波形: 44 个空槽跟 100% 丢包长得一模一样
                    <p className="mt-3 text-xs text-muted-foreground">
                      这条线路暂时下线，请改用其他线路，进哪条都是同一个世界。
                    </p>
                  ) : (
                    <>
                      <div className="mt-3">
                        <LatencySparkline samples={timeline} probed={probed} slots={SLOTS} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span>{phase === 'testing' && !settled ? '测试中…' : grade(outcome)}</span>
                        <span className="font-mono tabular-nums">
                          丢包{' '}
                          {outcome?.status === 'ok'
                            ? `${Math.round(outcome.lossRate * 100)}%`
                            : '--'}
                        </span>
                        <span className="font-mono tabular-nums">抖动 {ms(outcome?.jitter)} ms</span>
                        <span className="font-mono tabular-nums">峰值 {ms(outcome?.p95)} ms</span>
                        <span className="font-mono">{node.endpoint}</span>
                      </div>

                      {settled?.truncated && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          连接中途断开，以上只是断开前那一段的结果，不代表整条线路。
                        </p>
                      )}
                      {settled?.status === 'unreachable' && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          连接失败：{settled.error}
                        </p>
                      )}
                      {settled?.status === 'skipped' && (
                        <p className="mt-2 text-xs text-muted-foreground">这条线路未开放测速</p>
                      )}
                    </>
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

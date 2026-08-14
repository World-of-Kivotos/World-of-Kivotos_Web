/**
 * 线路延迟探测。
 *
 * 对每条线路的 WebSocket 探针反复发小消息并计时。探针部署在 Minecraft 所在的那台机器上,
 * 且经由与游戏流量完全相同的 frp 隧道暴露, 所以测出来的是玩家到服务器的完整往返, 而不是
 * 玩家到某个中转节点的半程。
 *
 * 服务端只做回显, 不解析消息内容, 因此发送时刻直接编在消息里, 收回来相减即是往返耗时。
 */

export type ProbeStatus = 'ok' | 'unreachable' | 'skipped'

export interface ProbeOutcome {
  status: ProbeStatus
  /**
   * 主口径延迟 (毫秒): 两端各去掉一成样本后的平均值, 无有效样本时为 null。
   *
   * 页面上那个大数字用的就是它。纯平均会被一次 GC 或一次路由抖动拉偏, 中位数又只看得见
   * 中间那一个样本 —— 稳在 50ms 的线和在 45 与 60 之间来回的线可能给出同一个中位数。
   * 裁掉两端极值再平均, 既保留整体水平, 又不让个别尖峰说了算。
   */
  average: number | null
  /** 往返延迟中位数 (毫秒), 无有效样本时为 null */
  p50: number | null
  /** 第 95 百分位, 反映偶发的卡顿尖峰 */
  p95: number | null
  /** 抖动: 相邻两次往返耗时之差的绝对值均值, 决定游戏里"一顿一顿"的手感 */
  jitter: number | null
  /** 超时未回的比例 */
  lossRate: number
  sampleCount: number
  /**
   * 按发送次序落位的往返耗时, 下标即第几个探测包 (预热包不占位), 空洞就是没回来的那些。
   *
   * 波形图必须画这个数组而不是自己另攒一份 —— 统计与波形出自同一次结算, 才不会出现
   * "图上一堆空档、丢包却写 0%" 这种自相矛盾。
   */
  timeline: (number | undefined)[]
  /** 实际发出的探测包数 (不含预热包)。波形图靠它区分"发了没回"与"根本没发到那一格"。 */
  probed: number
  /** 连接在测完之前就断了: 统计只覆盖断开前的那一段, 不能当完整测量看待 */
  truncated?: boolean
  error?: string
}

export interface ProbeOptions {
  /** 连上后静默等待多久再开始发包, 让连接进入稳态 */
  warmupMs?: number
  /** 发包总时长 (毫秒), 轮数由它除以间隔得出 */
  durationMs?: number
  /** 发包间隔 (毫秒) */
  intervalMs?: number
  /** 收尾等待时间, 超过此时长仍未回的算丢包 */
  tailWaitMs?: number
  /** 建连超时 */
  connectTimeoutMs?: number
  /**
   * 每收到一个样本回调一次, 仅用于测量途中的实时预览 (最终波形以 outcome.timeline 为准)。
   *
   * slot 是该样本在波形上的落位, probed 是此刻已发出的探测数 —— 两者一起才能把
   * "发了没回" 和 "还没发到那一格" 区分开。
   *
   * 注意: 回调在 WebSocket 的 message 事件里同步触发。这里做的任何事都会算进下一个样本的
   * 往返耗时, 所以实现方必须只做记账, 把渲染攒起来另行节流, 否则测出来的是自己的渲染开销。
   */
  onSample?: (sample: { slot: number; rtt: number; probed: number }) => void
  signal?: AbortSignal
}

interface Sample {
  seq: number
  rtt: number
}

/**
 * 默认 3 秒预热 + 11 秒发包 + 1 秒收尾 = 15 秒。
 *
 * 预热期间连着但不发包: TLS 握手刚完成、浏览器还在收尾建连开销, 这时候的往返耗时明显偏高
 * 且不代表稳态。早先的做法是照发不误、把首包从统计里剔掉, 但那样波形上会永远空出第一格,
 * 图上画成丢包而丢包率写 0%, 自相矛盾。改成静默等待后, 发出去的每一个包都如实计入。
 *
 * 250ms 的间隔给出 44 个样本, 丢包率的分辨率约 2.3% —— 再密下去除了给探针加压并不会让
 * 结论更准, 再稀就会让偶发丢包在统计上失真。
 */
export const PROBE_TOTAL_MS = 15_000

/** 连上后静默预热的时长。页面靠它决定这一段显示"正在建立连接"而不是干等一个空波形。 */
export const PROBE_WARMUP_MS = 3_000

const DEFAULTS = {
  warmupMs: PROBE_WARMUP_MS,
  durationMs: 11_000,
  intervalMs: 250,
  tailWaitMs: 1_000,
  connectTimeoutMs: 6_000,
}

function failed(error: string): ProbeOutcome {
  return {
    status: 'unreachable',
    average: null,
    p50: null,
    p95: null,
    jitter: null,
    lossRate: 1,
    sampleCount: 0,
    timeline: [],
    probed: 0,
    error,
  }
}

/**
 * 截尾均值: 已排序样本两端各裁掉一成再平均。
 *
 * 样本太少时裁不动 (裁完剩不下几个, 结论反而更飘), 直接取全体平均。
 */
export function trimmedMean(sorted: number[]): number | null {
  if (sorted.length === 0) return null
  const mean = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length
  if (sorted.length < 5) return mean(sorted)
  const cut = Math.floor(sorted.length * 0.1)
  return mean(sorted.slice(cut, sorted.length - cut))
}

/** 取排序后数组的百分位值。样本量只有十几个, 用最近秩法即可, 不做插值。 */
function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.ceil(fraction * sorted.length) - 1
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))]
}

/** 抖动按发送序号排序后计算, 而不是按到达顺序 —— 乱序到达时后者会把抖动算大。 */
function meanAbsoluteDifference(samples: Sample[]): number | null {
  if (samples.length < 2) return null
  const ordered = [...samples].sort((a, b) => a.seq - b.seq)
  let total = 0
  for (let i = 1; i < ordered.length; i += 1) {
    total += Math.abs(ordered[i].rtt - ordered[i - 1].rtt)
  }
  return total / (ordered.length - 1)
}

function summarize(
  samples: Sample[],
  probed: number,
  timeline: (number | undefined)[]
): ProbeOutcome {
  if (samples.length === 0) {
    return failed('探针无响应')
  }
  const sorted = samples.map((sample) => sample.rtt).sort((a, b) => a - b)
  return {
    status: 'ok',
    average: trimmedMean(sorted),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    jitter: meanAbsoluteDifference(samples),
    lossRate: probed > 0 ? Math.max(0, (probed - samples.length) / probed) : 0,
    sampleCount: samples.length,
    timeline: timeline.slice(0, probed),
    probed,
  }
}

export function probeNode(url: string, options: ProbeOptions = {}): Promise<ProbeOutcome> {
  const intervalMs = options.intervalMs ?? DEFAULTS.intervalMs
  const rounds = Math.max(2, Math.floor((options.durationMs ?? DEFAULTS.durationMs) / intervalMs))
  const warmupMs = options.warmupMs ?? DEFAULTS.warmupMs
  const tailWaitMs = options.tailWaitMs ?? DEFAULTS.tailWaitMs
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULTS.connectTimeoutMs

  if (!url) {
    return Promise.resolve({
      status: 'skipped',
      average: null,
      p50: null,
      p95: null,
      jitter: null,
      lossRate: 0,
      sampleCount: 0,
      timeline: [],
      probed: 0,
    })
  }

  return new Promise<ProbeOutcome>((resolve) => {
    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch {
      resolve(failed('探针地址无效'))
      return
    }

    const pending = new Map<number, number>()
    const samples: Sample[] = []
    // 波形数组与 samples 同步累积: 两者出自同一个 message 处理, 不可能对不上
    const timeline: (number | undefined)[] = []
    let sent = 0
    let settled = false
    // 三个定时器收在一个对象里, 而不是三个先声明后赋值的 let: finish 可能在 connect 定时器
    // 尚未创建时就被调用 (signal 已取消), 独立的 const 变量在那一刻会撞上暂时性死区
    const timers: {
      send?: ReturnType<typeof setInterval>
      connect?: ReturnType<typeof setTimeout>
      warmup?: ReturnType<typeof setTimeout>
      tail?: ReturnType<typeof setTimeout>
    } = {}

    const finish = (outcome: ProbeOutcome) => {
      if (settled) return
      settled = true
      if (timers.send !== undefined) clearInterval(timers.send)
      if (timers.connect !== undefined) clearTimeout(timers.connect)
      if (timers.warmup !== undefined) clearTimeout(timers.warmup)
      if (timers.tail !== undefined) clearTimeout(timers.tail)
      options.signal?.removeEventListener('abort', onAbort)
      try {
        socket.close()
      } catch {
        // 关闭失败不影响已得到的测量结果
      }
      resolve(outcome)
    }

    function onAbort() {
      finish(failed('已取消'))
    }

    if (options.signal) {
      if (options.signal.aborted) {
        finish(failed('已取消'))
        return
      }
      options.signal.addEventListener('abort', onAbort)
    }

    timers.connect = setTimeout(() => finish(failed('建立连接超时')), connectTimeoutMs)

    socket.onopen = () => {
      if (timers.connect !== undefined) clearTimeout(timers.connect)
      // 静默预热: 连上不等于连稳, 这几秒不发包也不计数
      timers.warmup = setTimeout(() => {
        timers.send = setInterval(() => {
          if (sent >= rounds) {
            if (timers.send !== undefined) clearInterval(timers.send)
            // 收尾等待: 最后几个包还在路上, 立刻结算会把它们误判成丢包
            timers.tail = setTimeout(() => finish(summarize(samples, sent, timeline)), tailWaitMs)
            return
          }
          const seq = sent
          sent += 1
          pending.set(seq, performance.now())
          try {
            socket.send(JSON.stringify({ seq, t: seq }))
          } catch {
            finish(failed('发送失败'))
          }
        }, intervalMs)
      }, warmupMs)
    }

    socket.onmessage = (event) => {
      const arrivedAt = performance.now()
      let seq: unknown
      try {
        seq = JSON.parse(String(event.data)).seq
      } catch {
        return
      }
      if (typeof seq !== 'number') return
      const sentAt = pending.get(seq)
      if (sentAt === undefined) return
      pending.delete(seq)
      const rtt = arrivedAt - sentAt
      samples.push({ seq, rtt })
      timeline[seq] = rtt
      options.onSample?.({ slot: seq, rtt, probed: sent })
    }

    socket.onerror = () => finish(failed('探针连接失败'))

    socket.onclose = () => {
      if (settled) return
      // 走到这里必然是对端主动断开 —— 正常收尾时 finish 已经先把 settled 置上了。
      // 已收到的样本仍然有效, 但只覆盖断开前那一段, 必须标记出来: 否则一条测到一半就断的线
      // 会拿"断开前没丢过包"算出 0% 丢包, 在页面上装成一条健康线路。
      finish(
        samples.length > 0
          ? { ...summarize(samples, sent, timeline), truncated: true }
          : failed('探针连接已断开')
      )
    }
  })
}

export type QualityLevel = 'good' | 'fair' | 'poor' | 'unknown'

export interface Quality {
  level: QualityLevel
  label: string
}

/**
 * 把测量结果归到一个体感档位。
 *
 * 阈值按 Minecraft 的实际手感取: 80ms 以内基本感觉不到延迟; 150ms 以上打怪与放置方块
 * 开始明显滞后。抖动与丢包单独设卡 —— 平均延迟再低, 一抖起来照样卡顿。
 */
export function classify(outcome: ProbeOutcome): Quality {
  if (outcome.status !== 'ok' || outcome.average === null) {
    return { level: 'unknown', label: '不可用' }
  }
  const jitter = outcome.jitter ?? 0
  if (outcome.lossRate > 0.05 || jitter > 40 || outcome.average > 150) {
    return { level: 'poor', label: '较差' }
  }
  if (outcome.lossRate > 0.01 || jitter > 15 || outcome.average > 80) {
    return { level: 'fair', label: '可用' }
  }
  return { level: 'good', label: '流畅' }
}

/**
 * 线路综合得分, 越小越好。抖动的权重高于平均延迟: 稳定的 90ms 比在 40ms 与 120ms 之间
 * 反复横跳的线路好玩得多。丢包权重再高一档, 它直接表现为动作丢失。
 */
export function score(outcome: ProbeOutcome): number {
  if (outcome.status !== 'ok' || outcome.average === null) return Number.POSITIVE_INFINITY
  return outcome.average + (outcome.jitter ?? 0) * 2 + outcome.lossRate * 500
}

/**
 * 用测量途中已经收到的样本做一次即时结算, 口径与最终结果完全一致。
 *
 * 途中排序必须走这里而不是另写一套简化算法 —— 两套口径会让卡片在测完的那一刻莫名其妙
 * 重排一次。样本不足以给出任何结论时返回 null, 由调用方决定怎么排。
 */
export function summarizeLive(
  timeline: (number | undefined)[],
  probed: number
): ProbeOutcome | null {
  const samples: Sample[] = []
  timeline.forEach((rtt, seq) => {
    if (typeof rtt === 'number') samples.push({ seq, rtt })
  })
  if (samples.length === 0) return null
  // 最近发出的两个包可能还在路上, 不计进丢包分母: 否则每发一个包就凭空多出一次"丢包",
  // 而丢包在评分里权重最高, 排序会一路乱跳
  return summarize(samples, Math.max(0, probed - 2), timeline)
}

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
  /** 往返延迟中位数 (毫秒), 无有效样本时为 null */
  p50: number | null
  /** 第 95 百分位, 反映偶发的卡顿尖峰 */
  p95: number | null
  /** 抖动: 相邻两次往返耗时之差的绝对值均值, 决定游戏里"一顿一顿"的手感 */
  jitter: number | null
  /** 超时未回的比例 */
  lossRate: number
  sampleCount: number
  error?: string
}

export interface ProbeOptions {
  /** 发包轮数, 首轮不计入统计 */
  rounds?: number
  /** 发包间隔 (毫秒) */
  intervalMs?: number
  /** 收尾等待时间, 超过此时长仍未回的算丢包 */
  tailWaitMs?: number
  /** 建连超时 */
  connectTimeoutMs?: number
  signal?: AbortSignal
}

interface Sample {
  seq: number
  rtt: number
}

const DEFAULTS = {
  rounds: 15,
  intervalMs: 180,
  tailWaitMs: 2000,
  connectTimeoutMs: 6000,
}

function failed(error: string): ProbeOutcome {
  return { status: 'unreachable', p50: null, p95: null, jitter: null, lossRate: 1, sampleCount: 0, error }
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

function summarize(samples: Sample[], effectiveSent: number): ProbeOutcome {
  if (samples.length === 0) {
    return failed('探针无响应')
  }
  const sorted = samples.map((sample) => sample.rtt).sort((a, b) => a - b)
  return {
    status: 'ok',
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    jitter: meanAbsoluteDifference(samples),
    lossRate: effectiveSent > 0 ? Math.max(0, (effectiveSent - samples.length) / effectiveSent) : 0,
    sampleCount: samples.length,
  }
}

export function probeNode(url: string, options: ProbeOptions = {}): Promise<ProbeOutcome> {
  const rounds = options.rounds ?? DEFAULTS.rounds
  const intervalMs = options.intervalMs ?? DEFAULTS.intervalMs
  const tailWaitMs = options.tailWaitMs ?? DEFAULTS.tailWaitMs
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULTS.connectTimeoutMs

  if (!url) {
    return Promise.resolve({
      status: 'skipped',
      p50: null,
      p95: null,
      jitter: null,
      lossRate: 0,
      sampleCount: 0,
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
    let sent = 0
    let settled = false
    // 三个定时器收在一个对象里, 而不是三个先声明后赋值的 let: finish 可能在 connect 定时器
    // 尚未创建时就被调用 (signal 已取消), 独立的 const 变量在那一刻会撞上暂时性死区
    const timers: {
      send?: ReturnType<typeof setInterval>
      connect?: ReturnType<typeof setTimeout>
      tail?: ReturnType<typeof setTimeout>
    } = {}

    const finish = (outcome: ProbeOutcome) => {
      if (settled) return
      settled = true
      if (timers.send !== undefined) clearInterval(timers.send)
      if (timers.connect !== undefined) clearTimeout(timers.connect)
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
      timers.send = setInterval(() => {
        if (sent >= rounds) {
          if (timers.send !== undefined) clearInterval(timers.send)
          // 收尾等待: 最后几个包还在路上, 立刻结算会把它们误判成丢包
          timers.tail = setTimeout(() => finish(summarize(samples, Math.max(0, sent - 1))), tailWaitMs)
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
      // 首轮不计入: 连接刚建立时 TCP 拥塞窗口尚未展开, 这一次的耗时不代表稳态延迟
      if (seq === 0) return
      samples.push({ seq, rtt: arrivedAt - sentAt })
    }

    socket.onerror = () => finish(failed('探针连接失败'))

    socket.onclose = () => {
      if (settled) return
      // 对端主动断开: 已经收到的样本仍然有效, 没有样本才算不可达
      finish(samples.length > 0 ? summarize(samples, Math.max(0, sent - 1)) : failed('探针连接已断开'))
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
  if (outcome.status !== 'ok' || outcome.p50 === null) {
    return { level: 'unknown', label: '不可用' }
  }
  const jitter = outcome.jitter ?? 0
  if (outcome.lossRate > 0.05 || jitter > 40 || outcome.p50 > 150) {
    return { level: 'poor', label: '较差' }
  }
  if (outcome.lossRate > 0.01 || jitter > 15 || outcome.p50 > 80) {
    return { level: 'fair', label: '可用' }
  }
  return { level: 'good', label: '流畅' }
}

/**
 * 线路综合得分, 越小越好。抖动的权重高于平均延迟: 稳定的 90ms 比在 40ms 与 120ms 之间
 * 反复横跳的线路好玩得多。丢包权重再高一档, 它直接表现为动作丢失。
 */
export function score(outcome: ProbeOutcome): number {
  if (outcome.status !== 'ok' || outcome.p50 === null) return Number.POSITIVE_INFINITY
  return outcome.p50 + (outcome.jitter ?? 0) * 2 + outcome.lossRate * 500
}

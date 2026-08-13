import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface LatencySparklineProps {
  /** 按发送序号落位的样本, 空洞即丢包 */
  samples: (number | undefined)[]
  /** 总槽位数, 决定波形铺满前的留白 */
  slots: number
  /** 纵轴满格对应的毫秒数 */
  ceiling?: number
  className?: string
}

/**
 * 逐样本的延迟波形。
 *
 * 只给一个平均值看不出线路"稳不稳" —— 一条稳定的 90ms 和一条在 40 与 200 之间反复横跳的线
 * 平均值可能一样, 手感天差地别。把每一次往返都画出来, 抖动和丢包一眼可见。
 *
 * 丢包画成贴底的暗槽而不是跳过: 跳过会让后面的样本前移把空洞填平, 波形看起来反而更"整齐"。
 */
export function LatencySparkline({ samples, slots, ceiling, className }: LatencySparklineProps) {
  const { bars, max } = useMemo(() => {
    const values = samples.filter((v): v is number => typeof v === 'number')
    // 纵轴上限取实测峰值与给定天花板的较大者, 并留 15% 余量, 免得最高那根顶到框
    const peak = values.length ? Math.max(...values) : 0
    const upper = Math.max(ceiling ?? 60, peak * 1.15, 1)
    return { bars: samples, max: upper }
  }, [samples, ceiling])

  return (
    <div
      className={cn('flex h-9 items-end gap-px overflow-hidden', className)}
      aria-hidden="true"
    >
      {Array.from({ length: slots }, (_, i) => {
        const value = bars[i]
        const pending = value === undefined && i >= bars.length
        const lost = value === undefined && i < bars.length

        if (pending) {
          return <div key={i} className="h-[3px] flex-1 rounded-full bg-foreground/[0.07]" />
        }
        if (lost) {
          return (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full bg-destructive/50"
              title="丢包"
            />
          )
        }
        const height = Math.max(6, Math.min(100, ((value as number) / max) * 100))
        return (
          <div
            key={i}
            className="flex-1 origin-bottom rounded-full bg-foreground/45 transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}

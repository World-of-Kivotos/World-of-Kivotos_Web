import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * 单个数位的翻页动画。
 *
 * 做法是把 0-9 竖排成一条, 外层裁切成一个字高, 靠 translateY 把目标数字推到窗口里。
 * 比逐帧改文字好在: 变化本身是连续的, 眼睛能跟上数字往哪个方向走, 而不是突然闪成另一个值。
 */
function Digit({
  value,
  index,
  duration,
}: {
  value: string
  index: number
  duration: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 首次渲染先停在 0, 下一帧再滚到目标值, 否则初始值不会有滚动过程
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!/\d/.test(value)) {
    return <span className="inline-block">{value}</span>
  }

  const target = mounted ? Number(value) : 0

  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-baseline">
      <span
        className="absolute inset-x-0 top-0 flex flex-col will-change-transform motion-reduce:transition-none"
        style={{
          transform: `translateY(-${target}em)`,
          // 每位错开一点, 高位先落定, 读起来像数字在"归位"而不是整体平移。
          // 实时刷新时 duration 短, 错开量也跟着收窄, 否则低位会一直追不上新值。
          transitionDelay: `${index * Math.min(45, duration / 14)}ms`,
          transitionProperty: 'transform',
          transitionDuration: `${duration}ms`,
          // 轻微过冲, 停下时有一点重量感
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="flex h-[1em] items-center justify-center leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * 会翻页的数字。传入已格式化好的字符串（如 "40.2"），小数点等非数字字符原样保留。
 *
 * @param duration 单个数位滚到位的毫秒数。实时刷新的场景要调短，否则上一次还没滚完
 *                 下一个值就来了，数字会一直悬在中间读不出来。
 */
export function RollingNumber({
  value,
  className,
  duration = 620,
}: {
  value: string
  className?: string
  duration?: number
}) {
  const chars = value.split('')
  return (
    <span className={cn('inline-flex items-baseline tabular-nums', className)}>
      {chars.map((char, i) => (
        // key 按"从右数第几位"给, 有两个原因:
        //   1. 不含字符本身 —— 否则数值一变数位就重新挂载、动画从 0 重来, 而要的是从旧值滚到新值
        //   2. 右对齐 —— 位数变化时 (9.8 -> 10.2) 左对齐会让小数点从第 1 位挪到第 2 位,
        //      整排字符集体错位; 右对齐则小数点始终落在同一个 key 上
        <Digit key={`r${chars.length - 1 - i}`} value={char} index={i} duration={duration} />
      ))}
    </span>
  )
}

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * 单个数位的翻页动画。
 *
 * 做法是把 0-9 竖排成一条, 外层裁切成一个字高, 靠 translateY 把目标数字推到窗口里。
 * 比逐帧改文字好在: 变化本身是连续的, 眼睛能跟上数字往哪个方向走, 而不是突然闪成另一个值。
 */
function Digit({ value, index }: { value: string; index: number }) {
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
          // 每位错开一点, 高位先落定, 读起来像数字在"归位"而不是整体平移
          transitionDelay: `${index * 45}ms`,
          transitionProperty: 'transform',
          transitionDuration: '620ms',
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
 */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline tabular-nums', className)}>
      {value.split('').map((char, i) => (
        // key 只用位置: 若把字符也编进 key, 数值一变整个数位就会重新挂载、动画从 0 重来,
        // 而我们要的是从旧值滚到新值
        <Digit key={i} value={char} index={i} />
      ))}
    </span>
  )
}

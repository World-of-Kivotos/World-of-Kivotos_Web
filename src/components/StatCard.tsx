import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type StatStatus = 'default' | 'success' | 'warning' | 'danger'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  hint?: string
  icon?: LucideIcon
  status?: StatStatus
  loading?: boolean
}

const statusValueColor: Record<StatStatus, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
}

/**
 * 数据统计卡: 监控盘风格 —— 小标签 + 大号等宽数字 + 单位/提示。
 * 数字用 font-mono / tabular-nums 对齐易扫读。
 */
export function StatCard({ label, value, unit, hint, icon: Icon, status = 'default', loading }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        ) : (
          <>
            <span className={cn('font-mono text-3xl font-semibold tabular-nums leading-none', statusValueColor[status])}>
              {value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </>
        )}
      </div>
      {hint && !loading && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

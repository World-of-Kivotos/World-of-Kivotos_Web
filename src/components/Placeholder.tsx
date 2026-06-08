import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlaceholderProps {
  title: string
  description?: string
}

/** 阶段性占位页: P1 骨架阶段各路由先用它, 后续阶段逐页替换为真实实现。 */
export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>建设中</CardTitle>
          <CardDescription>此模块将在后续阶段实现。</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          重构进行中 —— 设计系统与路由骨架已就位。
        </CardContent>
      </Card>
    </div>
  )
}

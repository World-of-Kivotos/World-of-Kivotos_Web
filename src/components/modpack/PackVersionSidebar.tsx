import { Archive, CheckCircle2, Copy, FilePenLine, History } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PackVersion, PackVersionStatus } from '@/types/modpack'

interface PackVersionSidebarProps {
  versions: PackVersion[]
  selectedVersionId: number | null
  isLoading: boolean
  isError: boolean
  actionPending: boolean
  onSelect: (versionId: number) => void
  onCopy: (version: PackVersion) => void
  onRollback: (version: PackVersion) => void
}

interface VersionSection {
  status: PackVersionStatus
  label: string
  icon: typeof FilePenLine
}

const SECTIONS: VersionSection[] = [
  { status: 'draft', label: '草稿', icon: FilePenLine },
  { status: 'published', label: '当前发布', icon: CheckCircle2 },
  { status: 'archived', label: '历史版本', icon: Archive },
]

const STATUS_LABEL: Record<PackVersionStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
}

const STATUS_VARIANT: Record<PackVersionStatus, BadgeProps['variant']> = {
  draft: 'warning',
  published: 'success',
  archived: 'secondary',
}

function formatTimestamp(value?: number | null): string {
  if (value == null) return '未发布'
  const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function PackVersionSidebar({
  versions,
  selectedVersionId,
  isLoading,
  isError,
  actionPending,
  onSelect,
  onCopy,
  onRollback,
}: PackVersionSidebarProps) {
  if (isLoading) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">正在加载版本...</p>
  }

  if (isError) {
    return <p className="px-4 py-10 text-center text-sm text-destructive">版本列表加载失败</p>
  }

  if (versions.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">暂无整合包版本</p>
  }

  return (
    <div className="space-y-5 p-3">
      {SECTIONS.map((section) => {
        const items = versions
          .filter((version) => version.status === section.status)
          .sort((left, right) => right.createdAt - left.createdAt)
        if (items.length === 0) return null
        const SectionIcon = section.icon

        return (
          <section key={section.status} aria-labelledby={`pack-version-${section.status}`}>
            <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <SectionIcon className="size-3.5" />
              <h2 id={`pack-version-${section.status}`}>{section.label}</h2>
              <span className="ml-auto font-mono tabular-nums">{items.length}</span>
            </div>

            <div className="space-y-2">
              {items.map((version) => {
                const selected = version.id === selectedVersionId
                return (
                  <div
                    key={version.id}
                    className={cn(
                      'rounded-lg border bg-background/45 p-3 transition-colors',
                      selected ? 'border-foreground/35 bg-accent/80 shadow-sm' : 'hover:bg-accent/45',
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onSelect(version.id)}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span>
                          <span className="block font-mono text-sm font-semibold">{version.version}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Minecraft {version.minecraft} · {version.loaderKind} {version.loaderVersion}
                          </span>
                        </span>
                        <Badge variant={STATUS_VARIANT[version.status]}>{STATUS_LABEL[version.status]}</Badge>
                      </span>
                      {version.note ? (
                        <span className="mt-2 line-clamp-2 block text-xs text-muted-foreground">{version.note}</span>
                      ) : null}
                      <span className="mt-2 block text-[11px] text-muted-foreground">
                        {version.status === 'draft'
                          ? `创建于 ${formatTimestamp(version.createdAt)}`
                          : `发布于 ${formatTimestamp(version.publishedAt)}`}
                      </span>
                    </button>

                    <div className="mt-3 flex gap-2 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        disabled={actionPending}
                        onClick={() => onCopy(version)}
                      >
                        <Copy /> 从此复制
                      </Button>
                      {version.status === 'archived' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={actionPending}
                          onClick={() => onRollback(version)}
                        >
                          <History /> 回滚
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

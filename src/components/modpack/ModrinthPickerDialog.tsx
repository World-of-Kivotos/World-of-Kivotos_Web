import { useState, type FormEvent } from 'react'
import { Download, PackageSearch, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useModrinthSearch, useModrinthVersions } from '@/hooks/useModpack'
import {
  replaceModrinthPackEntryVersion,
  selectModrinthPrimaryFile,
  toModrinthPackEntry,
} from '@/services/modrinth'
import { cn } from '@/lib/utils'
import type {
  ModrinthSearchHit,
  ModrinthVersion,
  PackEntryPolicy,
  PlatformPackEntry,
  PlatformPackEntryRequest,
} from '@/types/modpack'

interface ModrinthPickerDialogProps {
  open: boolean
  minecraft: string
  loader: string
  pending: boolean
  replaceEntry?: PlatformPackEntry
  onOpenChange: (open: boolean) => void
  onSelect: (request: PlatformPackEntryRequest) => void
}

function formatDownloads(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatPublishedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN')
}

export function ModrinthPickerDialog({
  open,
  minecraft,
  loader,
  pending,
  replaceEntry,
  onOpenChange,
  onSelect,
}: ModrinthPickerDialogProps) {
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [project, setProject] = useState<ModrinthSearchHit | null>(null)
  const [version, setVersion] = useState<ModrinthVersion | null>(null)
  const [path, setPath] = useState(replaceEntry?.path ?? '')
  const [policy, setPolicy] = useState<PackEntryPolicy>(replaceEntry?.policy ?? 'managed')

  const projectId = replaceEntry?.projectId ?? project?.project_id ?? ''
  const search = useModrinthSearch(
    { query, minecraft, loader, limit: 20, index: 'relevance' },
    open && !replaceEntry,
  )
  const versions = useModrinthVersions(
    { projectId, minecraft, loader },
    open && projectId.length > 0,
  )

  const close = () => {
    if (!pending) onOpenChange(false)
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const normalized = queryInput.trim()
    if (!normalized) {
      toast.error('请输入 Modrinth 项目名称')
      return
    }
    setQuery(normalized)
    setProject(null)
    setVersion(null)
    setPath('')
  }

  const chooseProject = (nextProject: ModrinthSearchHit) => {
    setProject(nextProject)
    setVersion(null)
    setPath('')
  }

  const chooseVersion = (nextVersion: ModrinthVersion) => {
    try {
      setVersion(nextVersion)
      if (replaceEntry) {
        setPath(replaceModrinthPackEntryVersion(replaceEntry, nextVersion).path)
      } else {
        const file = selectModrinthPrimaryFile(nextVersion)
        setPath(`mods/${file.filename}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '该版本没有可用文件')
    }
  }

  const submitSelection = () => {
    if (!version) {
      toast.error('请选择一个兼容版本')
      return
    }

    const normalizedPath = path.trim().replaceAll('\\', '/')
    if (!normalizedPath) {
      toast.error('请输入文件在实例中的相对路径')
      return
    }

    try {
      if (replaceEntry) {
        onSelect({
          ...replaceModrinthPackEntryVersion(replaceEntry, version),
          path: normalizedPath,
          policy,
        })
        return
      }

      if (!project) {
        toast.error('请先选择 Modrinth 项目')
        return
      }
      onSelect({ ...toModrinthPackEntry(project, version, policy), path: normalizedPath })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '无法生成平台条目')
    }
  }

  const projectName = replaceEntry?.projectName ?? project?.title

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="size-5" />
            {replaceEntry ? `更换 ${replaceEntry.projectName} 版本` : '从 Modrinth 添加平台 mod'}
          </DialogTitle>
          <DialogDescription>
            仅显示兼容 Minecraft {minecraft} 与 {loader} 的版本，文件由玩家直接从 Modrinth CDN 下载。
          </DialogDescription>
        </DialogHeader>

        {!replaceEntry ? (
          <form className="flex gap-2" onSubmit={submitSearch}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="搜索项目名称，例如 Sodium"
                aria-label="搜索 Modrinth 项目"
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" variant="outline" disabled={search.isFetching}>
              {search.isFetching ? '搜索中...' : '搜索'}
            </Button>
          </form>
        ) : null}

        <div className={cn('grid min-h-72 gap-4', replaceEntry ? 'grid-cols-1' : 'lg:grid-cols-2')}>
          {!replaceEntry ? (
            <section className="overflow-hidden rounded-lg border" aria-label="Modrinth 项目搜索结果">
              <div className="border-b bg-muted/35 px-3 py-2 text-sm font-medium">
                项目{search.data ? ` · ${search.data.total_hits} 个结果` : ''}
              </div>
              <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                {!query ? (
                  <p className="px-3 py-12 text-center text-sm text-muted-foreground">输入关键词开始搜索</p>
                ) : search.isLoading ? (
                  <p className="px-3 py-12 text-center text-sm text-muted-foreground">正在搜索...</p>
                ) : search.isError ? (
                  <p className="px-3 py-12 text-center text-sm text-destructive">Modrinth 搜索失败</p>
                ) : search.data?.hits.length === 0 ? (
                  <p className="px-3 py-12 text-center text-sm text-muted-foreground">没有找到兼容项目</p>
                ) : (
                  search.data?.hits.map((hit) => (
                    <button
                      key={hit.project_id}
                      type="button"
                      className={cn(
                        'flex w-full gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent',
                        project?.project_id === hit.project_id && 'bg-accent',
                      )}
                      aria-pressed={project?.project_id === hit.project_id}
                      onClick={() => chooseProject(hit)}
                    >
                      {hit.icon_url ? (
                        <img src={hit.icon_url} alt="" className="size-10 rounded-md object-cover" loading="lazy" />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                          <PackageSearch className="size-5 text-muted-foreground" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{hit.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{hit.description}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Download className="size-3" /> {formatDownloads(hit.downloads)} · {hit.author}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-lg border" aria-label="兼容版本">
            <div className="border-b bg-muted/35 px-3 py-2 text-sm font-medium">
              {projectName ? `${projectName} 的兼容版本` : '选择项目后查看兼容版本'}
            </div>
            <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
              {!projectId ? (
                <p className="px-3 py-12 text-center text-sm text-muted-foreground">尚未选择项目</p>
              ) : versions.isLoading ? (
                <p className="px-3 py-12 text-center text-sm text-muted-foreground">正在加载版本...</p>
              ) : versions.isError ? (
                <p className="px-3 py-12 text-center text-sm text-destructive">兼容版本加载失败</p>
              ) : versions.data?.length === 0 ? (
                <p className="px-3 py-12 text-center text-sm text-muted-foreground">没有兼容当前环境的版本</p>
              ) : (
                versions.data?.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent',
                      version?.id === item.id && 'bg-accent',
                    )}
                    aria-pressed={version?.id === item.id}
                    onClick={() => chooseVersion(item)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{item.version_number}</span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-muted-foreground">
                      <span className="block uppercase">{item.version_type}</span>
                      <span>{formatPublishedAt(item.date_published)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        {version ? (
          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <Label htmlFor="modrinth-entry-path">实例相对路径</Label>
              <Input id="modrinth-entry-path" value={path} onChange={(event) => setPath(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modrinth-entry-policy">文件策略</Label>
              <Select value={policy} onValueChange={(value) => setPolicy(value as PackEntryPolicy)}>
                <SelectTrigger id="modrinth-entry-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="managed">managed</SelectItem>
                  <SelectItem value="seeded">seeded</SelectItem>
                  <SelectItem value="optional">optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={close}>
            取消
          </Button>
          <Button type="button" disabled={!version || pending} onClick={submitSelection}>
            {pending ? '保存中...' : replaceEntry ? '确认更换版本' : '加入草稿'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

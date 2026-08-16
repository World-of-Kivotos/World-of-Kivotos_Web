import { useState } from 'react'
import { FileBox, Pencil, RefreshCw, Search, Server, Trash2 } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PackEntry, PackEntryPolicy, PlatformPackEntry } from '@/types/modpack'

interface PackEntryTableProps {
  entries: PackEntry[]
  readOnly: boolean
  isLoading: boolean
  isError: boolean
  actionPending: boolean
  onEdit: (entry: PackEntry) => void
  onReplaceVersion: (entry: PlatformPackEntry) => void
  onDelete: (entry: PackEntry, onSuccess: () => void) => void
}

const POLICY_LABEL: Record<PackEntryPolicy, string> = {
  managed: '受管',
  seeded: '首次投递',
  optional: '可选',
}

const POLICY_VARIANT: Record<PackEntryPolicy, BadgeProps['variant']> = {
  managed: 'default',
  seeded: 'warning',
  optional: 'secondary',
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function PackEntryTable({
  entries,
  readOnly,
  isLoading,
  isError,
  actionPending,
  onEdit,
  onReplaceVersion,
  onDelete,
}: PackEntryTableProps) {
  const [filter, setFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PackEntry | null>(null)

  const normalizedFilter = filter.trim().toLowerCase()
  const visibleEntries = normalizedFilter
    ? entries.filter((entry) => {
        const projectName = entry.kind === 'platform' ? entry.projectName : ''
        return `${entry.path}\n${projectName}\n${entry.sha1}`.toLowerCase().includes(normalizedFilter)
      })
    : entries

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="筛选路径、项目或 SHA1"
            aria-label="筛选整合包文件条目"
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {normalizedFilter ? `${visibleEntries.length} / ${entries.length}` : entries.length} 个文件
        </span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件与来源</TableHead>
              <TableHead>平台版本</TableHead>
              <TableHead>策略</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>SHA1</TableHead>
              {!readOnly ? <TableHead className="text-right">操作</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="py-12 text-center text-sm text-muted-foreground">
                  正在加载文件条目...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="py-12 text-center text-sm text-destructive">
                  文件条目加载失败
                </TableCell>
              </TableRow>
            ) : visibleEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 5 : 6} className="py-12 text-center text-sm text-muted-foreground">
                  {entries.length === 0 ? '此版本还没有文件条目' : '没有符合筛选条件的条目'}
                </TableCell>
              </TableRow>
            ) : (
              visibleEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="min-w-60">
                    <div className="flex items-start gap-2">
                      {entry.kind === 'platform' ? (
                        <Server className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileBox className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="break-all font-mono text-xs font-medium">{entry.path}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.kind === 'platform'
                            ? `${entry.platform === 'modrinth' ? 'Modrinth' : 'CurseForge'} · ${entry.projectName}`
                            : '自研上传'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-48 font-mono text-xs text-muted-foreground">
                    {entry.kind === 'platform' ? entry.externalVersionId : '不适用'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={POLICY_VARIANT[entry.policy]}>{POLICY_LABEL[entry.policy]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{formatBytes(entry.size)}</TableCell>
                  <TableCell className="max-w-36 truncate font-mono text-xs text-muted-foreground" title={entry.sha1}>
                    {entry.sha1}
                  </TableCell>
                  {!readOnly ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {entry.kind === 'platform' && entry.platform === 'modrinth' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionPending}
                            onClick={() => onReplaceVersion(entry)}
                          >
                            <RefreshCw /> 换版本
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" disabled={actionPending} onClick={() => onEdit(entry)}>
                          <Pencil /> 编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={actionPending}
                          aria-label={`移除 ${entry.path}`}
                          onClick={() => setDeleteTarget(entry)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && !actionPending && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认从草稿移除文件</AlertDialogTitle>
            <AlertDialogDescription>
              将移除 <span className="break-all font-mono text-foreground">{deleteTarget?.path}</span>。
              如果当前发布版包含该文件，它会出现在发布差异的删除列表中；受管文件将在玩家同步时被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionPending}
              onClick={(event) => {
                event.preventDefault()
                if (deleteTarget) onDelete(deleteTarget, () => setDeleteTarget(null))
              }}
            >
              {actionPending ? '移除中...' : '确认移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

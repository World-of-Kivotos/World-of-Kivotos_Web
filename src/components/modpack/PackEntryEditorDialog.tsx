import { useState, type FormEvent } from 'react'
import { FilePenLine } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import type { PackEntry, PackEntryPolicy, PackEntryRequest } from '@/types/modpack'

interface PackEntryEditorDialogProps {
  entry: PackEntry
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (request: PackEntryRequest) => void
}

function toRequest(entry: PackEntry, path: string, policy: PackEntryPolicy): PackEntryRequest {
  const base = {
    path,
    policy,
    sha1: entry.sha1,
    size: entry.size,
    downloadUrl: entry.downloadUrl,
  }
  if (entry.kind === 'platform') {
    return {
      ...base,
      kind: 'platform',
      platform: entry.platform,
      projectId: entry.projectId,
      projectName: entry.projectName,
      externalVersionId: entry.externalVersionId,
    }
  }
  return { ...base, kind: 'custom' }
}

export function PackEntryEditorDialog({
  entry,
  pending,
  onOpenChange,
  onSave,
}: PackEntryEditorDialogProps) {
  const [path, setPath] = useState(entry.path)
  const [policy, setPolicy] = useState<PackEntryPolicy>(entry.policy)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedPath = path.trim().replaceAll('\\', '/')
    if (!normalizedPath) {
      toast.error('文件路径不能为空')
      return
    }
    onSave(toRequest(entry, normalizedPath, policy))
  }

  return (
    <Dialog open onOpenChange={(open) => !pending && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePenLine className="size-5" /> 编辑整合包条目
          </DialogTitle>
          <DialogDescription>
            修改实例路径与文件策略。文件内容和下载来源不会在此处改变。
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Badge variant={entry.kind === 'platform' ? 'default' : 'outline'}>
                {entry.kind === 'platform' ? '平台引用' : '自研上传'}
              </Badge>
              <span className="truncate text-sm font-medium">
                {entry.kind === 'platform' ? entry.projectName : entry.path.split('/').at(-1)}
              </span>
            </div>
            <p className="mt-2 truncate font-mono text-xs text-muted-foreground">SHA1 {entry.sha1}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pack-entry-path">实例相对路径</Label>
            <Input
              id="pack-entry-path"
              value={path}
              disabled={pending}
              onChange={(event) => setPath(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pack-entry-policy">文件策略</Label>
            <Select value={policy} onValueChange={(value) => setPolicy(value as PackEntryPolicy)} disabled={pending}>
              <SelectTrigger id="pack-entry-policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="managed">managed · 更新时覆盖，移除时删除</SelectItem>
                <SelectItem value="seeded">seeded · 首次投递后保留玩家修改</SelectItem>
                <SelectItem value="optional">optional · 玩家可选安装</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '保存中...' : '保存条目'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

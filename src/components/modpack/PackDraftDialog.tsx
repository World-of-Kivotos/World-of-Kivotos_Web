import { useState, type FormEvent } from 'react'
import { Copy, FilePlus2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { PACK_LOADER_OPTIONS, requirePackLoaderKind } from '@/components/modpack/loader-kind'
import type { CreatePackDraftRequest, PackLoaderKind, PackVersion } from '@/types/modpack'

interface PackDraftDialogProps {
  open: boolean
  copySource: PackVersion | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (request: CreatePackDraftRequest) => void
}

export function PackDraftDialog({
  open,
  copySource,
  pending,
  onOpenChange,
  onCreate,
}: PackDraftDialogProps) {
  const [version, setVersion] = useState('')
  const [minecraft, setMinecraft] = useState('1.20.1')
  const [loaderKind, setLoaderKind] = useState<PackLoaderKind>('forge')
  const [loaderVersion, setLoaderVersion] = useState('47.4.20')
  const [note, setNote] = useState('')

  const close = () => {
    if (!pending) onOpenChange(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalizedVersion = version.trim()
    if (!normalizedVersion) {
      toast.error('请输入新版本号')
      return
    }

    if (copySource) {
      onCreate({ version: normalizedVersion, copyFromVersionId: copySource.id })
      return
    }

    const normalizedMinecraft = minecraft.trim()
    const normalizedLoaderKind = loaderKind
    const normalizedLoaderVersion = loaderVersion.trim()
    if (!normalizedMinecraft || !normalizedLoaderKind || !normalizedLoaderVersion) {
      toast.error('Minecraft 与加载器信息不能为空')
      return
    }

    onCreate({
      version: normalizedVersion,
      minecraft: normalizedMinecraft,
      loaderKind: normalizedLoaderKind,
      loaderVersion: normalizedLoaderVersion,
      note: note.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {copySource ? <Copy className="size-5" /> : <FilePlus2 className="size-5" />}
            {copySource ? '从现有版本复制草稿' : '新建空白草稿'}
          </DialogTitle>
          <DialogDescription>
            {copySource
              ? `将复制 ${copySource.version} 的全部条目与运行环境，原版本不会被修改。`
              : '创建后可添加平台引用、自研文件并调整文件策略。'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="pack-draft-version">新版本号</Label>
            <Input
              id="pack-draft-version"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="例如 2.1.0"
              autoFocus
            />
          </div>

          {copySource ? (
            <div className="rounded-lg border bg-muted/35 p-3 text-sm">
              <p className="font-medium">继承运行环境</p>
              <p className="mt-1 text-muted-foreground">
                Minecraft {copySource.minecraft} · {copySource.loaderKind} {copySource.loaderVersion}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pack-draft-minecraft">Minecraft</Label>
                  <Input
                    id="pack-draft-minecraft"
                    value={minecraft}
                    onChange={(event) => setMinecraft(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-draft-loader-kind">加载器</Label>
                  <Select
                    value={loaderKind}
                    onValueChange={(value) => {
                      const nextLoaderKind = requirePackLoaderKind(value)
                      if (nextLoaderKind !== loaderKind) setLoaderVersion('')
                      setLoaderKind(nextLoaderKind)
                    }}
                  >
                    <SelectTrigger id="pack-draft-loader-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACK_LOADER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack-draft-loader-version">加载器版本</Label>
                <Input
                  id="pack-draft-loader-version"
                  value={loaderVersion}
                  onChange={(event) => setLoaderVersion(event.target.value)}
                  placeholder="填写所选加载器的版本号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack-draft-note">更新说明</Label>
                <Textarea
                  id="pack-draft-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="展示给玩家的版本说明"
                  rows={3}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={close}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '创建中...' : '创建草稿'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

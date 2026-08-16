import { useState, type ChangeEvent, type FormEvent } from 'react'
import { FileArchive, Upload } from 'lucide-react'
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
import type { PackEntryPolicy, PackUploadProgress, PackUploadRequest } from '@/types/modpack'

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

interface UploadPackFileDialogProps {
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (
    request: PackUploadRequest,
    onProgress: (progress: PackUploadProgress) => void,
  ) => void
}

function suggestedPath(fileName: string): string {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.jar')) return `mods/${fileName}`
  if (lowerName === 'options.txt') return fileName
  return `config/${fileName}`
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadPackFileDialog({
  open,
  pending,
  onOpenChange,
  onUpload,
}: UploadPackFileDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [path, setPath] = useState('')
  const [policy, setPolicy] = useState<PackEntryPolicy>('managed')
  const [progress, setProgress] = useState<number | null>(null)

  const close = () => {
    if (!pending) onOpenChange(false)
  }

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setProgress(null)
    if (!nextFile) return
    setPath(suggestedPath(nextFile.name))
    setPolicy(nextFile.name.toLowerCase() === 'options.txt' ? 'seeded' : 'managed')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      toast.error('请选择要上传的文件')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('单个文件不能超过 200 MB')
      return
    }
    const normalizedPath = path.trim().replaceAll('\\', '/')
    if (!normalizedPath) {
      toast.error('请输入文件在实例中的相对路径')
      return
    }

    setProgress(0)
    onUpload(
      { file, path: normalizedPath, policy },
      (nextProgress) => setProgress(nextProgress.percentage ?? null),
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" /> 上传自研文件
          </DialogTitle>
          <DialogDescription>
            上传自研 mod 或配置文件。文件会按内容哈希存储，单文件上限为 200 MB。
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="pack-upload-file">本地文件</Label>
            <Input id="pack-upload-file" type="file" disabled={pending} onChange={selectFile} />
            {file ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileArchive className="size-3.5" />
                {file.name} · {formatBytes(file.size)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pack-upload-path">实例相对路径</Label>
            <Input
              id="pack-upload-path"
              value={path}
              disabled={pending}
              onChange={(event) => setPath(event.target.value)}
              placeholder="mods/wok-core.jar 或 config/example.toml"
            />
            <p className="text-xs text-muted-foreground">使用正斜杠；服务端会再次执行路径安全校验。</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pack-upload-policy">文件策略</Label>
            <Select value={policy} onValueChange={(value) => setPolicy(value as PackEntryPolicy)} disabled={pending}>
              <SelectTrigger id="pack-upload-policy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="managed">managed · 始终与整合包保持一致</SelectItem>
                <SelectItem value="seeded">seeded · 首次投递后保留玩家修改</SelectItem>
                <SelectItem value="optional">optional · 玩家可选安装</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {progress != null ? (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>上传进度</span>
                <span className="font-mono tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={close}>
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '上传中...' : '上传并加入草稿'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

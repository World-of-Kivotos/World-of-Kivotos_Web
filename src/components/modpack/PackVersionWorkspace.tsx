import { useEffect, useState, type FormEvent } from 'react'
import { CloudUpload, PackagePlus, Rocket, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ModrinthPickerDialog } from '@/components/modpack/ModrinthPickerDialog'
import { PackEntryEditorDialog } from '@/components/modpack/PackEntryEditorDialog'
import { PackEntryTable } from '@/components/modpack/PackEntryTable'
import { UploadPackFileDialog } from '@/components/modpack/UploadPackFileDialog'
import { PACK_LOADER_OPTIONS, requirePackLoaderKind } from '@/components/modpack/loader-kind'
import {
  getPackEnvironmentLockReason,
  hasPackEnvironmentChanged,
} from '@/components/modpack/draft-environment-safety'
import {
  useAddPackEntry,
  useDeletePackEntry,
  usePackEntries,
  useUpdatePackDraft,
  useUpdatePackEntry,
  useUploadPackFile,
} from '@/hooks/useModpack'
import type {
  PackEntry,
  PackEntryRequest,
  PackUploadProgress,
  PackUploadRequest,
  PackVersion,
  PlatformPackEntry,
  PlatformPackEntryRequest,
} from '@/types/modpack'

interface PackVersionWorkspaceProps {
  version: PackVersion
  onPublish: (version: PackVersion) => void
  onDirtyChange: (dirty: boolean) => void
}

const STATUS_TEXT = {
  draft: '草稿可编辑',
  published: '当前发布版',
  archived: '历史只读版',
} as const

export function PackVersionWorkspace({ version, onPublish, onDirtyChange }: PackVersionWorkspaceProps) {
  const [versionName, setVersionName] = useState(version.version)
  const [minecraft, setMinecraft] = useState(version.minecraft)
  const [loaderKind, setLoaderKind] = useState(version.loaderKind)
  const [loaderVersion, setLoaderVersion] = useState(version.loaderVersion)
  const [note, setNote] = useState(version.note ?? '')
  const [modrinthOpen, setModrinthOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PackEntry | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<PlatformPackEntry | null>(null)

  const entries = usePackEntries(version.id)
  const updateDraft = useUpdatePackDraft()
  const addEntry = useAddPackEntry()
  const updateEntry = useUpdatePackEntry()
  const deleteEntry = useDeletePackEntry()
  const uploadFile = useUploadPackFile()
  const isDraft = version.status === 'draft'
  const environmentChanged = hasPackEnvironmentChanged(version, {
    minecraft,
    loaderKind,
    loaderVersion,
  })
  const environmentLockReason = getPackEnvironmentLockReason(
    entries.data,
    entries.isLoading || entries.isFetching,
    entries.isError,
  )
  const hasUnsavedMetadata =
    versionName.trim() !== version.version ||
    minecraft.trim() !== version.minecraft ||
    loaderKind.trim() !== version.loaderKind ||
    loaderVersion.trim() !== version.loaderVersion ||
    (note.trim() || null) !== version.note
  const mutationInProgress =
    updateDraft.isPending ||
    addEntry.isPending ||
    updateEntry.isPending ||
    deleteEntry.isPending ||
    uploadFile.isPending
  const entryActionPending = mutationInProgress || hasUnsavedMetadata

  useEffect(() => {
    onDirtyChange(hasUnsavedMetadata)
  }, [hasUnsavedMetadata, onDirtyChange])

  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const saveMetadata = (event: FormEvent) => {
    event.preventDefault()
    const normalizedVersion = versionName.trim()
    const normalizedMinecraft = minecraft.trim()
    const normalizedLoaderKind = loaderKind
    const normalizedLoaderVersion = loaderVersion.trim()
    if (environmentChanged && environmentLockReason) {
      toast.error(
        environmentLockReason === 'platform'
          ? '请先移除全部平台条目，再修改 Minecraft 或加载器'
          : '尚未能确认平台条目，暂不能修改运行环境',
      )
      return
    }
    if (!normalizedVersion || !normalizedMinecraft || !normalizedLoaderKind || !normalizedLoaderVersion) {
      toast.error('版本号、Minecraft 与加载器信息不能为空')
      return
    }
    updateDraft.mutate({
      versionId: version.id,
      data: {
        version: normalizedVersion,
        minecraft: normalizedMinecraft,
        loaderKind: normalizedLoaderKind,
        loaderVersion: normalizedLoaderVersion,
        note: note.trim() || null,
      },
    })
  }

  const saveEntry = (entry: PackEntry, request: PackEntryRequest, onSuccess: () => void) => {
    updateEntry.mutate(
      { versionId: version.id, entryId: entry.id, data: request },
      { onSuccess },
    )
  }

  const chooseModrinthEntry = (request: PlatformPackEntryRequest) => {
    if (replaceTarget) {
      saveEntry(replaceTarget, request, () => setReplaceTarget(null))
      return
    }
    addEntry.mutate(
      { versionId: version.id, data: request },
      { onSuccess: () => setModrinthOpen(false) },
    )
  }

  const upload = (
    request: PackUploadRequest,
    onProgress: (progress: PackUploadProgress) => void,
  ) => {
    uploadFile.mutate(
      { versionId: version.id, data: request, onProgress },
      { onSuccess: () => setUploadOpen(false) },
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-mono text-xl">{version.version}</CardTitle>
                <Badge variant={isDraft ? 'warning' : version.status === 'published' ? 'success' : 'secondary'}>
                  {STATUS_TEXT[version.status]}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Minecraft {version.minecraft} · {version.loaderKind} {version.loaderVersion}
              </CardDescription>
            </div>
            {isDraft ? (
              <div className="text-right">
                <Button disabled={hasUnsavedMetadata || mutationInProgress} onClick={() => onPublish(version)}>
                  <Rocket /> 检查差异并发布
                </Button>
                {hasUnsavedMetadata ? (
                  <p className="mt-1 text-xs text-warning">请先保存版本信息，再检查发布差异。</p>
                ) : mutationInProgress ? (
                  <p className="mt-1 text-xs text-warning">等待当前草稿操作完成后再发布。</p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" /> 已发布版本不可修改
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isDraft ? (
            <form className="space-y-4" onSubmit={saveMetadata}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="pack-version-name">版本号</Label>
                  <Input id="pack-version-name" value={versionName} onChange={(event) => setVersionName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-minecraft">Minecraft</Label>
                  <Input
                    id="pack-minecraft"
                    value={minecraft}
                    disabled={environmentLockReason !== null || updateDraft.isPending}
                    onChange={(event) => setMinecraft(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-loader-kind">加载器</Label>
                  <Select
                    value={loaderKind}
                    disabled={environmentLockReason !== null || updateDraft.isPending}
                    onValueChange={(value) => {
                      const nextLoaderKind = requirePackLoaderKind(value)
                      if (nextLoaderKind !== loaderKind) setLoaderVersion('')
                      setLoaderKind(nextLoaderKind)
                    }}
                  >
                    <SelectTrigger id="pack-loader-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACK_LOADER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-loader-version">加载器版本</Label>
                  <Input
                    id="pack-loader-version"
                    value={loaderVersion}
                    disabled={environmentLockReason !== null || updateDraft.isPending}
                    onChange={(event) => setLoaderVersion(event.target.value)}
                    placeholder="填写所选加载器的版本号"
                  />
                </div>
              </div>
              {environmentLockReason ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
                  <span>
                    {environmentLockReason === 'platform'
                      ? '运行环境已锁定。请先移除全部平台条目，再修改 Minecraft 或加载器。'
                      : environmentLockReason === 'loading'
                        ? '正在确认平台条目，运行环境暂不可编辑。'
                        : '无法确认平台条目，运行环境暂不可编辑。'}
                  </span>
                  {environmentLockReason === 'error' ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void entries.refetch()}>
                      重新检查
                    </Button>
                  ) : environmentChanged ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMinecraft(version.minecraft)
                        setLoaderKind(version.loaderKind)
                        setLoaderVersion(version.loaderVersion)
                      }}
                    >
                      还原未保存的运行环境
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="pack-note">更新说明</Label>
                <Textarea
                  id="pack-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="展示给玩家的版本更新说明"
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={updateDraft.isPending}>
                  <Save /> {updateDraft.isPending ? '保存中...' : '保存版本信息'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {version.note ?? '此版本没有更新说明。'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>文件条目</CardTitle>
              <CardDescription className="mt-1">平台 mod 只保存引用，自研文件上传到对象存储。</CardDescription>
            </div>
            {isDraft ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={hasUnsavedMetadata || mutationInProgress}
                  onClick={() => setModrinthOpen(true)}
                >
                  <PackagePlus /> 添加 Modrinth mod
                </Button>
                <Button
                  variant="outline"
                  disabled={hasUnsavedMetadata || mutationInProgress}
                  onClick={() => setUploadOpen(true)}
                >
                  <CloudUpload /> 上传自研文件
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <PackEntryTable
            entries={entries.data ?? []}
            readOnly={!isDraft}
            isLoading={entries.isLoading}
            isError={entries.isError}
            actionPending={entryActionPending}
            onEdit={setEditTarget}
            onReplaceVersion={setReplaceTarget}
            onDelete={(entry, onSuccess) => {
              deleteEntry.mutate({ versionId: version.id, entryId: entry.id }, { onSuccess })
            }}
          />
        </CardContent>
      </Card>

      {editTarget ? (
        <PackEntryEditorDialog
          key={editTarget.id}
          entry={editTarget}
          pending={updateEntry.isPending}
          onOpenChange={(open) => !open && setEditTarget(null)}
          onSave={(request) => saveEntry(editTarget, request, () => setEditTarget(null))}
        />
      ) : null}

      {modrinthOpen || replaceTarget ? (
        <ModrinthPickerDialog
          key={replaceTarget?.id ?? 'new-entry'}
          open
          minecraft={minecraft.trim()}
          loader={loaderKind.trim()}
          pending={addEntry.isPending || updateEntry.isPending}
          replaceEntry={replaceTarget ?? undefined}
          onOpenChange={(open) => {
            if (!open) {
              setModrinthOpen(false)
              setReplaceTarget(null)
            }
          }}
          onSelect={chooseModrinthEntry}
        />
      ) : null}

      {uploadOpen ? (
        <UploadPackFileDialog
          open
          pending={uploadFile.isPending}
          onOpenChange={setUploadOpen}
          onUpload={upload}
        />
      ) : null}
    </div>
  )
}

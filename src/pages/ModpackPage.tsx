import { useEffect, useState } from 'react'
import { Boxes, FilePlus2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PackDraftDialog } from '@/components/modpack/PackDraftDialog'
import { PackReleaseDialog } from '@/components/modpack/PackReleaseDialog'
import { PackVersionSidebar } from '@/components/modpack/PackVersionSidebar'
import { PackVersionWorkspace } from '@/components/modpack/PackVersionWorkspace'
import {
  useCreatePackDraft,
  usePackVersions,
  usePublishPackVersion,
  useRollbackPackVersion,
} from '@/hooks/useModpack'
import { resolveSelectedPackVersionId } from '@/pages/modpack-selection'
import type { CreatePackDraftRequest, PackVersion } from '@/types/modpack'

interface ReleaseTarget {
  mode: 'publish' | 'rollback'
  version: PackVersion
}

interface VersionSelection {
  id: number | null
  retained: PackVersion | null
  retainUntilListed: boolean
}

export function ModpackPage() {
  const [versionSelection, setVersionSelection] = useState<VersionSelection>({
    id: null,
    retained: null,
    retainUntilListed: false,
  })
  const [draftDialogOpen, setDraftDialogOpen] = useState(false)
  const [copySource, setCopySource] = useState<PackVersion | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<ReleaseTarget | null>(null)
  const [workspaceDirty, setWorkspaceDirty] = useState(false)
  const [pendingVersionId, setPendingVersionId] = useState<number | null>(null)

  const versions = usePackVersions()
  const createDraft = useCreatePackDraft()
  const publishVersion = usePublishPackVersion()
  const rollbackVersion = useRollbackPackVersion()
  const versionList = versions.data ?? []
  const selectedVersionId = resolveSelectedPackVersionId(
    versionList,
    versionSelection.id,
    workspaceDirty,
    versionSelection.retainUntilListed,
  )
  const selectedVersionFromList = versionList.find((version) => version.id === selectedVersionId)
  const selectedVersion =
    selectedVersionFromList ??
    ((workspaceDirty || versionSelection.retainUntilListed) &&
    versionSelection.retained?.id === selectedVersionId
      ? versionSelection.retained
      : undefined)
  const publishedVersion = versionList.find((version) => version.status === 'published')
  const draftCount = versionList.filter((version) => version.status === 'draft').length

  useEffect(() => {
    const retained =
      selectedVersionFromList ??
      (selectedVersionId === versionSelection.id ? versionSelection.retained : null)
    const retainUntilListed =
      selectedVersionFromList === undefined &&
      selectedVersionId === versionSelection.id &&
      versionSelection.retainUntilListed
    if (
      selectedVersionId === versionSelection.id &&
      retained === versionSelection.retained &&
      retainUntilListed === versionSelection.retainUntilListed
    ) return
    let active = true
    const previousSelection = versionSelection
    queueMicrotask(() => {
      if (!active) return
      setVersionSelection((current) =>
        current === previousSelection
          ? { id: selectedVersionId, retained, retainUntilListed }
          : current,
      )
    })
    return () => {
      active = false
    }
  }, [selectedVersionFromList, selectedVersionId, versionSelection])

  const commitVersionSelection = (version: PackVersion, retainUntilListed = false) => {
    setVersionSelection({ id: version.id, retained: version, retainUntilListed })
  }

  const openEmptyDraft = () => {
    setCopySource(null)
    setDraftDialogOpen(true)
  }

  const openCopiedDraft = (source: PackVersion) => {
    setCopySource(source)
    setDraftDialogOpen(true)
  }

  const selectVersion = (versionId: number) => {
    if (workspaceDirty && versionId !== selectedVersion?.id) {
      setPendingVersionId(versionId)
      return
    }
    const version = versionList.find((candidate) => candidate.id === versionId)
    if (version) commitVersionSelection(version)
  }

  const create = (request: CreatePackDraftRequest) => {
    createDraft.mutate(request, {
      onSuccess: (created) => {
        commitVersionSelection(created, true)
        setDraftDialogOpen(false)
      },
    })
  }

  const confirmRelease = (
    confirmRemovals: boolean,
    expectedDiffRevision: string,
    onSuccess: () => void,
  ) => {
    if (!releaseTarget) return
    const mutation = releaseTarget.mode === 'publish' ? publishVersion : rollbackVersion
    mutation.mutate(
      { versionId: releaseTarget.version.id, confirmRemovals, expectedDiffRevision },
      {
        onSuccess: (released) => {
          commitVersionSelection(released)
          setReleaseTarget(null)
          onSuccess()
        },
      },
    )
  }

  const releasePending = publishVersion.isPending || rollbackVersion.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="size-6" />
            <h1 className="text-2xl font-semibold tracking-tight">整合包管理</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {publishedVersion
              ? `当前发布 ${publishedVersion.version}，另有 ${draftCount} 个草稿`
              : `尚未发布版本，现有 ${draftCount} 个草稿`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="刷新版本列表"
            disabled={versions.isFetching}
            onClick={() => void versions.refetch()}
          >
            <RefreshCw className={versions.isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button disabled={workspaceDirty} title={workspaceDirty ? '请先保存或放弃当前修改' : undefined} onClick={openEmptyDraft}>
            <FilePlus2 /> 新建空白草稿
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]">
          <CardHeader className="border-b p-4">
            <CardTitle>版本</CardTitle>
            <CardDescription>选择草稿编辑，或从任意版本复制新草稿。</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-13rem)] overflow-y-auto p-0 scrollbar-thin">
            <PackVersionSidebar
              versions={versionList}
              selectedVersionId={selectedVersion?.id ?? null}
              isLoading={versions.isLoading}
              isError={versions.isError}
              actionPending={createDraft.isPending || releasePending || workspaceDirty}
              onSelect={selectVersion}
              onCopy={openCopiedDraft}
              onRollback={(version) => setReleaseTarget({ mode: 'rollback', version })}
            />
          </CardContent>
        </Card>

        {selectedVersion ? (
          <PackVersionWorkspace
            key={selectedVersion.id}
            version={selectedVersion}
            onDirtyChange={setWorkspaceDirty}
            onPublish={(version) => setReleaseTarget({ mode: 'publish', version })}
          />
        ) : (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
              <Boxes className="size-10 text-muted-foreground" />
              <div>
                <p className="font-medium">还没有整合包版本</p>
                <p className="mt-1 text-sm text-muted-foreground">先创建空白草稿，再添加平台 mod 或上传自研文件。</p>
              </div>
              <Button variant="outline" onClick={openEmptyDraft}>
                <FilePlus2 /> 创建第一个草稿
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {draftDialogOpen ? (
        <PackDraftDialog
          key={copySource?.id ?? 'empty-draft'}
          open
          copySource={copySource}
          pending={createDraft.isPending}
          onOpenChange={setDraftDialogOpen}
          onCreate={create}
        />
      ) : null}

      {releaseTarget ? (
        <PackReleaseDialog
          key={`${releaseTarget.mode}-${releaseTarget.version.id}`}
          open
          mode={releaseTarget.mode}
          target={releaseTarget.version}
          pending={releasePending}
          onOpenChange={(open) => !open && setReleaseTarget(null)}
          onConfirm={confirmRelease}
        />
      ) : null}

      <AlertDialog
        open={pendingVersionId !== null}
        onOpenChange={(open) => !open && setPendingVersionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的版本信息？</AlertDialogTitle>
            <AlertDialogDescription>
              当前草稿 {selectedVersion?.version} 的版本号、运行环境或更新说明尚未保存。切换版本会丢失这些输入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingVersionId === null) return
                const version = versionList.find((candidate) => candidate.id === pendingVersionId)
                if (!version) return
                setWorkspaceDirty(false)
                commitVersionSelection(version)
                setPendingVersionId(null)
              }}
            >
              放弃修改并切换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

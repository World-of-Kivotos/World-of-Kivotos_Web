import { useEffect, useState } from 'react'
import { ArrowLeft, GitCompareArrows, History, Rocket, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { getPackEntryFieldChangeDisplays } from '@/components/modpack/release-diff-display'
import { usePackDiff } from '@/hooks/useModpack'
import { cn } from '@/lib/utils'
import {
  arePackRemovalsAcknowledged,
  createReleaseValidationGate,
  getReviewedReleaseRevision,
  isExpectedReleaseTarget,
  isPackDiffReady,
  isValidPackDiffRevision,
  packDiffSignature,
} from '@/components/modpack/release-safety'
import type { PackEntry, PackEntryChange, PackVersion, PackVersionDiff } from '@/types/modpack'

type ReleaseMode = 'publish' | 'rollback'

interface PackReleaseDialogProps {
  open: boolean
  mode: ReleaseMode
  target: PackVersion
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    confirmRemovals: boolean,
    expectedDiffRevision: string,
    onSuccess: () => void,
  ) => void
}

interface DiffListProps {
  title: string
  tone: 'added' | 'changed' | 'removed'
  items: PackEntry[] | PackEntryChange[]
}

interface VersionSnapshotProps {
  label: string
  version: PackVersion | null
}

const DIFF_TONE = {
  added: 'border-success/30 bg-success/5',
  changed: 'border-warning/30 bg-warning/5',
  removed: 'border-destructive/30 bg-destructive/5',
} as const

function entryLabel(entry: PackEntry): string {
  return entry.kind === 'platform' ? `${entry.projectName} · ${entry.path}` : entry.path
}

function VersionSnapshot({ label, version }: VersionSnapshotProps) {
  return (
    <section className="min-w-0 rounded-md border bg-background/55 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {version ? (
        <>
          <p className="mt-1 break-all font-mono text-sm font-semibold">{version.version}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Minecraft {version.minecraft} · {version.loaderKind} {version.loaderVersion}
          </p>
          <div className="mt-3 border-t pt-2">
            <p className="text-[11px] font-medium text-muted-foreground">更新说明</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs">
              {version.note ?? '无更新说明'}
            </p>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">无已发布基线，这是首次发布。</p>
      )}
    </section>
  )
}

function DiffList({ title, tone, items }: DiffListProps) {
  return (
    <section className={cn('rounded-lg border', DIFF_TONE[tone])}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant={tone === 'removed' ? 'destructive' : tone === 'changed' ? 'warning' : 'success'}>
          {items.length}
        </Badge>
      </div>
      <div className={cn('overflow-y-auto p-2 scrollbar-thin', tone === 'changed' ? 'max-h-96' : 'max-h-44')}>
        {items.length === 0 ? (
          <p className="px-2 py-5 text-center text-xs text-muted-foreground">无</p>
        ) : tone === 'changed' ? (
          (items as PackEntryChange[]).map((change) => (
            <div key={change.after.id} className="rounded-md px-2 py-2 text-xs hover:bg-background/50">
              <p className="break-all font-mono font-medium">{entryLabel(change.after)}</p>
              <dl className="mt-2 space-y-2">
                {getPackEntryFieldChangeDisplays(change).map((field) => (
                  <div key={field.field} className="rounded border bg-background/60 p-2">
                    <dt className="font-medium text-muted-foreground">{field.label}</dt>
                    <dd className="mt-1 grid gap-1 font-mono sm:grid-cols-[1fr_auto_1fr]">
                      <span className="break-all text-destructive">{field.before}</span>
                      <span className="text-muted-foreground" aria-hidden>到</span>
                      <span className="break-all text-success">{field.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        ) : (
          (items as PackEntry[]).map((entry) => (
            <div key={entry.id} className="rounded-md px-2 py-2 text-xs hover:bg-background/50">
              <p className="break-all font-mono font-medium">{entryLabel(entry)}</p>
              <p className="mt-1 text-muted-foreground">{entry.policy} · {entry.kind === 'platform' ? '平台引用' : '自研上传'}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export function PackReleaseDialog({
  open,
  mode,
  target,
  pending,
  onOpenChange,
  onConfirm,
}: PackReleaseDialogProps) {
  const [stage, setStage] = useState<'review' | 'confirm'>('review')
  const [acknowledgedRemovalSignature, setAcknowledgedRemovalSignature] = useState<string | null>(null)
  const [typedVersion, setTypedVersion] = useState('')
  const [reviewedDiffSignature, setReviewedDiffSignature] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationGate] = useState(createReleaseValidationGate)
  const diff = usePackDiff(target.id, open)
  const isPublish = mode === 'publish'
  const expectedTargetStatus = isPublish ? 'draft' : 'archived'
  const targetMatchesAction = isExpectedReleaseTarget(diff.data, target.id, expectedTargetStatus)
  const validatedTarget = targetMatchesAction ? diff.data?.targetVersion ?? null : null
  const currentDiffRevision = isValidPackDiffRevision(diff.data?.revision)
    ? diff.data?.revision ?? null
    : null
  const removedCount = diff.data?.removed.length ?? 0
  const hasRemovals = removedCount > 0
  const currentDiffSignature = packDiffSignature(diff.data)
  const removalsAcknowledged = arePackRemovalsAcknowledged(
    hasRemovals,
    currentDiffSignature,
    acknowledgedRemovalSignature,
  )
  const diffReady =
    targetMatchesAction &&
    currentDiffRevision !== null &&
    isPackDiffReady(currentDiffSignature, diff.isFetching || validating, diff.isError)
  const canContinue = diffReady && (!hasRemovals || removalsAcknowledged)
  const reviewedRevision = getReviewedReleaseRevision(
    diff.data,
    reviewedDiffSignature,
    target.id,
    expectedTargetStatus,
    diff.isFetching || validating,
    diff.isError,
  )
  const reviewedDiffIsCurrent = reviewedRevision !== null
  const exactVersionConfirmed =
    validatedTarget !== null && typedVersion.trim() === validatedTarget.version

  useEffect(() => () => {
    validationGate.invalidate()
  }, [validationGate])

  useEffect(() => {
    if (
      acknowledgedRemovalSignature === null ||
      acknowledgedRemovalSignature === currentDiffSignature
    ) return
    const staleAcknowledgement = acknowledgedRemovalSignature
    queueMicrotask(() => {
      setAcknowledgedRemovalSignature((current) =>
        current === staleAcknowledgement ? null : current,
      )
    })
  }, [acknowledgedRemovalSignature, currentDiffSignature])

  const close = () => {
    if (!pending && !validationGate.isBusy()) onOpenChange(false)
  }

  const beginValidation = (): number | null => {
    if (pending) return null
    const generation = validationGate.begin()
    if (generation === null) return null
    setValidating(true)
    return generation
  }

  const finishValidation = (generation: number) => {
    if (validationGate.finish(generation)) setValidating(false)
  }

  const refreshDiff = async (generation: number): Promise<PackVersionDiff | null> => {
    try {
      const refreshed = await diff.refetch()
      if (!validationGate.isCurrent(generation)) return null
      if (
        !refreshed.isError &&
        isValidPackDiffRevision(refreshed.data?.revision) &&
        isExpectedReleaseTarget(refreshed.data, target.id, expectedTargetStatus)
      ) {
        return refreshed.data
      }
      toast.error('无法重新校验版本差异，请稍后重试')
      return null
    } catch {
      if (validationGate.isCurrent(generation)) {
        toast.error('无法重新校验版本差异，请稍后重试')
      }
      return null
    }
  }

  const continueToConfirmation = async () => {
    if (!canContinue || !currentDiffSignature) return
    const generation = beginValidation()
    if (generation === null) return
    try {
      const refreshedDiff = await refreshDiff(generation)
      if (!refreshedDiff) return
      const refreshedSignature = packDiffSignature(refreshedDiff)
      if (!refreshedSignature) return
      if (refreshedSignature !== currentDiffSignature) {
        setAcknowledgedRemovalSignature(null)
        toast.warning('版本差异已发生变化，请重新核对')
        return
      }
      setReviewedDiffSignature(refreshedSignature)
      setStage('confirm')
    } finally {
      finishValidation(generation)
    }
  }

  const confirmCurrentDiff = async () => {
    if (!exactVersionConfirmed || !reviewedDiffIsCurrent) return
    const generation = beginValidation()
    if (generation === null) return
    try {
      const refreshedDiff = await refreshDiff(generation)
      if (!refreshedDiff) return
      const expectedDiffRevision = getReviewedReleaseRevision(
        refreshedDiff,
        reviewedDiffSignature,
        target.id,
        expectedTargetStatus,
        false,
        false,
      )
      if (!expectedDiffRevision) {
        setStage('review')
        setTypedVersion('')
        setAcknowledgedRemovalSignature(null)
        setReviewedDiffSignature(null)
        toast.warning('版本差异已发生变化，请重新核对')
        return
      }
      onConfirm(hasRemovals, expectedDiffRevision, close)
    } finally {
      finishValidation(generation)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPublish ? <Rocket className="size-5" /> : <History className="size-5" />}
            {isPublish ? '发布' : '回滚至'} {validatedTarget?.version ?? '待校验版本'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'review'
              ? '先核对与当前发布版的完整差异，删除项必须逐项确认。'
              : '这是最终确认。操作完成后，玩家客户端会立即看到新的当前版本。'}
          </DialogDescription>
        </DialogHeader>

        {stage === 'review' ? (
          <div className="space-y-4">
            {diff.isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">正在计算发布差异...</div>
            ) : diff.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                发布差异加载失败，不能继续操作。
              </div>
            ) : diff.data && (!targetMatchesAction || !currentDiffRevision) ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                目标版本状态或差异校验标识已变化，不能继续操作。请关闭窗口并从版本列表重新发起。
              </div>
            ) : diff.data && validatedTarget ? (
              <>
                <div className="space-y-3 rounded-lg border bg-muted/25 p-3">
                  <div className="grid items-stretch gap-2 md:grid-cols-[1fr_auto_1fr]">
                    <VersionSnapshot label="当前发布版" version={diff.data.publishedVersion} />
                    <div className="flex items-center justify-center px-1 text-muted-foreground">
                      <GitCompareArrows className="size-5" />
                    </div>
                    <VersionSnapshot label={isPublish ? '待发布版本' : '待回滚版本'} version={validatedTarget} />
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    新增 {diff.data.added.length} · 变更 {diff.data.changed.length} · 删除 {removedCount}
                  </p>
                </div>

                {removedCount >= 5 ? (
                  <div className="flex gap-3 rounded-lg border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive">
                    <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-semibold">检测到异常数量的删除项</p>
                      <p className="mt-1 text-xs">
                        本次会移除 {removedCount} 个文件。请确认草稿不是从空列表或错误版本创建的。
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-2">
                  <DiffList title="新增" tone="added" items={diff.data.added} />
                  <DiffList title="删除" tone="removed" items={diff.data.removed} />
                  <div className="lg:col-span-2">
                    <DiffList title="变更" tone="changed" items={diff.data.changed} />
                  </div>
                </div>

                {hasRemovals ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <Checkbox
                      checked={removalsAcknowledged}
                      onCheckedChange={(checked) =>
                        setAcknowledgedRemovalSignature(
                          checked === true ? currentDiffSignature : null,
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <span className="block font-medium">我已逐项核对以上 {removedCount} 个删除项</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        其中的 managed 文件会在玩家下次同步时从实例中删除。
                      </span>
                    </span>
                  </label>
                ) : null}
              </>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={validating} onClick={close}>取消</Button>
              <Button type="button" disabled={!canContinue} onClick={() => void continueToConfirmation()}>
                {diff.isFetching ? '重新校验中...' : '继续最终确认'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-4">
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold">{isPublish ? '发布会立即对所有玩家生效' : '回滚会立即切换当前版本'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    请在下方输入完整版本号{' '}
                    <span className="font-mono font-medium text-foreground">
                      {validatedTarget?.version ?? '目标版本已变化'}
                    </span>{' '}
                    以确认。
                  </p>
                  {validatedTarget ? (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>Minecraft {validatedTarget.minecraft} · {validatedTarget.loaderKind} {validatedTarget.loaderVersion}</p>
                      <p className="whitespace-pre-wrap break-words">更新说明：{validatedTarget.note ?? '无更新说明'}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack-release-confirm-version">确认版本号</Label>
              <Input
                id="pack-release-confirm-version"
                value={typedVersion}
                disabled={pending || validating}
                onChange={(event) => setTypedVersion(event.target.value)}
                placeholder={validatedTarget?.version ?? '请返回差异页重新核对'}
                autoComplete="off"
                autoFocus
              />
            </div>

            {!reviewedDiffIsCurrent || diff.isError ? (
              <div className="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm text-warning">
                当前差异已更新或无法验证，请返回差异页重新核对。
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending || validating}
                onClick={() => {
                  setStage('review')
                  setReviewedDiffSignature(null)
                }}
              >
                <ArrowLeft /> 返回差异
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!exactVersionConfirmed || !reviewedDiffIsCurrent || diff.isFetching || diff.isError || pending}
                onClick={() => void confirmCurrentDiff()}
              >
                {pending ? '执行中...' : diff.isFetching ? '校验差异中...' : isPublish ? '确认发布' : '确认回滚'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

import type { PackVersionDiff, PackVersionStatus } from '@/types/modpack'

const PACK_DIFF_REVISION_PATTERN = /^[0-9a-f]{64}$/

export interface ReleaseValidationGate {
  begin: () => number | null
  finish: (generation: number) => boolean
  invalidate: () => void
  isBusy: () => boolean
  isCurrent: (generation: number) => boolean
}

export function createReleaseValidationGate(): ReleaseValidationGate {
  let generation = 0
  let busy = false

  return {
    begin: () => {
      if (busy) return null
      busy = true
      generation += 1
      return generation
    },
    finish: (candidate) => {
      if (!busy || candidate !== generation) return false
      busy = false
      return true
    },
    invalidate: () => {
      generation += 1
      busy = false
    },
    isBusy: () => busy,
    isCurrent: (candidate) => busy && candidate === generation,
  }
}

export function packDiffSignature(diff: PackVersionDiff | undefined): string | null {
  return diff ? JSON.stringify(diff) : null
}

export function isExpectedReleaseTarget(
  diff: PackVersionDiff | undefined,
  targetId: number,
  targetStatus: PackVersionStatus,
): boolean {
  return diff?.targetVersion.id === targetId && diff.targetVersion.status === targetStatus
}

export function isValidPackDiffRevision(revision: string | undefined): revision is string {
  return revision !== undefined && PACK_DIFF_REVISION_PATTERN.test(revision)
}

export function getReviewedReleaseRevision(
  diff: PackVersionDiff | undefined,
  reviewedSignature: string | null,
  targetId: number,
  targetStatus: PackVersionStatus,
  isFetching: boolean,
  isError: boolean,
): string | null {
  const revision = diff?.revision
  if (!isValidPackDiffRevision(revision) || !isExpectedReleaseTarget(diff, targetId, targetStatus)) {
    return null
  }
  const currentSignature = packDiffSignature(diff)
  if (!isReviewedPackDiffCurrent(
    currentSignature,
    reviewedSignature,
    isFetching,
    isError,
  )) {
    return null
  }
  return revision
}

export function isPackDiffReady(
  signature: string | null,
  isFetching: boolean,
  isError: boolean,
): boolean {
  return signature !== null && !isFetching && !isError
}

export function arePackRemovalsAcknowledged(
  hasRemovals: boolean,
  currentSignature: string | null,
  acknowledgedSignature: string | null,
): boolean {
  return (
    !hasRemovals ||
    (currentSignature !== null && acknowledgedSignature === currentSignature)
  )
}

export function isReviewedPackDiffCurrent(
  currentSignature: string | null,
  reviewedSignature: string | null,
  isFetching: boolean,
  isError: boolean,
): boolean {
  return (
    isPackDiffReady(currentSignature, isFetching, isError) &&
    reviewedSignature !== null &&
    currentSignature === reviewedSignature
  )
}

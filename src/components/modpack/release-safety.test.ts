import { describe, expect, it } from 'vitest'
import {
  arePackRemovalsAcknowledged,
  createReleaseValidationGate,
  getReviewedReleaseRevision,
  isExpectedReleaseTarget,
  isPackDiffReady,
  isReviewedPackDiffCurrent,
  isValidPackDiffRevision,
  packDiffSignature,
} from '@/components/modpack/release-safety'
import type { CustomPackEntry, PackVersion, PackVersionDiff } from '@/types/modpack'

const publishedVersion: PackVersion = {
  id: 1,
  version: '2.0.0',
  status: 'published',
  minecraft: '1.20.1',
  loaderKind: 'forge',
  loaderVersion: '47.4.20',
  note: null,
  createdAt: 1_700_000_000,
  publishedAt: 1_700_000_100,
}

const draftVersion: PackVersion = {
  ...publishedVersion,
  id: 2,
  version: '2.1.0',
  status: 'draft',
  publishedAt: null,
}

const removedEntry: CustomPackEntry = {
  id: 10,
  versionId: publishedVersion.id,
  path: 'mods/removed.jar',
  kind: 'custom',
  policy: 'managed',
  sha1: '1111111111111111111111111111111111111111',
  size: 1024,
  downloadUrl: 'https://cdn.example.test/removed.jar',
  platform: null,
  projectId: null,
  projectName: null,
  externalVersionId: null,
}

function diffWithRemovedEntries(
  removed: CustomPackEntry[],
  revision = 'a'.repeat(64),
): PackVersionDiff {
  return {
    revision,
    publishedVersion,
    targetVersion: draftVersion,
    added: [],
    changed: [],
    removed,
  }
}

describe('release safety', () => {
  it('treats missing diff data as unusable', () => {
    expect(packDiffSignature(undefined)).toBeNull()
    expect(isPackDiffReady(null, false, false)).toBe(false)
  })

  it('accepts only the canonical lowercase SHA-256 revision wire format', () => {
    expect(isValidPackDiffRevision('a'.repeat(64))).toBe(true)
    expect(isValidPackDiffRevision('A'.repeat(64))).toBe(false)
    expect(isValidPackDiffRevision('a'.repeat(63))).toBe(false)
    expect(isValidPackDiffRevision('sha256:' + 'a'.repeat(64))).toBe(false)
  })

  it('rejects retained stale data while refetching or after a refetch error', () => {
    const signature = packDiffSignature(diffWithRemovedEntries([]))

    expect(isPackDiffReady(signature, true, false)).toBe(false)
    expect(isPackDiffReady(signature, false, true)).toBe(false)
    expect(isPackDiffReady(signature, false, false)).toBe(true)
  })

  it('changes the signature when the destructive diff changes', () => {
    const before = packDiffSignature(diffWithRemovedEntries([]))
    const after = packDiffSignature(diffWithRemovedEntries([removedEntry]))

    expect(after).not.toBe(before)
  })

  it('binds removal acknowledgement to the complete reviewed diff', () => {
    const acknowledgedSignature = packDiffSignature(diffWithRemovedEntries([removedEntry]))
    const changedEntriesSignature = packDiffSignature(diffWithRemovedEntries([{
      ...removedEntry,
      id: 11,
      path: 'mods/another-removed.jar',
    }]))
    const changedRevisionSignature = packDiffSignature(
      diffWithRemovedEntries([removedEntry], 'b'.repeat(64)),
    )

    expect(
      arePackRemovalsAcknowledged(true, acknowledgedSignature, acknowledgedSignature),
    ).toBe(true)
    expect(
      arePackRemovalsAcknowledged(true, changedEntriesSignature, acknowledgedSignature),
    ).toBe(false)
    expect(
      arePackRemovalsAcknowledged(true, changedRevisionSignature, acknowledgedSignature),
    ).toBe(false)
    expect(arePackRemovalsAcknowledged(true, null, acknowledgedSignature)).toBe(false)
    expect(arePackRemovalsAcknowledged(false, changedEntriesSignature, null)).toBe(true)
  })

  it('accepts only the requested target id in the expected lifecycle state', () => {
    const diff = diffWithRemovedEntries([])

    expect(isExpectedReleaseTarget(diff, draftVersion.id, 'draft')).toBe(true)
    expect(isExpectedReleaseTarget(diff, publishedVersion.id, 'draft')).toBe(false)
    expect(isExpectedReleaseTarget(diff, draftVersion.id, 'archived')).toBe(false)
    expect(isExpectedReleaseTarget(undefined, draftVersion.id, 'draft')).toBe(false)
  })

  it('accepts only the exact reviewed snapshot in a healthy query state', () => {
    const reviewed = packDiffSignature(diffWithRemovedEntries([]))
    const changed = packDiffSignature(diffWithRemovedEntries([removedEntry]))

    expect(isReviewedPackDiffCurrent(reviewed, reviewed, false, false)).toBe(true)
    expect(isReviewedPackDiffCurrent(changed, reviewed, false, false)).toBe(false)
    expect(isReviewedPackDiffCurrent(reviewed, reviewed, true, false)).toBe(false)
    expect(isReviewedPackDiffCurrent(reviewed, reviewed, false, true)).toBe(false)
  })

  it('returns a revision only while the exact reviewed release snapshot is current', () => {
    const reviewedDiff = diffWithRemovedEntries([])
    const reviewedSignature = packDiffSignature(reviewedDiff)
    const changedRevision = diffWithRemovedEntries([], 'b'.repeat(64))

    expect(
      getReviewedReleaseRevision(
        reviewedDiff,
        reviewedSignature,
        draftVersion.id,
        'draft',
        false,
        false,
      ),
    ).toBe(reviewedDiff.revision)
    expect(
      getReviewedReleaseRevision(
        changedRevision,
        reviewedSignature,
        draftVersion.id,
        'draft',
        false,
        false,
      ),
    ).toBeNull()
    expect(
      getReviewedReleaseRevision(
        reviewedDiff,
        reviewedSignature,
        draftVersion.id,
        'draft',
        true,
        false,
      ),
    ).toBeNull()
  })

  it('rejects a second validation while one is running and only the owner can finish it', () => {
    const gate = createReleaseValidationGate()
    const generation = gate.begin()

    expect(generation).not.toBeNull()
    expect(gate.isBusy()).toBe(true)
    expect(gate.begin()).toBeNull()
    expect(gate.finish((generation as number) + 1)).toBe(false)
    expect(gate.isBusy()).toBe(true)
    expect(gate.finish(generation as number)).toBe(true)
    expect(gate.isBusy()).toBe(false)
  })

  it('invalidates an in-flight validation after the dialog is gone', () => {
    const gate = createReleaseValidationGate()
    const generation = gate.begin()

    expect(generation).not.toBeNull()
    gate.invalidate()
    expect(gate.isBusy()).toBe(false)
    expect(gate.isCurrent(generation as number)).toBe(false)
    expect(gate.finish(generation as number)).toBe(false)
  })
})

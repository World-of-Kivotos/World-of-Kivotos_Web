import { describe, expect, it } from 'vitest'
import { reconcileReleasedPackVersion } from '@/hooks/modpack-version-cache'
import type { PackVersion, PackVersionStatus } from '@/types/modpack'

function version(id: number, status: PackVersionStatus): PackVersion {
  return {
    id,
    version: `2.${id}.0`,
    status,
    minecraft: '1.20.1',
    loaderKind: 'forge',
    loaderVersion: '47.4.20',
    note: null,
    createdAt: 1_700_000_000 + id,
    publishedAt: status === 'draft' ? null : 1_700_000_100 + id,
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('reconcileReleasedPackVersion', () => {
  it('uses the mutation response immediately and archives the previous current version', () => {
    const previousCurrent = version(1, 'published')
    const target = version(2, 'draft')
    const untouched = version(3, 'archived')
    const released = {
      ...target,
      status: 'published' as const,
      publishedAt: 1_800_000_000,
    }

    const result = reconcileReleasedPackVersion(
      [previousCurrent, target, untouched],
      released,
    )

    expect(result.find((item) => item.id === released.id)).toBe(released)
    expect(result.find((item) => item.id === previousCurrent.id)).toEqual({
      ...previousCurrent,
      status: 'archived',
    })
    expect(result.find((item) => item.id === untouched.id)).toBe(untouched)
    expect(result.filter((item) => item.status === 'published')).toEqual([released])
  })

  it('keeps the released response visible without depending on a successful refetch', () => {
    const released = version(4, 'published')

    expect(reconcileReleasedPackVersion(undefined, released)).toEqual([released])
  })

  it('upserts a released target missing from a stale cache', () => {
    const previousCurrent = version(1, 'published')
    const released = version(4, 'published')

    expect(reconcileReleasedPackVersion([previousCurrent], released)).toEqual([
      released,
      { ...previousCurrent, status: 'archived' },
    ])
  })

  it('leaves exactly the response version published across randomized stale caches', () => {
    const random = seededRandom(0x51a7e)
    const statuses: PackVersionStatus[] = ['draft', 'published', 'archived']

    for (let iteration = 0; iteration < 64; iteration += 1) {
      const released = version(10_000 + iteration, 'published')
      const count = 1 + Math.floor(random() * 24)
      const cached = Array.from({ length: count }, (_, index) =>
        version(
          iteration * 100 + index + 1,
          statuses[Math.floor(random() * statuses.length)] as PackVersionStatus,
        ),
      )
      if (iteration % 2 === 0) {
        cached.splice(Math.floor(random() * cached.length), 0, {
          ...released,
          status: 'archived',
        })
      }

      const result = reconcileReleasedPackVersion(cached, released)

      expect(result.find((item) => item.id === released.id)).toBe(released)
      expect(result.filter((item) => item.status === 'published')).toEqual([released])
    }
  })
})

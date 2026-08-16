import { describe, expect, it } from 'vitest'
import {
  getPackEnvironmentLockReason,
  hasPackEnvironmentChanged,
} from '@/components/modpack/draft-environment-safety'
import type { CustomPackEntry, PlatformPackEntry } from '@/types/modpack'

const customEntry: CustomPackEntry = {
  id: 1,
  versionId: 2,
  path: 'config/wok.toml',
  kind: 'custom',
  policy: 'seeded',
  sha1: '1'.repeat(40),
  size: 128,
  downloadUrl: 'https://cdn.example.test/wok.toml',
  platform: null,
  projectId: null,
  projectName: null,
  externalVersionId: null,
}

const platformEntry: PlatformPackEntry = {
  id: 2,
  versionId: 2,
  path: 'mods/sodium.jar',
  kind: 'platform',
  policy: 'managed',
  sha1: '2'.repeat(40),
  size: 1024,
  downloadUrl: 'https://cdn.modrinth.com/data/sodium.jar',
  platform: 'modrinth',
  projectId: 'sodium',
  projectName: 'Sodium',
  externalVersionId: 'sodium-version',
}

describe('pack draft environment safety', () => {
  it('locks the environment until entries are known and after an entries error', () => {
    expect(getPackEnvironmentLockReason(undefined, true, false)).toBe('loading')
    expect(getPackEnvironmentLockReason(undefined, false, false)).toBe('loading')
    expect(getPackEnvironmentLockReason([], false, true)).toBe('error')
  })

  it('locks a stale empty entry cache while its invalidation refetch is running', () => {
    expect(getPackEnvironmentLockReason([], true, false)).toBe('loading')
  })

  it('locks for every platform entry but not for custom-only drafts', () => {
    expect(getPackEnvironmentLockReason([customEntry], false, false)).toBeNull()
    expect(getPackEnvironmentLockReason([customEntry, platformEntry], false, false)).toBe('platform')
  })

  it('detects normalized Minecraft or loader changes', () => {
    const version = { minecraft: '1.20.1', loaderKind: 'forge', loaderVersion: '47.4.20' } as const

    expect(hasPackEnvironmentChanged(version, {
      minecraft: ' 1.20.1 ',
      loaderKind: 'forge',
      loaderVersion: '47.4.20',
    })).toBe(false)
    expect(hasPackEnvironmentChanged(version, {
      minecraft: '1.21.1',
      loaderKind: 'forge',
      loaderVersion: '47.4.20',
    })).toBe(true)
    expect(hasPackEnvironmentChanged(version, {
      minecraft: '1.20.1',
      loaderKind: 'fabric',
      loaderVersion: '0.16.14',
    })).toBe(true)
  })
})

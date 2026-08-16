import { describe, expect, it } from 'vitest'
import { getPackEntryFieldChangeDisplays } from '@/components/modpack/release-diff-display'
import type { CustomPackEntry, PackEntryChange, PlatformPackEntry } from '@/types/modpack'

const before: CustomPackEntry = {
  id: 1,
  versionId: 3,
  path: 'mods/example.jar',
  kind: 'custom',
  policy: 'seeded',
  sha1: '1'.repeat(40),
  size: 1024,
  downloadUrl: 'https://cdn.example.test/old.jar',
  platform: null,
  projectId: null,
  projectName: null,
  externalVersionId: null,
}

const after: PlatformPackEntry = {
  ...before,
  versionId: 4,
  kind: 'platform',
  policy: 'managed',
  sha1: '2'.repeat(40),
  size: 2048,
  downloadUrl: 'https://cdn.modrinth.com/new.jar',
  platform: 'modrinth',
  projectId: 'example-project',
  projectName: 'Example Project',
  externalVersionId: 'example-version',
}

describe('release diff display', () => {
  it('shows exact before and after values for every server-reported changed field', () => {
    const changedFields = [
      'kind',
      'policy',
      'sha1',
      'size',
      'downloadUrl',
      'platform',
      'projectId',
      'projectName',
      'externalVersionId',
    ]
    const change: PackEntryChange = { before, after, changedFields }

    expect(getPackEntryFieldChangeDisplays(change)).toEqual([
      { field: 'kind', label: '条目类型', before: 'custom', after: 'platform' },
      { field: 'policy', label: '文件策略', before: 'seeded', after: 'managed' },
      { field: 'sha1', label: 'SHA1', before: '1'.repeat(40), after: '2'.repeat(40) },
      { field: 'size', label: '文件大小', before: '1024 B', after: '2048 B' },
      {
        field: 'downloadUrl',
        label: '下载地址',
        before: 'https://cdn.example.test/old.jar',
        after: 'https://cdn.modrinth.com/new.jar',
      },
      { field: 'platform', label: '平台', before: '未设置', after: 'modrinth' },
      { field: 'projectId', label: '项目 ID', before: '未设置', after: 'example-project' },
      { field: 'projectName', label: '项目名称', before: '未设置', after: 'Example Project' },
      {
        field: 'externalVersionId',
        label: '平台版本 ID',
        before: '未设置',
        after: 'example-version',
      },
    ])
  })

  it('keeps unknown future fields visible instead of silently dropping them', () => {
    const change: PackEntryChange = {
      before,
      after,
      changedFields: ['futureField'],
    }

    expect(getPackEntryFieldChangeDisplays(change)).toEqual([
      {
        field: 'futureField',
        label: 'futureField',
        before: '字段不存在',
        after: '字段不存在',
      },
    ])
  })
})

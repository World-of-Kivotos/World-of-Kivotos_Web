import { describe, expect, it } from 'vitest'
import {
  buildModrinthSearchFacets,
  replaceModrinthPackEntryVersion,
  selectModrinthPrimaryFile,
  toModrinthPackEntry,
} from '@/services/modrinth'
import type {
  ModrinthSearchHit,
  ModrinthVersion,
  ModrinthVersionFile,
  PlatformPackEntry,
} from '@/types/modpack'

function versionFile(filename: string, primary: boolean, sha1: string): ModrinthVersionFile {
  return {
    hashes: {
      sha1,
      sha512: 'b'.repeat(128),
    },
    url: `https://cdn.modrinth.com/data/project/versions/version/${filename}`,
    filename,
    primary,
    size: 1_048_576,
    file_type: null,
  }
}

function modrinthVersion(
  files: ModrinthVersionFile[],
  overrides: Partial<ModrinthVersion> = {},
): ModrinthVersion {
  return {
    id: 'version-id',
    project_id: 'project-id',
    author_id: 'author-id',
    name: 'Release 2.0.0',
    version_number: '2.0.0',
    dependencies: [],
    game_versions: ['1.20.1'],
    version_type: 'release',
    loaders: ['forge'],
    featured: true,
    status: 'listed',
    requested_status: null,
    date_published: '2026-08-17T12:00:00Z',
    downloads: 100,
    changelog_url: null,
    environment: 'client_and_server',
    files,
    ...overrides,
  }
}

function searchHit(overrides: Partial<ModrinthSearchHit> = {}): ModrinthSearchHit {
  return {
    project_id: 'project-id',
    project_type: 'mod',
    all_project_types: ['mod'],
    title: 'Example Mod',
    description: 'Example description',
    author: 'author',
    categories: ['forge'],
    display_categories: ['forge'],
    versions: ['1.20.1'],
    downloads: 500,
    follows: 50,
    icon_url: null,
    date_created: '2026-01-01T00:00:00Z',
    date_modified: '2026-08-17T00:00:00Z',
    latest_version: 'version-id',
    license: 'MIT',
    environment: ['client_and_server'],
    gallery: [],
    slug: 'example-mod',
    author_id: null,
    organization: null,
    organization_id: null,
    featured_gallery: null,
    color: null,
    client_side: 'required',
    server_side: 'required',
    ...overrides,
  }
}

describe('buildModrinthSearchFacets', () => {
  it('为项目类型、加载器和 Minecraft 版本创建 AND 分组', () => {
    expect(buildModrinthSearchFacets(' 1.20.1 ', ' forge ')).toEqual([
      ['project_type:mod'],
      ['categories:forge'],
      ['versions:1.20.1'],
    ])
  })
})

describe('selectModrinthPrimaryFile', () => {
  it('优先选择 primary 文件', () => {
    const fallback = versionFile('fallback.jar', false, 'a'.repeat(40))
    const primary = versionFile('primary.jar', true, 'c'.repeat(40))

    expect(selectModrinthPrimaryFile(modrinthVersion([fallback, primary]))).toBe(primary)
  })

  it('没有 primary 标记时回退到第一个文件', () => {
    const first = versionFile('first.jar', false, 'a'.repeat(40))
    const second = versionFile('second.jar', false, 'c'.repeat(40))

    expect(selectModrinthPrimaryFile(modrinthVersion([first, second]))).toBe(first)
  })

  it('拒绝没有任何下载文件的版本', () => {
    expect(() => selectModrinthPrimaryFile(modrinthVersion([]))).toThrow(
      'Modrinth 版本 2.0.0 没有可下载文件',
    )
  })
})

describe('toModrinthPackEntry', () => {
  it('拒绝不属于所选项目的版本', () => {
    const project = searchHit()
    const version = modrinthVersion([], { project_id: 'another-project' })

    expect(() => toModrinthPackEntry(project, version)).toThrow('Modrinth 项目与版本不匹配')
  })

  it('把 primary 文件完整映射为平台条目', () => {
    const file = versionFile('example-mod-2.0.0.jar', true, 'd'.repeat(40))
    const entry = toModrinthPackEntry(searchHit(), modrinthVersion([file]), 'optional')

    expect(entry).toEqual({
      path: 'mods/example-mod-2.0.0.jar',
      kind: 'platform',
      policy: 'optional',
      sha1: 'd'.repeat(40),
      size: 1_048_576,
      downloadUrl:
        'https://cdn.modrinth.com/data/project/versions/version/example-mod-2.0.0.jar',
      platform: 'modrinth',
      projectId: 'project-id',
      projectName: 'Example Mod',
      externalVersionId: 'version-id',
    })
  })
})

describe('replaceModrinthPackEntryVersion', () => {
  it('换版本时保留原目录与 policy 并替换文件元数据', () => {
    const existing: PlatformPackEntry = {
      id: 7,
      versionId: 3,
      path: 'mods/client/old-name.jar',
      kind: 'platform',
      policy: 'seeded',
      sha1: 'a'.repeat(40),
      size: 512,
      downloadUrl: 'https://cdn.modrinth.com/old.jar',
      platform: 'modrinth',
      projectId: 'project-id',
      projectName: 'Example Mod',
      externalVersionId: 'old-version',
    }
    const file = versionFile('new-name.jar', true, 'e'.repeat(40))
    const updated = replaceModrinthPackEntryVersion(existing, modrinthVersion([file]))

    expect(updated.path).toBe('mods/client/new-name.jar')
    expect(updated.policy).toBe('seeded')
    expect(updated.sha1).toBe('e'.repeat(40))
    expect(updated.size).toBe(1_048_576)
    expect(updated.downloadUrl).toBe(
      'https://cdn.modrinth.com/data/project/versions/version/new-name.jar',
    )
    expect(updated.externalVersionId).toBe('version-id')
  })
})

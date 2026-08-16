import { describe, expect, it } from 'vitest'
import { resolveSelectedPackVersionId } from '@/pages/modpack-selection'
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

describe('resolveSelectedPackVersionId', () => {
  it('首次拿到版本列表时固化优先级最高的草稿', () => {
    const versions = [version(1, 'archived'), version(2, 'published'), version(3, 'draft')]

    expect(resolveSelectedPackVersionId(versions, null, false)).toBe(3)
  })

  it('列表刷新出现更新的草稿时保留已选版本', () => {
    const versions = [version(4, 'draft'), version(3, 'draft'), version(2, 'published')]

    expect(resolveSelectedPackVersionId(versions, 3, false)).toBe(3)
  })

  it('有未保存输入且已选 ID 暂时消失时不切换 Workspace', () => {
    const versions = [version(4, 'draft'), version(2, 'published')]

    expect(resolveSelectedPackVersionId(versions, 3, true)).toBe(3)
  })

  it('没有未保存输入且已选 ID 消失时安全回退', () => {
    const versions = [version(4, 'draft'), version(2, 'published')]

    expect(resolveSelectedPackVersionId(versions, 3, false)).toBe(4)
  })

  it('新建结果尚未进入版本缓存时保留服务端返回的选中项', () => {
    const staleVersions = [version(3, 'draft'), version(2, 'published')]

    expect(resolveSelectedPackVersionId(staleVersions, 4, false, true)).toBe(4)
  })

  it('空列表没有可选版本', () => {
    expect(resolveSelectedPackVersionId([], null, false)).toBeNull()
  })
})

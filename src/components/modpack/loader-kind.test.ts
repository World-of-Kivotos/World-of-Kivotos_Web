import { describe, expect, it } from 'vitest'
import { PACK_LOADER_OPTIONS, requirePackLoaderKind } from '@/components/modpack/loader-kind'

describe('pack loader kind', () => {
  it('与服务端加载器 allowlist 精确一致', () => {
    expect(PACK_LOADER_OPTIONS.map((option) => option.value)).toEqual([
      'fabric',
      'quilt',
      'forge',
      'neoforge',
    ])
  })

  it('拒绝 allowlist 之外的加载器', () => {
    expect(requirePackLoaderKind('forge')).toBe('forge')
    expect(() => requirePackLoaderKind('Forge')).toThrow('不支持的加载器类型：Forge')
  })
})

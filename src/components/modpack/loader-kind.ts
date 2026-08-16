import type { PackLoaderKind } from '@/types/modpack'

export const PACK_LOADER_OPTIONS = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'quilt', label: 'Quilt' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
] as const satisfies readonly { value: PackLoaderKind; label: string }[]

export function requirePackLoaderKind(value: string): PackLoaderKind {
  const option = PACK_LOADER_OPTIONS.find((candidate) => candidate.value === value)
  if (!option) throw new Error(`不支持的加载器类型：${value}`)
  return option.value
}

import type { PackEntry, PackLoaderKind, PackVersion } from '@/types/modpack'

export type PackEnvironmentLockReason = 'loading' | 'error' | 'platform'

interface PackEnvironmentInput {
  minecraft: string
  loaderKind: PackLoaderKind
  loaderVersion: string
}

export function getPackEnvironmentLockReason(
  entries: readonly PackEntry[] | undefined,
  isLoading: boolean,
  isError: boolean,
): PackEnvironmentLockReason | null {
  if (isError) return 'error'
  if (isLoading || entries === undefined) return 'loading'
  return entries.some((entry) => entry.kind === 'platform') ? 'platform' : null
}

export function hasPackEnvironmentChanged(
  version: Pick<PackVersion, 'minecraft' | 'loaderKind' | 'loaderVersion'>,
  input: PackEnvironmentInput,
): boolean {
  return (
    input.minecraft.trim() !== version.minecraft ||
    input.loaderKind.trim() !== version.loaderKind ||
    input.loaderVersion.trim() !== version.loaderVersion
  )
}

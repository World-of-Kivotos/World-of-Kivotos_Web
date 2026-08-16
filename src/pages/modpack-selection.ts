import type { PackVersion } from '@/types/modpack'

type SelectablePackVersion = Pick<PackVersion, 'id' | 'status'>

function preferredPackVersionId(versions: readonly SelectablePackVersion[]): number | null {
  return (
    versions.find((version) => version.status === 'draft')?.id ??
    versions.find((version) => version.status === 'published')?.id ??
    versions[0]?.id ??
    null
  )
}

export function resolveSelectedPackVersionId(
  versions: readonly SelectablePackVersion[],
  selectedVersionId: number | null,
  hasUnsavedChanges: boolean,
  retainUntilListed = false,
): number | null {
  if (selectedVersionId !== null) {
    if (versions.some((version) => version.id === selectedVersionId)) return selectedVersionId
    if (hasUnsavedChanges || retainUntilListed) return selectedVersionId
  }

  return preferredPackVersionId(versions)
}

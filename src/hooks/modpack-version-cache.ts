import type { PackVersion } from '@/types/modpack'

export function reconcileReleasedPackVersion(
  cachedVersions: readonly PackVersion[] | undefined,
  releasedVersion: PackVersion,
): PackVersion[] {
  let targetFound = false
  const reconciled = (cachedVersions ?? []).map((version) => {
    if (version.id === releasedVersion.id) {
      targetFound = true
      return releasedVersion
    }
    if (version.status === 'published') {
      return { ...version, status: 'archived' as const }
    }
    return version
  })

  return targetFound ? reconciled : [releasedVersion, ...reconciled]
}

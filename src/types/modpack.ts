export type PackVersionStatus = 'draft' | 'published' | 'archived'

export type PackLoaderKind = 'fabric' | 'quilt' | 'forge' | 'neoforge'

export type PackEntryKind = 'platform' | 'custom'

export type PackEntryPolicy = 'managed' | 'seeded' | 'optional'

export type PackPlatform = 'modrinth' | 'curseforge'

export interface PackVersion {
  id: number
  version: string
  status: PackVersionStatus
  minecraft: string
  loaderKind: PackLoaderKind
  loaderVersion: string
  note: string | null
  createdAt: number
  publishedAt: number | null
}

interface PackEntryBase {
  id: number
  versionId: number
  path: string
  policy: PackEntryPolicy
  sha1: string
  size: number
  downloadUrl: string
}

export interface PlatformPackEntry extends PackEntryBase {
  kind: 'platform'
  platform: PackPlatform
  projectId: string
  projectName: string
  externalVersionId: string
}

export interface CustomPackEntry extends PackEntryBase {
  kind: 'custom'
  platform: null
  projectId: null
  projectName: null
  externalVersionId: null
}

export type PackEntry = PlatformPackEntry | CustomPackEntry

export interface CreateEmptyPackDraftRequest {
  version: string
  minecraft: string
  loaderKind: PackLoaderKind
  loaderVersion: string
  note?: string | null
  copyFromVersionId?: never
}

export interface CopyPackDraftRequest {
  version: string
  copyFromVersionId: number
  minecraft?: never
  loaderKind?: never
  loaderVersion?: never
  note?: never
}

export type CreatePackDraftRequest = CreateEmptyPackDraftRequest | CopyPackDraftRequest

export interface UpdatePackDraftRequest {
  version: string
  minecraft: string
  loaderKind: PackLoaderKind
  loaderVersion: string
  note: string | null
}

interface PackEntryRequestBase {
  path: string
  policy: PackEntryPolicy
  sha1: string
  size: number
  downloadUrl: string
}

export interface PlatformPackEntryRequest extends PackEntryRequestBase {
  kind: 'platform'
  platform: PackPlatform
  projectId: string
  projectName: string
  externalVersionId: string
}

export interface CustomPackEntryRequest extends PackEntryRequestBase {
  kind: 'custom'
  platform?: null
  projectId?: null
  projectName?: null
  externalVersionId?: null
}

export type PackEntryRequest = PlatformPackEntryRequest | CustomPackEntryRequest

export interface PackEntryChange {
  before: PackEntry
  after: PackEntry
  changedFields: string[]
}

export interface PackVersionDiff {
  revision: string
  publishedVersion: PackVersion | null
  targetVersion: PackVersion
  added: PackEntry[]
  changed: PackEntryChange[]
  removed: PackEntry[]
}

export interface ConfirmPackVersionRequest {
  confirmRemovals: boolean
  expectedDiffRevision: string
}

export interface PackUploadRequest {
  file: File
  path: string
  policy: PackEntryPolicy
}

export interface PackUploadProgress {
  loaded: number
  total?: number
  percentage?: number
}

export interface PackApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code: number
  timestamp: string
}

export type ModrinthSearchIndex = 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'

export interface SearchModrinthProjectsParams {
  query: string
  minecraft?: string
  loader?: string
  index?: ModrinthSearchIndex
  offset?: number
  limit?: number
}

export type ModrinthProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader'

export type ModrinthSideSupport = 'required' | 'optional' | 'unsupported' | 'unknown'

export interface ModrinthSearchHit {
  project_id: string
  project_type: ModrinthProjectType
  all_project_types: string[]
  title: string
  description: string
  author: string
  categories: string[]
  display_categories: string[]
  versions: string[]
  downloads: number
  follows: number
  icon_url: string | null
  date_created: string
  date_modified: string
  latest_version: string
  license: string
  environment: string[]
  gallery: string[]
  slug: string | null
  author_id: string | null
  organization: string | null
  organization_id: string | null
  featured_gallery: string | null
  color: number | null
  client_side: ModrinthSideSupport
  server_side: ModrinthSideSupport
}

export interface ModrinthSearchResponse {
  hits: ModrinthSearchHit[]
  offset: number
  limit: number
  total_hits: number
}

export type ModrinthDependencyType = 'required' | 'optional' | 'incompatible' | 'embedded'

export interface ModrinthDependency {
  version_id: string | null
  project_id: string | null
  file_name: string | null
  dependency_type: ModrinthDependencyType
}

export type ModrinthVersionType = 'release' | 'beta' | 'alpha'

export type ModrinthVersionStatus =
  | 'listed'
  | 'archived'
  | 'draft'
  | 'unlisted'
  | 'scheduled'
  | 'unknown'

export type ModrinthFileType =
  | 'required-resource-pack'
  | 'optional-resource-pack'
  | 'sources-jar'
  | 'dev-jar'
  | 'javadoc-jar'
  | 'unknown'
  | 'signature'

export interface ModrinthVersionFile {
  hashes: {
    sha512: string
    sha1: string
  }
  url: string
  filename: string
  primary: boolean
  size: number
  file_type: ModrinthFileType | null
}

export interface ModrinthVersion {
  id: string
  project_id: string
  author_id: string
  name: string
  version_number: string
  changelog?: string | null
  dependencies: ModrinthDependency[]
  game_versions: string[]
  version_type: ModrinthVersionType
  loaders: string[]
  featured: boolean
  status: ModrinthVersionStatus
  requested_status: Exclude<ModrinthVersionStatus, 'scheduled' | 'unknown'> | null
  date_published: string
  downloads: number
  changelog_url: string | null
  environment: string
  files: ModrinthVersionFile[]
}

export interface ListModrinthVersionsParams {
  projectId: string
  minecraft: string
  loader?: string
}

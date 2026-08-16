import axios, { isAxiosError } from 'axios'
import type {
  ListModrinthVersionsParams,
  ModrinthSearchHit,
  ModrinthSearchResponse,
  ModrinthVersion,
  ModrinthVersionFile,
  PackEntryPolicy,
  PlatformPackEntry,
  PlatformPackEntryRequest,
  SearchModrinthProjectsParams,
} from '@/types/modpack'

const MODRINTH_API_BASE_URL = 'https://api.modrinth.com/v2'
const DEFAULT_LOADER = 'forge'

// 独立实例用于确保站内 JWT 不会被共享 axios 拦截器发送到第三方域名。
const modrinthClient = axios.create({
  baseURL: MODRINTH_API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
})

function validatePagination(offset: number, limit: number): void {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Modrinth 搜索 offset 必须是非负整数')
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Modrinth 搜索 limit 必须是 1 到 100 的整数')
  }
}

function modrinthErrorMessage(error: unknown, fallback: string): Error {
  if (axios.isCancel(error)) return error
  if (!isAxiosError(error)) {
    return error instanceof Error ? error : new Error(fallback)
  }

  const body = error.response?.data
  if (body != null && typeof body === 'object') {
    const description = (body as { description?: unknown }).description
    if (typeof description === 'string' && description.length > 0) {
      return new Error(description)
    }
  }
  return new Error(error.message || fallback)
}

export function buildModrinthSearchFacets(
  minecraft?: string,
  loader: string = DEFAULT_LOADER,
): string[][] {
  const facets: string[][] = [['project_type:mod']]
  const normalizedLoader = loader.trim()
  const normalizedMinecraft = minecraft?.trim()

  if (normalizedLoader) facets.push([`categories:${normalizedLoader}`])
  if (normalizedMinecraft) facets.push([`versions:${normalizedMinecraft}`])
  return facets
}

export function selectModrinthPrimaryFile(version: ModrinthVersion): ModrinthVersionFile {
  const file = version.files.find((candidate) => candidate.primary) ?? version.files[0]
  if (!file) {
    throw new Error(`Modrinth 版本 ${version.version_number} 没有可下载文件`)
  }
  return file
}

export function toModrinthPackEntry(
  project: ModrinthSearchHit,
  version: ModrinthVersion,
  policy: PackEntryPolicy = 'managed',
): PlatformPackEntryRequest {
  if (project.project_id !== version.project_id) {
    throw new Error('Modrinth 项目与版本不匹配')
  }

  const file = selectModrinthPrimaryFile(version)
  return {
    path: `mods/${file.filename}`,
    kind: 'platform',
    policy,
    sha1: file.hashes.sha1,
    size: file.size,
    downloadUrl: file.url,
    platform: 'modrinth',
    projectId: project.project_id,
    projectName: project.title,
    externalVersionId: version.id,
  }
}

export function replaceModrinthPackEntryVersion(
  entry: PlatformPackEntry,
  version: ModrinthVersion,
): PlatformPackEntryRequest {
  if (entry.platform !== 'modrinth') {
    throw new Error('只有 Modrinth 条目可以使用 Modrinth 版本替换')
  }
  if (entry.projectId !== version.project_id) {
    throw new Error('Modrinth 项目与版本不匹配')
  }

  const file = selectModrinthPrimaryFile(version)
  const separator = entry.path.lastIndexOf('/')
  const directory = separator >= 0 ? entry.path.slice(0, separator + 1) : ''
  return {
    path: `${directory}${file.filename}`,
    kind: 'platform',
    policy: entry.policy,
    sha1: file.hashes.sha1,
    size: file.size,
    downloadUrl: file.url,
    platform: 'modrinth',
    projectId: entry.projectId,
    projectName: entry.projectName,
    externalVersionId: version.id,
  }
}

export const modrinthApi = {
  async searchProjects(
    params: SearchModrinthProjectsParams,
    signal?: AbortSignal,
  ): Promise<ModrinthSearchResponse> {
    const offset = params.offset ?? 0
    const limit = params.limit ?? 20
    validatePagination(offset, limit)

    try {
      const response = await modrinthClient.get<ModrinthSearchResponse>('/search', {
        signal,
        params: {
          query: params.query.trim(),
          facets: JSON.stringify(buildModrinthSearchFacets(params.minecraft, params.loader)),
          index: params.index ?? 'relevance',
          offset,
          limit,
        },
      })
      return response.data
    } catch (error) {
      throw modrinthErrorMessage(error, '搜索 Modrinth 项目失败')
    }
  },

  async listProjectVersions(
    params: ListModrinthVersionsParams,
    signal?: AbortSignal,
  ): Promise<ModrinthVersion[]> {
    const projectId = params.projectId.trim()
    const minecraft = params.minecraft.trim()
    const loader = (params.loader ?? DEFAULT_LOADER).trim()
    if (!projectId || !minecraft || !loader) {
      throw new Error('查询 Modrinth 版本需要项目、Minecraft 版本和加载器')
    }

    try {
      const response = await modrinthClient.get<ModrinthVersion[]>(
        `/project/${encodeURIComponent(projectId)}/version`,
        {
          signal,
          params: {
            game_versions: JSON.stringify([minecraft]),
            loaders: JSON.stringify([loader]),
            include_changelog: false,
          },
        },
      )
      return response.data
    } catch (error) {
      throw modrinthErrorMessage(error, '获取 Modrinth 项目版本失败')
    }
  },
}

export default modrinthApi

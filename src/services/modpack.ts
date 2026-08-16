import { isAxiosError } from 'axios'
import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import api from '@/lib/axios'
import type {
  CreatePackDraftRequest,
  PackApiResponse,
  PackEntry,
  PackEntryRequest,
  PackUploadProgress,
  PackUploadRequest,
  PackVersion,
  PackVersionDiff,
  UpdatePackDraftRequest,
} from '@/types/modpack'

const PACK_UPLOAD_TIMEOUT_MS = 20 * 60 * 1000

function responseErrorMessage(body: unknown): string | undefined {
  if (body == null || typeof body !== 'object') return undefined

  const response = body as { error?: unknown; message?: unknown }
  if (typeof response.error === 'string' && response.error.length > 0) {
    return response.error
  }
  if (response.error != null && typeof response.error === 'object') {
    const nestedMessage = (response.error as { message?: unknown }).message
    if (typeof nestedMessage === 'string' && nestedMessage.length > 0) {
      return nestedMessage
    }
  }
  return typeof response.message === 'string' && response.message.length > 0
    ? response.message
    : undefined
}

async function execute<T>(
  request: Promise<AxiosResponse<PackApiResponse<T>>>,
  fallbackMessage: string,
): Promise<PackApiResponse<T>> {
  try {
    const response = await request
    if (!response.data.success) {
      throw new Error(responseErrorMessage(response.data) ?? fallbackMessage)
    }
    return response.data
  } catch (error) {
    if (isAxiosError(error)) {
      const message = responseErrorMessage(error.response?.data)
      if (message) throw new Error(message)
    }
    throw error
  }
}

async function executeWithData<T>(
  request: Promise<AxiosResponse<PackApiResponse<T>>>,
  fallbackMessage: string,
): Promise<T> {
  const body = await execute(request, fallbackMessage)
  if (body.data == null) {
    throw new Error(`${fallbackMessage}：服务端未返回数据`)
  }
  return body.data
}

function toUploadProgress(event: AxiosProgressEvent): PackUploadProgress {
  const total = event.total
  return {
    loaded: event.loaded,
    total,
    percentage: total != null && total > 0 ? Math.round((event.loaded / total) * 100) : undefined,
  }
}

export function createPackUploadForm(data: PackUploadRequest): FormData {
  const form = new FormData()
  form.append('file', data.file, data.file.name)
  form.append('path', data.path)
  form.append('policy', data.policy)
  return form
}

export const modpackApi = {
  async listVersions(signal?: AbortSignal): Promise<PackVersion[]> {
    return executeWithData(
      api.get<PackApiResponse<PackVersion[]>>('/v1/pack/versions', { signal }),
      '获取整合包版本失败',
    )
  },

  async createDraft(data: CreatePackDraftRequest): Promise<PackVersion> {
    return executeWithData(
      api.post<PackApiResponse<PackVersion>>('/v1/pack/versions', data),
      '创建整合包草稿失败',
    )
  },

  async updateDraft(versionId: number, data: UpdatePackDraftRequest): Promise<PackVersion> {
    return executeWithData(
      api.put<PackApiResponse<PackVersion>>(`/v1/pack/versions/${versionId}`, data),
      '更新整合包草稿失败',
    )
  },

  async listEntries(versionId: number, signal?: AbortSignal): Promise<PackEntry[]> {
    return executeWithData(
      api.get<PackApiResponse<PackEntry[]>>(`/v1/pack/versions/${versionId}/entries`, { signal }),
      '获取整合包条目失败',
    )
  },

  async addEntry(versionId: number, data: PackEntryRequest): Promise<PackEntry> {
    return executeWithData(
      api.post<PackApiResponse<PackEntry>>(`/v1/pack/versions/${versionId}/entries`, data),
      '添加整合包条目失败',
    )
  },

  async updateEntry(entryId: number, data: PackEntryRequest): Promise<PackEntry> {
    return executeWithData(
      api.put<PackApiResponse<PackEntry>>(`/v1/pack/entries/${entryId}`, data),
      '更新整合包条目失败',
    )
  },

  async deleteEntry(entryId: number): Promise<void> {
    await execute(
      api.delete<PackApiResponse<unknown>>(`/v1/pack/entries/${entryId}`),
      '删除整合包条目失败',
    )
  },

  async uploadFile(
    versionId: number,
    data: PackUploadRequest,
    onProgress?: (progress: PackUploadProgress) => void,
  ): Promise<PackEntry> {
    const form = createPackUploadForm(data)

    return executeWithData(
      api.post<PackApiResponse<PackEntry>>(`/v1/pack/versions/${versionId}/upload`, form, {
        headers: { 'Content-Type': undefined },
        timeout: PACK_UPLOAD_TIMEOUT_MS,
        onUploadProgress: onProgress ? (event) => onProgress(toUploadProgress(event)) : undefined,
      }),
      '上传整合包文件失败',
    )
  },

  async getDiff(versionId: number, signal?: AbortSignal): Promise<PackVersionDiff> {
    return executeWithData(
      api.get<PackApiResponse<PackVersionDiff>>(`/v1/pack/versions/${versionId}/diff`, { signal }),
      '获取整合包版本差异失败',
    )
  },

  async publish(versionId: number, confirmRemovals: boolean): Promise<PackVersion> {
    return executeWithData(
      api.post<PackApiResponse<PackVersion>>(`/v1/pack/versions/${versionId}/publish`, {
        confirmRemovals,
      }),
      '发布整合包版本失败',
    )
  },

  async rollback(versionId: number, confirmRemovals: boolean): Promise<PackVersion> {
    return executeWithData(
      api.post<PackApiResponse<PackVersion>>(`/v1/pack/versions/${versionId}/rollback`, {
        confirmRemovals,
      }),
      '回滚整合包版本失败',
    )
  },
}

export default modpackApi

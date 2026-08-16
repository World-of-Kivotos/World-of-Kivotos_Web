import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { reconcileReleasedPackVersion } from '@/hooks/modpack-version-cache'
import { modpackApi } from '@/services/modpack'
import { modrinthApi } from '@/services/modrinth'
import type {
  ConfirmPackVersionRequest,
  CreatePackDraftRequest,
  ListModrinthVersionsParams,
  PackEntryRequest,
  PackUploadProgress,
  PackUploadRequest,
  PackVersion,
  SearchModrinthProjectsParams,
  UpdatePackDraftRequest,
} from '@/types/modpack'

export const modpackKeys = {
  all: ['modpack'] as const,
  versions: () => [...modpackKeys.all, 'versions'] as const,
  entriesRoot: () => [...modpackKeys.all, 'entries'] as const,
  entries: (versionId: number) => [...modpackKeys.entriesRoot(), versionId] as const,
  diffs: () => [...modpackKeys.all, 'diff'] as const,
  diff: (versionId: number) => [...modpackKeys.diffs(), versionId] as const,
}

export const modrinthKeys = {
  all: ['modrinth'] as const,
  searches: () => [...modrinthKeys.all, 'search'] as const,
  search: (params: SearchModrinthProjectsParams) => [...modrinthKeys.searches(), params] as const,
  versions: (params: ListModrinthVersionsParams) =>
    [...modrinthKeys.all, 'versions', params] as const,
}

function showMutationError(error: Error, fallback: string): void {
  toast.error(error.message || fallback)
}

export function usePackVersions() {
  return useQuery({
    queryKey: modpackKeys.versions(),
    queryFn: ({ signal }) => modpackApi.listVersions(signal),
    staleTime: 30 * 1000,
  })
}

export function usePackEntries(versionId: number) {
  return useQuery({
    queryKey: modpackKeys.entries(versionId),
    queryFn: ({ signal }) => modpackApi.listEntries(versionId, signal),
    enabled: versionId > 0,
    staleTime: 30 * 1000,
  })
}

export function usePackDiff(versionId: number, enabled = true) {
  return useQuery({
    queryKey: modpackKeys.diff(versionId),
    queryFn: ({ signal }) => modpackApi.getDiff(versionId, signal),
    enabled: enabled && versionId > 0,
    staleTime: 15 * 1000,
  })
}

export function useCreatePackDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePackDraftRequest) => modpackApi.createDraft(data),
    onSuccess: () => {
      toast.success('整合包草稿已创建')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.versions() })
    },
    onError: (error: Error) => showMutationError(error, '创建整合包草稿失败'),
  })
}

export interface UpdatePackDraftMutation {
  versionId: number
  data: UpdatePackDraftRequest
}

export function useUpdatePackDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, data }: UpdatePackDraftMutation) =>
      modpackApi.updateDraft(versionId, data),
    onSuccess: (_, variables) => {
      toast.success('整合包草稿已更新')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.versions() })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
    onError: (error: Error) => showMutationError(error, '更新整合包草稿失败'),
  })
}

export interface AddPackEntryMutation {
  versionId: number
  data: PackEntryRequest
}

export function useAddPackEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, data }: AddPackEntryMutation) =>
      modpackApi.addEntry(versionId, data),
    onSuccess: (_, variables) => {
      toast.success('整合包条目已添加')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.entries(variables.versionId) })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
    onError: (error: Error) => showMutationError(error, '添加整合包条目失败'),
  })
}

export interface UpdatePackEntryMutation {
  versionId: number
  entryId: number
  data: PackEntryRequest
}

export function useUpdatePackEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ entryId, data }: UpdatePackEntryMutation) => modpackApi.updateEntry(entryId, data),
    onSuccess: (_, variables) => {
      toast.success('整合包条目已更新')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.entries(variables.versionId) })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
    onError: (error: Error) => showMutationError(error, '更新整合包条目失败'),
  })
}

export interface DeletePackEntryMutation {
  versionId: number
  entryId: number
}

export function useDeletePackEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ entryId }: DeletePackEntryMutation) => modpackApi.deleteEntry(entryId),
    onSuccess: (_, variables) => {
      toast.success('整合包条目已移除')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.entries(variables.versionId) })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
    onError: (error: Error) => showMutationError(error, '移除整合包条目失败'),
  })
}

export interface UploadPackFileMutation {
  versionId: number
  data: PackUploadRequest
  onProgress?: (progress: PackUploadProgress) => void
}

export function useUploadPackFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, data, onProgress }: UploadPackFileMutation) =>
      modpackApi.uploadFile(versionId, data, onProgress),
    onSuccess: (_, variables) => {
      toast.success('整合包文件已上传')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.entries(variables.versionId) })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
    onError: (error: Error) => showMutationError(error, '上传整合包文件失败'),
  })
}

export interface ConfirmPackVersionMutation extends ConfirmPackVersionRequest {
  versionId: number
}

export function usePublishPackVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, confirmRemovals, expectedDiffRevision }: ConfirmPackVersionMutation) =>
      modpackApi.publish(versionId, { confirmRemovals, expectedDiffRevision }),
    onSuccess: (released) => {
      queryClient.setQueryData<PackVersion[]>(modpackKeys.versions(), (cached) =>
        reconcileReleasedPackVersion(cached, released),
      )
      toast.success('整合包版本已发布')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.versions() })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diffs() })
    },
    onError: (error: Error, variables) => {
      showMutationError(error, '发布整合包版本失败')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
  })
}

export function useRollbackPackVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ versionId, confirmRemovals, expectedDiffRevision }: ConfirmPackVersionMutation) =>
      modpackApi.rollback(versionId, { confirmRemovals, expectedDiffRevision }),
    onSuccess: (released) => {
      queryClient.setQueryData<PackVersion[]>(modpackKeys.versions(), (cached) =>
        reconcileReleasedPackVersion(cached, released),
      )
      toast.success('整合包版本已回滚')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.versions() })
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diffs() })
    },
    onError: (error: Error, variables) => {
      showMutationError(error, '回滚整合包版本失败')
      void queryClient.invalidateQueries({ queryKey: modpackKeys.diff(variables.versionId) })
    },
  })
}

export function useModrinthSearch(params: SearchModrinthProjectsParams, enabled = true) {
  return useQuery({
    queryKey: modrinthKeys.search(params),
    queryFn: ({ signal }) => modrinthApi.searchProjects(params, signal),
    enabled: enabled && params.query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useModrinthVersions(params: ListModrinthVersionsParams, enabled = true) {
  return useQuery({
    queryKey: modrinthKeys.versions(params),
    queryFn: ({ signal }) => modrinthApi.listProjectVersions(params, signal),
    enabled:
      enabled &&
      params.projectId.trim().length > 0 &&
      params.minecraft.trim().length > 0 &&
      (params.loader ?? 'forge').trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

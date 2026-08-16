import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/lib/axios'
import { createPackUploadForm, modpackApi } from '@/services/modpack'

vi.mock('@/lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

const mockedPost = vi.mocked(api.post)

beforeEach(() => {
  mockedPost.mockReset()
})

describe('createPackUploadForm', () => {
  it('只生成服务端上传契约要求的 file、path 和 policy 字段', async () => {
    const file = new File(['jar-body'], 'wok-core.jar', {
      type: 'application/java-archive',
    })

    const form = createPackUploadForm({
      file,
      path: 'mods/wok-core.jar',
      policy: 'managed',
    })

    expect(Array.from(form.keys())).toEqual(['file', 'path', 'policy'])
    expect(form.get('path')).toBe('mods/wok-core.jar')
    expect(form.get('policy')).toBe('managed')
    expect(form.get('kind')).toBeNull()

    const uploadedFile = form.get('file')
    expect(uploadedFile).toBeInstanceOf(File)
    expect((uploadedFile as File).name).toBe('wok-core.jar')
    expect((uploadedFile as File).type).toBe('application/java-archive')
    expect(await (uploadedFile as File).text()).toBe('jar-body')
  })
})

describe('modpackApi.uploadFile', () => {
  it('为大文件上传覆盖共享客户端的短超时', async () => {
    mockedPost.mockResolvedValue({
      data: {
        success: true,
        code: 200,
        timestamp: '2026-08-17T12:00:00Z',
        data: {
          id: 11,
          versionId: 7,
          path: 'mods/wok-core.jar',
          kind: 'custom',
          policy: 'managed',
          sha1: 'a'.repeat(40),
          size: 8,
          downloadUrl: 'https://cdn.example.com/files/wok-core.jar',
          platform: null,
          projectId: null,
          projectName: null,
          externalVersionId: null,
        },
      },
    })

    const file = new File(['jar-body'], 'wok-core.jar')
    await modpackApi.uploadFile(7, {
      file,
      path: 'mods/wok-core.jar',
      policy: 'managed',
    })

    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(mockedPost.mock.calls[0]?.[2]).toMatchObject({
      timeout: 20 * 60 * 1000,
      headers: { 'Content-Type': undefined },
    })
  })
})

describe('modpackApi release confirmation', () => {
  const publishedVersion = {
    id: 7,
    version: '2.1.0',
    status: 'published' as const,
    minecraft: '1.20.1',
    loaderKind: 'forge',
    loaderVersion: '47.4.20',
    note: null,
    createdAt: 1_776_614_400,
    publishedAt: 1_776_614_500,
  }

  beforeEach(() => {
    mockedPost.mockResolvedValue({
      data: {
        success: true,
        code: 200,
        timestamp: '2026-08-17T12:00:00Z',
        data: publishedVersion,
      },
    })
  })

  it.each(['publish', 'rollback'] as const)(
    '为 %s 发送精确的确定性确认请求体',
    async (action) => {
      const request = action === 'publish' ? modpackApi.publish : modpackApi.rollback

      await request(7, {
        confirmRemovals: true,
        expectedDiffRevision: 'a'.repeat(64),
      })

      expect(mockedPost).toHaveBeenCalledTimes(1)
      expect(mockedPost).toHaveBeenCalledWith(`/v1/pack/versions/7/${action}`, {
        confirmRemovals: true,
        expectedDiffRevision: 'a'.repeat(64),
      })
    },
  )

  it('原样冒泡过期 revision 的 409 可操作消息', async () => {
    mockedPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          success: false,
          code: 409,
          timestamp: '2026-08-17T12:00:00Z',
          error: {
            message: '整合包差异已变化，请重新获取并审阅后再发布',
          },
        },
      },
    })

    await expect(
      modpackApi.publish(7, {
        confirmRemovals: false,
        expectedDiffRevision: 'b'.repeat(64),
      }),
    ).rejects.toThrow('整合包差异已变化，请重新获取并审阅后再发布')
  })
})

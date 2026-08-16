import { describe, expect, it } from 'vitest'
import { createPackUploadForm } from '@/services/modpack'

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

import type { PackEntry, PackEntryChange } from '@/types/modpack'

const PACK_ENTRY_FIELD_LABELS: Record<string, string> = {
  kind: '条目类型',
  policy: '文件策略',
  sha1: 'SHA1',
  size: '文件大小',
  downloadUrl: '下载地址',
  platform: '平台',
  projectId: '项目 ID',
  projectName: '项目名称',
  externalVersionId: '平台版本 ID',
}

export interface PackEntryFieldChangeDisplay {
  field: string
  label: string
  before: string
  after: string
}

function formatFieldValue(entry: PackEntry, field: string): string {
  const value = (entry as unknown as Record<string, unknown>)[field]
  if (value === undefined) return '字段不存在'
  if (value === null) return '未设置'
  if (value === '') return '空字符串'
  if (field === 'size' && typeof value === 'number') return `${value} B`
  return String(value)
}

export function getPackEntryFieldChangeDisplays(
  change: PackEntryChange,
): PackEntryFieldChangeDisplay[] {
  return change.changedFields.map((field) => ({
    field,
    label: PACK_ENTRY_FIELD_LABELS[field] ?? field,
    before: formatFieldValue(change.before, field),
    after: formatFieldValue(change.after, field),
  }))
}

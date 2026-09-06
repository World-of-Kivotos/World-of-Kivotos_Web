import type { SubmissionAnswer, UploadedAttachment } from '@/types/submission'

// 与问卷后端 question_types._UPLOAD_URL_PATTERN 同源: 只认本站 /uploads/ 下的单层文件名。
const UPLOAD_URL_PATTERN = /^\/uploads\/[A-Za-z0-9._-]{1,128}$/

/**
 * 取出文件题答案里的附件列表, 没有则返回 null。
 *
 * 地址形态在这里再卡一道: 提交时后端已经把关, 但审核页点开的是一个由玩家数据拼出来的链接,
 * 不该只信上游 —— 存量库里还可能有更早期写进去的形态。
 */
export function answerAttachments(answer: SubmissionAnswer): UploadedAttachment[] | null {
  const content = answer.content
  if (!content || typeof content !== 'object' || Array.isArray(content) || !Array.isArray(content.files)) {
    return null
  }
  const files = content.files.filter(
    (file): file is UploadedAttachment =>
      !!file &&
      typeof file.url === 'string' &&
      !file.url.includes('..') &&
      UPLOAD_URL_PATTERN.test(file.url),
  )
  return files.length ? files : null
}

/** 字节数压成人看得懂的体积; 拿不到有效数字时返回空串 (不显示比显示 NaN 好)。 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

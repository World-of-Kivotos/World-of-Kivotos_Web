import { Paperclip } from 'lucide-react'
import { surveyImageUrl } from '@/services/survey'
import { formatFileSize } from '@/lib/attachments'
import type { UploadedAttachment } from '@/types/submission'

/**
 * 文件题附件的下载列表。审核页与结果页共用一份 —— 附件的展示形态 (原始文件名 + 体积 + 新窗打开)
 * 分成两处实现迟早漂移。
 *
 * 附件与面板不同域, 地址必须经 surveyImageUrl 补成问卷源站的绝对地址。
 */
export function AttachmentList({ files, className }: { files: UploadedAttachment[]; className?: string }) {
  return (
    <ul className={className ?? 'mt-2 space-y-1'}>
      {files.map((file) => (
        <li key={file.url}>
          <a
            href={surveyImageUrl(file.url)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            <Paperclip className="size-3.5 shrink-0" />
            <span className="break-all">{file.name || file.url}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

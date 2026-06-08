import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 class 名: clsx 处理条件类, tailwind-merge 消解 Tailwind 冲突类 (后者覆盖前者)。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

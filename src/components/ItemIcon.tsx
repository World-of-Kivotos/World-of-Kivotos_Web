import { useState, useEffect } from 'react'
import { Box } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ItemIconProps {
  /** 物品注册键, 形如 "minecraft:diamond_sword" 或模组命名空间 "create:cogwheel"。 */
  id: string
  /** 堆叠数量; >1 时右下角显数字角标。 */
  count?: number
  /** 像素尺寸 (正方形), 默认 32。 */
  size?: number
  className?: string
}

const VANILLA_CDN = 'https://assets.mcasset.cloud/1.20.1/assets/minecraft/textures'

/**
 * 解析 id 得到该轮要尝试的图标 URL。
 * 香草物品在 1.20.1 资源里贴图可能落在 item/ 或 block/ 两个目录 (方块物品在 block/),
 * 无法仅凭 id 判定, 故按 item -> block 顺序回退; 模组物品走 mod 端 item-icon 端点。
 */
function resolveSource(id: string, stage: number): string | null {
  const colon = id.indexOf(':')
  const ns = colon >= 0 ? id.slice(0, colon) : 'minecraft'
  const path = colon >= 0 ? id.slice(colon + 1) : id

  if (ns === 'minecraft') {
    if (stage === 0) return `${VANILLA_CDN}/item/${path}.png`
    if (stage === 1) return `${VANILLA_CDN}/block/${path}.png`
    return null
  }

  // 模组物品: 走 mod 端贴图端点 (该端点需 mod 侧实现; 不存在时 img 触发 onError 落占位)。
  if (stage === 0) {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    return `${base}/v1/item-icon?id=${encodeURIComponent(id)}`
  }
  return null
}

/**
 * MC 物品图标。香草走 mcasset.cloud CDN (item -> block 回退), 模组走 mod 端 item-icon 端点,
 * 全部失败回退通用占位 (lucide Box)。16x16 像素图放大用 image-rendering: pixelated 防糊。
 */
export function ItemIcon({ id, count, size = 32, className }: ItemIconProps) {
  // stage 递增表示当前 src 已 404, 进入下一个候选; 超出候选则 src=null 显占位。
  const [stage, setStage] = useState(0)

  // 切换物品 id 时重置回退链, 否则上一个物品的失败 stage 会污染新图标。
  useEffect(() => {
    setStage(0)
  }, [id])

  const src = resolveSource(id, stage)

  if (!src) {
    return (
      <div
        title={id}
        className={cn(
          'flex items-center justify-center rounded-sm bg-muted text-muted-foreground',
          className
        )}
        style={{ width: size, height: size }}
      >
        <Box style={{ width: size * 0.55, height: size * 0.55 }} />
      </div>
    )
  }

  return (
    <div
      className={cn('relative inline-flex', className)}
      style={{ width: size, height: size }}
      title={count && count > 1 ? `${id} x${count}` : id}
    >
      <img
        key={src}
        src={src}
        alt={id}
        width={size}
        height={size}
        draggable={false}
        onError={() => setStage((s) => s + 1)}
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
      />
      {count != null && count > 1 && (
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 rounded-sm bg-background/90 px-0.5 font-mono text-[10px] font-semibold leading-tight tabular-nums shadow-sm">
          {count}
        </span>
      )}
    </div>
  )
}

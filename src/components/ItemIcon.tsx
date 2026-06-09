import { useState, useEffect } from 'react'
import { Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveVanillaTexture } from '@/lib/mcAssets'

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
 * MC 物品图标。
 * 香草回退链: 0=textures/item/<id>.png (generated 物品) -> 1=textures/block/<id>.png (贴图名=id 的方块)
 *   -> 2=模型解析 (贴图名 != id 的方块/特殊物品, 经 item 模型 + parent 链取贴图) -> 3=占位。
 * 模组: 0=mod 端 /v1/item-icon 端点 (服务端从 jar 抽) -> 1=占位。
 * 全部失败回退 lucide Box。16x16 像素图放大用 image-rendering: pixelated 防糊。
 */
export function ItemIcon({ id, count, size = 32, className }: ItemIconProps) {
  const colon = id.indexOf(':')
  const ns = colon >= 0 ? id.slice(0, colon) : 'minecraft'
  const name = colon >= 0 ? id.slice(colon + 1) : id
  const isVanilla = ns === 'minecraft'

  const [stage, setStage] = useState(0)
  // stage 2 模型解析结果: undefined=解析中, null=失败, string=解析到的贴图 URL
  const [resolved, setResolved] = useState<string | null | undefined>(undefined)

  // 切换物品 id 时重置回退链与解析态
  useEffect(() => {
    setStage(0)
    setResolved(undefined)
  }, [id])

  // 香草直猜 (item/block) 都失败后 (stage 2) 才做模型解析, 不拖慢能直出的 generated 物品
  useEffect(() => {
    if (!isVanilla || stage !== 2 || resolved !== undefined) return
    let alive = true
    resolveVanillaTexture(name).then((url) => {
      if (alive) setResolved(url)
    })
    return () => {
      alive = false
    }
  }, [isVanilla, stage, resolved, name])

  let src: string | null = null
  if (isVanilla) {
    if (stage === 0) src = `${VANILLA_CDN}/item/${name}.png`
    else if (stage === 1) src = `${VANILLA_CDN}/block/${name}.png`
    else if (stage === 2) src = resolved ?? null // 解析中(undefined)或失败(null)均无 src -> 占位
  } else if (stage === 0) {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    src = `${base}/v1/item-icon?id=${encodeURIComponent(id)}`
  }

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

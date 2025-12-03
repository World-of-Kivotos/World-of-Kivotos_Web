import { useState } from 'react'

interface MinecraftAvatarProps {
  /** 玩家名称 */
  playerName: string
  /** 头像尺寸 */
  size?: number
  /** 自定义类名 */
  className?: string
}

/**
 * Minecraft 玩家头像组件
 * 
 * 使用 mc-heads.net API 获取头像：
 * - 使用玩家名称查询正版皮肤（支持离线服务器）
 * - 如果加载失败，显示首字母 fallback
 */
export function MinecraftAvatar({
  playerName,
  size = 32,
  className = '',
}: MinecraftAvatarProps) {
  const [hasError, setHasError] = useState(false)

  // 构建头像 URL
  // 优先使用玩家名称查询，因为服务器可能是离线模式，存储的是离线 UUID
  // mc-heads.net 支持用玩家名称查询正版皮肤
  const avatarUrl = `https://mc-heads.net/avatar/${playerName}/${size}`

  // 如果加载失败，显示首字母 fallback
  if (hasError) {
    return (
      <div
        className={`rounded-lg bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium shadow-sm ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {playerName.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={avatarUrl}
      alt={`${playerName}'s avatar`}
      width={size}
      height={size}
      className={`rounded-lg shadow-sm ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  )
}

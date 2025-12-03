/**
 * 服务器状态类型
 */
export interface ServerStatus {
  online: boolean
  spark_available: boolean
  plugin_version: string
  timestamp: number
}

/**
 * TPS 数据
 */
export interface TpsData {
  values: {
    last_1m: number
    last_5m: number
    last_15m: number
  }
}

/**
 * MSPT 数据
 */
export interface MsptData {
  values: {
    last_1m: number
    last_5m: number
    last_15m: number
  }
}

/**
 * 内存数据
 */
export interface MemoryData {
  used: number
  max: number
  free: number
}

/**
 * CPU 数据
 */
export interface CpuData {
  process: number
  system: number
}

/**
 * 服务器性能数据
 */
export interface ServerPerformance {
  tps: TpsData
  mspt: MsptData
  memory: MemoryData
  cpu: CpuData
  timestamp: number
}

/**
 * 服务器详细信息
 */
export interface ServerInfo {
  name: string
  version: string
  bukkit_version: string
  motd: string
  max_players: number
  online_players: number
  view_distance: number
  online_mode: boolean
  default_game_mode: string
  worlds: string[]
}

/**
 * 在线玩家数量
 */
export interface OnlinePlayersCount {
  count: number
  max: number
  players: string[]
}

/**
 * 健康检查
 */
export interface HealthCheck {
  status: string
  uptime: number
  version: string
  components: {
    cache: string
    data_collector: string
  }
  timestamp: number
}

/**
 * 格式化后的服务器状态（用于 UI 显示）
 */
export interface FormattedServerStatus {
  online: boolean
  players: number
  maxPlayers: number
  tps: number
  memory: number
  maxMemory: number
  uptime: string
}

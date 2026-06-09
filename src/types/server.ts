/*
 * 服务器 API 类型 (对齐 v2 Forge mod: /api/v1/server/performance 与 /api/v1/server/players)。
 * 性能数据形状随 spark 是否安装而异 (spark 精确 / JVM fallback), 故多数字段可选。
 */

export interface PerfTps {
  available?: boolean
  values?: { last_10s?: number; last_1m?: number; last_5m?: number }
  server_load_percent?: number
  note?: string
}

export interface MsptWindow {
  mean: number
  max?: number
  min?: number
  percentile_95?: number
}

export interface PerfMspt {
  available?: boolean
  values?: { last_1m?: MsptWindow; last_5m?: MsptWindow }
  note?: string
}

export interface PerfCpuWindows {
  last_10s?: number
  last_1m?: number
  last_15m?: number
}

export interface PerfCpu {
  available?: boolean
  system?: PerfCpuWindows
  process?: PerfCpuWindows
  note?: string
}

export interface PerfMemoryUsage {
  init?: number
  used: number
  committed?: number
  max: number
  usage_percent?: number
}

export interface PerfMemory {
  heap?: PerfMemoryUsage
  non_heap?: PerfMemoryUsage
  source?: string
}

export interface PerfThreads {
  current_thread_count?: number
  daemon_thread_count?: number
  peak_thread_count?: number
  total_started_thread_count?: number
  deadlocked_threads?: number
}

export interface ServerPerformance {
  source?: string
  sparkAvailable?: boolean
  tps?: PerfTps
  mspt?: PerfMspt
  cpu?: PerfCpu
  memory?: PerfMemory
  threads?: PerfThreads
}

export interface OnlinePlayer {
  name: string
  uuid: string
  dimension: string
  x: number
  y: number
  z: number
  health: number
  ping: number
  gameMode: string
}

export interface OnlinePlayers {
  count: number
  maxPlayers: number
  players: OnlinePlayer[]
}

/** /api/v1/player?name= 返回 (在线为完整数据, 离线仅 name+uuid)。多数字段可选。 */
export interface PlayerLocation {
  dimension: string
  x: number
  y: number
  z: number
}

export interface PlayerVitals {
  health?: number
  maxHealth?: number
  armor?: number
  foodLevel?: number
  level?: number
}

export interface PlayerDetail {
  playerName: string
  uuid: string
  online: boolean
  note?: string
  gameMode?: string
  ping?: number
  location?: PlayerLocation
  vitals?: PlayerVitals
}

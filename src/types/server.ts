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

/**
 * /api/v1/player?name= 返回 (在线/离线同构, 字段由 PlayerDataHandlerImpl 序列化)。
 * 离线缺失运行期瞬时态 (sneaking/sprinting/swimming/gliding) 与 maxHealth/maximumAir/armor, 故标可选。
 */
export interface PlayerLocation {
  dimension: string
  x: number
  y: number
  z: number
  yaw?: number   // float; 在线离线均返回
  pitch?: number // float; 在线离线均返回
}

export interface PlayerVitals {
  health?: number
  maxHealth?: number      // 仅在线 (离线无法可靠还原)
  armor?: number          // 仅在线 (离线 vitals 未写入)
  foodLevel?: number
  saturation?: number
  exhaustion?: number
  level?: number
  exp?: number            // 0~1 当前等级经验进度
  totalExperience?: number
  remainingAir?: number
  maximumAir?: number     // 仅在线 (离线未写入, 香草默认 300)
  fireTicks?: number
}

/** 玩家移动/飞行状态; 后四项为运行期瞬时态, 离线快照不含。 */
export interface PlayerState {
  flying?: boolean
  allowFlight?: boolean
  invulnerable?: boolean
  walkSpeed?: number
  flySpeed?: number
  sneaking?: boolean      // 仅在线
  sprinting?: boolean     // 仅在线
  swimming?: boolean      // 仅在线
  gliding?: boolean       // 仅在线
}

/** 药水效果; amplifier 0 起算 (等级 = amplifier+1), duration 单位 tick (20 tick=1s)。 */
export interface PotionEffect {
  type: string
  amplifier: number
  duration: number
  ambient: boolean
  visible: boolean
  showIcon: boolean
}

/**
 * 单个物品 (在线/离线共用 convertItem 序列化, 字段一致)。
 * displayName 仅自定义命名时返回; 普通物品需前端从 type 派生显示名。
 */
export interface PlayerItem {
  type: string            // 注册键 "minecraft:diamond_sword"
  amount: number
  slot: string            // main: "0".."35"; armor: 部位名; offHand: "offhand"; enderChest: "0".."26"
  damage?: number         // 仅可损耗物品
  maxDurability?: number  // 仅可损耗物品 (耐久% = (maxDurability-damage)/maxDurability)
  displayName?: string    // 仅自定义命名
  enchantments?: Record<string, number> // key 形如 "minecraft:sharpness", value 等级
}

/** 背包: 主物品栏 36 格 (空槽跳过)、盔甲、副手 (单个对象, 空时缺省)。 */
export interface PlayerInventory {
  main: PlayerItem[]
  armor: PlayerItem[]
  offHand?: PlayerItem
}

export interface PlayerDetail {
  playerName: string
  uuid: string
  online: boolean
  source?: string        // 'offline-nbt' 表示来自离线存档快照
  lastSaved?: string     // 离线存档的最后保存时间 (ISO)
  gameMode?: string
  ping?: number          // 仅在线
  location?: PlayerLocation
  vitals?: PlayerVitals
  state?: PlayerState
  potionEffects?: PotionEffect[]
  inventory?: PlayerInventory
  enderChest?: PlayerItem[]  // 平铺数组; 从未开过末影箱时为 []
}

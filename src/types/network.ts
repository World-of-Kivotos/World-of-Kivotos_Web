/** 一条接入线路的服务端视角状态, 对应 mod 的 GET /api/v1/net/nodes。 */
export interface NetworkNode {
  /** 线路标识, 如 gz / sz / home */
  id: string
  /** 展示名, 如 "阿里云广州" */
  name: string
  /** 给玩家填进游戏客户端的地址 */
  endpoint: string
  /** WebSocket 探针地址; 留空表示这条线不做延迟探测 */
  probeUrl: string
  /** 当前经这条线在玩的人数 */
  online: number
  /** 已连上但还没进入游戏的连接数, 含服务器列表刷新产生的短连接, 有秒级抖动 */
  connecting: number
}

export interface NetworkStatus {
  nodes: NetworkNode[]
  totalOnline: number
  maxPlayers: number
  /** 未经转发器直连进来的玩家数, 通常是内网 */
  unattributed: number
  relayEnabled: boolean
}

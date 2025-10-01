// 服务器监控状态管理
import { reactive } from 'vue'
import apiService from '../services/api.js'

// 服务器状态
const serverState = reactive({
  // 服务器基本状态
  status: {
    online: false,
    version: '',
    motd: '',
    players: {
      online: 0,
      max: 0
    },
    uptime: 0,
    lastUpdate: null
  },
  
  // 服务器性能数据
  performance: {
    cpu: {
      usage: 0,
      cores: 0
    },
    memory: {
      used: 0,
      total: 0,
      usage: 0
    },
    disk: {
      used: 0,
      total: 0,
      usage: 0
    },
    tps: 20.0,
    mspt: 0,
    lastUpdate: null
  },
  
  // 在线玩家列表
  onlinePlayers: [],
  
  // 服务器日志
  logs: {
    entries: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 50,
    filters: {
      level: '',
      search: '',
      startTime: '',
      endTime: ''
    }
  },
  
  // 加载状态
  isLoading: {
    status: false,
    performance: false,
    players: false,
    logs: false
  },
  
  // 错误状态
  error: {
    status: null,
    performance: null,
    players: null,
    logs: null
  }
})

// 获取服务器状态
async function fetchServerStatus() {
  serverState.isLoading.status = true
  serverState.error.status = null
  
  try {
    const result = await apiService.getServerStatus()
    
    if (result.success) {
      serverState.status = {
        ...result.data,
        lastUpdate: new Date()
      }
    } else {
      serverState.error.status = result.error.message
    }
  } catch (error) {
    serverState.error.status = '获取服务器状态失败'
    console.error('获取服务器状态失败:', error)
  } finally {
    serverState.isLoading.status = false
  }
}

// 获取服务器性能数据
async function fetchServerPerformance() {
  serverState.isLoading.performance = true
  serverState.error.performance = null
  
  try {
    const result = await apiService.getServerPerformance()
    
    if (result.success) {
      serverState.performance = {
        ...result.data,
        lastUpdate: new Date()
      }
    } else {
      serverState.error.performance = result.error.message
    }
  } catch (error) {
    serverState.error.performance = '获取服务器性能数据失败'
    console.error('获取服务器性能数据失败:', error)
  } finally {
    serverState.isLoading.performance = false
  }
}

// 获取在线玩家列表
async function fetchOnlinePlayers() {
  serverState.isLoading.players = true
  serverState.error.players = null
  
  try {
    const result = await apiService.getOnlinePlayers()
    
    if (result.success) {
      serverState.onlinePlayers = result.data || []
    } else {
      serverState.error.players = result.error.message
    }
  } catch (error) {
    serverState.error.players = '获取在线玩家列表失败'
    console.error('获取在线玩家列表失败:', error)
  } finally {
    serverState.isLoading.players = false
  }
}

// 获取服务器日志
async function fetchServerLogs(page = 1, filters = {}) {
  serverState.isLoading.logs = true
  serverState.error.logs = null
  
  try {
    const params = {
      page,
      limit: serverState.logs.pageSize,
      ...filters
    }
    
    const result = await apiService.getServerLogs(params)
    
    if (result.success) {
      serverState.logs.entries = result.data.logs || []
      serverState.logs.totalCount = result.data.total || 0
      serverState.logs.currentPage = page
      
      // 更新过滤器
      serverState.logs.filters = { ...serverState.logs.filters, ...filters }
    } else {
      serverState.error.logs = result.error.message
    }
  } catch (error) {
    serverState.error.logs = '获取服务器日志失败'
    console.error('获取服务器日志失败:', error)
  } finally {
    serverState.isLoading.logs = false
  }
}

// 刷新所有服务器数据
async function refreshAllServerData() {
  await Promise.all([
    fetchServerStatus(),
    fetchServerPerformance(),
    fetchOnlinePlayers()
  ])
}

// 格式化内存大小
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化运行时间
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

// 获取服务器状态颜色
function getServerStatusColor() {
  if (serverState.status.online) {
    return 'success'
  } else {
    return 'error'
  }
}

// 获取TPS状态颜色
function getTpsStatusColor() {
  const tps = serverState.performance.tps
  if (tps >= 19.5) return 'success'
  if (tps >= 18) return 'warning'
  return 'error'
}

// 获取内存使用状态颜色
function getMemoryStatusColor() {
  const usage = serverState.performance.memory.usage
  if (usage < 70) return 'success'
  if (usage < 85) return 'warning'
  return 'error'
}

export {
  serverState,
  fetchServerStatus,
  fetchServerPerformance,
  fetchOnlinePlayers,
  fetchServerLogs,
  refreshAllServerData,
  formatBytes,
  formatUptime,
  getServerStatusColor,
  getTpsStatusColor,
  getMemoryStatusColor
}
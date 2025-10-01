// ConvenientAccess API 服务模块
class ApiService {
  constructor() {
    // 默认API基础URL，可以通过环境变量配置
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:22222/api/v1'
    this.adminPassword = null
  }

  // 设置管理员密码
  setAdminPassword(password) {
    this.adminPassword = password
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    // 如果需要管理员密码认证
    if (options.requiresAuth && this.adminPassword) {
      config.headers['Authorization'] = `Bearer ${this.adminPassword}`
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`)
      }
      
      return data
    } catch (error) {
      console.error('API请求失败:', error)
      throw error
    }
  }

  // 白名单管理 API
  async getWhitelist(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const endpoint = `/whitelist${queryString ? `?${queryString}` : ''}`
    return this.request(endpoint)
  }

  async addWhitelistEntry(entry) {
    return this.request('/whitelist', {
      method: 'POST',
      body: JSON.stringify(entry)
    })
  }

  async deleteWhitelistEntry(uuid) {
    return this.request(`/whitelist/${uuid}`, {
      method: 'DELETE'
    })
  }

  async updateWhitelistEntry(uuid, updateData) {
    return this.request(`/whitelist/${uuid}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  }

  async batchAddWhitelist(entries) {
    return this.request('/whitelist/batch', {
      method: 'POST',
      body: JSON.stringify({ entries })
    })
  }

  async getWhitelistStats() {
    return this.request('/whitelist/stats')
  }

  async syncWhitelist() {
    return this.request('/whitelist/sync', {
      method: 'POST'
    })
  }

  async getSyncStatus() {
    return this.request('/whitelist/sync/status')
  }

  // 令牌管理 API
  async generateToken(expiryHours = 24) {
    return this.request('/admin/generate-token', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ expiryHours })
    })
  }

  // 用户注册 API
  async registerUser(token, playerName, playerUuid) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        playerName,
        playerUuid
      })
    })
  }

  // 服务器监控 API
  async getServerInfo() {
    return this.request('/server/info')
  }

  async getServerStatus() {
    return this.request('/server/status')
  }

  async getServerPerformance() {
    return this.request('/server/performance')
  }

  async getOnlinePlayers() {
    return this.request('/players/online')
  }

  async getPlayersList() {
    return this.request('/players/list')
  }

  async getWorldsList() {
    return this.request('/worlds/list')
  }

  async getSystemResources() {
    return this.request('/system/resources')
  }

  async healthCheck() {
    return this.request('/health')
  }

  // 验证管理员密码
  async validateAdminPassword(password) {
    try {
      // 使用管理员密码访问白名单API来验证密码是否正确
      this.setAdminPassword(password)
      await this.getWhitelist({ page: 1, size: 1 }) // 只获取第一条记录来验证
      return true
    } catch (error) {
      this.adminPassword = null
      return false
    }
  }
}

// 创建单例实例
const apiService = new ApiService()

export default apiService
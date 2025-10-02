// ConvenientAccess API 服务模块
class ApiService {
  constructor() {
    // 在开发环境中使用代理，生产环境直接使用API地址
    this.baseURL = import.meta.env.DEV 
      ? '/api/v1'  // 开发环境使用代理
      : (import.meta.env.VITE_API_BASE_URL || 'https://api.mcwok.cn/api/v1')
    this.adminPassword = null
    // 从环境变量读取访问令牌
    this.accessToken = import.meta.env.VITE_API_ACCESS_TOKEN
    
    // 安全检查：生产环境必须设置Token
    if (!import.meta.env.DEV && !this.accessToken) {
      console.error('⚠️ 生产环境未配置API访问令牌，请在.env文件中设置VITE_API_ACCESS_TOKEN')
    }
  }

  // 设置管理员密码
  setAdminPassword(password) {
    this.adminPassword = password
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const finalUrl = `${this.baseURL}${endpoint}`
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    // 如果有访问token且没有Authorization头且不是公开端点，使用X-API-Key头
    if (this.accessToken && !options.headers?.Authorization && !options.isPublic) {
      config.headers['X-API-Key'] = this.accessToken
    } else if (!options.isPublic && !options.headers?.Authorization) {
      console.warn('⚠️ API访问令牌未配置,请在.env.local中设置VITE_API_ACCESS_TOKEN')
      console.warn('参考: ENV_GUIDE.md 了解如何配置环境变量')
    }

    try {
      const response = await fetch(finalUrl, config)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ 认证失败 (401): API访问被拒绝')
          console.error('可能原因:')
          console.error('  1. 访问令牌未配置或无效')
          console.error('  2. 访问令牌与后端config.yml中的不一致')
          console.error('  3. 访问令牌已过期')
          console.error('当前Token:', this.accessToken ? `${this.accessToken.slice(0, 10)}...` : '未设置')
          console.error('请求URL:', finalUrl)
          console.error('解决方案: 检查.env.local文件中的VITE_API_ACCESS_TOKEN配置')
          throw new Error(`认证失败: 请检查API访问令牌配置 (参考 ENV_GUIDE.md)`)
        }
        
        let errorMessage = `HTTP ${response.status}`
        try {
          const data = await response.json()
          errorMessage = data.error?.message || data.message || errorMessage
        } catch (e) {
          // 如果响应不是JSON，使用默认错误消息
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
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

  async addToWhitelist(playerName, playerUuid, notes, addedByName) {
    if (!addedByName) {
      throw new Error('必须提供操作人名称(addedByName)')
    }
    
    const payload = {
      name: playerName,
      source: 'ADMIN',
      added_by_name: addedByName,
      added_by_uuid: '00000000-0000-0000-0000-000000000000'
    }
    
    // 如果提供了UUID,添加到请求中(v0.5.0可选)
    if (playerUuid) {
      payload.uuid = playerUuid
    }
    
    // 如果提供了备注,添加到请求中
    if (notes) {
      payload.notes = notes
    }
    
    return this.request('/whitelist', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  async removeFromWhitelist(uuid) {
    if (!uuid || uuid === 'null' || uuid === 'undefined') {
      throw new Error('UUID 不能为空')
    }
    return this.request(`/whitelist/${uuid}`, {
      method: 'DELETE'
    })
  }
  
  async removeFromWhitelistByName(name) {
    return this.request(`/whitelist/by-name/${name}`, {
      method: 'DELETE'
    })
  }

  async updateWhitelistEntry(uuid, updateData) {
    return this.request(`/whitelist/${uuid}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  }

  async batchAddToWhitelist(players, addedByName) {
    if (!addedByName) {
      throw new Error('必须提供操作人名称(addedByName)')
    }
    
    return this.request('/whitelist/batch', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'add',
        source: 'ADMIN',  // 修改为后端接受的有效值: PLAYER, ADMIN, SYSTEM
        added_by_name: addedByName,
        added_by_uuid: '00000000-0000-0000-0000-000000000000',
        players: players.map(p => ({
          name: p.name
          // 批量导入API只需要name字段,UUID会在玩家首次登录时自动补充
        }))
      })
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

  // 管理员认证 API
  async adminLogin(username, password) {
    return this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      isPublic: true  // 标记为公开端点,不添加 X-API-Key
    })
  }

  async adminRegister(username, password, token, displayName) {
    return this.request('/admin/register', {
      method: 'POST',
      body: JSON.stringify({ 
        username, 
        password, 
        token,
        displayName: displayName || username
      }),
      isPublic: true  // 标记为公开端点,不添加 X-API-Key
    })
  }

  async getCurrentUser(authToken) {
    return this.request('/admin/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      // 不使用默认的 X-API-Key
      requiresAuth: false
    })
  }

  // 令牌管理 API
  async generateToken(expiryHours = 24) {
    const authToken = localStorage.getItem('authToken')
    if (!authToken) {
      throw new Error('未登录或登录已过期')
    }
    
    return this.request('/admin/generate-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ expiryHours })
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

  // 测试token有效性
  async testToken() {
    try {
      console.log('测试Token认证...')
      const result = await this.request('/test')
      console.log('Token认证成功:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('Token认证失败:', error.message)
      return { success: false, error: error.message }
    }
  }

}

// 创建单例实例
const apiService = new ApiService()

export default apiService
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import apiService from '../services/api.js'

export const useWhitelistStore = defineStore('whitelist', () => {
  // 白名单数据状态
  const whitelistData = ref([])
  const isLoading = ref(false)
  const error = ref('')

  // 分页状态
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })

  // 筛选状态
  const filters = reactive({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  // 统计数据
  const stats = reactive({
    totalPlayers: 0,
    onlinePlayers: 0,
    lastSyncTime: null
  })

  // 获取白名单数据 - 不传参数则获取所有数据
  const fetchWhitelist = async (page = 1, pageSize = 999999) => {
    isLoading.value = true
    error.value = ''
    
    try {
      const result = await apiService.getWhitelist({
        page,
        size: pageSize,
        search: filters.search,
        sort: filters.sortBy,
        order: filters.sortOrder
      })
      
      // 处理API返回的数据结构
      console.log('API返回的原始数据:', result)
      
      if (result.success && result.data) {
        // 后端返回的字段名是 items，不是 entries
        const entries = result.data.items || result.data.entries || []
        console.log('原始数据数量:', entries.length)
        
        if (entries.length > 0) {
          console.log('第一条原始数据示例:', entries[0])
        }
        
        // 将下划线格式转换为驼峰格式
        whitelistData.value = entries.map(entry => ({
          id: entry.id,
          uuid: entry.uuid,
          name: entry.name,
          addedByName: entry.added_by_name || entry.addedByName,
          addedByUuid: entry.added_by_uuid || entry.addedByUuid,
          addedAt: entry.added_at || entry.addedAt,
          source: entry.source,
          isActive: entry.is_active !== undefined ? entry.is_active : entry.isActive,
          createdAt: entry.created_at || entry.createdAt,
          updatedAt: entry.updated_at || entry.updatedAt,
          uuidPending: entry.uuid_pending || entry.uuidPending
        }))
        
        console.log('转换后的数据数量:', whitelistData.value.length)
        if (whitelistData.value.length > 0) {
          console.log('第一条转换后数据示例:', whitelistData.value[0])
        }
        
        pagination.currentPage = result.data.pagination?.page || page
        pagination.pageSize = result.data.pagination?.size || pageSize
        pagination.total = result.data.pagination?.total || whitelistData.value.length
        pagination.totalPages = result.data.pagination?.total_pages || Math.ceil(pagination.total / pageSize)
      } else if (Array.isArray(result)) {
        // 兼容旧版本API或直接返回数组的情况
        console.log('使用数组格式的数据:', result.length)
        whitelistData.value = result
        pagination.total = result.length
        pagination.totalPages = Math.ceil(result.length / pageSize)
      } else {
        console.error('无法识别的数据格式:', result)
        error.value = result.error || '获取白名单数据失败'
      }
    } catch (err) {
      error.value = '网络错误，请检查服务器连接'
    } finally {
      isLoading.value = false
    }
  }

  // 添加白名单条目
  const addWhitelistEntry = async (playerName, playerUuid, notes) => {
    try {
      const result = await apiService.addToWhitelist(playerName, playerUuid, notes)
      
      if (result.success) {
        // 重新获取当前页数据
        await fetchWhitelist(pagination.currentPage, pagination.pageSize)
        return { success: true, message: '添加成功' }
      } else {
        return { success: false, error: result.error || '添加失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接' }
    }
  }

  // 删除白名单条目
  const removeWhitelistEntry = async (playerId) => {
    try {
      const result = await apiService.removeFromWhitelist(playerId)
      
      if (result.success) {
        // 重新获取当前页数据
        await fetchWhitelist(pagination.currentPage, pagination.pageSize)
        return { success: true, message: '删除成功' }
      } else {
        return { success: false, error: result.error || '删除失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接' }
    }
  }

  // 批量添加白名单
  const batchAddWhitelist = async (entries) => {
    try {
      const result = await apiService.batchAddToWhitelist(entries)
      
      if (result.success) {
        // 重新获取当前页数据
        await fetchWhitelist(pagination.currentPage, pagination.pageSize)
        return { 
          success: true, 
          message: `成功添加 ${result.data.successCount} 个条目`,
          details: result.data
        }
      } else {
        return { success: false, error: result.error || '批量添加失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接' }
    }
  }

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const result = await apiService.getStats()
      
      if (result.success) {
        Object.assign(stats, result.data)
      }
    } catch (err) {
      console.error('获取统计数据失败:', err)
    }
  }

  // 获取同步状态
  const fetchSyncStatus = async () => {
    try {
      const result = await apiService.getSyncStatus()
      
      if (result.success) {
        stats.lastSyncTime = result.data.lastSyncTime
      }
    } catch (err) {
      console.error('获取同步状态失败:', err)
    }
  }

  // 设置筛选条件
  const setFilters = (newFilters) => {
    Object.assign(filters, newFilters)
    // 重置到第一页
    pagination.currentPage = 1
    // 重新获取数据
    fetchWhitelist(1, pagination.pageSize)
  }

  // 设置分页
  const setPage = (page) => {
    pagination.currentPage = page
    fetchWhitelist(page, pagination.pageSize)
  }

  // 设置每页大小
  const setPageSize = (size) => {
    pagination.pageSize = size
    pagination.currentPage = 1
    fetchWhitelist(1, size)
  }

  // AG Grid 兼容的方法
  const whitelist = computed(() => whitelistData.value)
  
  const addPlayer = async (playerData, addedByName) => {
    try {
      if (!addedByName) {
        throw new Error('必须登录后才能添加玩家')
      }
      
      const result = await apiService.addToWhitelist(playerData.name, playerData.uuid, playerData.notes, addedByName)
      
      if (result.success) {
        // 不在这里刷新数据,让调用方决定是否刷新
        return { success: true, message: '添加成功', data: result.data }
      } else {
        return { success: false, error: result.error || '添加失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接' }
    }
  }

  const deletePlayer = async (player) => {
    try {
      let result
      
      // 如果有 UUID,使用 UUID 删除;否则使用 name 删除
      if (player.uuid && player.uuid !== 'null' && player.uuid !== 'undefined') {
        result = await apiService.removeFromWhitelist(player.uuid)
      } else if (player.name) {
        result = await apiService.removeFromWhitelistByName(player.name)
      } else {
        return { success: false, error: '缺少玩家标识信息' }
      }
      
      if (result.success) {
        // 重新获取当前页数据
        await fetchWhitelist(pagination.currentPage, pagination.pageSize)
        return { success: true, message: '删除成功' }
      } else {
        return { success: false, error: result.error || '删除失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接' }
    }
  }

  const updatePlayer = async (uuid, updateData) => {
    try {
      const result = await apiService.updateWhitelistEntry(uuid, updateData)
      
      if (result.success) {
        // 重新获取当前页数据
        await fetchWhitelist(pagination.currentPage, pagination.pageSize)
        return { success: true, message: '更新成功' }
      } else {
        return { success: false, error: result.error || '更新失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接' }
    }
  }

  const batchAddPlayers = async (players, addedByName) => {
    try {
      if (!addedByName) {
        throw new Error('必须登录后才能批量添加玩家')
      }
      
      const result = await apiService.batchAddToWhitelist(players, addedByName)
      
      if (result.success) {
        // 不在这里刷新数据,让调用方决定是否刷新
        return { success: true, message: '批量导入成功', data: result.data }
      } else {
        return { success: false, error: result.error || '批量导入失败' }
      }
    } catch (err) {
      return { success: false, error: '网络错误，请检查服务器连接: ' + err.message }
    }
  }

  return {
    // 状态
    whitelistData,
    whitelist, // AG Grid 兼容
    isLoading,
    error,
    pagination,
    filters,
    stats,
    
    // 方法
    fetchWhitelist,
    addWhitelistEntry,
    removeWhitelistEntry,
    batchAddWhitelist,
    fetchStats,
    fetchSyncStatus,
    setFilters,
    setPage,
    setPageSize,
    
    // AG Grid 兼容方法
    addPlayer,
    deletePlayer,
    updatePlayer,
    batchAddPlayers
  }
})
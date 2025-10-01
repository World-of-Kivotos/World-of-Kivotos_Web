// 白名单状态管理
import { ref, reactive, computed } from 'vue'
import apiService from '../services/api.js'

// 白名单数据
const whitelistEntries = ref([])
const isLoading = ref(false)
const error = ref('')

// 分页和筛选状态
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0,
  totalPages: 0
})

const filters = reactive({
  search: '',
  status: 'all', // all, active, inactive
  sort: 'created_at',
  order: 'desc'
})

// 统计信息
const stats = ref({
  total_entries: 0,
  recent_additions: 0,
  recent_deletions: 0,
  sync_status: 'unknown',
  last_sync: null
})

// 计算属性：过滤后的白名单条目
const filteredEntries = computed(() => {
  let entries = whitelistEntries.value

  // 搜索过滤
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    entries = entries.filter(entry => 
      entry.name.toLowerCase().includes(searchTerm) ||
      entry.uuid.toLowerCase().includes(searchTerm) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm))
    )
  }

  return entries
})

// 获取白名单列表
async function fetchWhitelist(params = {}) {
  isLoading.value = true
  error.value = ''

  try {
    const queryParams = {
      page: pagination.page,
      size: pagination.size,
      search: filters.search || undefined,
      sort: filters.sort,
      order: filters.order,
      ...params
    }

    const response = await apiService.getWhitelist(queryParams)
    
    if (response.success) {
      whitelistEntries.value = response.data.entries || []
      
      // 更新分页信息
      if (response.data.pagination) {
        pagination.page = response.data.pagination.page
        pagination.size = response.data.pagination.size
        pagination.total = response.data.pagination.total
        pagination.totalPages = response.data.pagination.total_pages
      }
    } else {
      throw new Error(response.error?.message || '获取白名单失败')
    }
  } catch (err) {
    error.value = err.message
    console.error('获取白名单失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 添加白名单条目
async function addWhitelistEntry(entry) {
  try {
    const response = await apiService.addWhitelistEntry(entry)
    
    if (response.success) {
      // 重新获取列表以确保数据同步
      await fetchWhitelist()
      return { success: true, message: '添加成功' }
    } else {
      throw new Error(response.error?.message || '添加失败')
    }
  } catch (err) {
    console.error('添加白名单条目失败:', err)
    return { success: false, error: err.message }
  }
}

// 删除白名单条目
async function deleteWhitelistEntry(uuid) {
  try {
    const response = await apiService.deleteWhitelistEntry(uuid)
    
    if (response.success) {
      // 重新获取列表以确保数据同步
      await fetchWhitelist()
      return { success: true, message: '删除成功' }
    } else {
      throw new Error(response.error?.message || '删除失败')
    }
  } catch (err) {
    console.error('删除白名单条目失败:', err)
    return { success: false, error: err.message }
  }
}

// 批量添加白名单条目
async function batchAddWhitelist(entries) {
  try {
    const response = await apiService.batchAddWhitelist(entries)
    
    if (response.success) {
      // 重新获取列表以确保数据同步
      await fetchWhitelist()
      return { success: true, message: `成功添加 ${entries.length} 个条目` }
    } else {
      throw new Error(response.error?.message || '批量添加失败')
    }
  } catch (err) {
    console.error('批量添加白名单条目失败:', err)
    return { success: false, error: err.message }
  }
}

// 获取白名单统计信息
async function fetchWhitelistStats() {
  try {
    const response = await apiService.getWhitelistStats()
    
    if (response.success) {
      stats.value = response.data
    } else {
      console.error('获取统计信息失败:', response.error)
    }
  } catch (err) {
    console.error('获取统计信息失败:', err)
  }
}

// 同步白名单
async function syncWhitelist() {
  try {
    const response = await apiService.syncWhitelist()
    
    if (response.success) {
      // 重新获取统计信息
      await fetchWhitelistStats()
      return { success: true, message: '同步成功' }
    } else {
      throw new Error(response.error?.message || '同步失败')
    }
  } catch (err) {
    console.error('同步白名单失败:', err)
    return { success: false, error: err.message }
  }
}

// 获取同步状态
async function fetchSyncStatus() {
  try {
    const response = await apiService.getSyncStatus()
    
    if (response.success) {
      return response.data
    } else {
      console.error('获取同步状态失败:', response.error)
      return null
    }
  } catch (err) {
    console.error('获取同步状态失败:', err)
    return null
  }
}

// 更新分页
function updatePagination(newPage, newSize) {
  if (newPage !== undefined) pagination.page = newPage
  if (newSize !== undefined) pagination.size = newSize
  fetchWhitelist()
}

// 更新筛选条件
function updateFilters(newFilters) {
  Object.assign(filters, newFilters)
  pagination.page = 1 // 重置到第一页
  fetchWhitelist()
}

// 清除筛选条件
function clearFilters() {
  filters.search = ''
  filters.status = 'all'
  filters.sort = 'created_at'
  filters.order = 'desc'
  pagination.page = 1
  fetchWhitelist()
}

export {
  whitelistEntries,
  filteredEntries,
  isLoading,
  error,
  pagination,
  filters,
  stats,
  fetchWhitelist,
  addWhitelistEntry,
  deleteWhitelistEntry,
  batchAddWhitelist,
  fetchWhitelistStats,
  syncWhitelist,
  fetchSyncStatus,
  updatePagination,
  updateFilters,
  clearFilters
}
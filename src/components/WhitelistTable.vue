<template>
  <div class="bg-base-100 rounded-lg shadow-lg p-6">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="alert alert-error mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-ghost" @click="refreshData">重试</button>
    </div>
    
    <!-- 操作栏 -->
    <div class="backdrop-blur-md bg-white/10 border-b border-white/20 p-4">
      <!-- 操作按钮和搜索 -->
      <div class="flex justify-between items-center">
        <div class="flex space-x-3">
          <button 
            @click="showAddModal = true"
            class="backdrop-blur-sm bg-blue-600/80 hover:bg-blue-700/90 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors border border-blue-500/30"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            添加玩家
          </button>
          
          <!-- 搜索框 -->
          <div class="relative">
            <input 
              v-model="filters.search"
              type="text" 
              placeholder="搜索玩家名称或UUID..."
              class="backdrop-blur-sm bg-white/10 border border-white/30 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-blue-400/60 focus:bg-white/15 w-64 text-white placeholder-gray-300"
            />
            <svg class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          
          <button 
            v-if="selectedUsers.length > 0"
            @click="batchEnable"
            class="backdrop-blur-sm bg-green-600/80 hover:bg-green-700/90 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors border border-green-500/30"
          >
            批量导入
          </button>
        </div>
        
        <div class="flex items-center space-x-3">
          <button class="backdrop-blur-sm bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white p-2 rounded-lg transition-colors border border-white/20">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 表格区域 -->
    <div class="flex-1 overflow-auto">
       <table class="w-full">
         <thead class="backdrop-blur-lg bg-white/15 sticky top-0 border-b border-white/20">
          <tr>
            <th class="text-left p-4 w-12">
              <input 
                type="checkbox" 
                v-model="selectAll"
                @change="toggleSelectAll"
                class="w-4 h-4 text-blue-400 bg-white/10 border-white/30 rounded focus:ring-blue-400 focus:ring-2 backdrop-blur-sm"
              />
            </th>
            <th class="text-left p-4 text-gray-200 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('name')">
              <div class="flex items-center space-x-1">
                <span>玩家名称</span>
                <svg v-if="sortField === 'name'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
              </div>
            </th>
            <th class="text-left p-4 text-gray-200 font-medium">UUID</th>
            <th class="text-left p-4 text-gray-200 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('created_at')">
              <div class="flex items-center space-x-1">
                <span>添加时间</span>
                <svg v-if="sortField === 'created_at'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
              </div>
            </th>
            <th class="text-left p-4 text-gray-200 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('updated_at')">
              <div class="flex items-center space-x-1">
                <span>更新时间</span>
                <svg v-if="sortField === 'updated_at'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
              </div>
            </th>
            <th class="text-left p-4 text-gray-200 font-medium">来源</th>
            <th class="text-left p-4 text-gray-200 font-medium">备注</th>
            <th class="text-left p-4 text-gray-200 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
             v-for="user in paginatedUsers" 
             :key="user.uuid"
             class="border-b border-white/10 hover:bg-white/5 transition-colors backdrop-blur-sm"
             :class="{ 'bg-white/10': selectedUsers.includes(user.uuid) }"
           >
             <td class="p-4">
               <input 
                 type="checkbox"
                 :value="user.uuid"
                 v-model="selectedUsers"
                 class="w-4 h-4 text-blue-400 bg-white/10 border-white/30 rounded focus:ring-blue-400 focus:ring-2 backdrop-blur-sm"
               />
             </td>
             <td class="p-4 text-white">
               <div class="flex items-center">
                 <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mr-3 flex items-center justify-center">
                   <span class="text-white text-sm font-medium">{{ user.name.charAt(0).toUpperCase() }}</span>
                 </div>
                 <span>{{ user.name }}</span>
               </div>
             </td>
             <td class="p-4 text-gray-300 font-mono text-sm">{{ user.uuid }}</td>
             <td class="p-4 text-gray-400 text-sm">{{ user.created_at }}</td>
             <td class="p-4 text-gray-400 text-sm">{{ user.updated_at }}</td>
             <td class="p-4 text-gray-300">
               <span class="px-2 py-1 rounded-md text-xs bg-blue-900/30 text-blue-400 border border-blue-700">
                 {{ user.source || '手动添加' }}
               </span>
             </td>
             <td class="p-4 text-gray-300 text-sm">{{ user.notes || '-' }}</td>
            <td class="p-4">
               <div class="flex space-x-2">
                 <button 
                   @click="editUser(user)"
                   class="px-3 py-1 text-xs bg-blue-900/30 text-blue-400 rounded-md hover:bg-blue-900/50 transition-colors backdrop-blur-sm border border-blue-700"
                 >
                   编辑
                 </button>
                 <button 
                   @click="deleteUser(user)"
                   class="px-3 py-1 text-xs bg-red-900/30 text-red-400 rounded-md hover:bg-red-900/50 transition-colors backdrop-blur-sm border border-red-700"
                 >
                   删除
                 </button>
               </div>
             </td>
          </tr>
        </tbody>
      </table>
      
         <!-- 空状态 -->
         <tr v-if="paginatedUsers.length === 0">
           <td colspan="8" class="p-12 text-center">
             <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
             </svg>
             <p class="text-white text-lg">没有找到匹配的用户</p>
             <p class="text-gray-300 text-sm mt-2">尝试调整筛选条件或添加新用户</p>
           </td>
         </tr>
    </div>
    
    <!-- 分页 -->
    <div class="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
      <div class="text-sm text-gray-300">
        显示 {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }}-{{ Math.min(pagination.currentPage * pagination.pageSize, filteredUsers.length) }} 共 {{ filteredUsers.length }} 条记录
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-300">每页显示:</span>
        <select 
          v-model="pagination.pageSize" 
          @change="updatePagination"
          class="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg focus:ring-blue-400 focus:border-blue-400 p-2 backdrop-blur-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <button 
          @click="previousPage"
          :disabled="pagination.currentPage === 1"
          class="px-3 py-2 text-sm bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
        >
          上一页
        </button>
        <button 
          @click="nextPage"
          :disabled="pagination.currentPage === totalPages"
          class="px-3 py-2 text-sm bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue'

// 定义 props
const props = defineProps<{
  users: Array<any>
}>()

// 定义 emits
const emit = defineEmits<{
  close: []
  updateUser: [user: any]
  deleteUser: [user: any]
  batchUpdate: [userIds: number[], action: string]
}>()

// 筛选器
const filters = reactive({
  search: ''
})

// 排序
const sortField = ref('')
const sortDirection = ref('asc')

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10
})

// 选择状态
const selectedUsers = ref<number[]>([])
const selectAll = ref(false)
const showAddModal = ref(false)

// 筛选后的用户列表
const filteredUsers = computed(() => {
  let result = props.users || []

  // 按搜索关键词筛选
  if (filters.search && result.length > 0) {
    const searchTerm = filters.search.toLowerCase()
    result = result.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.uuid.toLowerCase().includes(searchTerm) ||
      (user.notes && user.notes.toLowerCase().includes(searchTerm)) ||
      (user.source && user.source.toLowerCase().includes(searchTerm))
    )
  }

  // 排序
  if (sortField.value) {
    result.sort((a, b) => {
      let aVal = a[sortField.value]
      let bVal = b[sortField.value]
      
      // 处理日期
      if (sortField.value === 'created_at' || sortField.value === 'updated_at') {
        aVal = new Date(aVal)
        bVal = new Date(bVal)
      }
      
      if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return result
})

// 分页后的用户列表
const paginatedUsers = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredUsers.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / pagination.pageSize)
})

// 可见页码
const visiblePages = computed(() => {
  const current = pagination.currentPage
  const total = totalPages.value
  const pages: (number | string)[] = []
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
})

// 清除筛选
const clearFilters = () => {
  filters.search = ''
  sortField.value = ''
  sortDirection.value = 'asc'
}

// 排序
const sortBy = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// 分页操作
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    pagination.currentPage = page
  }
}

const updatePagination = () => {
  pagination.currentPage = 1
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedUsers.value = paginatedUsers.value.map(user => user.uuid)
  } else {
    selectedUsers.value = []
  }
}

// 监听选中用户变化，更新全选状态
watch(selectedUsers, (newVal) => {
  const currentPageUserIds = paginatedUsers.value.map(user => user.uuid)
  selectAll.value = currentPageUserIds.length > 0 && currentPageUserIds.every(id => newVal.includes(id))
}, { deep: true })

// 监听分页变化，清空选择
watch(() => pagination.currentPage, () => {
  selectedUsers.value = []
  selectAll.value = false
})

// 用户操作
const editUser = (user) => {
  // 这里可以打开编辑模态框
  console.log('编辑用户:', user)
}

const deleteUser = (user) => {
  if (confirm(`确定要删除用户 "${user.name}" 吗？`)) {
    emit('deleteUser', user)
    // 从选中列表中移除
    selectedUsers.value = selectedUsers.value.filter(id => id !== user.uuid)
  }
}

// 批量操作
const batchDelete = () => {
  if (confirm(`确定要删除选中的 ${selectedUsers.value.length} 个用户吗？`)) {
    emit('batchUpdate', selectedUsers.value, 'delete')
    selectedUsers.value = []
    selectAll.value = false
  }
}
</script>

<style scoped>
table {
  border-collapse: separate;
  border-spacing: 0;
}

th:first-child,
td:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

th:last-child,
td:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}
</style>
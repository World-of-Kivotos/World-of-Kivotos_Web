<template>
  <!-- 导航栏 -->
  <Navbar />
  
  <!-- 主内容区域，添加顶部边距以避免被导航栏遮挡 -->
  <div class="min-h-screen flex items-center justify-end p-8 pr-16 pt-20">
    <div class="relative w-full max-w-md">
      <!-- 登录/注册卡片 -->
      <div class="backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl transition-all duration-500">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">World of Kivotos Panel</h1>
          <p class="text-gray-400">请登录或注册以开始使用</p>
        </div>

        <!-- 登录表单 -->
        <transition name="slide-fade" mode="out-in">
          <div v-if="!isRegister" key="login" class="space-y-6">
            <div class="space-y-4">
              <div class="relative">
                <input 
                  v-model="loginForm.username"
                  type="text" 
                  placeholder="账号"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div class="relative">
                <input 
                  v-model="loginForm.password"
                  type="password" 
                  placeholder="密码"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            
            <button 
              @click="handleLogin"
              class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors !rounded-button whitespace-nowrap"
            >
              登录
            </button>
            
            <div class="text-center mt-4">
              <button 
                @click="switchToRegister"
                class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                还没有账号？立即注册
              </button>
            </div>
          </div>
          
          <!-- 注册表单 -->
          <div v-else key="register" class="space-y-6">
            <div class="space-y-4">
              <div class="relative">
                <input 
                  v-model="registerForm.username"
                  type="text" 
                  placeholder="账号"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div class="relative">
                <input 
                  v-model="registerForm.password"
                  type="password" 
                  placeholder="密码"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div class="relative">
                <input 
                  v-model="registerForm.authCode"
                  type="text" 
                  placeholder="鉴权码"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>
            
            <button 
              @click="handleRegister"
              class="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors !rounded-button whitespace-nowrap"
            >
              注册
            </button>
            
            <div class="text-center mt-4">
              <button 
                @click="switchToLogin"
                class="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                已有账号？立即登录
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 白名单管理页面 -->
    <div v-if="isLoggedIn" class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="backdrop-blur-xl bg-gray-900/30 rounded-2xl border border-white/20 w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <!-- 头部 -->
        <div class="backdrop-blur-md bg-white/5 border-b border-white/10 p-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold text-white">MC服务器白名单管理</h2>
              <p class="text-gray-400 mt-1">管理您的 Minecraft 服务器白名单用户</p>
            </div>
            <button 
              @click="logout"
              class="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 筛选和操作栏 -->
        <div class="backdrop-blur-md bg-white/5 border-b border-white/10 p-6 space-y-4">
          <!-- 筛选器 -->
          <div class="flex flex-wrap gap-4 items-center">
            <div class="flex items-center space-x-2">
              <label class="text-gray-300 text-sm">状态:</label>
              <select v-model="filters.status" class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15">
                <option value="">全部</option>
                <option value="active">已启用</option>
                <option value="inactive">已禁用</option>
              </select>
            </div>
            
            <div class="flex items-center space-x-2">
              <label class="text-gray-300 text-sm">等级:</label>
              <select v-model="filters.level" class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15">
                <option value="">全部</option>
                <option value="★">★</option>
                <option value="★★">★★</option>
                <option value="★★★">★★★</option>
              </select>
            </div>
            
            <div class="flex items-center space-x-2">
              <label class="text-gray-300 text-sm">搜索:</label>
              <div class="relative">
                <input 
                  v-model="filters.search"
                  type="text" 
                  placeholder="搜索玩家名称..."
                  class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white pl-10 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 w-64"
                />
                <svg class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            
            <button 
              @click="clearFilters"
              class="text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              清除筛选
            </button>
          </div>
          
          <!-- 操作按钮 -->
          <div class="flex justify-between items-center">
            <div class="flex space-x-3">
              <button 
                @click="showAddModal = true"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                添加用户
              </button>
              
              <button 
                v-if="selectedUsers.length > 0"
                @click="batchEnable"
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                批量启用 ({{ selectedUsers.length }})
              </button>
              
              <button 
                v-if="selectedUsers.length > 0"
                @click="batchDisable"
                class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                </svg>
                批量禁用 ({{ selectedUsers.length }})
              </button>
              
              <button 
                v-if="selectedUsers.length > 0"
                @click="batchDelete"
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                批量删除 ({{ selectedUsers.length }})
              </button>
            </div>
            
            <div class="flex items-center space-x-3">
              <span class="text-gray-400 text-sm">每页显示:</span>
              <select v-model="pagination.pageSize" @change="updatePagination" class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 表格区域 -->
        <div class="flex-1 overflow-auto">
          <table class="w-full">
            <thead class="backdrop-blur-lg bg-white/10 sticky top-0 border-b border-white/20">
              <tr>
                <th class="text-left p-4 w-12">
                  <input 
                    type="checkbox" 
                    v-model="selectAll"
                    @change="toggleSelectAll"
                    class="w-4 h-4 text-blue-400 bg-white/10 border-white/30 rounded focus:ring-blue-400 focus:ring-2 backdrop-blur-sm"
                  />
                </th>
                <th class="text-left p-4 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('name')">
                  <div class="flex items-center space-x-1">
                    <span>玩家名称</span>
                    <svg v-if="sortField === 'name'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  </div>
                </th>
                <th class="text-left p-4 text-gray-300 font-medium">语言</th>
                <th class="text-left p-4 text-gray-300 font-medium">国家</th>
                <th class="text-left p-4 text-gray-300 font-medium">游戏名称</th>
                <th class="text-left p-4 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('level')">
                  <div class="flex items-center space-x-1">
                    <span>等级</span>
                    <svg v-if="sortField === 'level'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  </div>
                </th>
                <th class="text-left p-4 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('addedDate')">
                  <div class="flex items-center space-x-1">
                    <span>添加时间</span>
                    <svg v-if="sortField === 'addedDate'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  </div>
                </th>
                <th class="text-left p-4 text-gray-300 font-medium cursor-pointer hover:text-white transition-colors" @click="sortBy('status')">
                  <div class="flex items-center space-x-1">
                    <span>状态</span>
                    <svg v-if="sortField === 'status'" class="w-4 h-4" :class="sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                  </div>
                </th>
                <th class="text-left p-4 text-gray-300 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="user in paginatedUsers" 
                :key="user.id"
                class="border-b border-white/10 hover:bg-white/5 transition-colors backdrop-blur-sm"
                :class="{ 'bg-white/10': selectedUsers.includes(user.id) }"
              >
                <td class="p-4">
                  <input 
                    type="checkbox" 
                    :value="user.id"
                    v-model="selectedUsers"
                    class="w-4 h-4 text-blue-400 bg-white/10 border-white/30 rounded focus:ring-blue-400 focus:ring-2 backdrop-blur-sm"
                  />
                </td>
                <td class="p-4 text-white">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mr-3 flex items-center justify-center">
                      <span class="text-xs font-bold text-white">{{ user.name.charAt(0) }}</span>
                    </div>
                    <span class="font-medium">{{ user.name }}</span>
                  </div>
                </td>
                <td class="p-4 text-gray-300">{{ user.language }}</td>
                <td class="p-4 text-gray-300">
                  <div class="flex items-center">
                    <span class="mr-2">{{ user.country.flag }}</span>
                    <span>{{ user.country.name }}</span>
                  </div>
                </td>
                <td class="p-4 text-gray-300">{{ user.gameName }}</td>
                <td class="p-4">
                  <div class="flex items-center">
                    <span class="text-yellow-400">{{ user.level }}</span>
                  </div>
                </td>
                <td class="p-4 text-gray-400 text-sm">{{ user.addedDate }}</td>
                <td class="p-4">
                  <span 
                    class="px-3 py-1 rounded-full text-xs font-medium"
                    :class="user.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'"
                  >
                    {{ user.status === 'active' ? '已启用' : '已禁用' }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex space-x-2">
                    <button 
                      @click="toggleUserStatus(user)"
                      class="p-2 rounded-lg transition-colors backdrop-blur-sm"
                      :class="user.status === 'active' ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green-400 hover:bg-green-400/10'"
                      :title="user.status === 'active' ? '禁用用户' : '启用用户'"
                    >
                      <svg v-if="user.status === 'active'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                      </svg>
                      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </button>
                    <button 
                      @click="editUser(user)"
                      class="text-blue-400 hover:bg-blue-400/10 p-2 rounded-lg transition-colors backdrop-blur-sm"
                      title="编辑用户"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    <button 
                      @click="deleteUser(user)"
                      class="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors backdrop-blur-sm"
                      title="删除用户"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- 空状态 -->
          <div v-if="filteredUsers.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p class="text-gray-400 text-lg">没有找到匹配的用户</p>
            <p class="text-gray-500 text-sm mt-2">尝试调整筛选条件或添加新用户</p>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="backdrop-blur-md bg-white/5 border-t border-white/10 p-4 flex justify-between items-center">
          <div class="text-gray-400 text-sm">
            显示第 {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} 到 {{ Math.min(pagination.currentPage * pagination.pageSize, filteredUsers.length) }} 项，共 {{ filteredUsers.length }} 项
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="goToPage(pagination.currentPage - 1)"
              :disabled="pagination.currentPage === 1"
              class="w-8 h-8 flex items-center justify-center rounded-lg backdrop-blur-sm bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/20"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            
            <template v-for="page in visiblePages" :key="page">
              <button 
                v-if="page !== '...'"
                @click="goToPage(page)"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors backdrop-blur-sm border border-white/20"
                :class="page === pagination.currentPage ? 'bg-blue-500/80 text-white border-blue-400/50' : 'bg-white/10 text-white hover:bg-white/15'"
              >
                {{ page }}
              </button>
              <span v-else class="text-gray-400 px-2">...</span>
            </template>
            
            <button 
              @click="goToPage(pagination.currentPage + 1)"
              :disabled="pagination.currentPage === totalPages"
              class="w-8 h-8 flex items-center justify-center rounded-lg backdrop-blur-sm bg-white/10 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-white/20"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch } from 'vue'
import Navbar from './components/Navbar.vue'

// 登录状态
const isLoggedIn = ref(false)

// 表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  authCode: ''
})

// 切换状态
const isRegister = ref(false)
const showAddModal = ref(false)

// 筛选器
const filters = reactive({
  status: '',
  level: '',
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
const selectedUsers = ref([])
const selectAll = ref(false)

// 切换到注册
const switchToRegister = () => {
  isRegister.value = true
}

// 切换到登录
const switchToLogin = () => {
  isRegister.value = false
}

// 处理登录
const handleLogin = () => {
  // 简单验证
  if (loginForm.username && loginForm.password) {
    isLoggedIn.value = true
  }
}

// 处理注册
const handleRegister = () => {
  // 简单验证
  if (registerForm.username && registerForm.password && registerForm.authCode) {
    isLoggedIn.value = true
  }
}

// 退出登录
const logout = () => {
  isLoggedIn.value = false
  selectedUsers.value = []
  selectAll.value = false
}

// 白名单用户数据 - 更新为更丰富的数据结构
const whitelistUsers = ref([
  {
    id: 1,
    name: '托尼·史塔克',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'IronMan',
    level: '★★★',
    addedDate: '2023-05-15 14:30',
    status: 'active'
  },
  {
    id: 2,
    name: '史蒂夫·罗杰斯',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'CaptainAmerica',
    level: '★★★',
    addedDate: '2023-05-16 09:15',
    status: 'active'
  },
  {
    id: 3,
    name: '娜塔莎·罗曼诺夫',
    language: '俄语',
    country: { flag: '🇷🇺', name: '俄罗斯' },
    gameName: 'BlackWidow',
    level: '★★',
    addedDate: '2023-05-17 16:45',
    status: 'inactive'
  },
  {
    id: 4,
    name: '布鲁斯·班纳',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'Hulk',
    level: '★★★',
    addedDate: '2023-05-18 11:20',
    status: 'active'
  },
  {
    id: 5,
    name: '雷神·托尔',
    language: '阿斯加德语',
    country: { flag: '⚡', name: '阿斯加德' },
    gameName: 'Thor',
    level: '★★★',
    addedDate: '2023-05-19 13:50',
    status: 'active'
  },
  {
    id: 6,
    name: '克林特·巴顿',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'Hawkeye',
    level: '★★',
    addedDate: '2023-05-20 08:30',
    status: 'inactive'
  },
  {
    id: 7,
    name: '旺达·马克西莫夫',
    language: '索科维亚语',
    country: { flag: '🇸🇰', name: '索科维亚' },
    gameName: 'ScarletWitch',
    level: '★★★',
    addedDate: '2023-05-21 15:10',
    status: 'active'
  },
  {
    id: 8,
    name: '斯科特·朗',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'AntMan',
    level: '★',
    addedDate: '2023-05-22 10:45',
    status: 'active'
  },
  {
    id: 9,
    name: '彼得·帕克',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'SpiderMan',
    level: '★★',
    addedDate: '2023-05-23 12:30',
    status: 'active'
  },
  {
    id: 10,
    name: '卡罗尔·丹弗斯',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'CaptainMarvel',
    level: '★★★',
    addedDate: '2023-05-24 16:20',
    status: 'inactive'
  },
  {
    id: 11,
    name: '山姆·威尔逊',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'Falcon',
    level: '★★',
    addedDate: '2023-05-25 09:45',
    status: 'active'
  },
  {
    id: 12,
    name: '巴基·巴恩斯',
    language: '英语',
    country: { flag: '🇺🇸', name: '美国' },
    gameName: 'WinterSoldier',
    level: '★★',
    addedDate: '2023-05-26 14:15',
    status: 'active'
  }
])

// 筛选后的用户列表
const filteredUsers = computed(() => {
  let result = whitelistUsers.value

  // 按状态筛选
  if (filters.status) {
    result = result.filter(user => user.status === filters.status)
  }

  // 按等级筛选
  if (filters.level) {
    result = result.filter(user => user.level === filters.level)
  }

  // 按搜索关键词筛选
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase()
    result = result.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.gameName.toLowerCase().includes(searchTerm) ||
      user.language.toLowerCase().includes(searchTerm) ||
      user.country.name.toLowerCase().includes(searchTerm)
    )
  }

  // 排序
  if (sortField.value) {
    result.sort((a, b) => {
      let aVal = a[sortField.value]
      let bVal = b[sortField.value]
      
      // 处理嵌套对象
      if (sortField.value === 'country') {
        aVal = a.country.name
        bVal = b.country.name
      }
      
      // 处理日期
      if (sortField.value === 'addedDate') {
        aVal = new Date(aVal)
        bVal = new Date(bVal)
      }
      
      // 处理等级
      if (sortField.value === 'level') {
        aVal = aVal.length
        bVal = bVal.length
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
  const pages = []
  
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
  filters.status = ''
  filters.level = ''
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
    selectedUsers.value = paginatedUsers.value.map(user => user.id)
  } else {
    selectedUsers.value = []
  }
}

// 监听选中用户变化，更新全选状态
watch(selectedUsers, (newVal) => {
  const currentPageUserIds = paginatedUsers.value.map(user => user.id)
  selectAll.value = currentPageUserIds.length > 0 && currentPageUserIds.every(id => newVal.includes(id))
}, { deep: true })

// 监听分页变化，清空选择
watch(() => pagination.currentPage, () => {
  selectedUsers.value = []
  selectAll.value = false
})

// 用户操作
const toggleUserStatus = (user) => {
  user.status = user.status === 'active' ? 'inactive' : 'active'
}

const editUser = (user) => {
  // 这里可以打开编辑模态框
  console.log('编辑用户:', user)
}

const deleteUser = (user) => {
  if (confirm(`确定要删除用户 "${user.name}" 吗？`)) {
    const index = whitelistUsers.value.findIndex(u => u.id === user.id)
    if (index > -1) {
      whitelistUsers.value.splice(index, 1)
    }
    // 从选中列表中移除
    selectedUsers.value = selectedUsers.value.filter(id => id !== user.id)
  }
}

// 批量操作
const batchEnable = () => {
  selectedUsers.value.forEach(userId => {
    const user = whitelistUsers.value.find(u => u.id === userId)
    if (user) {
      user.status = 'active'
    }
  })
  selectedUsers.value = []
  selectAll.value = false
}

const batchDisable = () => {
  selectedUsers.value.forEach(userId => {
    const user = whitelistUsers.value.find(u => u.id === userId)
    if (user) {
      user.status = 'inactive'
    }
  })
  selectedUsers.value = []
  selectAll.value = false
}

const batchDelete = () => {
  if (confirm(`确定要删除选中的 ${selectedUsers.value.length} 个用户吗？`)) {
    selectedUsers.value.forEach(userId => {
      const index = whitelistUsers.value.findIndex(u => u.id === userId)
      if (index > -1) {
        whitelistUsers.value.splice(index, 1)
      }
    })
    selectedUsers.value = []
    selectAll.value = false
  }
}
</script>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

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
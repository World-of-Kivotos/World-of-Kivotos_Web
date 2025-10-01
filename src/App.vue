<template>
  <!-- 登录页面 -->
  <div v-if="!isLoggedIn">
    <!-- 导航栏 -->
    <Navbar />
    
    <!-- 主内容区域，添加顶部边距以避免被导航栏遮挡 -->
    <div class="min-h-screen flex items-center justify-end p-8 pr-16 pt-20">
      <div class="relative w-full max-w-md">
        <!-- 登录/注册卡片 -->
        <div class="backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl transition-all duration-500">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-2">World of Kivotos Panel</h1>
            <p class="text-gray-400">请选择登录方式</p>
          </div>

          <!-- 模式切换按钮 -->
          <div class="flex mb-6 bg-white/5 rounded-lg p-1">
            <button 
              @click="setAuthMode('admin')"
              :class="[
                'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200',
                authMode === 'admin' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              ]"
            >
              管理员
            </button>
            <button 
              @click="setAuthMode('user')"
              :class="[
                'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200',
                authMode === 'user' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              ]"
            >
              用户登录
            </button>
            <button 
              @click="setAuthMode('register')"
              :class="[
                'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200',
                authMode === 'register' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              ]"
            >
              注册
            </button>
          </div>

          <!-- 表单内容 -->
          <transition name="slide-fade" mode="out-in">
            <!-- 管理员登录 -->
            <div v-if="authMode === 'admin'" key="admin" class="space-y-6">
              <!-- 错误/成功消息 -->
              <div v-if="errorMessage" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                {{ errorMessage }}
              </div>
              <div v-if="successMessage" class="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-200 text-sm">
                {{ successMessage }}
              </div>
              
              <div class="space-y-4">
                <div class="relative">
                  <input 
                    v-model="adminForm.password"
                    type="password" 
                    placeholder="管理员密码"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
              
              <button 
                @click="handleAdminLogin"
                :disabled="isLoading"
                class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isLoading">登录中...</span>
                <span v-else>管理员登录</span>
              </button>
            </div>
            
            <!-- 用户登录 -->
            <div v-else-if="authMode === 'user'" key="user" class="space-y-6">
              <!-- 错误/成功消息 -->
              <div v-if="errorMessage" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                {{ errorMessage }}
              </div>
              <div v-if="successMessage" class="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-200 text-sm">
                {{ successMessage }}
              </div>
              
              <div class="space-y-4">
                <div class="relative">
                  <input 
                    v-model="userForm.username"
                    type="text" 
                    placeholder="用户名"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors disabled:opacity-50"
                  />
                </div>
                <div class="relative">
                  <input 
                    v-model="userForm.password"
                    type="password" 
                    placeholder="密码"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
              
              <button 
                @click="handleUserLogin"
                :disabled="isLoading"
                class="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isLoading">登录中...</span>
                <span v-else>用户登录</span>
              </button>
            </div>
            
            <!-- 用户注册 -->
            <div v-else-if="authMode === 'register'" key="register" class="space-y-6">
              <!-- 错误/成功消息 -->
              <div v-if="errorMessage" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                {{ errorMessage }}
              </div>
              <div v-if="successMessage" class="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-200 text-sm">
                {{ successMessage }}
              </div>
              
              <div class="space-y-4">
                <div class="relative">
                  <input 
                    v-model="registerForm.playerName"
                    type="text" 
                    placeholder="玩家名称"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                  />
                </div>
                <div class="relative">
                  <input 
                    v-model="registerForm.playerUuid"
                    type="text" 
                    placeholder="玩家UUID"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                  />
                </div>
                <div class="relative">
                  <input 
                    v-model="registerForm.token"
                    type="text" 
                    placeholder="注册令牌"
                    :disabled="isLoading"
                    class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
              
              <button 
                @click="handleRegister"
                :disabled="isLoading"
                class="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isLoading">注册中...</span>
                <span v-else>注册白名单</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>

  <!-- 管理页面 -->
  <ManagementPage v-else @close="handleLogout" />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import ManagementPage from './components/ManagementPage.vue'
import { isAuthenticated, loginAsAdmin, registerWithToken, logout } from './stores/auth.js'

// 认证模式：admin, user, register
const authMode = ref('admin')

// 表单数据
const adminForm = reactive({
  password: ''
})

const userForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  playerName: '',
  playerUuid: '',
  token: ''
})

// 状态
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// 计算属性：是否已登录
const isLoggedIn = computed(() => isAuthenticated.value)

// 设置认证模式
const setAuthMode = (mode) => {
  authMode.value = mode
  clearMessages()
  clearForms()
}

// 清除消息
const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

// 清除表单
const clearForms = () => {
  adminForm.password = ''
  userForm.username = ''
  userForm.password = ''
  registerForm.playerName = ''
  registerForm.playerUuid = ''
  registerForm.token = ''
}

// 处理管理员登录
const handleAdminLogin = async () => {
  if (!adminForm.password.trim()) {
    errorMessage.value = '请输入管理员密码'
    return
  }

  isLoading.value = true
  clearMessages()

  try {
    const result = await loginAsAdmin(adminForm.password)
    
    if (result.success) {
      successMessage.value = '登录成功！'
      adminForm.password = ''
    } else {
      errorMessage.value = result.error || '登录失败'
    }
  } catch (error) {
    errorMessage.value = '网络错误，请检查服务器连接'
  } finally {
    isLoading.value = false
  }
}

// 处理用户登录
const handleUserLogin = async () => {
  if (!userForm.username.trim() || !userForm.password.trim()) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  isLoading.value = true
  clearMessages()

  try {
    // TODO: 实现用户登录逻辑
    errorMessage.value = '用户登录功能暂未实现'
  } catch (error) {
    errorMessage.value = '网络错误，请检查服务器连接'
  } finally {
    isLoading.value = false
  }
}

// 处理用户注册
const handleRegister = async () => {
  if (!registerForm.playerName.trim() || !registerForm.playerUuid.trim() || !registerForm.token.trim()) {
    errorMessage.value = '请填写所有必填字段'
    return
  }

  isLoading.value = true
  clearMessages()

  try {
    const result = await registerWithToken(
      registerForm.token,
      registerForm.playerName,
      registerForm.playerUuid
    )
    
    if (result.success) {
      successMessage.value = '注册成功！您已被添加到白名单'
      registerForm.playerName = ''
      registerForm.playerUuid = ''
      registerForm.token = ''
    } else {
      errorMessage.value = result.error || '注册失败'
    }
  } catch (error) {
    errorMessage.value = '网络错误，请检查服务器连接'
  } finally {
    isLoading.value = false
  }
}

// 处理登出
const handleLogout = () => {
  logout()
  clearForms()
  clearMessages()
  authMode.value = 'admin'
}

// 组件挂载时的初始化
onMounted(() => {
  // 可以在这里添加初始化逻辑
})
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
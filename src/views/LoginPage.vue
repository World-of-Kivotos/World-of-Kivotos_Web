<template>
  <div class="min-h-screen flex items-center justify-end p-8 pr-16 pt-20">
    <!-- 导航栏 -->
    <Navbar />
    
    <div class="relative w-full max-w-md">
      <!-- 登录/注册卡片 -->
      <div class="backdrop-blur-lg bg-white/10 rounded-2xl border border-white/20 p-8 shadow-2xl transition-all duration-500">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">World of Kivotos Panel</h1>
          <p class="text-gray-400">请选择登录方式</p>
          
          <!-- 服务器连接状态 -->
          <div class="mt-4 flex items-center justify-center space-x-2">
            <div 
              :class="[
                'w-2 h-2 rounded-full',
                serverStatus.isChecking ? 'bg-yellow-400 animate-pulse' :
                serverStatus.isConnected ? 'bg-green-400' : 'bg-red-400'
              ]"
            ></div>
            <span 
              :class="[
                'text-xs',
                serverStatus.isChecking ? 'text-yellow-400' :
                serverStatus.isConnected ? 'text-green-400' : 'text-red-400'
              ]"
            >
              {{ 
                serverStatus.isChecking ? '检查服务器连接...' :
                serverStatus.isConnected ? '服务器已连接' : '服务器连接失败'
              }}
            </span>
            <button 
              @click="checkServerConnection"
              :disabled="serverStatus.isChecking"
              class="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              重新检查
            </button>
          </div>
        </div>

        <!-- 模式切换按钮 -->
        <div class="flex mb-6 bg-white/5 rounded-lg p-1">
          <button 
            @click="setAuthMode('login')"
            :class="[
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200',
              authMode === 'login' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            ]"
          >
            登录
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
          <!-- 用户登录 -->
          <div v-if="authMode === 'login'" key="login" class="space-y-6">
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
                  v-model="loginForm.username"
                  type="text" 
                  placeholder="玩家名称"
                  :disabled="isLoading"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                />
              </div>
              <div class="relative">
                <input 
                  v-model="loginForm.password"
                  type="password" 
                  placeholder="密码"
                  :disabled="isLoading"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-50"
                />
              </div>
            </div>
            
            <button 
              @click="handleLogin"
              :disabled="isLoading"
              class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading">登录中...</span>
              <span v-else>登录</span>
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
                  v-model="registerForm.username"
                  type="text" 
                  placeholder="玩家名称"
                  :disabled="isLoading"
                  class="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors disabled:opacity-50"
                />
              </div>
              <div class="relative">
                <input 
                  v-model="registerForm.password"
                  type="password" 
                  placeholder="密码"
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
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import { useAuthStore } from '../stores/auth.js'
import apiService from '../services/api.js'

const router = useRouter()
const authStore = useAuthStore()

// 认证模式：login-用户登录, register-用户注册
const authMode = ref('login')

// 服务器连接状态
const serverStatus = ref({
  isConnected: false,
  isChecking: true,
  lastChecked: null
})

// 表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  token: ''
})

// 状态
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

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
  loginForm.username = ''
  loginForm.password = ''
  registerForm.username = ''
  registerForm.password = ''
  registerForm.token = ''
}

// 处理用户登录
const handleLogin = async () => {
  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  // 检查服务器连接状态
  if (!serverStatus.value.isConnected) {
    errorMessage.value = '服务器连接失败，请检查服务器是否运行在 http://localhost:22222'
    return
  }

  isLoading.value = true
  clearMessages()

  try {
    const result = await authStore.adminLogin(loginForm.username, loginForm.password)
    
    if (result.success) {
      successMessage.value = '登录成功！'
      loginForm.username = ''
      loginForm.password = ''
      // 使用路由跳转
      router.push('/admin')
    } else {
      errorMessage.value = result.error || '登录失败'
    }
  } catch (error) {
    console.error('登录错误:', error)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage.value = '无法连接到服务器，请确认服务器运行在 http://localhost:22222'
    } else {
      errorMessage.value = '网络错误，请检查服务器连接'
    }
    // 重新检查服务器连接状态
    checkServerConnection()
  } finally {
    isLoading.value = false
  }
}



// 处理管理员注册
const handleRegister = async () => {
  if (!registerForm.username.trim() || !registerForm.password.trim() || !registerForm.token.trim()) {
    errorMessage.value = '请填写所有必填字段'
    return
  }

  // 检查服务器连接状态
  if (!serverStatus.value.isConnected) {
    errorMessage.value = '服务器连接失败，请检查服务器是否运行在 http://localhost:22222'
    return
  }

  isLoading.value = true
  clearMessages()

  try {
    const result = await authStore.adminRegister(
      registerForm.username,
      registerForm.password,
      registerForm.token,
      registerForm.username  // displayName 默认使用 username
    )
    
    if (result.success) {
      successMessage.value = '注册成功！请使用您的账号密码登录'
      registerForm.username = ''
      registerForm.password = ''
      registerForm.token = ''
      // 自动切换到登录模式
      setTimeout(() => {
        setAuthMode('login')
      }, 2000)
    } else {
      errorMessage.value = result.error || '注册失败'
    }
  } catch (error) {
    console.error('注册错误:', error)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage.value = '无法连接到服务器，请确认服务器运行在 http://localhost:22222'
    } else {
      errorMessage.value = '网络错误，请检查服务器连接'
    }
    // 重新检查服务器连接状态
    checkServerConnection()
  } finally {
    isLoading.value = false
  }
}

// 检查服务器连接状态
const checkServerConnection = async () => {
  serverStatus.value.isChecking = true
  
  try {
    const result = await apiService.healthCheck()
    serverStatus.value.isConnected = result.success || false
    serverStatus.value.lastChecked = new Date()
  } catch (error) {
    serverStatus.value.isConnected = false
    serverStatus.value.lastChecked = new Date()
    console.error('服务器连接检查失败:', error)
  } finally {
    serverStatus.value.isChecking = false
  }
}

// 组件挂载时检查服务器连接
onMounted(() => {
  checkServerConnection()
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
</style>
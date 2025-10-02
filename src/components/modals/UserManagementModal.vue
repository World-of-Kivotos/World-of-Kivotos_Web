<template>
  <!-- 透明背景遮罩 -->
  <Transition name="modal-backdrop">
    <div 
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop"
      @click.self="$emit('close')"
    >
      <!-- 白色模态框 -->
      <div 
        class="relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col modal-content"
        @click.stop
      >

      <!-- 固定头部 -->
      <div class="flex-shrink-0 px-8 pt-8 pb-4">
        <div class="text-center">
          <h3 class="text-2xl font-bold text-gray-800 mb-2">用户管理</h3>
          <p class="text-sm text-gray-600">生成注册令牌供新用户注册使用</p>
        </div>
      </div>
      
      <!-- 可滚动内容区域 -->
      <div class="flex-1 overflow-y-auto px-8">
        <form @submit.prevent="handleSubmit" class="space-y-5" id="user-management-form">
          <!-- 当前用户信息 -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="avatar placeholder">
                <div class="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center">
                  <span class="text-sm font-semibold">{{ userInfo.username.charAt(0).toUpperCase() }}</span>
                </div>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ userInfo.username }}</p>
                <p class="text-xs text-gray-600">{{ userInfo.isAdmin ? '管理员账号' : '普通用户' }}</p>
              </div>
            </div>
          </div>

          <!-- 管理员功能 -->
          <template v-if="userInfo.isAdmin">
            <!-- 令牌有效期选择 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-700 font-medium">令牌有效期 *</label>
              <div class="relative">
                <select 
                  v-model="tokenExpiryHours"
                  :disabled="isGenerating"
                  :class="[
                    'w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:bg-gray-100',
                    'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  ]"
                >
                  <option :value="1">1 小时</option>
                  <option :value="6">6 小时</option>
                  <option :value="24">24 小时 (1 天)</option>
                  <option :value="168">168 小时 (7 天)</option>
                  <option :value="720">720 小时 (30 天)</option>
                </select>
                <p class="mt-1.5 text-xs text-gray-500">选择注册令牌的有效期限</p>
              </div>
            </div>

            <!-- 生成的令牌显示 -->
            <div v-if="generatedToken" class="space-y-2">
              <label class="text-sm text-gray-700 font-medium">生成的令牌 (仅显示一次)</label>
              <div class="relative">
                <input 
                  type="text" 
                  :value="generatedToken"
                  readonly
                  class="w-full px-4 py-3 pr-20 bg-green-50 border border-green-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none font-mono text-sm"
                />
                <button 
                  type="button"
                  @click="copyToken"
                  class="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none transition-all"
                >
                  {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
              <p class="text-xs text-green-700">⚠️ 此令牌仅显示一次,关闭窗口后将无法再次查看,请妥善保管</p>
            </div>
          </template>

          <!-- 非管理员提示 -->
          <div v-else class="text-center py-6">
            <div class="avatar placeholder mb-3">
              <div class="bg-gray-200 text-gray-400 rounded-full w-16 h-16 flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p class="text-sm text-gray-600">您没有管理员权限</p>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
            {{ errorMessage }}
          </div>
        </form>
      </div>

      <!-- 固定底部按钮组 -->
      <div class="flex-shrink-0 border-t border-gray-200 px-8 py-6">
        <div class="flex gap-3">
          <button 
            type="button" 
            @click="$emit('close')"
            :disabled="isGenerating"
            class="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all disabled:opacity-50"
          >
            关闭
          </button>
          <button 
            v-if="userInfo.isAdmin"
            type="submit"
            form="user-management-form"
            :disabled="isGenerating"
            class="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {{ isGenerating ? '生成中...' : '生成令牌' }}
          </button>
        </div>
      </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import apiService from '../../services/api.js'

const emit = defineEmits(['close'])
const authStore = useAuthStore()

const userInfo = computed(() => authStore.userInfo)

const tokenExpiryHours = ref(24)
const isGenerating = ref(false)
const generatedToken = ref('')
const errorMessage = ref('')
const copied = ref(false)

// 提交表单
async function handleSubmit() {
  isGenerating.value = true
  errorMessage.value = ''
  generatedToken.value = ''
  copied.value = false
  
  try {
    const result = await apiService.generateToken(tokenExpiryHours.value)
    
    if (result.success) {
      generatedToken.value = result.data.token
      
      // 重置自动登出定时器
      authStore.resetAutoLogoutTimer()
    } else {
      errorMessage.value = result.error || '生成令牌失败'
    }
  } catch (error) {
    errorMessage.value = '生成失败: ' + error.message
  } finally {
    isGenerating.value = false
  }
}

// 复制令牌到剪贴板
async function copyToken() {
  try {
    await navigator.clipboard.writeText(generatedToken.value)
    copied.value = true
    
    // 3秒后恢复按钮文本
    setTimeout(() => {
      copied.value = false
    }, 3000)
  } catch (error) {
    console.error('复制失败:', error)
    errorMessage.value = '复制失败,请手动复制'
  }
}
</script>

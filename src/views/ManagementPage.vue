<template>
  <div class="min-h-screen bg-base-200">
    <!-- 导航栏 -->
    <Navbar @logout="handleLogout" />
    
    <!-- 主要内容 -->
    <div class="container mx-auto px-2 py-6 max-w-[98%]">
      <!-- 标签页导航 -->
      <div role="tablist" class="tabs tabs-lifted mb-6">
        <!-- 白名单管理标签 -->
        <router-link 
          to="/admin/whitelist"
          class="tab"
          :class="{ 'tab-active text-blue-500 border-b-2 border-blue-500': $route.name === 'WhitelistManagement' }"
        >
          白名单管理
        </router-link>
        
        <!-- 服务器监控标签 -->
        <router-link 
          to="/admin/server"
          class="tab"
          :class="{ 'tab-active text-blue-500 border-b-2 border-blue-500': $route.name === 'ServerMonitor' }"
        >
          服务器监控
        </router-link>
      </div>

      <!-- 路由视图 -->
      <div class="backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-3">
        <router-view />
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="toast toast-top toast-end">
      <div class="alert" :class="{
        'alert-success': message.type === 'success',
        'alert-error': message.type === 'error',
        'alert-warning': message.type === 'warning'
      }">
        <span>{{ message.text }}</span>
        <button class="btn btn-sm btn-ghost" @click="message = null">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

// 消息状态
const message = ref(null)

// 处理登出
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

// 显示消息
const showMessage = (text, type = 'info') => {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 5000)
}

// 用户活动监听 - 重置自动登出定时器
const handleUserActivity = () => {
  authStore.resetAutoLogoutTimer()
}

// 监听的事件列表
const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']

onMounted(() => {
  // 添加用户活动监听
  activityEvents.forEach(event => {
    window.addEventListener(event, handleUserActivity)
  })
})

onUnmounted(() => {
  // 移除用户活动监听
  activityEvents.forEach(event => {
    window.removeEventListener(event, handleUserActivity)
  })
})

// 暴露方法给子组件使用
defineExpose({
  showMessage
})
</script>
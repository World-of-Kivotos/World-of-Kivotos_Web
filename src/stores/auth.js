import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import apiService from '../services/api.js'

export const useAuthStore = defineStore('auth', () => {
  // 认证状态
  const isAuthenticated = ref(false)
  const userInfo = reactive({
    username: '',
    isAdmin: false
  })

  // 消息状态
  const errorMessage = ref('')
  const successMessage = ref('')
  const isLoading = ref(false)
  
  // 自动登出定时器
  let autoLogoutTimer = null
  const AUTO_LOGOUT_TIME = 5 * 60 * 1000 // 5分钟

  // 启动自动登出定时器
  const startAutoLogoutTimer = () => {
    // 清除之前的定时器
    if (autoLogoutTimer) {
      clearTimeout(autoLogoutTimer)
    }
    
    // 设置新的定时器
    autoLogoutTimer = setTimeout(() => {
      console.log('5分钟无操作,自动登出')
      logout()
    }, AUTO_LOGOUT_TIME)
  }
  
  // 重置自动登出定时器
  const resetAutoLogoutTimer = () => {
    if (isAuthenticated.value) {
      startAutoLogoutTimer()
    }
  }
  
  // 从本地存储恢复状态 - 刷新页面时不保持登录状态
  const initializeAuth = () => {
    // 刷新页面时自动登出,不从localStorage恢复登录状态
    isAuthenticated.value = false
    userInfo.username = ''
    userInfo.isAdmin = false
    localStorage.removeItem('auth')
  }

  // 保存状态到本地存储
  const saveAuthState = () => {
    const authData = {
      isAuthenticated: isAuthenticated.value,
      userInfo: { ...userInfo }
    }
    localStorage.setItem('auth', JSON.stringify(authData))
  }

  // 清除消息
  const clearMessages = () => {
    errorMessage.value = ''
    successMessage.value = ''
  }

  // 管理员登录
  const adminLogin = async (username, password) => {
    isLoading.value = true
    clearMessages()
    
    try {
      const result = await apiService.adminLogin(username, password)
      
      if (result.success) {
        // 保存认证token
        const authToken = result.data.token
        localStorage.setItem('authToken', authToken)
        
        // 保存用户信息
        isAuthenticated.value = true
        userInfo.username = result.data.user.username
        userInfo.isAdmin = result.data.user.isAdmin || result.data.user.isSuperAdmin
        
        successMessage.value = '登录成功'
        
        // 启动自动登出定时器
        startAutoLogoutTimer()
        
        return { success: true }
      } else {
        errorMessage.value = result.error || '登录失败'
        return { success: false, error: result.error }
      }
    } catch (error) {
      errorMessage.value = '网络错误，请检查服务器连接'
      return { success: false, error: '网络错误' }
    } finally {
      isLoading.value = false
    }
  }

  // 管理员注册
  const adminRegister = async (username, password, token, displayName) => {
    isLoading.value = true
    clearMessages()
    
    try {
      const result = await apiService.adminRegister(username, password, token, displayName)
      
      if (result.success) {
        successMessage.value = '注册成功！请使用您的账号密码登录'
        return { success: true }
      } else {
        errorMessage.value = result.error || '注册失败'
        return { success: false, error: result.error }
      }
    } catch (error) {
      errorMessage.value = '网络错误，请检查服务器连接'
      return { success: false, error: '网络错误' }
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = () => {
    // 清除定时器
    if (autoLogoutTimer) {
      clearTimeout(autoLogoutTimer)
      autoLogoutTimer = null
    }
    
    // 清除认证token
    localStorage.removeItem('authToken')
    
    isAuthenticated.value = false
    userInfo.username = ''
    userInfo.isAdmin = false
    localStorage.removeItem('auth')
    clearMessages()
  }

  // 初始化
  initializeAuth()

  return {
    // 状态
    isAuthenticated,
    userInfo,
    errorMessage,
    successMessage,
    isLoading,
    
    // 方法
    clearMessages,
    adminLogin,
    adminRegister,
    logout,
    resetAutoLogoutTimer
  }
})
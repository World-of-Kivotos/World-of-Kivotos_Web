// 认证状态管理
import { ref, reactive } from 'vue'
import apiService from '../services/api.js'

// 认证状态
const isAuthenticated = ref(false)
const adminPassword = ref('')
const currentUser = reactive({
  username: '',
  role: 'admin'
})

// 登录状态持久化
const AUTH_STORAGE_KEY = 'kivotos_auth'

// 从本地存储恢复认证状态
function restoreAuthState() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const authData = JSON.parse(stored)
      if (authData.isAuthenticated && authData.adminPassword) {
        isAuthenticated.value = true
        adminPassword.value = authData.adminPassword
        currentUser.username = authData.username || 'admin'
        apiService.setAdminPassword(authData.adminPassword)
      }
    }
  } catch (error) {
    console.error('恢复认证状态失败:', error)
    clearAuthState()
  }
}

// 保存认证状态到本地存储
function saveAuthState() {
  try {
    const authData = {
      isAuthenticated: isAuthenticated.value,
      adminPassword: adminPassword.value,
      username: currentUser.username,
      timestamp: Date.now()
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
  } catch (error) {
    console.error('保存认证状态失败:', error)
  }
}

// 清除认证状态
function clearAuthState() {
  isAuthenticated.value = false
  adminPassword.value = ''
  currentUser.username = ''
  apiService.setAdminPassword(null)
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

// 管理员登录
async function loginAsAdmin(password) {
  try {
    // 验证管理员密码
    const isValid = await apiService.validateAdminPassword(password)
    
    if (isValid) {
      isAuthenticated.value = true
      adminPassword.value = password
      currentUser.username = 'admin'
      currentUser.role = 'admin'
      
      // 保存认证状态
      saveAuthState()
      
      return { success: true }
    } else {
      return { success: false, error: '管理员密码错误' }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return { success: false, error: '登录失败，请检查网络连接和服务器状态' }
  }
}

// 用户注册（使用令牌）
async function registerWithToken(token, playerName, playerUuid) {
  try {
    const result = await apiService.registerUser(token, playerName, playerUuid)
    
    if (result.success) {
      // 注册成功后，用户可以以普通用户身份登录
      isAuthenticated.value = true
      currentUser.username = playerName
      currentUser.role = 'user'
      
      // 保存认证状态（不包含管理员密码）
      const authData = {
        isAuthenticated: true,
        username: playerName,
        role: 'user',
        timestamp: Date.now()
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      
      return { success: true, message: result.message }
    } else {
      return { success: false, error: result.error?.message || '注册失败' }
    }
  } catch (error) {
    console.error('注册失败:', error)
    return { success: false, error: '注册失败，请检查令牌是否有效' }
  }
}

// 生成注册令牌（仅管理员）
async function generateRegistrationToken(expiryHours = 24) {
  if (!isAuthenticated.value || currentUser.role !== 'admin') {
    return { success: false, error: '需要管理员权限' }
  }
  
  try {
    const result = await apiService.generateToken(expiryHours)
    return { success: true, token: result.data.token, expiryHours: result.data.expiryHours }
  } catch (error) {
    console.error('生成令牌失败:', error)
    return { success: false, error: '生成令牌失败' }
  }
}

// 退出登录
function logout() {
  clearAuthState()
}

// 检查是否为管理员
function isAdmin() {
  return isAuthenticated.value && currentUser.role === 'admin'
}

// 初始化时恢复认证状态
restoreAuthState()

export {
  isAuthenticated,
  currentUser,
  loginAsAdmin,
  registerWithToken,
  generateRegistrationToken,
  logout,
  isAdmin
}
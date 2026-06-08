import axios from 'axios'

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.mcwok.cn/api'
const API_TOKEN = import.meta.env.VITE_API_TOKEN || ''

// 创建 axios 实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 优先使用 JWT token（已登录用户）
    const jwtToken = localStorage.getItem('auth_token')
    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`
    } else if (API_TOKEN) {
      // 否则使用 API Token
      config.headers['X-API-Key'] = API_TOKEN
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 处理 401 未授权: 清除登录态并跳登录页 (避免在登录页自身循环跳转)
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

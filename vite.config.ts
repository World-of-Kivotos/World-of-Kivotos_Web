import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 白名单/服务器/日志 API -> AccessHub mod 的 HTTP 服务 (:22222, 纯 http)
      '/api': {
        target: 'http://api.mcwok.cn:22222',
        changeOrigin: true,
        secure: false,
      },
      // 问卷 API 代理
      '/survey-api': {
        target: 'https://questionnaire.mcwok.cn',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/survey-api/, '/api/v1'),
      },
    },
  },
})

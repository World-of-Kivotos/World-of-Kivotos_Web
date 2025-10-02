import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'https://api.mcwok.cn',
          changeOrigin: true,
          secure: true,
          headers: {
            'X-API-Key': env.VITE_API_ACCESS_TOKEN || ''
          }
        }
      }
    }
  }
})
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
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
          'X-API-Key': 'sk-J6WX2lVeMiJB9a4veklDVGNUe0brItoYt43tzaJtlQMKE41s9iidBkJlamfxL'
        }
      }
    }
  }
})
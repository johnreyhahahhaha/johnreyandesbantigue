import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => {
          // /api/login.php -> /josephus/st.joseph/public/api/login.php
          return path.replace(/^\/api/, '/josephus/st.joseph/public/api');
        }
      }
    }
  }
})

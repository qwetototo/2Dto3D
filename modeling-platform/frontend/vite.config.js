import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/proxy-osm': {
        target: 'https://api.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-osm/, '')
      },
      '/proxy-nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-nominatim/, '')
      }
    }
  }
})

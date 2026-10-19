import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dns from 'node:dns'
import https from 'node:https'

dns.setDefaultResultOrder('ipv4first')

const osmAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  timeout: 30000
})

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/proxy-osm': {
        target: 'https://api.openstreetmap.org',
        changeOrigin: true,
        agent: osmAgent,
        timeout: 30000,
        proxyTimeout: 30000,
        rewrite: (path) => path.replace(/^\/proxy-osm/, '')
      },
      '/proxy-nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        agent: osmAgent,
        timeout: 30000,
        proxyTimeout: 30000,
        rewrite: (path) => path.replace(/^\/proxy-nominatim/, '')
      }
    }
  }
})

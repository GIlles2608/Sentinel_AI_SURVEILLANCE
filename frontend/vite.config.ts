import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Pour supporter simple-peer
      include: ['events', 'util', 'buffer', 'process', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    // Fix pour simple-peer qui utilise 'global'
    global: 'globalThis',
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API vers le backend FastAPI
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket vers le backend FastAPI
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

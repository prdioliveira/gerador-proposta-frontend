import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL ?? 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 8030,
      allowedHosts: ['docker.tibercloud.cn'],
      proxy: {
        '/api': {
          target: 'http://localhost:8031/',
          changeOrigin: true,
          secure: false,
        },
        '/v2': {
          target: 'http://localhost:8031/',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'legacy'
        }
      }
    }
  }
})

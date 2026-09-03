import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // new Worker(new URL('./poseWorker.ts', import.meta.url), { type: 'module' }) 用
  worker: { format: 'es' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Dopagaki Training',
        short_name: 'Dopagaki',
        description:
          'カメラで筋トレ動作を認識し、回数に応じてパチスロ風の演出を出すトレーニングアプリ',
        lang: 'ja',
        theme_color: '#0b0b12',
        background_color: '#0b0b12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // MediaPipe の wasm/モデル(models/**)は precache しない（Phase 5 でオフライン対応時に検討）。
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/models/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    // Cloudflare Tunnel 越しに実機デバッグする際に使う（Phase 2）。
    // allowedHosts: ['.trycloudflare.com'],
    // hmr: { clientPort: 443, protocol: 'wss' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

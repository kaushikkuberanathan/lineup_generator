import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Only enforced on real Vercel builds (Vercel sets VERCEL=1 automatically) —
// never in CI's build-sanity step (frontend Vitest job builds with zero
// secrets on purpose) or local dev, both of which legitimately run without
// these vars set.
function validateVercelEnv() {
  if (process.env.VERCEL !== '1') return

  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `[vite.config] Missing required env var(s) for this Vercel build: ${missing.join(', ')}. ` +
      `Set them in Vercel -> Settings -> Environment Variables for the ${process.env.VERCEL_ENV || 'unknown'} environment.`
    )
  }

  // The exact misconfiguration behind the 2026-08-22 production auth outage:
  // a legacy JWT-format anon key survived in Vercel env vars after Supabase
  // disabled legacy API keys for this project. New keys look like
  // `sb_publishable_...`; legacy keys are three-segment JWTs starting `eyJ`.
  if (/^eyJ/.test(process.env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error(
      '[vite.config] VITE_SUPABASE_ANON_KEY looks like a legacy JWT-format key (starts with "eyJ"). ' +
      'Supabase has legacy keys disabled for this project -- use the new publishable key ' +
      '(starts with "sb_publishable_") from Supabase -> Settings -> API Keys instead.'
    )
  }
}
validateVercelEnv()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['**/node_modules/**'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-512.png'],
      manifest: {
        name: 'Dugout Lineup',
        short_name: 'Dugout Lineup',
        description: 'Game-day lineup manager for youth baseball coaches',
        theme_color: '#0f1f3d',
        background_color: '#fdf6ec',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache jsPDF from CDN for offline PDF generation
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-libs-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ]
})

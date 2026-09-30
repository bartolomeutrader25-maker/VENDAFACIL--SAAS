import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function silenceViteHmrPlugin(): Plugin {
  return {
    name: 'silence-vite-hmr-client',
    transform(code: string, id: string) {
      if (id.includes('client.mjs') && process.env.DISABLE_HMR === 'true') {
        return code
          .replace('console.debug("[vite] connecting...");', '// [vite] HMR disabled in AI Studio environment')
          .replace(
            /const transport = normalizeModuleRunnerTransport\([\s\S]*?\n\);/,
            'const transport = { connect() { return Promise.resolve(); }, disconnect() { return Promise.resolve(); }, send() { return Promise.resolve(); } };'
          );
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      silenceViteHmrPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'VendaFácil - POS & Gestão Comercial',
          short_name: 'VendaFácil',
          description: 'Sistema Comercial e Ponto de Venda (POS) Offline para Angola.',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for single bundle
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          importScripts: ['/sw-sync-handler.js'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache critical catalog & configuration data for seamless offline POS usage
              urlPattern: /\/api\/(products|categories|customers|company|cash-register\/current)/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'vendafacil-offline-catalog',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR === 'true' ? false : { clientPort: 443 },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { imagetools } from 'vite-imagetools'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Link previews need an absolute og:image URL. On Vercel the production domain is known at build time;
 * elsewhere set SITE_URL (e.g. SITE_URL=https://my-roll.vercel.app npm run build).
 */
function ogImage(): Plugin {
  return {
    name: 'og-image-url',
    transformIndexHtml(html) {
      const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
      const site = process.env.SITE_URL ?? (vercel ? `https://${vercel}` : '')
      return html.replace('%OG_IMAGE%', `${site.replace(/\/$/, '')}/og-image.jpg`)
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    imagetools(),
    // `npm run dev:phone`: HTTPS on the local network, because the mic only works on secure pages
    mode === 'phone' ? basicSsl() : null,
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png', 'og-image.jpg'],
      manifest: {
        name: 'Reel Twenty-Two',
        short_name: 'Reel 22',
        description: 'A roll of film waiting to be developed.',
        lang: 'en',
        theme_color: '#2E3A6E',
        background_color: '#2E3A6E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2,wav}'],
        // Font subsets the site never uses
        globIgnores: ['**/*-cyrillic*', '**/*-greek*', '**/*-math*', '**/*-symbols*'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    ogImage(),
  ],
}))

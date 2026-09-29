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
      /*
       * No web app manifest on purpose. On iOS 26 a page that links one (or asks for a translucent status bar)
       * is laid out by a buggy path when opened from the Home Screen: the view is one status bar too short and a
       * bare strip is left at the bottom of the screen (pi-web issue #598, measured on device). Without it, an
       * iPhone still opens the roll full screen from the Home Screen (index.html: apple-mobile-web-app-capable,
       * the title and icon metas), and the service worker below still makes it work offline.
       */
      manifest: false,
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

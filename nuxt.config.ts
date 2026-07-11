// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // canvas 中心のクライアント専用アプリなので全面 SPA。
  ssr: false,
  // GitHub Pages 向け静的化。.nojekyll を自動生成し `_nuxt/` が無視されるのを防ぐ。
  nitro: {
    preset: 'github_pages',
  },

  modules: ['@nuxt/icon'],
  css: ['~/assets/scss/main.scss'],
  devServer: {
    host: "0.0.0.0",
    port: 3000
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/_color.scss" as *;',
        },
      },
    },
  },
  app: {
    // project page (sYamaz.github.io/enpitsu/) で公開する。CI からは NUXT_APP_BASE_URL で上書き可能。
    baseURL: process.env.NUXT_APP_BASE_URL || '/enpitsu/',
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600&display=swap',
        },
      ],
      meta: [
        // pinch-in/out を含むズーム操作をアプリ側で扱うため、ブラウザの user-scalable を無効化。
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, user-scalable=no'
        }
      ],
    }
  }
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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
  // - 速記でのイベント落ち回避に必要かと思ったがそうでもなさそう
  // - それとは別に、pinch-in outのために追加している
  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, user-scalable=no'
        }
      ],
    }
  }
})

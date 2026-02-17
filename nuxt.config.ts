// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [],
  css: ['~/assets/css/main.css'],
  devServer: {
    host: "0.0.0.0",
    port: 3000
  },
  // 速記でのイベント落ち回避に必要かと思ったがそうでもなさそう
  // app: {
  //   head: {
  //     meta: [
  //       {
  //         name: 'viewport',
  //         content: 'width=device-width, initial-scale=1.0, user-scalable=no'
  //       }
  //     ],
  //   }
  // }
})

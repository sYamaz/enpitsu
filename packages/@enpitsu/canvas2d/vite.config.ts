// vite.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [dts({ include: ['src/**/*'], exclude: ['src/workers/**/*'] }), tsconfigPaths()],
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: '@enpitsu/canvas2d',
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            // 外部依存はバンドルしない
            external: ['react', 'vue'],
        },
    },
})
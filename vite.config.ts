/// <reference types="vitest" />
import {defineConfig} from "vite";

/** @type {import('vite').UserConfig} */
export default defineConfig({
    test: {},
    define: {},
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'babylon': ['@babylonjs/core']
                }
            }
        }
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'window',
            }
        }
    },
    server: {
        port: 3001,
        proxy: {
            '^/sync/.*': {
                target: 'https://www.deepdiagram.com/',
                changeOrigin: true,
            },
            '^/create-db': {
                target: 'https://www.deepdiagram.com/',
                changeOrigin: true,
            },
            '^/api/images': {
                target: 'https://www.deepdiagram.com/',
                changeOrigin: true,
            },
        }

    },
    preview: {
        port: 3001,
        proxy: {
            '^/sync/.*': {
                target: 'https://www.deepdiagram.com/',
                changeOrigin: true,
            },
            '^/create-db': {
                target: 'https://www.deepdiagram.com/',
                changeOrigin: true,
            },
            '^/api/images': {
                target: 'https://www.deepdiagram.com/',
                changeOrigin: true,
            },
        }
    },
    base: "/"

})
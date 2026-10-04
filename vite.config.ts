/// <reference types="vitest" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
// @ts-expect-error type error without @types/node package
import process from "node:process"
const host = process.env.TAURI_DEV_HOST

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@components": path.resolve(__dirname, "./src/presentation/components"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      funcio: "funcio/lib/main.js",
    },
  },
  test: {
    globals: true,
    environment: "node",
  },

  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          highlight: ["lowlight", "hast-util-to-jsx-runtime"],
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}))

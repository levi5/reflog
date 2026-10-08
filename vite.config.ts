import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pkg from "./package.json" with { type: "json" }

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const host = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.TAURI_DEV_HOST

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@domain": path.resolve(rootDir, "./src/domain"),
      "@components": path.resolve(rootDir, "./src/presentation/components"),
      "@infrastructure": path.resolve(rootDir, "./src/infrastructure"),
      funcio: "funcio/lib/main.js",
      react: path.resolve(rootDir, "./node_modules/react"),
      "react-dom": path.resolve(rootDir, "./node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom", "react-dom/client"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "e2e"],
  },

  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("lowlight") || id.includes("hast-util-to-jsx-runtime")) return "highlight"
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "vendor"
          return undefined
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

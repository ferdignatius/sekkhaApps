import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

// FE-13 Remediation: Deduplicate React instances explicitly in Vite SSR configuration
const config = defineConfig({
  plugins: [
    devtools(),
    tanstackStart({
      router: {
        routeFileIgnorePattern: "\\.md$",
      },
    }),
    nitro({
      devProxy: {
        "/api/**": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
      handlers: [
        {
          route: "/api/**",
          handler: "./src/server/api-proxy.ts",
          env: "prod",
        },
      ],
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.io"],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})

export default config

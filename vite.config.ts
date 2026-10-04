import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script",
      includeAssets: ["assets/cna-insignia.png"],
      manifest: {
        name: "Club Náutico Azopardo — Vela Ligera",
        short_name: "CNA Vela",
        lang: "es-AR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#073A5A",
        theme_color: "#073A5A",
        icons: [
          {
            src: "assets/cna-insignia.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2,pdf,docx}"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});

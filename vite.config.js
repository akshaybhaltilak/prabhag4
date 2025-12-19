import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Prabhag 4",
        short_name: "Prabhag 4",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#f97316",
        icons: [
          { src: "/logobjp.jpg", sizes: "192x192", type: "image/png" },
          { src: "/logobjp.jpg", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['firebase/firestore', 'firebase/app']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore']
        }
      }
    }
  }
})
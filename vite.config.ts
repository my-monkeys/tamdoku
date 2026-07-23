import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // PWA : la grille du jour se calcule côté client par date, le jeu est donc
    // 100 % jouable hors-ligne une fois le shell précaché. Les appels réseau
    // (stats t-api, feedback) échouent déjà en silence — rien à intercepter.
    VitePWA({
      registerType: "autoUpdate",
      // Le manifest.webmanifest statique de public/ fait foi (lien déjà dans index.html).
      manifest: false,
      workbox: {
        // Shell + favicons seulement : og.png (876 Ko) et les grosses icônes
        // d'installation (icon-512, apple-touch-icon) n'ont rien à faire offline.
        globPatterns: ["**/*.{js,css,html,svg,ico,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-css",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Chemins d'assets absolus : nécessaire pour que les routes profondes
  // (/archive/2026-07-03) chargent /assets/* et non /archive/assets/*.
  base: "/",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});

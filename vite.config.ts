import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Chemins d'assets absolus : nécessaire pour que les routes profondes
  // (/archive/2026-07-03) chargent /assets/* et non /archive/assets/*.
  base: "/",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});

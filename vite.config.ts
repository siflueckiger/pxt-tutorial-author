import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` keeps asset URLs relative so the built page works when served
// from a GitHub Pages sub-path (https://<user>.github.io/pxt-tutorial-author/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});

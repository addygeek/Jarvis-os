import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3847",
        changeOrigin: true,
        // Ollama chat can take 30s+ on first token
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";

export default defineConfig({
  envDir: "..",
  plugins: [
    react(),
    compression({ algorithm: "gzip", threshold: 1024 }),
    compression({ algorithm: "brotliCompress", threshold: 1024, ext: ".br" }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            return "vendor";
          }

          return undefined;
        }
      }
    }
  }
});

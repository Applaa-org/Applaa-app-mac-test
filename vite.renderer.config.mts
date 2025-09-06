import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Fix for Node.js globals in renderer process
    global: "globalThis",
    "process.env": "{}",
  },
  optimizeDeps: {
    // Exclude Node.js modules from pre-bundling
    exclude: ["fs-extra", "graceful-fs"],
  },
});

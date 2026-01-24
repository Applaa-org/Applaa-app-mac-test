import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: [
        "better-sqlite3", 
        "onnxruntime-node", 
        "@xenova/transformers",
        "keytar",
        "googleapis",
        "google-auth-library",
        "@google/generative-ai",
        "stripe",
        "electron",
        "electron-updater",
        "fs-extra",
        // Firebase SDK modules (must be external for Electron main process)
        "firebase/app",
        "firebase/auth",
        "firebase/functions",
        "firebase/remote-config",
        /^firebase\//,  // Match all firebase/* imports
        "child_process",
        "fs",
        "path",
        "os",
        "crypto",
        "util",
        "net",
        "http",
        "https",
        "stream",
        "buffer",
        "url",
        "querystring",
        "assert",
        "constants",
        "worker_threads",
        "perf_hooks",
        /^node:/,
        /^fs\//
      ],
    },
    sourcemap: true,
  },
  plugins: [
    {
      name: "restart",
      closeBundle() {
        process.stdin.emit("data", "rs");
      },
    },
  ],
});

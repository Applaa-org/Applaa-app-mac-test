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
        "electron",
        "playwright-core",
        "shell-env",
        "sharp",
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
        "bufferutil",
        "utf-8-validate",
        "ws",
        "@browserbasehq/stagehand",
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

import { defineConfig } from "vite";
import path from "path";
import { builtinModules } from "module";

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
        "electron",
        "better-sqlite3",
        "sqlite-vec",
        "onnxruntime-node",
        "@xenova/transformers",
        "keytar",
        "googleapis",
        "google-auth-library",
        "@google/generative-ai",
        "playwright-core",
        "shell-env",
        "sharp",
        "bufferutil",
        "utf-8-validate",
        "ws",
        "@browserbasehq/stagehand",
        "stripe",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        // Handle subpath imports like stream/promises
        /^node:.*$/,
        /^(fs|stream|path|crypto|util|net|http|https|zlib|child_process|events|tls|dns|async_hooks|v8|vm|tty|punycode|module|perf_hooks|worker_threads|assert|constants|url|querystring|buffer|diagnostics_channel|process|readline|repl|string_decoder|timers|dgram)\/.*$/,
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

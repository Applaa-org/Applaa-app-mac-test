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
        "onnxruntime-node",
        "@xenova/transformers",
        "keytar",
        "bufferutil",
        "utf-8-validate",
        "electron-squirrel-startup",
        "sharp",
        // Sharp: external so native addons load from node_modules (Mac darwin-*, Windows win32-*, Linux)
        /^@img\/sharp/,
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

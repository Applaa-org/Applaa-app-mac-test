import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: false,
    hmr: {
      overlay: false, // Disable error overlay
    },
  },
  clearScreen: false, // Don't clear terminal on rebuild
  logLevel: 'error', // Only show errors, not info/warnings
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "better-sqlite3": path.resolve(__dirname, "./src/mocks/empty.ts"),
      "drizzle-orm/better-sqlite3": path.resolve(__dirname, "./src/mocks/empty.ts"),
      "electron-log": path.resolve(__dirname, "./src/mocks/empty.ts"),
    },
  },
  define: {
    // Fix for Node.js globals in renderer process
    global: "globalThis",
    "process.env": "{}",
  },
  optimizeDeps: {
    // Exclude Node.js modules from pre-bundling
    exclude: ["fs-extra", "graceful-fs", "shell-env", "execa", "human-signals", "better-sqlite3", "drizzle-orm", "electron-log"],
  },
  build: {
    rollupOptions: {
      external: [
        'shell-env',
        'execa',
        'human-signals',
        'fs-extra',
        'graceful-fs',
        'better-sqlite3',
        'drizzle-orm',
        'drizzle-orm/better-sqlite3',
        'drizzle-orm/better-sqlite3/migrator',
        'electron-log',
        /^node:.*/,  // Externalize all node: imports
        /^better-sqlite3\/.*/,  // Externalize all better-sqlite3 sub-paths
        /^drizzle-orm\/.*/,  // Externalize all drizzle-orm sub-paths
        /^electron-log\/.*/,  // Externalize all electron-log sub-paths
      ],
    },
  },
});

import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";

// Based on https://github.com/electron/forge/blob/6b2d547a7216c30fde1e1fddd1118eee5d872945/packages/plugin/vite/src/VitePlugin.ts#L124
const ignore = (file: string) => {
  if (!file) return false;
  // `file` always starts with `/`
  // @see - https://github.com/electron/packager/blob/v18.1.3/src/copy-filter.ts#L89-L93
  if (file === "/node_modules") {
    return false;
  }
  if (file.startsWith("/drizzle")) {
    return false;
  }
  if (file.startsWith("/scaffold")) {
    return false;
  }
  if (file.startsWith("/webapp-templates")) {
    return false;
  }
  if (file.startsWith("/expo-templates")) {
    return false; // ✅ Include expo templates in EXE
  }
  if (file.startsWith("/src/prompts")) {
    return false; // ✅ Include all system prompts (including expo_system_prompt.ts)
  }
  if (file.startsWith("/userData")) {
    return false;
  }
  

  if (file.startsWith("/worker") && !file.startsWith("/workers")) {
    return false;
  }
  if (file.startsWith("/node_modules/stacktrace-js")) {
    return false;
  }
  if (file.startsWith("/node_modules/stacktrace-js/dist")) {
    return false;
  }
  if (file.startsWith("/node_modules/better-sqlite3")) {
    return false;
  }
  if (file.startsWith("/node_modules/bindings")) {
    return false;
  }
  if (file.startsWith("/node_modules/file-uri-to-path")) {
    return false;
  }
  if (file.startsWith("/.vite")) {
    return false;
  }

  return true;
};

const isEndToEndTestBuild = process.env.E2E_TEST_BUILD === "true";

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "com.applaa.app",
    protocols: [
      {
        name: "Applaa",
        schemes: ["applaa"],
      },
    ],
    icon: "./assets/icon/logo.ico",
    asar: true,
    asarUnpack: [
      "node_modules/@google/gemini-cli/**",
      "node_modules/onnxruntime-react-native/**",
      "node_modules/react-native-transformers/**",
      "node_modules/better-sqlite3/**",
      "node_modules/expo/**",
      "node_modules/@expo/**",
      "node_modules/.bin/**",
      "drizzle/**"
    ],
    // extraResource: [
    //   "vendor/node20"
    // ],
    ignore,
  },
  rebuildConfig: {
    // Use onlyModules to explicitly control which modules to rebuild
    // This prevents auto-detection of better-sqlite3 which requires Windows SDK
    onlyModules: [
      "onnxruntime-react-native", 
      "react-native-transformers",
      "@react-native-async-storage/async-storage",
      "expo-sqlite",
      "react-native-svg",
      "expo",
      "@expo/cli",
      "@expo/ngrok"
    ],
    force: true,
  },
  // Makers for creating distributable packages
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Applaa",
        authors: "Applaa Team",
        description: "Your local AI app builder with beautiful orange and green design",
        setupIcon: "./assets/icon/logo.ico",
        noMsi: false,
      },
    },
    {
      name: "@electron-forge/maker-zip",
      config: {
        platforms: ["darwin", "linux", "win32"],
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
        {
          entry: "workers/tsc/tsc_worker.ts",
          config: "vite.worker.config.mts",
          target: "main",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: isEndToEndTestBuild,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;

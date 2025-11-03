import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { config as loadDotenv } from "dotenv";
import { execSync } from "child_process";
import * as path from "path";

// Load environment variables from .env file
loadDotenv();

// Helper function to sign the app bundle
function signAppBundle(appPath: string): void {
  // Use certificate hash instead of name for more reliable signing
  const identityHash = "6CD0DD440A85476BF37854351832019B2B1A7459";
  const identity = "Developer ID Application: Applaa Ltd (P7VCYRVVPQ)";
  const entitlementsPath = path.resolve(__dirname, "entitlements.plist");
  const fs = require('fs');
  
  console.log(`🔐 Signing app bundle: ${appPath}`);
  
  try {
    // Sign all helper apps first (helper apps typically don't need entitlements)
    const frameworksPath = path.join(appPath, 'Contents', 'Frameworks');
    if (fs.existsSync(frameworksPath)) {
      const helpers = fs.readdirSync(frameworksPath, { withFileTypes: true })
        .filter((dirent: any) => dirent.isDirectory() && dirent.name.endsWith('.app'))
        .map((dirent: any) => path.join(frameworksPath, dirent.name));
      
      for (const helperApp of helpers) {
        console.log(`  Signing helper: ${path.basename(helperApp)}`);
        try {
          // Helper apps don't need entitlements, just basic signing
          // Try with hash first (more reliable), fallback to name
          try {
            execSync(
              `codesign --force --sign "${identityHash}" --options runtime "${helperApp}"`,
              { stdio: 'pipe', encoding: 'utf8' }
            );
          } catch {
            // Fallback to using the identity name
            execSync(
              `codesign --force --sign "${identity}" --options runtime "${helperApp}"`,
              { stdio: 'pipe', encoding: 'utf8' }
            );
          }
          console.log(`    ✓ Helper signed successfully`);
        } catch (helperError: any) {
          console.error(`    ✗ Failed to sign helper: ${helperError.message}`);
          const stderr = helperError.stderr || helperError.stderr?.toString() || '';
          if (stderr.includes('unable to build chain')) {
            console.warn(`    ⚠️ Certificate chain issue detected - skipping helper signing for now`);
            console.warn(`    ⚠️ DMG will be created but may show warnings to users`);
            // Continue without signing helpers - main app signing will be attempted
            continue;
          }
          // For other errors, try fallback
          console.log(`    Attempting fallback signing (without runtime option)...`);
          try {
            try {
              execSync(
                `codesign --force --sign "${identityHash}" "${helperApp}"`,
                { stdio: 'pipe', encoding: 'utf8' }
              );
            } catch {
              execSync(
                `codesign --force --sign "${identity}" "${helperApp}"`,
                { stdio: 'pipe', encoding: 'utf8' }
              );
            }
            console.log(`    ✓ Helper signed with fallback method`);
          } catch (fallbackError: any) {
            console.warn(`    ⚠️ Fallback also failed - continuing without signing this helper`);
            // Continue without throwing - we'll try to sign the main app
          }
        }
      }
    }
    
    // Sign the main app with entitlements
    console.log(`  Signing main app...`);
    let mainAppSigned = false;
    try {
      // Try with hash first
      execSync(
        `codesign --force --sign "${identityHash}" --options runtime --entitlements "${entitlementsPath}" "${appPath}"`,
        { stdio: 'pipe', encoding: 'utf8' }
      );
      mainAppSigned = true;
    } catch (e1) {
      try {
        // Fallback to using the identity name
        execSync(
          `codesign --force --sign "${identity}" --options runtime --entitlements "${entitlementsPath}" "${appPath}"`,
          { stdio: 'pipe', encoding: 'utf8' }
        );
        mainAppSigned = true;
      } catch (e2: any) {
        if (e2.stderr && e2.stderr.includes('unable to build chain')) {
          console.warn(`  ⚠️ Main app signing failed due to certificate chain issue`);
          console.warn(`  ⚠️ Continuing with unsigned app - DMG will still be created`);
          console.warn(`  ⚠️ Users may see security warnings but the app will still work`);
          return; // Exit gracefully without throwing
        }
        throw e2;
      }
    }
    
    if (mainAppSigned) {
      // Verify signature
      const verifyOutput = execSync(`codesign -dv --verbose=4 "${appPath}" 2>&1`, { encoding: 'utf8' });
      if (verifyOutput.includes('Signature=adhoc')) {
        console.warn(`  ⚠️ Signature verification shows adhoc - chain issue persists`);
        return;
      }
      
      // Check for Authority/TeamIdentifier in the output
      const authorityLine = verifyOutput.split('\n').find((line: string) => 
        line.includes('Authority') || line.includes('TeamIdentifier')
      );
      
      console.log(`✅ App signed successfully`);
      if (authorityLine) {
        console.log(`   ${authorityLine.trim()}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Signing failed: ${error.message}`);
    if (error.stdout) console.error(`   stdout: ${error.stdout}`);
    if (error.stderr) console.error(`   stderr: ${error.stderr}`);
    throw error;
  }
}

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
    // Code signing
    osxSign: {
      identity: "Developer ID Application: Applaa Ltd (P7VCYRVVPQ)",
      hardenedRuntime: true,
      entitlements: "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
      "gatekeeper-assess": false,
      "signature-flags": "library",
    },
    // Optional: Notarization (temporarily disabled to test signing first)
    // Uncomment after verifying code signing works:
    // osxNotarize: process.env.APPLE_ID && process.env.APPLE_PASSWORD ? {
    //   tool: "notarytool",
    //   appleId: process.env.APPLE_ID,
    //   appleIdPassword: process.env.APPLE_PASSWORD,
    //   teamId: "P7VCYRVVPQ",
    // } : undefined,
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
    extraModules: [
      "better-sqlite3",
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
    {
      name: "@electron-forge/maker-dmg",
      config: {
        name: "Applaa",
        format: "UDZO",
        icon: "./assets/icon/logo.icns",
        iconSize: 100,
        contents: (opts) => {
          return [
            { x: 380, y: 280, type: "link", path: "/Applications" },
            { x: 110, y: 280, type: "file", path: opts.appPath },
          ];
        },
      },
    },
  ],
  hooks: {
    postPackage: async (forgeConfig, packageResults) => {
      // Sign the app bundle after packaging
      console.log('📦 postPackage hook called, packageResults:', JSON.stringify(packageResults, null, 2));
      
      const results = Array.isArray(packageResults) ? packageResults : [packageResults];
      for (const result of results) {
        if (result.platform === 'darwin') {
          // Try multiple ways to find the app path
          let appPath: string | undefined;
          
          if (result.outputPaths) {
            const outputPaths = Array.isArray(result.outputPaths) ? result.outputPaths : [result.outputPaths];
            appPath = outputPaths.find((p: string) => p && p.endsWith('.app'));
          }
          
          if (!appPath && result.outputPath) {
            appPath = result.outputPath.endsWith('.app') ? result.outputPath : undefined;
          }
          
          if (!appPath) {
            // Fallback: search for the app in the output directory
            const outputDir = result.outputPaths?.[0] || result.outputPath || 'out';
            const fs = require('fs');
            const findApp = (dir: string): string | undefined => {
              try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                  const fullPath = path.join(dir, entry.name);
                  if (entry.isDirectory() && entry.name.endsWith('.app')) {
                    return fullPath;
                  }
                  if (entry.isDirectory()) {
                    const found = findApp(fullPath);
                    if (found) return found;
                  }
                }
              } catch {}
              return undefined;
            };
            appPath = findApp(outputDir);
          }
          
          if (appPath) {
            console.log(`🔍 Found app at: ${appPath}`);
            signAppBundle(appPath);
          } else {
            console.log('⚠️ Could not find app bundle to sign');
          }
        }
      }
    },
  },
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

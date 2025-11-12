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

// Removed custom codesign helper; rely on packager osxSign/osxNotarize and staple in hooks

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
    } as any,
    // Notarization
    osxNotarize:
      process.platform === 'darwin' && process.env.APPLE_ID && (process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_PASSWORD)
        ? {
            tool: "notarytool",
            appleId: process.env.APPLE_ID as string,
            appleIdPassword: (process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_PASSWORD) as string,
            teamId: process.env.APPLE_TEAM_ID || process.env.TEAM_ID || "P7VCYRVVPQ",
          } as any
        : undefined,
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
  } as any,
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
    // Windows makers (only include on Windows)
    ...(process.platform === 'win32' ? [
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
    ] : []),
    // Cross-platform ZIP maker
    {
      name: "@electron-forge/maker-zip",
      config: {
        platforms: ["darwin", "linux", "win32"],
      },
    },
    // macOS DMG maker (only include on macOS)
    ...(process.platform === 'darwin' ? [
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
    ] : []),
  ],
  hooks: {
    postPackage: async (forgeConfig, packageResults) => {
      // Verify and re-staple the .app after packaging (if not already stapled)
      // This ensures the .app is stapled before ZIP/DMG creation
      // Also remove quarantine attributes to prevent "damaged" errors
      try {
      const results = Array.isArray(packageResults) ? packageResults : [packageResults];
      for (const result of results) {
          if (result.platform !== 'darwin') continue;
          
          // Find the .app bundle
          let appPath: string | undefined;
          if (result.outputPaths) {
            const outputPaths = Array.isArray(result.outputPaths) ? result.outputPaths : [result.outputPaths];
            appPath = outputPaths.find((p: string) => p && p.endsWith('.app'));
          }
          if (!appPath && result.outputPath) {
            appPath = result.outputPath.endsWith('.app') ? result.outputPath : undefined;
          }
          
          if (appPath && require('fs').existsSync(appPath)) {
            // Remove ALL extended attributes recursively to prevent "damaged" errors
            // This ensures the .app is completely clean before stapling
            try {
              execSync(`xattr -cr "${appPath}"`, { stdio: 'pipe' });
              console.log(`🧹 Removed all extended attributes from ${appPath}`);
              
              // Verify signature is still valid after removing attributes
              execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'pipe' });
              console.log(`✅ Signature verified after attribute removal`);
            } catch (e) {
              console.warn(`⚠️ Could not remove attributes or verify signature: ${e}`);
            }
            
            // Verify staple
            try {
              const validateOutput = execSync(`xcrun stapler validate "${appPath}"`, { encoding: 'utf8', stdio: 'pipe' });
              if (!validateOutput.includes('The validate action worked!')) {
                console.log(`📎 Stapling ${appPath}...`);
                execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
              } else {
                console.log(`✅ App is already stapled: ${appPath}`);
              }
            } catch (e: any) {
              // If validate fails, try to staple
              try {
                console.log(`📎 Stapling ${appPath}...`);
                execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
              } catch (stapleError) {
                console.warn(`⚠️ Could not staple ${appPath}: ${stapleError}`);
              }
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ postPackage hook encountered an error: ${e}`);
      }
    },
    postMake: async (forgeConfig, makeResults) => {
      // Re-create ZIP files with ditto to preserve extended attributes and signatures
      // This ensures maximum compatibility across different download methods
      try {
        const results = Array.isArray(makeResults) ? makeResults : [makeResults];
        const fs = require('fs');
        
        for (const result of results) {
          if (result.platform !== 'darwin') continue;
          
          // Get artifacts (ZIP files, DMG files, etc.)
          const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
          
          // Process ZIP files
          for (const artifact of artifacts) {
            if (!artifact.endsWith('.zip')) continue;
            
            const zipPath = artifact;
            const zipName = path.basename(zipPath);
            const tempDir = path.join(__dirname, '.tmp-zip-repack');
            const tempZipPath = zipPath + '.tmp';
            
            try {
              console.log(`📦 Re-creating ZIP with ditto: ${zipName}`);
              
              // Create temp directory
              if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
              }
              fs.mkdirSync(tempDir, { recursive: true });
              
              // Extract existing ZIP using ditto (preserves extended attributes)
              execSync(`ditto -x -k "${zipPath}" "${tempDir}"`, { stdio: 'pipe' });
              
              // Find the .app bundle in extracted files
              const findApp = (dir: string): string | undefined => {
                try {
                  const entries = fs.readdirSync(dir, { withFileTypes: true });
                  for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory() && entry.name.endsWith('.app')) {
                      return fullPath;
                    } else if (entry.isDirectory()) {
                      const found = findApp(fullPath);
                      if (found) return found;
                    }
                  }
                } catch {}
                return undefined;
              };
              
              const appPath = findApp(tempDir);
              if (!appPath || !fs.existsSync(appPath)) {
                console.warn(`⚠️ Could not find .app in ZIP: ${zipName}`);
                fs.rmSync(tempDir, { recursive: true, force: true });
                continue;
              }
              
              // Remove ALL extended attributes recursively to prevent "damaged" errors
              // This ensures the app is completely clean before re-zipping
              try {
                execSync(`xattr -cr "${appPath}"`, { stdio: 'pipe' });
                console.log(`🧹 Removed all extended attributes from app before re-zipping`);
                
                // Verify signature is still valid
                execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'pipe' });
              } catch (e) {
                console.warn(`⚠️ Could not remove attributes or verify signature: ${e}`);
              }
              
              // Verify the app is stapled before re-zipping
              try {
                const validateOutput = execSync(`xcrun stapler validate "${appPath}"`, { encoding: 'utf8', stdio: 'pipe' });
                if (!validateOutput.includes('The validate action worked!')) {
                  console.log(`📎 Stapling app before re-zipping...`);
                  execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' });
                }
              } catch (e) {
                // Try to staple anyway
                try {
                  execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'pipe' });
                } catch {}
              }
              
              // Create new ZIP with ditto (preserves extended attributes and signatures)
              // --sequesterRsrc is CRITICAL: prevents quarantine attributes from being included in ZIP
              execSync(`ditto -c -k --sequesterRsrc --keepParent "${appPath}" "${tempZipPath}"`, { stdio: 'inherit' });
              
              // Verify the new ZIP contains a valid app
              const verifyDir = path.join(__dirname, '.tmp-zip-verify');
              if (fs.existsSync(verifyDir)) {
                fs.rmSync(verifyDir, { recursive: true, force: true });
              }
              fs.mkdirSync(verifyDir, { recursive: true });
              execSync(`ditto -x -k "${tempZipPath}" "${verifyDir}"`, { stdio: 'pipe' });
              const verifyAppPath = findApp(verifyDir);
              if (verifyAppPath) {
                const validateResult = execSync(`xcrun stapler validate "${verifyAppPath}"`, { encoding: 'utf8', stdio: 'pipe' });
                if (validateResult.includes('The validate action worked!')) {
                  // Replace old ZIP
                  fs.renameSync(tempZipPath, zipPath);
                  console.log(`✅ ZIP re-created and verified: ${zipName}`);
                } else {
                  console.warn(`⚠️ Re-created ZIP failed validation: ${zipName}`);
                  if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
                }
              }
              fs.rmSync(verifyDir, { recursive: true, force: true });
              
              // Cleanup
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
              console.warn(`⚠️ Could not re-create ZIP ${zipName}: ${e}`);
              // Cleanup on error
              if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
              if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ postMake hook encountered an error: ${e}`);
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

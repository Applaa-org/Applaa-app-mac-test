import * as fs from "fs";
import * as path from "path";
import log from "electron-log";

/**
 * Scans all TypeScript/JavaScript files in an app directory and extracts import statements
 */
export function extractImports(appPath: string): Set<string> {
  const imports = new Set<string>();
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, .expo, etc.
        if (entry.name === "node_modules" || entry.name === ".expo" || entry.name === ".git") {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            
            // Match import statements: import X from 'package'
            const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(content)) !== null) {
              const importPath = match[1];
              
              // Only track external packages (not relative imports)
              if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
                // Extract package name (handle scoped packages like @expo/vector-icons)
                const packageName = importPath.startsWith("@")
                  ? importPath.split("/").slice(0, 2).join("/")
                  : importPath.split("/")[0];
                
                imports.add(packageName);
              }
            }
          } catch (error) {
            log.warn(`Failed to read file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to scan directory ${dir}:`, error);
    }
  }
  
  scanDirectory(appPath);
  return imports;
}

/**
 * Reads package.json and returns the set of installed dependencies
 */
export function getInstalledDependencies(appPath: string): Set<string> {
  const installed = new Set<string>();
  
  try {
    const packageJsonPath = path.join(appPath, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    
    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        installed.add(dep);
      }
    }
    
    if (packageJson.devDependencies) {
      for (const dep of Object.keys(packageJson.devDependencies)) {
        installed.add(dep);
      }
    }
  } catch (error) {
    log.error(`Failed to read package.json at ${appPath}:`, error);
  }
  
  return installed;
}

/**
 * Compares imports in code vs installed dependencies and returns missing packages
 */
export function findMissingDependencies(appPath: string): string[] {
  const importsInCode = extractImports(appPath);
  const installedPackages = getInstalledDependencies(appPath);
  
  const missing: string[] = [];
  
  // Built-in Node.js modules and React Native built-ins to ignore
  const builtins = new Set([
    // React/React Native core
    "react",
    "react-native",
    "react-dom",
    
    // Expo core (pre-installed in template)
    "expo",
    "expo-router",
    "expo-status-bar",
    "expo-linking",
    "expo-splash-screen",
    "@expo/vector-icons",
    
    // React Native essentials
    "react-native-safe-area-context",
    "react-native-screens",
    "react-native-web",
    
    // Node.js built-ins (shouldn't be used in RN, but ignore to prevent false positives)
    "fs", "path", "os", "crypto", "http", "https", "net", "util",
    "stream", "events", "buffer", "process", "child_process",
  ]);
  
  for (const importedPackage of importsInCode) {
    // Skip built-ins and already installed
    if (builtins.has(importedPackage) || installedPackages.has(importedPackage)) {
      continue;
    }
    
    // This package is imported but not installed
    missing.push(importedPackage);
  }
  
  log.info(`📦 Found ${missing.length} missing dependencies:`, missing);
  return missing;
}




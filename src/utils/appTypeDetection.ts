import type { App } from "@/ipc/ipc_types";

export type AppCategory = 'web' | 'mobile' | 'flutter' | 'capacitor' | 'game' | 'blockly' | 'arcade' | 'microbit' | 'minecraft';

// Store for external app type data (will be populated by the AppList component)
const appTypeCache = new Map<number, AppCategory>();

/**
 * Sets the app category from external detection (e.g., IPC handlers)
 */
export function setAppCategory(appId: number, category: AppCategory): void {
  appTypeCache.set(appId, category);
}

/**
 * Detects the category of an app based on its database appType field and files
 */
export function detectAppCategory(app: App): AppCategory {
  // First check if we have the appType from database (most reliable)
  if (app.appType) {
    // Map database appType to AppCategory
    if (app.appType === 'mobile') {
      return 'mobile';
    } else if (app.appType === 'web') {
      return 'web';
    } else if (app.appType === 'godot') {
      return 'game';
    } else if (app.appType === 'blockly') {
      return 'blockly';
    } else if (app.appType === 'arcade') {
      return 'arcade';
    } else if (app.appType === 'microbit') {
      return 'microbit';
    } else if (app.appType === 'minecraft') {
      return 'minecraft';
    }
  }

  // Second, check if we have cached data from external detection
  const cachedCategory = appTypeCache.get(app.id);
  if (cachedCategory) {
    return cachedCategory;
  }

  // If no files available, default to web for now
  if (!app.files || app.files.length === 0) {
    return 'web';
  }

  // Check for Expo/React Native mobile app
  const hasExpoConfig = app.files.some(file =>
    file === 'app.json' || file === 'expo.json'
  );

  const hasExpoRouterStructure = app.files.some(file =>
    file.startsWith('app/') && (file.endsWith('.tsx') || file.endsWith('.ts'))
  );

  const hasTraditionalWebFiles = app.files.some(file =>
    file === 'index.html' || file === 'vite.config.js' || file === 'vite.config.ts'
  );

  // If it has app.json but no traditional web files, it's likely Expo
  // OR if it has both app.json and app/ structure, it's definitely Expo
  if (hasExpoConfig && (!hasTraditionalWebFiles || hasExpoRouterStructure)) {
    return 'mobile';
  }

  // Check for Capacitor app (has capacitor.config.js/ts and android/ios folders)
  const hasCapacitorConfig = app.files.some(file =>
    file === 'capacitor.config.js' || file === 'capacitor.config.ts' || file === 'capacitor.config.json'
  );

  const hasCapacitorFolders = app.files.some(file =>
    file.startsWith('android/') || file.startsWith('ios/')
  );

  if (hasCapacitorConfig && hasCapacitorFolders) {
    return 'capacitor';
  }

  // Check for Flutter app (has pubspec.yaml and lib/main.dart)
  const hasFlutterConfig = app.files.some(file =>
    file === 'pubspec.yaml'
  );

  const hasFlutterMain = app.files.some(file =>
    file === 'lib/main.dart'
  );

  if (hasFlutterConfig && hasFlutterMain) {
    return 'flutter';
  }

  // Check for Godot game (has godot-project/project.godot or project.godot)
  const hasGodotProject = app.files.some(file =>
    file === 'project.godot' || file === 'godot-project/project.godot' || file.endsWith('/project.godot')
  );

  if (hasGodotProject) {
    return 'game';
  }

  // Default to web app
  return 'web';
}

/**
 * Gets the display label for an app category
 */
export function getCategoryLabel(category: AppCategory): string {
  switch (category) {
    case 'web':
      return 'Web Apps';
    case 'mobile':
      return 'Mobile Apps';
    case 'flutter':
      return 'Flutter Apps';
    case 'capacitor':
      return 'Capacitor Apps';
    case 'game':
      return 'Godot Games';
    case 'blockly':
      return 'Blocklaa Apps';
    case 'arcade':
      return 'Arcade Games';
    case 'microbit':
      return 'micro:bit Projects';
    case 'minecraft':
      return 'Minecraft Mods';
    default:
      return 'Apps';
  }
}

/**
 * Gets the icon for an app category
 */
export function getCategoryIcon(category: AppCategory): string {
  switch (category) {
    case 'web':
      return '🌐';
    case 'mobile':
      return '📱';
    case 'flutter':
      return '🎯';
    case 'capacitor':
      return '⚡';
    case 'game':
      return '🎮';
    case 'blockly':
      return '🧩';
    case 'arcade':
      return '🕹️';
    case 'microbit':
      return '📟';
    case 'minecraft':
      return '🧊';
    default:
      return '📁';
  }
}

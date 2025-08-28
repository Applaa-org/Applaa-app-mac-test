/**
 * Centralized Expo Dependencies Configuration
 * This file ensures synchronization between the Expo system prompt and createFromTemplate.ts
 */

export const EXPO_DEPENDENCIES = {
  // Essential packages that are ALWAYS pre-installed in every Expo app
  ESSENTIAL: [
    "react-native-svg",           // Required for lucide-react-native and most icon libraries
    "lucide-react-native",        // Primary icon library for Applaa apps
    "@expo/vector-icons",         // Expo's built-in icon library
    "expo-linear-gradient",       // For gradient backgrounds and effects
    "react-native-safe-area-context", // Safe area handling
    "react-native-screens",       // Navigation screen optimization
  ],

  // Common packages that are frequently used and should be mentioned as "safe"
  COMMON: [
    "expo-font",                  // Custom fonts
    "expo-status-bar",           // Status bar styling
    "react-native-gesture-handler", // Gesture handling
    "expo-haptics",              // Haptic feedback
    "expo-blur",                 // Blur effects
    "expo-constants",            // App constants
    "expo-device",               // Device information
  ],

  // Packages that should NOT be auto-installed but are safe to use
  OPTIONAL: [
    "expo-camera",               // Camera functionality
    "expo-image-picker",         // Image selection
    "expo-location",             // GPS location
    "expo-notifications",        // Push notifications
    "expo-secure-store",         // Secure storage
    "expo-file-system",          // File operations
    "expo-av",                   // Audio/Video
    "expo-web-browser",          // In-app browser
  ],

  // Packages to avoid (mentioned in system prompt)
  FORBIDDEN: [
    "expo-sqlite",               // Heavy and complex
    "react-native-reanimated",   // Can cause compatibility issues
    "react-native-maps",         // Heavy native dependency
  ]
} as const;

/**
 * Get the complete list of packages that should be pre-installed
 */
export function getEssentialPackages(): string[] {
  return [...EXPO_DEPENDENCIES.ESSENTIAL];
}

/**
 * Get the complete list of "safe" packages for the system prompt
 */
export function getSafePackages(): string[] {
  return [...EXPO_DEPENDENCIES.ESSENTIAL, ...EXPO_DEPENDENCIES.COMMON];
}

/**
 * Get packages formatted for system prompt documentation
 */
export function getSafePackagesString(): string {
  return getSafePackages().join(" ");
}

/**
 * Check if a package is in the forbidden list
 */
export function isForbiddenPackage(packageName: string): boolean {
  return EXPO_DEPENDENCIES.FORBIDDEN.includes(packageName as any);
}

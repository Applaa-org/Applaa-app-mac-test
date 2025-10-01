/**
 * 🚨 CRITICAL: Applaa Dependencies Control System
 * 
 * This file defines EXACTLY which modules the AI can use for each framework.
 * NO MODULE should be used by the AI unless it's explicitly listed here.
 * This prevents "Unable to resolve" errors and ensures consistent app creation.
 */

export const APPLAA_DEPENDENCIES = {
  // ===== WEB APPS (React/Next.js) =====
  WEB: {
    // Essential packages pre-installed in every web app
    ESSENTIAL: [
      "react",
      "react-dom",
      "lucide-react",              // Primary icon library
      "clsx",                      // Conditional CSS classes
      "tailwind-merge",            // Tailwind class merging utility
      "tailwindcss",               // CSS framework
      "@types/react",              // TypeScript support
      "@types/react-dom",
      // Radix UI dependencies for shadcn/ui components (Essential UI primitives)
      "@radix-ui/react-label",           // Label primitive for forms
      "@radix-ui/react-slot",            // Slot primitive for composition
      "@radix-ui/react-select",          // Select primitive for dropdowns
      "@radix-ui/react-dialog",          // Dialog primitive for modals
      "@radix-ui/react-popover",         // Popover primitive
      "@radix-ui/react-tooltip",         // Tooltip primitive
      "@radix-ui/react-dropdown-menu",   // Dropdown menu primitive
      "@radix-ui/react-checkbox",        // Checkbox primitive
      "@radix-ui/react-radio-group",     // Radio group primitive
      "@radix-ui/react-switch",          // Switch/toggle primitive
      "@radix-ui/react-tabs",            // Tabs primitive
      "@radix-ui/react-accordion",       // Accordion primitive
      "@radix-ui/react-alert-dialog",    // Alert dialog primitive
      "@radix-ui/react-avatar",          // Avatar primitive
      "@radix-ui/react-button",          // Button primitives
      "@radix-ui/react-card",            // Card primitives
      "@radix-ui/react-input",           // Input primitives
    ],
    
    // Common packages that are safe to use (will be auto-installed)
    COMMON: [
      "framer-motion",             // Animations
      "react-hook-form",           // Form handling
      "zod",                       // Schema validation
      "date-fns",                  // Date utilities
      "recharts",                  // Charts and graphs
      "react-hot-toast",           // Toast notifications
      "react-router-dom",          // Client-side routing (legacy)
      "@tanstack/react-router",    // Modern type-safe routing
      "@tanstack/react-query",     // Data fetching and caching
      "axios",                     // HTTP client
      // Additional Radix UI components (used less frequently)
      "@radix-ui/react-context-menu",    // Context menu primitive
      "@radix-ui/react-hover-card",      // Hover card primitive
      "@radix-ui/react-menubar",         // Menubar primitive
      "@radix-ui/react-navigation-menu", // Navigation menu primitive
      "@radix-ui/react-progress",        // Progress bar primitive
      "@radix-ui/react-scroll-area",     // Scroll area primitive
      "@radix-ui/react-separator",       // Separator primitive
      "@radix-ui/react-slider",          // Slider primitive
      "@radix-ui/react-toggle",          // Toggle primitive
      "@radix-ui/react-toggle-group",    // Toggle group primitive
      "@radix-ui/react-collapsible",     // Collapsible primitive
      "@radix-ui/react-aspect-ratio",    // Aspect ratio primitive
    ],
    
    // Advanced packages (only use when specifically needed)
    OPTIONAL: [
      "react-query",               // Data fetching
      "zustand",                   // State management
      "react-dropzone",            // File uploads
      "react-markdown",            // Markdown rendering
      "remark-gfm",                // GitHub Flavored Markdown for react-markdown
      "react-syntax-highlighter",  // Code highlighting
      "rehype-highlight",          // Syntax highlighting for rehype
      "highlight.js",              // Syntax highlighting library
      "sonner",                    // Toast notifications (modern alternative)
    ],
    
    // NEVER use these packages
    FORBIDDEN: [
      "jquery",                    // Outdated, conflicts with React
      "bootstrap",                 // Use Tailwind instead
      "material-ui",               // Heavy, use Tailwind
      "antd",                      // Heavy, use Tailwind
      "react-native",              // Wrong framework
    ]
  },

  // ===== EXPO APPS (React Native) =====
  EXPO: {
    // Essential packages pre-installed in every Expo app
    ESSENTIAL: [
      "react",
      "react-dom",                 // Required for web bundling
      "react-native",
      "expo",
      "expo-router",               // File-based navigation
      "react-native-svg",          // Required for icons
      "lucide-react-native",       // Primary icon library
      "@expo/vector-icons",        // Expo's built-in icons
      "expo-linear-gradient",      // Gradient backgrounds
      "react-native-safe-area-context", // Safe area handling
      "react-native-screens",      // Screen optimization
    ],
    
    // Common packages that are safe to use (will be auto-installed)
    COMMON: [
      "expo-font",                 // Custom fonts
      "expo-status-bar",           // Status bar styling
      "react-native-gesture-handler", // Gesture handling
      "expo-haptics",              // Haptic feedback
      "expo-blur",                 // Blur effects (glassmorphism)
      "expo-constants",            // App constants
      "expo-device",               // Device information
      "expo-linking",              // Deep linking
      "expo-splash-screen",        // Splash screen control
      "@react-native-async-storage/async-storage", // Data persistence (CRITICAL)
      "expo-system-ui",            // System UI control
      "expo-image",                // Optimized image component
    ],
    
    // Advanced packages (only use when specifically needed)
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
    
    // NEVER use these packages
    FORBIDDEN: [
      "expo-sqlite",               // Heavy and complex
      "react-native-reanimated",   // Can cause compatibility issues
      "react-native-maps",         // Heavy native dependency
      "react-native-vector-icons", // Use @expo/vector-icons instead
      "react-navigation",          // Use expo-router instead
      "redux",                     // Too complex for MVP apps
    ]
  },

  // ===== FLUTTER APPS =====
  FLUTTER: {
    // Essential packages pre-installed in every Flutter app
    ESSENTIAL: [
      "flutter/material.dart",     // Material Design
      "flutter/cupertino.dart",    // iOS-style widgets
    ],
    
    // Common packages that are safe to use
    COMMON: [
      "http",                      // HTTP requests
      "shared_preferences",        // Local storage
      "url_launcher",              // Open URLs
      "image_picker",              // Image selection
    ],
    
    OPTIONAL: [],
    FORBIDDEN: []
  }
} as const;

/**
 * Get essential packages for a specific framework
 */
export function getEssentialPackages(framework: 'web' | 'expo' | 'flutter'): string[] {
  switch (framework) {
    case 'web':
      return [...APPLAA_DEPENDENCIES.WEB.ESSENTIAL];
    case 'expo':
      return [...APPLAA_DEPENDENCIES.EXPO.ESSENTIAL];
    case 'flutter':
      return [...APPLAA_DEPENDENCIES.FLUTTER.ESSENTIAL];
    default:
      return [];
  }
}

/**
 * Get all safe packages (essential + common) for a specific framework
 */
export function getSafePackages(framework: 'web' | 'expo' | 'flutter'): string[] {
  switch (framework) {
    case 'web':
      return [...APPLAA_DEPENDENCIES.WEB.ESSENTIAL, ...APPLAA_DEPENDENCIES.WEB.COMMON];
    case 'expo':
      return [...APPLAA_DEPENDENCIES.EXPO.ESSENTIAL, ...APPLAA_DEPENDENCIES.EXPO.COMMON];
    case 'flutter':
      return [...APPLAA_DEPENDENCIES.FLUTTER.ESSENTIAL, ...APPLAA_DEPENDENCIES.FLUTTER.COMMON];
    default:
      return [];
  }
}

/**
 * Get all allowed packages (essential + common + optional) for a specific framework
 */
export function getAllowedPackages(framework: 'web' | 'expo' | 'flutter'): string[] {
  switch (framework) {
    case 'web':
      return [
        ...APPLAA_DEPENDENCIES.WEB.ESSENTIAL,
        ...APPLAA_DEPENDENCIES.WEB.COMMON,
        ...APPLAA_DEPENDENCIES.WEB.OPTIONAL
      ];
    case 'expo':
      return [
        ...APPLAA_DEPENDENCIES.EXPO.ESSENTIAL,
        ...APPLAA_DEPENDENCIES.EXPO.COMMON,
        ...APPLAA_DEPENDENCIES.EXPO.OPTIONAL
      ];
    case 'flutter':
      return [
        ...APPLAA_DEPENDENCIES.FLUTTER.ESSENTIAL,
        ...APPLAA_DEPENDENCIES.FLUTTER.COMMON,
        ...APPLAA_DEPENDENCIES.FLUTTER.OPTIONAL
      ];
    default:
      return [];
  }
}

/**
 * Check if a package is forbidden for a specific framework
 */
export function isForbiddenPackage(packageName: string, framework: 'web' | 'expo' | 'flutter'): boolean {
  switch (framework) {
    case 'web':
      return APPLAA_DEPENDENCIES.WEB.FORBIDDEN.includes(packageName as any);
    case 'expo':
      return APPLAA_DEPENDENCIES.EXPO.FORBIDDEN.includes(packageName as any);
    case 'flutter':
      return APPLAA_DEPENDENCIES.FLUTTER.FORBIDDEN.includes(packageName as any);
    default:
      return false;
  }
}

/**
 * Check if a package is allowed for a specific framework
 */
export function isAllowedPackage(packageName: string, framework: 'web' | 'expo' | 'flutter'): boolean {
  const allowedPackages = getAllowedPackages(framework);
  return allowedPackages.includes(packageName);
}

/**
 * Get packages formatted for system prompt documentation
 */
export function getPackagesForPrompt(framework: 'web' | 'expo' | 'flutter'): {
  essential: string[];
  common: string[];
  optional: string[];
  forbidden: string[];
} {
  switch (framework) {
    case 'web':
      return {
        essential: APPLAA_DEPENDENCIES.WEB.ESSENTIAL,
        common: APPLAA_DEPENDENCIES.WEB.COMMON,
        optional: APPLAA_DEPENDENCIES.WEB.OPTIONAL,
        forbidden: APPLAA_DEPENDENCIES.WEB.FORBIDDEN,
      };
    case 'expo':
      return {
        essential: APPLAA_DEPENDENCIES.EXPO.ESSENTIAL,
        common: APPLAA_DEPENDENCIES.EXPO.COMMON,
        optional: APPLAA_DEPENDENCIES.EXPO.OPTIONAL,
        forbidden: APPLAA_DEPENDENCIES.EXPO.FORBIDDEN,
      };
    case 'flutter':
      return {
        essential: APPLAA_DEPENDENCIES.FLUTTER.ESSENTIAL,
        common: APPLAA_DEPENDENCIES.FLUTTER.COMMON,
        optional: APPLAA_DEPENDENCIES.FLUTTER.OPTIONAL,
        forbidden: APPLAA_DEPENDENCIES.FLUTTER.FORBIDDEN,
      };
    default:
      return { essential: [], common: [], optional: [], forbidden: [] };
  }
}

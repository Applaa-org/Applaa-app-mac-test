/**
 * Mobile App Templates Registry
 * 
 * This module contains the complete registry of available templates for mobile app generation,
 * supporting both Expo and Flutter frameworks with comprehensive metadata and configuration.
 */

import { TemplateOption, Framework, TemplateCategory, Platform } from '@/lib/mobile/types';

/**
 * Flutter Templates
 * Comprehensive collection of Flutter app templates covering various use cases
 */
export const FLUTTER_TEMPLATES: TemplateOption[] = [
  // Basic Templates
  {
    id: "flutter-minimal",
    title: "Minimal Flutter App",
    description: "Clean, minimal Flutter app with basic navigation structure",
    framework: "flutter",
    category: "basic",
    tags: ["minimal", "starter", "beginner"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter"],
    complexity: 1,
    setupTime: 5,
    defaults: {
      stateMgmt: "none",
      navigation: "stack",
      backend: "none",
      auth: "none",
      features: [],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-material3",
    title: "Material Design 3 App",
    description: "Modern Material Design 3 application with adaptive theming",
    framework: "flutter",
    category: "basic",
    tags: ["material3", "material-you", "theming", "adaptive"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "material"],
    complexity: 2,
    setupTime: 10,
    preview_image: "/templates/flutter-material3.png",
    defaults: {
      stateMgmt: "none",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["responsive", "dark-mode"],
      platforms: ["android", "ios"],
      themeConfig: {
        useMaterial3: true,
        darkMode: true
      }
    }
  },

  {
    id: "flutter-cupertino",
    title: "Cupertino (iOS Style) App",
    description: "Native iOS-style app using Cupertino design language",
    framework: "flutter",
    category: "basic",
    tags: ["cupertino", "ios", "native-feel"],
    platforms: ["ios", "android"],
    dependencies: ["flutter", "cupertino_icons"],
    complexity: 2,
    setupTime: 10,
    preview_image: "/templates/flutter-cupertino.png",
    defaults: {
      stateMgmt: "none",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["responsive"],
      platforms: ["ios"],
      themeConfig: {
        useCupertino: true
      }
    }
  },

  {
    id: "flutter-responsive",
    title: "Responsive Multi-Platform App",
    description: "Adaptive UI that works seamlessly across mobile, tablet, and desktop",
    framework: "flutter",
    category: "basic",
    tags: ["responsive", "adaptive", "multi-platform", "desktop"],
    platforms: ["android", "ios", "web", "desktop"],
    dependencies: ["flutter", "responsive_framework"],
    complexity: 3,
    setupTime: 15,
    defaults: {
      stateMgmt: "provider",
      navigation: "drawer",
      backend: "none",
      auth: "none",
      features: ["responsive", "desktop-support"],
      platforms: ["android", "ios", "web", "desktop"]
    }
  },

  // Navigation Templates
  {
    id: "flutter-navigation-tabs",
    title: "Tab Navigation App",
    description: "Bottom tab navigation with multiple screens and routing",
    framework: "flutter",
    category: "navigation",
    tags: ["tabs", "navigation", "routing", "bottom-nav"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "go_router"],
    complexity: 2,
    setupTime: 12,
    defaults: {
      stateMgmt: "provider",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["routing"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-navigation-drawer",
    title: "Drawer Navigation App",
    description: "Side drawer navigation with hierarchical menu structure",
    framework: "flutter",
    category: "navigation",
    tags: ["drawer", "navigation", "menu", "sidebar"],
    platforms: ["android", "ios", "web", "desktop"],
    dependencies: ["flutter", "go_router"],
    complexity: 3,
    setupTime: 15,
    defaults: {
      stateMgmt: "riverpod",
      navigation: "drawer",
      backend: "none",
      auth: "none",
      features: ["routing", "responsive"],
      platforms: ["android", "ios", "web"]
    }
  },

  // State Management Templates
  {
    id: "flutter-provider-app",
    title: "Provider State Management",
    description: "App architecture using Provider for state management",
    framework: "flutter",
    category: "state",
    tags: ["provider", "state-management", "architecture"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "provider"],
    complexity: 3,
    setupTime: 20,
    defaults: {
      stateMgmt: "provider",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["state-management"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-riverpod-app",
    title: "Riverpod State Management",
    description: "Modern state management using Riverpod with code generation",
    framework: "flutter",
    category: "state",
    tags: ["riverpod", "state-management", "code-generation", "modern"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "flutter_riverpod", "riverpod_annotation"],
    complexity: 4,
    setupTime: 25,
    defaults: {
      stateMgmt: "riverpod",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["state-management", "code-generation"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-bloc-app",
    title: "BLoC State Management",
    description: "Reactive state management using BLoC pattern",
    framework: "flutter",
    category: "state",
    tags: ["bloc", "state-management", "reactive", "pattern"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "flutter_bloc"],
    complexity: 4,
    setupTime: 30,
    defaults: {
      stateMgmt: "bloc",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["state-management", "reactive"],
      platforms: ["android", "ios"]
    }
  },

  // Backend Integration Templates
  {
    id: "flutter-rest-api",
    title: "REST API Integration",
    description: "App with REST API integration, HTTP client, and data modeling",
    framework: "flutter",
    category: "backend",
    tags: ["rest", "api", "http", "networking", "json"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "http", "json_annotation", "provider"],
    complexity: 3,
    setupTime: 25,
    defaults: {
      stateMgmt: "provider",
      navigation: "tabs",
      backend: "rest",
      auth: "none",
      features: ["networking", "json-serialization"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-graphql-app",
    title: "GraphQL Integration",
    description: "Modern GraphQL client with queries, mutations, and subscriptions",
    framework: "flutter",
    category: "backend",
    tags: ["graphql", "api", "real-time", "subscriptions"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "graphql_flutter", "riverpod"],
    complexity: 4,
    setupTime: 35,
    defaults: {
      stateMgmt: "riverpod",
      navigation: "tabs",
      backend: "graphql",
      auth: "none",
      features: ["real-time", "caching"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-firebase-app",
    title: "Firebase Backend",
    description: "Complete Firebase integration with Firestore, Auth, and Cloud Functions",
    framework: "flutter",
    category: "backend",
    tags: ["firebase", "firestore", "cloud", "real-time", "backend-as-service"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "firebase_core", "cloud_firestore", "firebase_auth"],
    complexity: 4,
    setupTime: 40,
    requirements: ["Firebase project setup"],
    defaults: {
      stateMgmt: "riverpod",
      navigation: "tabs",
      backend: "firebase",
      auth: "email",
      features: ["real-time", "offline-support"],
      platforms: ["android", "ios"]
    }
  },

  // Authentication Templates
  {
    id: "flutter-auth-email",
    title: "Email Authentication",
    description: "Complete email/password authentication with user management",
    framework: "flutter",
    category: "auth",
    tags: ["authentication", "email", "password", "user-management"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "firebase_auth", "provider"],
    complexity: 3,
    setupTime: 30,
    defaults: {
      stateMgmt: "provider",
      navigation: "tabs",
      backend: "firebase",
      auth: "email",
      features: ["user-management", "password-reset"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-auth-oauth",
    title: "OAuth Social Authentication",
    description: "Social login with Google, Apple, and other OAuth providers",
    framework: "flutter",
    category: "auth",
    tags: ["oauth", "social-login", "google", "apple", "authentication"],
    platforms: ["android", "ios", "web"],
    dependencies: ["flutter", "google_sign_in", "sign_in_with_apple", "firebase_auth"],
    complexity: 4,
    setupTime: 45,
    requirements: ["OAuth provider setup", "Platform-specific configuration"],
    defaults: {
      stateMgmt: "riverpod",
      navigation: "tabs",
      backend: "firebase",
      auth: "oauth",
      features: ["social-login", "profile-management"],
      platforms: ["android", "ios"]
    }
  },

  // WebView Template
  {
    id: "flutter-webview-wrapper",
    title: "WebView Mobile Wrapper",
    description: "Native mobile wrapper for web apps with pull-to-refresh, offline support, and platform-specific UI",
    framework: "flutter",
    category: "feature",
    tags: ["webview", "wrapper", "web-app", "hybrid", "pull-to-refresh", "offline", "connectivity"],
    platforms: ["android", "ios"],
    dependencies: ["flutter", "webview_flutter", "connectivity_plus", "shared_preferences"],
    complexity: 3,
    setupTime: 20,
    preview_image: "/templates/flutter-webview.png",
    defaults: {
      stateMgmt: "none",
      navigation: "drawer",
      backend: "none",
      auth: "none",
      features: [
        "webview", 
        "connectivity", 
        "pull-to-refresh", 
        "dark-mode",
        "search",
        "offline-support",
        "platform-ui"
      ],
      platforms: ["android", "ios"],
      themeConfig: {
        useMaterial3: true,
        useCupertino: true,
        darkMode: true,
        primaryColor: "#2563eb"
      }
    }
  },

  // Feature-Rich Templates
  {
    id: "flutter-ecommerce",
    title: "E-commerce App",
    description: "Complete e-commerce app with cart, payments, and product catalog",
    framework: "flutter",
    category: "feature",
    tags: ["ecommerce", "shopping", "payments", "catalog", "cart"],
    platforms: ["android", "ios"],
    dependencies: ["flutter", "riverpod", "go_router", "stripe_flutter", "cached_network_image"],
    complexity: 5,
    setupTime: 60,
    requirements: ["Payment processor setup", "Backend API"],
    defaults: {
      stateMgmt: "riverpod",
      navigation: "tabs",
      backend: "rest",
      auth: "email",
      features: ["payments", "image-caching", "search", "favorites"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "flutter-social-app",
    title: "Social Media App",
    description: "Social networking app with feeds, messaging, and user profiles",
    framework: "flutter",
    category: "feature",
    tags: ["social", "messaging", "feeds", "profiles", "real-time"],
    platforms: ["android", "ios"],
    dependencies: ["flutter", "riverpod", "firebase_core", "cloud_firestore", "firebase_messaging"],
    complexity: 5,
    setupTime: 75,
    requirements: ["Firebase project", "Push notification setup"],
    defaults: {
      stateMgmt: "riverpod",
      navigation: "tabs",
      backend: "firebase",
      auth: "oauth",
      features: ["real-time-messaging", "push-notifications", "image-upload", "feeds"],
      platforms: ["android", "ios"]
    }
  }
];

/**
 * Expo Templates
 * Collection of Expo/React Native templates for rapid mobile development
 */
export const EXPO_TEMPLATES: TemplateOption[] = [
  {
    id: "expo-basic",
    title: "Basic Expo App",
    description: "Simple Expo app with navigation and basic structure",
    framework: "expo",
    category: "basic",
    tags: ["expo", "react-native", "basic", "starter"],
    platforms: ["android", "ios", "web"],
    dependencies: ["expo", "@expo/vector-icons"],
    complexity: 1,
    setupTime: 5,
    defaults: {
      stateMgmt: "none",
      navigation: "stack",
      backend: "none",
      auth: "none",
      features: [],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "expo-tabs",
    title: "Tab Navigation Expo App",
    description: "Expo app with bottom tab navigation and multiple screens",
    framework: "expo",
    category: "navigation",
    tags: ["expo", "tabs", "navigation", "react-navigation"],
    platforms: ["android", "ios", "web"],
    dependencies: ["expo", "@react-navigation/native", "@react-navigation/bottom-tabs"],
    complexity: 2,
    setupTime: 10,
    defaults: {
      stateMgmt: "zustand",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["navigation"],
      platforms: ["android", "ios"]
    }
  },

  {
    id: "expo-redux",
    title: "Redux State Management",
    description: "Expo app with Redux Toolkit for state management",
    framework: "expo",
    category: "state",
    tags: ["expo", "redux", "state-management", "toolkit"],
    platforms: ["android", "ios"],
    dependencies: ["expo", "@reduxjs/toolkit", "react-redux"],
    complexity: 3,
    setupTime: 20,
    defaults: {
      stateMgmt: "redux",
      navigation: "tabs",
      backend: "none",
      auth: "none",
      features: ["state-management"],
      platforms: ["android", "ios"]
    }
  }
];

/**
 * Complete template registry combining all frameworks
 */
export const ALL_TEMPLATES: TemplateOption[] = [
  ...FLUTTER_TEMPLATES,
  ...EXPO_TEMPLATES
];

/**
 * Template registry utility functions
 */

/**
 * Get a template by its ID
 */
export function getTemplateById(id: string): TemplateOption | undefined {
  return ALL_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all templates for a specific framework
 */
export function getTemplatesByFramework(framework: Framework): TemplateOption[] {
  return ALL_TEMPLATES.filter(template => template.framework === framework);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateOption[] {
  return ALL_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get templates by supported platforms
 */
export function getTemplatesByPlatform(platform: Platform): TemplateOption[] {
  return ALL_TEMPLATES.filter(template => template.platforms.includes(platform));
}

/**
 * Search templates by text query
 */
export function searchTemplates(query: string): TemplateOption[] {
  const searchTerm = query.trim().toLowerCase();
  
  // Return empty array for empty search terms
  if (!searchTerm) {
    return [];
  }
  
  return ALL_TEMPLATES.filter(template => {
    return (
      template.title.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  });
}

/**
 * Filter templates by complexity level
 */
export function getTemplatesByComplexity(maxComplexity: number): TemplateOption[] {
  return ALL_TEMPLATES.filter(template => 
    (template.complexity || 1) <= maxComplexity
  );
}

/**
 * Get featured templates (high quality, popular ones)
 */
export function getFeaturedTemplates(): TemplateOption[] {
  const featuredIds = [
    "flutter-material3",
    "flutter-cupertino", 
    "flutter-responsive",
    "flutter-riverpod-app",
    "flutter-firebase-app",
    "expo-tabs"
  ];
  
  return featuredIds.map(id => getTemplateById(id)).filter(Boolean) as TemplateOption[];
}

/**
 * Get beginner-friendly templates
 */
export function getBeginnerTemplates(): TemplateOption[] {
  return ALL_TEMPLATES.filter(template => 
    (template.complexity || 1) <= 2 && 
    (template.setupTime || 0) <= 15
  );
}

/**
 * Get templates suitable for a specific use case
 */
export function getTemplatesForUseCase(useCase: string): TemplateOption[] {
  const useCaseLower = useCase.toLowerCase();
  
  // Map common use cases to relevant templates
  const useCaseMapping: Record<string, string[]> = {
    "todo": ["flutter-minimal", "flutter-material3", "expo-basic"],
    "ecommerce": ["flutter-ecommerce", "flutter-rest-api"],
    "social": ["flutter-social-app", "flutter-firebase-app"],
    "business": ["flutter-responsive", "flutter-drawer-navigation"],
    "game": ["flutter-minimal", "expo-basic"],
    "productivity": ["flutter-material3", "flutter-riverpod-app"],
    "fitness": ["flutter-material3", "flutter-firebase-app"],
    "finance": ["flutter-material3", "flutter-auth-email"],
    "education": ["flutter-responsive", "flutter-firebase-app"],
    "news": ["flutter-rest-api", "flutter-material3"]
  };

  // Find matching use case
  for (const [caseKey, templateIds] of Object.entries(useCaseMapping)) {
    if (useCaseLower.includes(caseKey)) {
      return templateIds.map(id => getTemplateById(id)).filter(Boolean) as TemplateOption[];
    }
  }

  // Fallback to searching in tags and descriptions
  return searchTemplates(useCase);
}

/**
 * Validate template registry integrity
 */
export function validateTemplateRegistry(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const template of ALL_TEMPLATES) {
    // Check for duplicate IDs
    if (ids.has(template.id)) {
      issues.push(`Duplicate template ID: ${template.id}`);
    }
    ids.add(template.id);

    // Validate required fields
    if (!template.title) {
      issues.push(`Template ${template.id} missing title`);
    }
    if (!template.description) {
      issues.push(`Template ${template.id} missing description`);
    }
    if (template.platforms.length === 0) {
      issues.push(`Template ${template.id} has no supported platforms`);
    }
    if (template.dependencies.length === 0) {
      issues.push(`Template ${template.id} has no dependencies`);
    }

    // Validate complexity range
    if (template.complexity && (template.complexity < 1 || template.complexity > 5)) {
      issues.push(`Template ${template.id} has invalid complexity: ${template.complexity}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get template statistics
 */
export function getTemplateStats() {
  const stats = {
    total: ALL_TEMPLATES.length,
    byFramework: {} as Record<Framework, number>,
    byCategory: {} as Record<TemplateCategory, number>,
    byComplexity: {} as Record<number, number>,
    avgSetupTime: 0,
    avgComplexity: 0
  };

  let totalSetupTime = 0;
  let totalComplexity = 0;
  let setupTimeCount = 0;
  let complexityCount = 0;

  for (const template of ALL_TEMPLATES) {
    // Count by framework
    stats.byFramework[template.framework] = (stats.byFramework[template.framework] || 0) + 1;
    
    // Count by category
    stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
    
    // Count by complexity
    if (template.complexity) {
      stats.byComplexity[template.complexity] = (stats.byComplexity[template.complexity] || 0) + 1;
      totalComplexity += template.complexity;
      complexityCount++;
    }
    
    // Calculate average setup time
    if (template.setupTime) {
      totalSetupTime += template.setupTime;
      setupTimeCount++;
    }
  }

  stats.avgSetupTime = setupTimeCount > 0 ? Math.round(totalSetupTime / setupTimeCount) : 0;
  stats.avgComplexity = complexityCount > 0 ? Math.round((totalComplexity / complexityCount) * 10) / 10 : 0;

  return stats;
}

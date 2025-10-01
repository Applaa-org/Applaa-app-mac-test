/**
 * Dynamic Color System for Applaa
 * Replaces hardcoded purple/pink colors with app-type-specific colors
 */

export interface AppColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
}

export const APP_COLOR_SCHEMES: Record<string, AppColorScheme> = {
  // Health & Medical Apps
  health: {
    primary: "blue-500",
    secondary: "green-500", 
    accent: "blue-400",
    primaryHex: "#3B82F6",
    secondaryHex: "#10B981",
    accentHex: "#60A5FA"
  },
  
  // Recipe & Food Apps
  food: {
    primary: "orange-500",
    secondary: "red-500",
    accent: "orange-400", 
    primaryHex: "#F97316",
    secondaryHex: "#EF4444",
    accentHex: "#FB923C"
  },
  
  // Astrology & Mystical Apps
  astrology: {
    primary: "purple-500",
    secondary: "purple-600",
    accent: "amber-400",
    primaryHex: "#8B5CF6",
    secondaryHex: "#7C3AED", 
    accentHex: "#FBBF24"
  },
  
  // Fitness & Sports Apps
  fitness: {
    primary: "red-500",
    secondary: "orange-500",
    accent: "yellow-400",
    primaryHex: "#EF4444",
    secondaryHex: "#F97316",
    accentHex: "#FACC15"
  },
  
  // Gaming & Entertainment Apps
  gaming: {
    primary: "blue-500",
    secondary: "cyan-500",
    accent: "green-400",
    primaryHex: "#3B82F6",
    secondaryHex: "#06B6D4",
    accentHex: "#4ADE80"
  },
  
  // Music & Creative Apps
  music: {
    primary: "purple-500",
    secondary: "pink-500", 
    accent: "red-500",
    primaryHex: "#8B5CF6",
    secondaryHex: "#EC4899",
    accentHex: "#EF4444"
  },
  
  // Business & Finance Apps
  business: {
    primary: "blue-600",
    secondary: "blue-500",
    accent: "green-500",
    primaryHex: "#2563EB",
    secondaryHex: "#3B82F6",
    accentHex: "#10B981"
  },
  
  // Shopping Apps
  shopping: {
    primary: "purple-600",
    secondary: "purple-500",
    accent: "gold-400",
    primaryHex: "#7C3AED",
    secondaryHex: "#8B5CF6", 
    accentHex: "#FBBF24"
  },
  
  // Default fallback
  default: {
    primary: "blue-500",
    secondary: "blue-600",
    accent: "blue-400",
    primaryHex: "#3B82F6",
    secondaryHex: "#2563EB",
    accentHex: "#60A5FA"
  }
};

/**
 * Detect app type from app name, description, or content
 */
export const detectAppType = (appName?: string, description?: string, content?: string): string => {
  const text = `${appName || ''} ${description || ''} ${content || ''}`.toLowerCase();
  
  // Health & Medical keywords
  if (text.includes('health') || text.includes('medical') || text.includes('doctor') || 
      text.includes('hospital') || text.includes('wellness') || text.includes('fitness') ||
      text.includes('workout') || text.includes('exercise')) {
    return text.includes('fitness') || text.includes('workout') || text.includes('exercise') ? 'fitness' : 'health';
  }
  
  // Food & Recipe keywords
  if (text.includes('food') || text.includes('recipe') || text.includes('cooking') || 
      text.includes('restaurant') || text.includes('meal') || text.includes('chef')) {
    return 'food';
  }
  
  // Astrology & Mystical keywords
  if (text.includes('astrology') || text.includes('horoscope') || text.includes('zodiac') ||
      text.includes('mystical') || text.includes('spiritual') || text.includes('tarot')) {
    return 'astrology';
  }
  
  // Gaming keywords
  if (text.includes('game') || text.includes('gaming') || text.includes('entertainment') ||
      text.includes('fun') || text.includes('play')) {
    return 'gaming';
  }
  
  // Music keywords
  if (text.includes('music') || text.includes('song') || text.includes('audio') ||
      text.includes('creative') || text.includes('art') || text.includes('design')) {
    return 'music';
  }
  
  // Business keywords
  if (text.includes('business') || text.includes('finance') || text.includes('money') ||
      text.includes('corporate') || text.includes('professional') || text.includes('office')) {
    return 'business';
  }
  
  // Shopping keywords
  if (text.includes('shop') || text.includes('store') || text.includes('buy') ||
      text.includes('ecommerce') || text.includes('product') || text.includes('cart')) {
    return 'shopping';
  }
  
  return 'default';
};

/**
 * Get color scheme for an app
 */
export const getAppColorScheme = (appName?: string, description?: string, content?: string): AppColorScheme => {
  const appType = detectAppType(appName, description, content);
  return APP_COLOR_SCHEMES[appType] || APP_COLOR_SCHEMES.default;
};

/**
 * Replace color placeholders in system prompt with actual colors
 */
export const replaceColorPlaceholders = (
  systemPrompt: string, 
  appName?: string, 
  description?: string, 
  content?: string
): string => {
  const colorScheme = getAppColorScheme(appName, description, content);
  
  return systemPrompt
    .replace(/\[APP_COLOR_PRIMARY\]/g, colorScheme.primary)
    .replace(/\[APP_COLOR_SECONDARY\]/g, colorScheme.secondary)
    .replace(/\[APP_COLOR_ACCENT\]/g, colorScheme.accent);
};

/**
 * Get Tailwind color classes for an app type
 */
export const getAppTailwindColors = (appType: string) => {
  const scheme = APP_COLOR_SCHEMES[appType] || APP_COLOR_SCHEMES.default;
  return {
    primary: scheme.primary,
    secondary: scheme.secondary,
    accent: scheme.accent,
    primaryHex: scheme.primaryHex,
    secondaryHex: scheme.secondaryHex,
    accentHex: scheme.accentHex
  };
};

/**
 * Generate gradient classes for different app types
 */
export const getAppGradients = (appType: string) => {
  const colors = getAppTailwindColors(appType);
  
  return {
    primary: `bg-gradient-to-r from-${colors.primary} to-${colors.secondary}`,
    secondary: `bg-gradient-to-br from-${colors.primary} via-${colors.secondary} to-${colors.accent}`,
    accent: `bg-gradient-to-br from-${colors.accent} to-${colors.primary}`,
    hero: `bg-gradient-to-br from-${colors.primary}-50 via-${colors.secondary}-50 to-${colors.accent}-100`
  };
};


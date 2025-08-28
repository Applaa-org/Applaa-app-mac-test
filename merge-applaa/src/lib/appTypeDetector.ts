import { AppType } from "@/components/AppTypeSelector";

// Keywords that indicate mobile app intent
const MOBILE_KEYWORDS = [
  'mobile', 'app', 'phone', 'android', 'ios', 'iphone', 'tablet', 'ipad',
  'expo', 'react native', 'native', 'cross-platform', 'touch', 'swipe',
  'notification', 'camera', 'location', 'gps', 'offline', 'download',
  'install', 'play store', 'app store', 'push notification'
];

// Keywords that indicate web app intent  
const WEB_KEYWORDS = [
  'website', 'web', 'browser', 'dashboard', 'admin', 'cms', 'blog',
  'landing page', 'portfolio', 'e-commerce', 'online', 'responsive',
  'desktop', 'chrome', 'firefox', 'safari', 'seo', 'domain'
];

/**
 * Detects the intended app type based on user input
 * Returns 'mobile' if mobile keywords are detected, otherwise defaults to 'web'
 */
export function detectAppType(userInput: string): AppType {
  const lowerInput = userInput.toLowerCase();
  
  // Check for mobile keywords
  const hasMobileKeywords = MOBILE_KEYWORDS.some(keyword => 
    lowerInput.includes(keyword)
  );
  
  // Check for web keywords
  const hasWebKeywords = WEB_KEYWORDS.some(keyword => 
    lowerInput.includes(keyword)
  );
  
  // If mobile keywords are found and no explicit web keywords, return mobile
  if (hasMobileKeywords && !hasWebKeywords) {
    return 'mobile';
  }
  
  // Default to web for everything else
  return 'web';
}

/**
 * Gets the appropriate template ID based on app type
 */
export function getTemplateForAppType(appType: AppType): string {
  switch (appType) {
    case 'mobile':
      return 'expo-base-master';
    case 'web':
    default:
      return 'react';
  }
}

/**
 * Gets the platform setting for system prompt selection
 */
export function getPlatformForAppType(appType: AppType): string {
  switch (appType) {
    case 'mobile':
      return 'expo';
    case 'web':
    default:
      return 'web';
  }
}

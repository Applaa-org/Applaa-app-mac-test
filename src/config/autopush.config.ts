// Auto Push Configuration
// This file contains the configuration for GitHub and Vercel auto push functionality
//
// NOTE: Firebase Functions are deployed and ready for future migration
// For now, keeping tokens here so the app continues to work

export const AUTOPUSH_CONFIG = {
  // GitHub Configuration
  GITHUB_TOKEN:"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",
  GITHUB_USERNAME: "Applaa-org",
  
  // Vercel Configuration
  VERCEL_TOKEN:"gZ8iD2ITkjXdjn5esIHvUZL1",
  
  // Deployment Settings
  DEPLOYMENT_TIMER_SECONDS: 60,
  DEFAULT_DEPLOY_TO_VERCEL: true,
  
  // Feature flags
  USE_FIREBASE_FUNCTIONS: false, // Set to true when migration is complete
} as const;

// Type for the configuration
export type AutopushConfig = typeof AUTOPUSH_CONFIG;

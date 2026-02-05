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

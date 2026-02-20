// Auto Push Configuration
// This file contains the configuration for GitHub and Vercel auto push functionality

export const AUTOPUSH_CONFIG = {
  // GitHub Configuration
  GITHUB_TOKEN: "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",
  GITHUB_USERNAME: "Applaa-org",
  
  // Vercel Configuration
  VERCEL_TOKEN: "gZ8iD2ITkjXdjn5esIHvUZL1",
  // Deployment Settings
  DEPLOYMENT_TIMER_SECONDS: 60,
  DEFAULT_DEPLOY_TO_VERCEL: true,
} as const;

// Type for the configuration
export type AutopushConfig = typeof AUTOPUSH_CONFIG;

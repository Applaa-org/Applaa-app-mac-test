// Auto Push Configuration
// This file contains the configuration for GitHub and Vercel auto push functionality

export const AUTOPUSH_CONFIG = {
  // GitHub Configuration
  GITHUB_TOKEN:"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",
  // GITHUB_TOKEN:"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",
  GITHUB_USERNAME: "Applaa-org",
  
  // Vercel Configuration
  // VERCEL_TOKEN: import.meta.env.VITE_VERCEL_TOKEN || "oKy0ljHgV10r1unsphU4XoaM",
  // VERCEL_TOKEN: "oKy0ljHgV10r1unsphU4XoaM",
  VERCEL_TOKEN:"gZ8iD2ITkjXdjn5esIHvUZL1",
  // Deployment Settings
  DEPLOYMENT_TIMER_SECONDS: 60,
  DEFAULT_DEPLOY_TO_VERCEL: true,
} as const;

// Type for the configuration
export type AutopushConfig = typeof AUTOPUSH_CONFIG;

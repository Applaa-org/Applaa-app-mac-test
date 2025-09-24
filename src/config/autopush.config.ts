// Auto Push Configuration
// This file contains the configuration for GitHub and Vercel auto push functionality

export const AUTOPUSH_CONFIG = {
  // GitHub Configuration
  GITHUB_TOKEN: import.meta.env.VITE_GITHUB_TOKEN || "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",
  GITHUB_USERNAME: import.meta.env.VITE_GITHUB_USERNAME || "patidarmk",
  
  // Vercel Configuration
  VERCEL_TOKEN: import.meta.env.VITE_VERCEL_TOKEN || "oKy0ljHgV10r1unsphU4XoaM",
  
  // Deployment Settings
  DEPLOYMENT_TIMER_SECONDS: 60,
  DEFAULT_DEPLOY_TO_VERCEL: true,
} as const;

// Type for the configuration
export type AutopushConfig = typeof AUTOPUSH_CONFIG;

/**
 * Credit cost constants for different operations in the application
 * These costs are deducted from user's remaining_credits when operations are performed
 */

export const CREDIT_COSTS = {
  // Chat operations
  CHAT_BASIC: 1,              // Basic chat message (Gemini Flash, Gemini Pro)
  CHAT_ADVANCED: 5,           // Advanced AI (GPT-4, Claude Sonnet)

  // Code generation
  CODE_GENERATION: 3,         // AI code generation

  // App creation
  APP_CREATION_WEB: 10,       // Create web app
  APP_CREATION_MOBILE: 15,    // Create mobile app
  APP_CREATION_GAME: 20,      // Create game
  APP_CREATION_MINECRAFT: 25, // Create Minecraft mod

  // Deployments
  DEPLOYMENT_VERCEL: 5,       // Deploy to Vercel
  DEPLOYMENT_EAS: 8,          // Deploy APK to EAS

  // Integrations
  GITHUB_SYNC: 2,             // GitHub repository sync

  // AI-powered features
  SMART_NAMING: 1,            // AI-powered app naming
  GAME_SPEC_GENERATION: 3,    // Generate game specification
  UI_DESIGN_GENERATION: 5,    // Generate UI designs
} as const;

/**
 * Monthly credit allocation based on subscription tier
 */
export const MONTHLY_CREDITS = {
  FREE: 50,
  PRO: 500,
  ULTRA: 1000,  // Default, can be customized
  BUSINESS: 2000,  // Default, can be customized
} as const;

/**
 * Credit rollover limits (Pro+ only)
 */
export const CREDIT_ROLLOVER = {
  FREE: 0,           // No rollover for free tier
  PRO: 250,          // Up to 50% of monthly allocation (500 * 0.5)
  ULTRA: 500,        // Up to 50% of monthly allocation (1000 * 0.5)
  BUSINESS: 1000,    // Up to 50% of monthly allocation (2000 * 0.5) or custom
} as const;

/**
 * Get credit cost for an operation type
 */
export function getCreditCost(operationType: keyof typeof CREDIT_COSTS): number {
  return CREDIT_COSTS[operationType];
}

/**
 * Get monthly credit allocation for a subscription tier
 */
export function getMonthlyCredits(tier: 'free' | 'pro' | 'ultra' | 'business'): number {
  switch (tier) {
    case 'free':
      return MONTHLY_CREDITS.FREE;
    case 'pro':
      return MONTHLY_CREDITS.PRO;
    case 'ultra':
      return MONTHLY_CREDITS.ULTRA;
    case 'business':
      return MONTHLY_CREDITS.BUSINESS;
    default:
      return MONTHLY_CREDITS.FREE;
  }
}

/**
 * Get credit rollover limit for a subscription tier
 */
export function getCreditRolloverLimit(tier: 'free' | 'pro' | 'ultra' | 'business'): number {
  switch (tier) {
    case 'free':
      return CREDIT_ROLLOVER.FREE;
    case 'pro':
      return CREDIT_ROLLOVER.PRO;
    case 'ultra':
      return CREDIT_ROLLOVER.ULTRA;
    case 'business':
      return CREDIT_ROLLOVER.BUSINESS;
    default:
      return CREDIT_ROLLOVER.FREE;
  }
}

/**
 * Determine if a chat message is basic or advanced based on model
 */
export function getChatCreditCost(modelName?: string, provider?: string): number {
  // Advanced AI models
  const advancedModels = ['gpt-4', 'claude-3', 'claude-sonnet'];
  const isAdvanced = modelName && advancedModels.some(advanced => 
    modelName.toLowerCase().includes(advanced.toLowerCase())
  );

  return isAdvanced ? CREDIT_COSTS.CHAT_ADVANCED : CREDIT_COSTS.CHAT_BASIC;
}

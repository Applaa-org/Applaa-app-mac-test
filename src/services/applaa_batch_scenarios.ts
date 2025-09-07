/**
 * Applaa Batch Processing Scenarios
 * These are background services that don't require real-time responses
 */

export interface ApplaaBatchScenario {
  name: string;
  description: string;
  timing: string;
  userImpact: string;
  costSavings: string;
  example: string;
}

export const APPLAA_BATCH_SCENARIOS: ApplaaBatchScenario[] = [
  {
    name: "Overnight App Generation",
    description: "Generate multiple starter apps for workshops, tutorials, or bulk requests",
    timing: "Runs overnight (6 PM - 6 AM)",
    userImpact: "No waiting - apps ready by morning",
    costSavings: "95% (batch + caching)",
    example: "Teacher requests 30 React starter apps for tomorrow's class"
  },
  {
    name: "Weekly Code Quality Analysis", 
    description: "Analyze all user projects for security, performance, and best practices",
    timing: "Runs Sunday nights during low usage",
    userImpact: "Users get detailed reports Monday morning",
    costSavings: "95% (batch + caching)",
    example: "Analyze 1000 user projects for security vulnerabilities"
  },
  {
    name: "Documentation Generation",
    description: "Auto-generate documentation for public projects",
    timing: "Monthly during maintenance window",
    userImpact: "Users get updated docs without requesting",
    costSavings: "95% (batch + caching)", 
    example: "Generate README files for 500 public repositories"
  },
  {
    name: "A/B Testing & Optimization",
    description: "Test new prompts and features on sample data",
    timing: "During development cycles",
    userImpact: "Better features and prompts for users",
    costSavings: "95% (batch + caching)",
    example: "Test new system prompt on 1000 sample requests"
  },
  {
    name: "Bulk Migration & Updates",
    description: "Update existing projects to new frameworks or patterns",
    timing: "Scheduled maintenance windows",
    userImpact: "Projects automatically updated",
    costSavings: "95% (batch + caching)",
    example: "Migrate 200 React apps to use new hooks pattern"
  },
  {
    name: "Content Moderation",
    description: "Review user-generated content and code for policy compliance",
    timing: "Continuous background processing",
    userImpact: "Safer platform, no user delays",
    costSavings: "95% (batch + caching)",
    example: "Review 10,000 code snippets for malicious content"
  }
];

/**
 * Real-time vs Batch decision matrix
 */
export const PROCESSING_DECISION_MATRIX = {
  realTime: {
    criteria: [
      "User is waiting for response",
      "Interactive coding session", 
      "Immediate feedback needed",
      "Single request processing"
    ],
    strategy: "Prompt Caching Only",
    savings: "90%",
    responseTime: "2-5 seconds"
  },
  batch: {
    criteria: [
      "Background processing acceptable",
      "Bulk operations (100+ requests)",
      "Non-urgent tasks",
      "Scheduled operations"
    ],
    strategy: "Batch + Prompt Caching",
    savings: "95%", 
    responseTime: "1-24 hours"
  }
};

/**
 * Cost comparison for 1000 users
 */
export const COST_COMPARISON_1000_USERS = {
  realTimeCoding: {
    scenario: "1000 users, 10 requests/day each",
    withoutOptimization: "$960/day",
    withPromptCaching: "$96/day", 
    savings: "$864/day (90%)",
    userExperience: "Instant responses"
  },
  batchServices: {
    scenario: "Weekly analysis of 1000 projects",
    withoutOptimization: "$500/week",
    withBatchAndCaching: "$25/week",
    savings: "$475/week (95%)",
    userExperience: "Background processing, no waiting"
  },
  combined: {
    totalMonthlySavings: "$26,820/month",
    annualSavings: "$321,840/year",
    note: "Savings scale with user growth"
  }
};

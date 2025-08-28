/**
 * Universal Prompt Processor
 * 
 * The brain that transforms ANY user prompt into a buildable project
 * This enables the "Prompt to ANY Framework" functionality
 */

import { FrameworkDetectionEngine, UniversalProjectGenerator, type UniversalFramework } from './framework-registry';

export interface ProcessedPrompt {
  originalPrompt: string;
  intent: ProjectIntent;
  detectedFramework: UniversalFramework | null;
  suggestedFrameworks: UniversalFramework[];
  projectType: ProjectType;
  features: string[];
  platforms: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: string;
  guidance: string[];
}

export type ProjectIntent = 
  | 'create-app' | 'create-website' | 'create-api' | 'create-service'
  | 'create-game' | 'create-tool' | 'create-library' | 'create-plugin'
  | 'create-extension' | 'create-bot' | 'create-dashboard'
  | 'learn-framework' | 'prototype-idea' | 'solve-problem';

export type ProjectType = 
  | 'web-app' | 'mobile-app' | 'desktop-app' | 'api-service'
  | 'microservice' | 'static-site' | 'spa' | 'pwa'
  | 'game' | 'cli-tool' | 'library' | 'framework'
  | 'cms' | 'ecommerce' | 'blog' | 'portfolio'
  | 'dashboard' | 'admin-panel' | 'landing-page'
  | 'chatbot' | 'automation' | 'data-analysis'
  | 'iot-project' | 'blockchain-app' | 'ai-ml-project';

/**
 * The Universal Prompt Processor
 * Analyzes ANY user input and provides actionable project guidance
 */
export class UniversalPromptProcessor {
  /**
   * Process any user prompt and return actionable insights
   */
  static processPrompt(userPrompt: string): ProcessedPrompt {
    const prompt = userPrompt.toLowerCase().trim();
    
    return {
      originalPrompt: userPrompt,
      intent: this.detectIntent(prompt),
      detectedFramework: FrameworkDetectionEngine.detectFramework(prompt),
      suggestedFrameworks: FrameworkDetectionEngine.suggestFrameworks(prompt),
      projectType: this.detectProjectType(prompt),
      features: this.extractFeatures(prompt),
      platforms: this.extractPlatforms(prompt),
      complexity: this.assessComplexity(prompt),
      estimatedTime: this.estimateTime(prompt),
      guidance: this.generateGuidance(prompt)
    };
  }

  /**
   * Generate a project based on the processed prompt
   */
  static async generateFromPrompt(
    userPrompt: string,
    selectedFramework?: UniversalFramework
  ): Promise<{
    success: boolean;
    projectPath?: string;
    nextSteps?: string[];
    alternatives?: UniversalFramework[];
    error?: string;
  }> {
    const processed = this.processPrompt(userPrompt);
    
    // Use detected framework or user selection
    const framework = selectedFramework || processed.detectedFramework;
    
    if (!framework) {
      return {
        success: false,
        error: 'Could not determine framework. Please specify which framework you\'d like to use.',
        alternatives: processed.suggestedFrameworks
      };
    }
    
    // Generate project name from prompt
    const projectName = this.generateProjectName(userPrompt);
    
    // Generate the project
    const result = await UniversalProjectGenerator.generateProject(
      framework,
      projectName,
      userPrompt
    );
    
    return {
      success: result.success,
      projectPath: result.projectPath,
      nextSteps: result.nextSteps,
      error: result.error,
      alternatives: result.success ? [] : processed.suggestedFrameworks
    };
  }

  /**
   * Detect what the user wants to do
   */
  private static detectIntent(prompt: string): ProjectIntent {
    // Create/Build patterns
    if (this.containsAny(prompt, ['create', 'build', 'make', 'develop', 'generate'])) {
      if (this.containsAny(prompt, ['app', 'application'])) return 'create-app';
      if (this.containsAny(prompt, ['website', 'site', 'web'])) return 'create-website';
      if (this.containsAny(prompt, ['api', 'service', 'backend'])) return 'create-api';
      if (this.containsAny(prompt, ['game'])) return 'create-game';
      if (this.containsAny(prompt, ['tool', 'utility', 'cli'])) return 'create-tool';
      if (this.containsAny(prompt, ['library', 'package', 'module'])) return 'create-library';
      if (this.containsAny(prompt, ['plugin', 'extension', 'addon'])) return 'create-plugin';
      if (this.containsAny(prompt, ['bot', 'chatbot'])) return 'create-bot';
      if (this.containsAny(prompt, ['dashboard', 'admin'])) return 'create-dashboard';
      return 'create-app'; // Default
    }
    
    // Learning patterns
    if (this.containsAny(prompt, ['learn', 'tutorial', 'example', 'demo'])) {
      return 'learn-framework';
    }
    
    // Prototyping patterns
    if (this.containsAny(prompt, ['prototype', 'poc', 'proof of concept', 'test'])) {
      return 'prototype-idea';
    }
    
    // Problem solving patterns
    if (this.containsAny(prompt, ['solve', 'fix', 'help', 'need', 'problem'])) {
      return 'solve-problem';
    }
    
    return 'create-app'; // Default fallback
  }

  /**
   * Detect the type of project being requested
   */
  private static detectProjectType(prompt: string): ProjectType {
    // Mobile indicators
    if (this.containsAny(prompt, ['mobile', 'ios', 'android', 'phone', 'tablet'])) {
      return 'mobile-app';
    }
    
    // Desktop indicators
    if (this.containsAny(prompt, ['desktop', 'windows', 'macos', 'linux', 'electron'])) {
      return 'desktop-app';
    }
    
    // Web indicators
    if (this.containsAny(prompt, ['web', 'website', 'browser'])) {
      if (this.containsAny(prompt, ['spa', 'single page'])) return 'spa';
      if (this.containsAny(prompt, ['pwa', 'progressive'])) return 'pwa';
      if (this.containsAny(prompt, ['static', 'jamstack'])) return 'static-site';
      return 'web-app';
    }
    
    // API/Service indicators
    if (this.containsAny(prompt, ['api', 'rest', 'graphql', 'service', 'backend'])) {
      if (this.containsAny(prompt, ['micro', 'microservice'])) return 'microservice';
      return 'api-service';
    }
    
    // Specialized types
    if (this.containsAny(prompt, ['game', 'gaming'])) return 'game';
    if (this.containsAny(prompt, ['cli', 'command line', 'terminal'])) return 'cli-tool';
    if (this.containsAny(prompt, ['cms', 'content management'])) return 'cms';
    if (this.containsAny(prompt, ['ecommerce', 'shop', 'store', 'marketplace'])) return 'ecommerce';
    if (this.containsAny(prompt, ['blog', 'blogging'])) return 'blog';
    if (this.containsAny(prompt, ['portfolio', 'showcase'])) return 'portfolio';
    if (this.containsAny(prompt, ['dashboard', 'analytics'])) return 'dashboard';
    if (this.containsAny(prompt, ['admin', 'management panel'])) return 'admin-panel';
    if (this.containsAny(prompt, ['landing', 'landing page'])) return 'landing-page';
    if (this.containsAny(prompt, ['bot', 'chatbot', 'automation'])) return 'chatbot';
    if (this.containsAny(prompt, ['iot', 'internet of things', 'embedded'])) return 'iot-project';
    if (this.containsAny(prompt, ['blockchain', 'crypto', 'web3', 'defi'])) return 'blockchain-app';
    if (this.containsAny(prompt, ['ai', 'ml', 'machine learning', 'neural'])) return 'ai-ml-project';
    
    return 'web-app'; // Default fallback
  }

  /**
   * Extract features mentioned in the prompt
   */
  private static extractFeatures(prompt: string): string[] {
    const features: string[] = [];
    
    // Authentication
    if (this.containsAny(prompt, ['auth', 'login', 'signup', 'authentication', 'user management'])) {
      features.push('authentication');
    }
    
    // Database
    if (this.containsAny(prompt, ['database', 'db', 'storage', 'data', 'crud'])) {
      features.push('database');
    }
    
    // Real-time
    if (this.containsAny(prompt, ['real-time', 'realtime', 'live', 'websocket', 'socket'])) {
      features.push('real-time');
    }
    
    // Payments
    if (this.containsAny(prompt, ['payment', 'stripe', 'paypal', 'checkout', 'billing'])) {
      features.push('payments');
    }
    
    // File handling
    if (this.containsAny(prompt, ['upload', 'file', 'image', 'document', 'media'])) {
      features.push('file-upload');
    }
    
    // Notifications
    if (this.containsAny(prompt, ['notification', 'push', 'alert', 'email', 'sms'])) {
      features.push('notifications');
    }
    
    // Search
    if (this.containsAny(prompt, ['search', 'filter', 'query', 'find'])) {
      features.push('search');
    }
    
    // Admin
    if (this.containsAny(prompt, ['admin', 'management', 'dashboard', 'analytics'])) {
      features.push('admin-panel');
    }
    
    // Social
    if (this.containsAny(prompt, ['social', 'share', 'like', 'comment', 'follow'])) {
      features.push('social-features');
    }
    
    // API integration
    if (this.containsAny(prompt, ['api', 'integration', 'third-party', 'external'])) {
      features.push('api-integration');
    }
    
    return features;
  }

  /**
   * Extract target platforms from the prompt
   */
  private static extractPlatforms(prompt: string): string[] {
    const platforms: string[] = [];
    
    if (this.containsAny(prompt, ['web', 'browser', 'website'])) platforms.push('web');
    if (this.containsAny(prompt, ['ios', 'iphone', 'ipad', 'apple'])) platforms.push('ios');
    if (this.containsAny(prompt, ['android', 'google play'])) platforms.push('android');
    if (this.containsAny(prompt, ['windows', 'win32', 'pc'])) platforms.push('windows');
    if (this.containsAny(prompt, ['macos', 'mac', 'osx'])) platforms.push('macos');
    if (this.containsAny(prompt, ['linux', 'ubuntu', 'debian'])) platforms.push('linux');
    if (this.containsAny(prompt, ['mobile', 'phone', 'tablet'])) {
      platforms.push('ios', 'android');
    }
    if (this.containsAny(prompt, ['desktop', 'computer'])) {
      platforms.push('windows', 'macos', 'linux');
    }
    if (this.containsAny(prompt, ['cross-platform', 'multiplatform', 'all platforms'])) {
      platforms.push('web', 'ios', 'android', 'windows', 'macos', 'linux');
    }
    
    // Default to web if no platforms specified
    if (platforms.length === 0) {
      platforms.push('web');
    }
    
    return platforms;
  }

  /**
   * Assess project complexity based on the prompt
   */
  private static assessComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
    let complexityScore = 0;
    
    // Feature complexity indicators
    const complexFeatures = [
      'real-time', 'payment', 'authentication', 'database', 'api',
      'microservice', 'scaling', 'performance', 'security', 'analytics',
      'admin', 'dashboard', 'integration', 'automation', 'ai', 'ml'
    ];
    
    for (const feature of complexFeatures) {
      if (prompt.includes(feature)) complexityScore += 1;
    }
    
    // Platform complexity
    const platforms = this.extractPlatforms(prompt);
    if (platforms.length > 2) complexityScore += 1;
    if (platforms.includes('ios') || platforms.includes('android')) complexityScore += 1;
    
    // Architecture complexity indicators
    if (this.containsAny(prompt, ['enterprise', 'scalable', 'distributed', 'microservices'])) {
      complexityScore += 2;
    }
    
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'medium';
    return 'simple';
  }

  /**
   * Estimate development time
   */
  private static estimateTime(prompt: string): string {
    const complexity = this.assessComplexity(prompt);
    const platforms = this.extractPlatforms(prompt);
    const features = this.extractFeatures(prompt);
    
    let baseTime = 0;
    
    // Base time by complexity
    switch (complexity) {
      case 'simple': baseTime = 30; break;
      case 'medium': baseTime = 120; break;
      case 'complex': baseTime = 480; break;
    }
    
    // Additional time for platforms
    baseTime += (platforms.length - 1) * 30;
    
    // Additional time for features
    baseTime += features.length * 15;
    
    if (baseTime < 60) return `${baseTime} minutes`;
    if (baseTime < 1440) return `${Math.round(baseTime / 60)} hours`;
    return `${Math.round(baseTime / 1440)} days`;
  }

  /**
   * Generate guidance for the user
   */
  private static generateGuidance(prompt: string): string[] {
    const guidance: string[] = [];
    const complexity = this.assessComplexity(prompt);
    const projectType = this.detectProjectType(prompt);
    
    // General guidance based on complexity
    switch (complexity) {
      case 'simple':
        guidance.push('This looks like a straightforward project - perfect for getting started!');
        guidance.push('You should be able to have a working prototype quickly');
        break;
      case 'medium':
        guidance.push('This is a moderately complex project with several moving parts');
        guidance.push('Consider breaking it down into smaller milestones');
        guidance.push('Plan for proper testing and documentation');
        break;
      case 'complex':
        guidance.push('This is a complex project that will require careful planning');
        guidance.push('Consider starting with an MVP (Minimum Viable Product)');
        guidance.push('Think about architecture, scaling, and maintainability early');
        guidance.push('You might want to work with a team or get mentorship');
        break;
    }
    
    // Project-specific guidance
    switch (projectType) {
      case 'mobile-app':
        guidance.push('Consider whether you need native features or if cross-platform works');
        guidance.push('Think about app store requirements and guidelines');
        break;
      case 'web-app':
        guidance.push('Consider SEO requirements and performance optimization');
        guidance.push('Think about responsive design for mobile users');
        break;
      case 'api-service':
        guidance.push('Plan your API design and documentation strategy');
        guidance.push('Consider rate limiting, authentication, and versioning');
        break;
      case 'ecommerce':
        guidance.push('Payment processing and security are critical considerations');
        guidance.push('Consider inventory management and order fulfillment workflows');
        break;
    }
    
    return guidance;
  }

  /**
   * Generate a project name from the prompt
   */
  private static generateProjectName(prompt: string): string {
    // Remove common words and extract meaningful terms
    const stopWords = ['build', 'create', 'make', 'develop', 'want', 'need', 'like', 'using', 'with', 'for', 'a', 'an', 'the'];
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 3);
    
    if (words.length === 0) {
      return 'my-awesome-project';
    }
    
    return words.join('-');
  }

  /**
   * Helper function to check if prompt contains any of the given terms
   */
  private static containsAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }
}

/**
 * Natural Language Framework Suggestions
 * Provides human-friendly explanations for framework choices
 */
export class FrameworkSuggestionEngine {
  static explainFrameworkChoice(
    framework: UniversalFramework, 
    userPrompt: string
  ): {
    reasoning: string;
    benefits: string[];
    alternatives: string[];
    warning?: string;
  } {
    const prompt = userPrompt.toLowerCase();
    
    let reasoning = `${framework.name} is suggested because `;
    const benefits: string[] = [];
    const alternatives: string[] = [];
    let warning: string | undefined;
    
    // Reasoning based on framework category
    switch (framework.category) {
      case 'web-frontend':
        reasoning += 'you mentioned building a web application';
        benefits.push('Rich user interface capabilities');
        benefits.push('Large ecosystem of components');
        benefits.push('Strong community support');
        break;
        
      case 'mobile-cross-platform':
        reasoning += 'you want to build for multiple mobile platforms';
        benefits.push('Single codebase for iOS and Android');
        benefits.push('Native performance');
        benefits.push('Fast development cycle');
        break;
        
      case 'web-backend':
        reasoning += 'you need server-side functionality';
        benefits.push('Robust API development');
        benefits.push('Database integration');
        benefits.push('Scalable architecture');
        break;
    }
    
    // Add specific benefits for the framework
    benefits.push(...framework.gettingStarted.slice(0, 2));
    
    // Suggest alternatives
    if (framework.language === 'javascript') {
      alternatives.push('TypeScript for better type safety');
    }
    
    // Add warnings for complex frameworks
    if (framework.maturity === 'experimental') {
      warning = 'This framework is experimental - consider more mature alternatives for production use';
    }
    
    return {
      reasoning,
      benefits,
      alternatives,
      warning
    };
  }
}



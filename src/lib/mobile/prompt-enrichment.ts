/**
 * Mobile App Prompt Enrichment System
 * 
 * This module handles intelligent prompt enrichment for mobile app generation.
 * It modifies LLM prompts internally with structured data (GenerationSpec) to guide
 * code generation and reduce unnecessary file churn.
 */

import type { 
  GenerationSpec, 
  TemplateOption, 
  Framework,
  Platform,
  StateMgmt,
  NavigationType,
  BackendType,
  AuthType,
  FeatureType
} from './types';

/**
 * Prompt enrichment configuration
 */
export interface PromptEnrichmentConfig {
  /** Whether to include platform-specific guidance */
  includePlatformGuidance: boolean;
  
  /** Whether to include framework-specific best practices */
  includeFrameworkBestPractices: boolean;
  
  /** Whether to include template-specific patterns */
  includeTemplatePatterns: boolean;
  
  /** Whether to include dependency recommendations */
  includeDependencyGuidance: boolean;
  
  /** Whether to include architecture recommendations */
  includeArchitectureGuidance: boolean;
  
  /** Maximum length of enriched prompt */
  maxPromptLength: number;
}

/**
 * Default enrichment configuration
 */
export const DEFAULT_ENRICHMENT_CONFIG: PromptEnrichmentConfig = {
  includePlatformGuidance: true,
  includeFrameworkBestPractices: true,
  includeTemplatePatterns: true,
  includeDependencyGuidance: true,
  includeArchitectureGuidance: true,
  maxPromptLength: 8000 // Reasonable limit for most LLMs
};

/**
 * Enriched prompt result
 */
export interface EnrichedPrompt {
  /** The enriched prompt text */
  prompt: string;
  
  /** Original user prompt */
  originalPrompt: string;
  
  /** Generation specification used */
  spec: GenerationSpec;
  
  /** Sections included in enrichment */
  includedSections: string[];
  
  /** Whether the prompt was truncated */
  wasTruncated: boolean;
  
  /** Final prompt length */
  length: number;
}

/**
 * Main prompt enrichment function
 */
export function enrichPromptForMobileGeneration(
  userPrompt: string,
  spec: GenerationSpec,
  template: TemplateOption,
  config: Partial<PromptEnrichmentConfig> = {}
): EnrichedPrompt {
  const enrichmentConfig = { ...DEFAULT_ENRICHMENT_CONFIG, ...config };
  const sections: string[] = [];
  let enrichedContent = '';

  // Start with the user's original prompt
  const basePrompt = `
# Mobile App Generation Request

## User Requirements
${userPrompt.trim()}

## Technical Specifications
`;

  sections.push('User Requirements');

  // Add framework-specific guidance
  if (enrichmentConfig.includeFrameworkBestPractices) {
    const frameworkGuidance = generateFrameworkGuidance(spec.framework);
    enrichedContent += frameworkGuidance;
    sections.push('Framework Guidance');
  }

  // Add template-specific patterns
  if (enrichmentConfig.includeTemplatePatterns) {
    const templateGuidance = generateTemplateGuidance(template, spec);
    enrichedContent += templateGuidance;
    sections.push('Template Patterns');
  }

  // Add platform-specific guidance
  if (enrichmentConfig.includePlatformGuidance) {
    const platformGuidance = generatePlatformGuidance(spec.platforms);
    enrichedContent += platformGuidance;
    sections.push('Platform Guidance');
  }

  // Add architecture recommendations
  if (enrichmentConfig.includeArchitectureGuidance) {
    const architectureGuidance = generateArchitectureGuidance(spec);
    enrichedContent += architectureGuidance;
    sections.push('Architecture Guidance');
  }

  // Add dependency recommendations
  if (enrichmentConfig.includeDependencyGuidance) {
    const dependencyGuidance = generateDependencyGuidance(spec);
    enrichedContent += dependencyGuidance;
    sections.push('Dependency Guidance');
  }

  // Add generation constraints
  const constraintsGuidance = generateConstraintsGuidance(spec, template);
  enrichedContent += constraintsGuidance;
  sections.push('Generation Constraints');

  // Combine and truncate if necessary
  let finalPrompt = basePrompt + enrichedContent;
  let wasTruncated = false;

  if (finalPrompt.length > enrichmentConfig.maxPromptLength) {
    finalPrompt = truncatePrompt(finalPrompt, enrichmentConfig.maxPromptLength);
    wasTruncated = true;
  }

  return {
    prompt: finalPrompt,
    originalPrompt: userPrompt,
    spec,
    includedSections: sections,
    wasTruncated,
    length: finalPrompt.length
  };
}

/**
 * Generate framework-specific guidance
 */
function generateFrameworkGuidance(framework: Framework): string {
  switch (framework) {
    case 'flutter':
      return `
### Flutter Framework Requirements

**Core Principles:**
- Use Flutter's widget-based architecture
- Follow Material Design 3 guidelines for Android
- Use Cupertino widgets for iOS-specific UI
- Implement proper state management patterns
- Ensure hot reload compatibility

**Code Structure:**
- Organize code into lib/screens/, lib/widgets/, lib/models/, lib/services/
- Use proper widget composition over inheritance
- Implement BuildContext properly
- Use const constructors where possible

**Performance:**
- Minimize widget rebuilds
- Use ListView.builder for large lists
- Implement proper image caching
- Avoid blocking the UI thread

**Platform Integration:**
- Use platform channels for native functionality
- Handle platform-specific code with Platform.isIOS/isAndroid
- Implement proper navigation with Navigator 2.0 or go_router
`;

    case 'expo':
      return `
### Expo Framework Requirements

**Core Principles:**
- Use React Native components and patterns
- Follow Expo's managed workflow guidelines
- Leverage Expo SDK for native functionality
- Ensure compatibility with Expo Go

**Code Structure:**
- Organize code into screens/, components/, services/, utils/
- Use functional components with hooks
- Implement proper TypeScript types
- Follow React Native navigation patterns

**Performance:**
- Use FlatList for large data sets
- Implement proper image optimization
- Use React.memo for component optimization
- Handle asynchronous operations properly

**Expo Integration:**
- Use Expo APIs instead of raw React Native where possible
- Configure app.json/app.config.js properly
- Handle OTA updates considerations
- Use EAS Build for production apps
`;

    default:
      return '';
  }
}

/**
 * Generate template-specific guidance
 */
function generateTemplateGuidance(template: TemplateOption, spec: GenerationSpec): string {
  let guidance = `
### Template: ${template.title}

**Template Description:** ${template.description}

**Complexity Level:** ${template.complexity}/5
**Estimated Setup Time:** ${template.setupTime} minutes

**Template Features:**
`;

  // Add template-specific patterns based on category
  switch (template.category) {
    case 'basic':
      guidance += `
- Keep the code structure simple and readable
- Focus on core functionality without over-engineering
- Use minimal dependencies
- Implement clean, straightforward navigation
`;
      break;

    case 'navigation':
      guidance += `
- Implement robust navigation structure
- Use proper navigation patterns for the framework
- Handle deep linking appropriately
- Consider navigation state management
`;
      break;

    case 'state':
      guidance += `
- Implement proper state management architecture
- Use the specified state management solution: ${spec.stateMgmt}
- Separate business logic from UI components
- Handle state persistence where appropriate
`;
      break;

    case 'backend':
      guidance += `
- Implement proper API integration patterns
- Use the specified backend type: ${spec.backend}
- Handle error states and loading states
- Implement proper data validation
`;
      break;

    case 'auth':
      guidance += `
- Implement secure authentication flows
- Use the specified auth type: ${spec.auth}
- Handle token management properly
- Implement proper logout functionality
`;
      break;

    case 'feature-rich':
      guidance += `
- Implement advanced features systematically
- Maintain code organization as complexity grows
- Use proper architectural patterns
- Consider performance implications of features
`;
      break;
  }

  // Add template-specific requirements
  if (template.requirements && template.requirements.length > 0) {
    guidance += `
**Template Requirements:**
${template.requirements.map(req => `- ${req}`).join('\n')}
`;
  }

  return guidance;
}

/**
 * Generate platform-specific guidance
 */
function generatePlatformGuidance(platforms: Platform[]): string {
  let guidance = `
### Platform Configuration

**Target Platforms:** ${platforms.join(', ')}

`;

  if (platforms.includes('ios')) {
    guidance += `
**iOS Considerations:**
- Follow iOS Human Interface Guidelines
- Use Cupertino-style components where appropriate
- Handle iOS-specific permissions
- Consider iPhone and iPad layouts
- Implement proper iOS navigation patterns
`;
  }

  if (platforms.includes('android')) {
    guidance += `
**Android Considerations:**
- Follow Material Design guidelines
- Handle Android-specific permissions
- Consider different screen sizes and densities
- Implement proper Android navigation patterns
- Handle Android back button behavior
`;
  }

  if (platforms.includes('web')) {
    guidance += `
**Web Considerations:**
- Ensure responsive design for web browsers
- Handle web-specific routing
- Optimize for web performance
- Consider keyboard navigation
- Implement proper web accessibility
`;
  }

  if (platforms.includes('desktop')) {
    guidance += `
**Desktop Considerations:**
- Design for larger screen sizes
- Implement desktop-appropriate navigation
- Handle desktop-specific interactions
- Consider window management
- Optimize for desktop performance
`;
  }

  return guidance;
}

/**
 * Generate architecture guidance based on spec
 */
function generateArchitectureGuidance(spec: GenerationSpec): string {
  let guidance = `
### Architecture Configuration

`;

  // State management guidance
  if (spec.stateMgmt !== 'none') {
    guidance += `
**State Management:** ${spec.stateMgmt}
`;
    
    switch (spec.stateMgmt) {
      case 'provider':
        guidance += `
- Use Provider package for state management
- Create separate providers for different domains
- Use ChangeNotifier for simple state
- Use Consumer widgets for listening to changes
`;
        break;
      
      case 'riverpod':
        guidance += `
- Use Riverpod for state management
- Create providers for business logic
- Use StateNotifier for complex state
- Implement proper provider hierarchy
`;
        break;
      
      case 'bloc':
        guidance += `
- Use BLoC pattern for state management
- Create separate blocs for different features
- Implement proper event/state architecture
- Use BlocBuilder and BlocListener appropriately
`;
        break;
    }
  }

  // Navigation guidance
  if (spec.navigation !== 'stack') {
    guidance += `
**Navigation:** ${spec.navigation}
- Implement ${spec.navigation} navigation pattern
- Use proper route management
- Handle navigation state appropriately
`;
  }

  // Backend integration guidance
  if (spec.backend !== 'none') {
    guidance += `
**Backend Integration:** ${spec.backend}
`;
    
    switch (spec.backend) {
      case 'rest':
        guidance += `
- Implement RESTful API integration
- Use proper HTTP client (http package for Flutter, fetch/axios for Expo)
- Handle API errors appropriately
- Implement proper data serialization
`;
        break;
      
      case 'graphql':
        guidance += `
- Implement GraphQL integration
- Use appropriate GraphQL client
- Handle queries and mutations properly
- Implement proper caching strategy
`;
        break;
      
      case 'firebase':
        guidance += `
- Integrate Firebase services
- Use Firebase SDKs appropriately
- Handle Firebase authentication
- Implement proper security rules
`;
        break;
    }
  }

  // Authentication guidance
  if (spec.auth !== 'none') {
    guidance += `
**Authentication:** ${spec.auth}
- Implement secure authentication flows
- Handle token storage securely
- Implement proper logout functionality
- Handle authentication state changes
`;
  }

  return guidance;
}

/**
 * Generate dependency guidance
 */
function generateDependencyGuidance(spec: GenerationSpec): string {
  let guidance = `
### Recommended Dependencies

`;

  // Framework-specific core dependencies
  if (spec.framework === 'flutter') {
    guidance += `
**Flutter Core Dependencies:**
- flutter/material.dart (core UI)
- flutter/cupertino.dart (iOS-style widgets)
`;

    // State management dependencies
    switch (spec.stateMgmt) {
      case 'provider':
        guidance += `- provider: ^6.1.1 (state management)\n`;
        break;
      case 'riverpod':
        guidance += `- flutter_riverpod: ^2.4.9 (state management)\n`;
        break;
      case 'bloc':
        guidance += `- flutter_bloc: ^8.1.3 (state management)\n`;
        break;
    }

    // Backend dependencies
    switch (spec.backend) {
      case 'rest':
        guidance += `- http: ^1.1.0 (HTTP client)\n- json_annotation: ^4.8.1 (JSON serialization)\n`;
        break;
      case 'graphql':
        guidance += `- graphql_flutter: ^5.1.2 (GraphQL client)\n`;
        break;
      case 'firebase':
        guidance += `- firebase_core: ^2.24.2 (Firebase core)\n- cloud_firestore: ^4.13.6 (Firestore)\n`;
        break;
    }
  }

  if (spec.framework === 'expo') {
    guidance += `
**Expo Core Dependencies:**
- expo (core Expo SDK)
- react-native (React Native framework)
- @expo/vector-icons (icon set)
`;

    // Navigation for Expo
    if (spec.navigation !== 'stack') {
      guidance += `- @react-navigation/native (navigation)\n`;
    }

    // State management for Expo
    switch (spec.stateMgmt) {
      case 'provider':
        guidance += `- react-context (built-in state management)\n`;
        break;
      case 'redux':
        guidance += `- @reduxjs/toolkit (state management)\n- react-redux (React Redux bindings)\n`;
        break;
    }
  }

  // Feature-specific dependencies
  if (spec.features.includes('responsive')) {
    guidance += spec.framework === 'flutter' 
      ? `- responsive_framework: ^1.1.1 (responsive design)\n`
      : `- react-native-super-grid: ^4.4.0 (responsive layouts)\n`;
  }

  if (spec.features.includes('image-caching')) {
    guidance += spec.framework === 'flutter'
      ? `- cached_network_image: ^3.3.0 (image caching)\n`
      : `- expo-image: ^1.8.1 (optimized images)\n`;
  }

  return guidance;
}

/**
 * Generate generation constraints and guidelines
 */
function generateConstraintsGuidance(spec: GenerationSpec, template: TemplateOption): string {
  return `
### Generation Constraints

**Important Guidelines:**
1. **Code Quality:**
   - Write clean, readable, and maintainable code
   - Follow the framework's coding conventions
   - Include proper error handling
   - Add meaningful comments for complex logic

2. **File Organization:**
   - Use the standard project structure for ${spec.framework}
   - Create separate files for different concerns
   - Keep components focused and single-purpose
   - Use proper import/export patterns

3. **Performance:**
   - Optimize for the target platforms: ${spec.platforms.join(', ')}
   - Implement lazy loading where appropriate
   - Minimize unnecessary re-renders
   - Use efficient data structures

4. **User Experience:**
   - Implement proper loading states
   - Handle error states gracefully
   - Ensure responsive design
   - Follow platform-specific UI guidelines

5. **Template Compliance:**
   - Adhere to the ${template.title} template patterns
   - Implement the specified features systematically
   - Maintain consistency with template architecture
   - Follow the template's complexity level (${template.complexity}/5)

**Generation Preferences:**
- Prioritize working, functional code over perfect code
- Include placeholder content where appropriate
- Focus on the core user requirements first
- Ensure the app can be built and run immediately
- Include basic navigation between screens
- Implement proper app structure from the start
`;
}

/**
 * Truncate prompt to fit within length limits
 */
function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  // Find a good truncation point (end of a section)
  const sections = prompt.split('\n###');
  let truncated = sections[0];
  
  for (let i = 1; i < sections.length; i++) {
    const withSection = truncated + '\n###' + sections[i];
    if (withSection.length > maxLength - 200) { // Leave some buffer
      break;
    }
    truncated = withSection;
  }

  // Add truncation notice
  truncated += '\n\n[Note: Prompt was truncated to fit length limits. Focus on core requirements.]';
  
  return truncated;
}

/**
 * Generate a simple prompt without enrichment (for comparison)
 */
export function generateSimplePrompt(userPrompt: string, spec: GenerationSpec): string {
  return `Create a ${spec.framework} mobile app: ${userPrompt}

Framework: ${spec.framework}
Platforms: ${spec.platforms.join(', ')}
Template: ${spec.templateId}`;
}

/**
 * Analyze prompt enrichment effectiveness
 */
export function analyzePromptEnrichment(enrichedPrompt: EnrichedPrompt): {
  enrichmentRatio: number;
  structuredDataRatio: number;
  guidanceRatio: number;
  recommendations: string[];
} {
  const originalLength = enrichedPrompt.originalPrompt.length;
  const totalLength = enrichedPrompt.length;
  const enrichmentLength = totalLength - originalLength;

  const enrichmentRatio = enrichmentLength / originalLength;
  const structuredDataRatio = enrichedPrompt.includedSections.length / 6; // Max sections
  const guidanceRatio = enrichmentLength / totalLength;

  const recommendations: string[] = [];

  if (enrichmentRatio < 2) {
    recommendations.push('Consider adding more structured guidance for better code generation');
  }

  if (enrichedPrompt.wasTruncated) {
    recommendations.push('Prompt was truncated - consider reducing enrichment or increasing limits');
  }

  if (structuredDataRatio < 0.5) {
    recommendations.push('Enable more enrichment sections for comprehensive guidance');
  }

  return {
    enrichmentRatio,
    structuredDataRatio,
    guidanceRatio,
    recommendations
  };
}



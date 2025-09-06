/**
 * Mobile App Generation - Type Definitions
 * 
 * This module defines all types and interfaces for the mobile app generation system,
 * supporting both Expo and Flutter frameworks with comprehensive template options.
 */

// Core framework types
export type Framework = "expo" | "flutter";
export type StateMgmt = "provider" | "riverpod" | "bloc" | "zustand" | "jotai" | "redux" | "none";
export type NavigationType = "tabs" | "drawer" | "stack";
export type BackendType = "none" | "rest" | "graphql" | "firebase";
export type AuthType = "none" | "email" | "oauth" | "biometric";
export type Platform = "android" | "ios" | "web" | "desktop";

// Template categories for organization
export type TemplateCategory = "basic" | "navigation" | "state" | "backend" | "auth" | "feature";

/**
 * Complete specification for generating a mobile app
 * This is the core data structure that drives the entire generation process
 */
export interface GenerationSpec {
  /** Target framework for the application */
  framework: Framework;
  
  /** ID of the selected template */
  templateId: string;
  
  /** State management solution */
  stateMgmt: StateMgmt;
  
  /** Navigation pattern */
  navigation: NavigationType;
  
  /** Backend integration type */
  backend: BackendType;
  
  /** Authentication method */
  auth: AuthType;
  
  /** Additional features to include */
  features: string[];
  
  /** Target platforms */
  platforms: Platform[];
  
  /** Custom packages to include */
  customPackages?: string[];
  
  /** Theme configuration */
  themeConfig?: {
    primaryColor?: string;
    useMaterial3?: boolean;
    useCupertino?: boolean;
    darkMode?: boolean;
  };
}

/**
 * Template definition with metadata and configuration
 */
export interface TemplateOption {
  /** Unique template identifier */
  id: string;
  
  /** Human-readable template name */
  title: string;
  
  /** Template description */
  description: string;
  
  /** Target framework */
  framework: Framework;
  
  /** Template category for filtering */
  category: TemplateCategory;
  
  /** Searchable tags */
  tags: string[];
  
  /** Default values for this template */
  defaults?: Partial<GenerationSpec>;
  
  /** System requirements */
  requirements?: string[];
  
  /** Supported platforms */
  platforms: Platform[];
  
  /** Required dependencies */
  dependencies: string[];
  
  /** Preview image URL */
  preview_image?: string;
  
  /** Complexity level (1-5) */
  complexity?: number;
  
  /** Estimated setup time in minutes */
  setupTime?: number;
}

/**
 * Validation result for GenerationSpec
 */
export interface ValidationResult {
  /** Whether the spec is valid */
  valid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** List of warnings (non-blocking) */
  warnings: string[];
}

/**
 * Template registry query options
 */
export interface TemplateQuery {
  /** Filter by framework */
  framework?: Framework;
  
  /** Filter by category */
  category?: TemplateCategory;
  
  /** Filter by supported platforms */
  platforms?: Platform[];
  
  /** Search text */
  search?: string;
  
  /** Maximum complexity level */
  maxComplexity?: number;
}

/**
 * Project creation options
 */
export interface ProjectCreationOptions {
  /** User's original prompt */
  prompt: string;
  
  /** Generated specification */
  spec: GenerationSpec;
  
  /** App display name */
  displayName: string;
  
  /** Package identifier */
  packageId: string;
  
  /** URL-friendly slug */
  slug: string;
  
  /** Custom project path */
  projectPath?: string;
  
  /** Progress callback */
  onProgress?: (progress: number, message?: string) => void;
}

/**
 * Flutter-specific types
 */
export interface FlutterDoctorResult {
  /** Whether Flutter SDK is installed */
  sdkInstalled: boolean;
  
  /** Flutter SDK version */
  sdkVersion?: string;
  
  /** SDK channel (stable, beta, dev) */
  channel?: string;
  
  /** Android toolchain status */
  androidToolchain: ToolchainStatus;
  
  /** iOS toolchain status (macOS only) */
  iosToolchain: ToolchainStatus;
  
  /** Web support availability */
  webSupport: boolean;
  
  /** IDE support status */
  ideSupport: IDEStatus[];
  
  /** List of issues found */
  issues: DoctorIssue[];
}

export interface ToolchainStatus {
  /** Whether toolchain is installed */
  installed: boolean;
  
  /** Toolchain version */
  version?: string;
  
  /** List of issues */
  issues: string[];
}

export interface IDEStatus {
  /** IDE name */
  name: string;
  
  /** Whether IDE is installed */
  installed: boolean;
  
  /** IDE version */
  version?: string;
  
  /** Flutter plugin status */
  flutterPlugin?: boolean;
  
  /** Dart plugin status */
  dartPlugin?: boolean;
}

export interface DoctorIssue {
  /** Issue severity */
  type: "error" | "warning" | "info";
  
  /** Issue category */
  category: string;
  
  /** Issue description */
  message: string;
  
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Flutter project information
 */
export interface FlutterProject {
  /** Project directory path */
  path: string;
  
  /** Project name */
  name: string;
  
  /** Package identifier */
  packageId: string;
  
  /** Flutter version used */
  flutterVersion: string;
  
  /** Supported platforms */
  platforms: Platform[];
  
  /** Project configuration */
  config: GenerationSpec;
}

/**
 * Preview system types
 */
export interface PreviewInfo {
  /** Preview URL */
  url: string;
  
  /** Preview port */
  port: number;
  
  /** Process ID */
  pid: number;
  
  /** Whether hot reload is enabled */
  hotReload: boolean;
  
  /** Target device/platform */
  device: string;
}

export interface HotReloadResult {
  /** Whether reload was successful */
  success: boolean;
  
  /** Reload time in milliseconds */
  reloadTime: number;
  
  /** Error message if failed */
  error?: string;
  
  /** Files that were reloaded */
  reloadedFiles?: string[];
}

/**
 * Error types for mobile app generation
 */
export type MobileError = 
  | { type: "INVALID_SPEC"; message: string; details: string[] }
  | { type: "TEMPLATE_NOT_FOUND"; templateId: string }
  | { type: "FRAMEWORK_NOT_SUPPORTED"; framework: string }
  | { type: "PLATFORM_NOT_SUPPORTED"; platform: string; framework: Framework }
  | { type: "SDK_NOT_FOUND"; framework: Framework; suggestion: string }
  | { type: "PROJECT_CREATION_FAILED"; reason: string; suggestion: string }
  | { type: "PREVIEW_FAILED"; reason: string; suggestion: string }
  | { type: "HOT_RELOAD_FAILED"; reason: string }
  | { type: "DEPENDENCY_ERROR"; dependency: string; reason: string };

/**
 * Result type for operations that can fail
 */
export type Result<T, E = MobileError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Branded string types for type safety
 */
export type FlutterProjectPath = string & { readonly __brand: 'FlutterProjectPath' };
export type ExpoProjectPath = string & { readonly __brand: 'ExpoProjectPath' };
export type FlutterSDKVersion = string & { readonly __brand: 'FlutterSDKVersion' };
export type PackageId = string & { readonly __brand: 'PackageId' };

/**
 * Type guards for runtime type checking
 */
export function isFramework(value: string): value is Framework {
  return value === "expo" || value === "flutter";
}

export function isStateMgmt(value: string): value is StateMgmt {
  return ["provider", "riverpod", "bloc", "zustand", "jotai", "redux", "none"].includes(value);
}

export function isPlatform(value: string): value is Platform {
  return ["android", "ios", "web", "desktop"].includes(value);
}

export function isTemplateCategory(value: string): value is TemplateCategory {
  return ["basic", "navigation", "state", "backend", "auth", "feature"].includes(value);
}

/**
 * Validation functions
 */
export function validateGenerationSpec(spec: Partial<GenerationSpec>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!spec.framework) {
    errors.push("framework is required");
  } else if (!isFramework(spec.framework)) {
    errors.push(`Invalid framework: ${spec.framework}`);
  }

  if (!spec.templateId) {
    errors.push("templateId is required");
  }

  // Platform validation
  if (spec.platforms) {
    for (const platform of spec.platforms) {
      if (!isPlatform(platform)) {
        errors.push(`Invalid platform: ${platform}`);
      }
    }

    // Framework-specific platform validation
    if (spec.framework === "flutter" && spec.platforms.length === 0) {
      errors.push("At least one platform must be selected for Flutter");
    }
  }

  // State management validation
  if (spec.stateMgmt && !isStateMgmt(spec.stateMgmt)) {
    errors.push(`Invalid state management: ${spec.stateMgmt}`);
  }

  // Template-specific validations
  if (spec.templateId?.includes("cupertino") && spec.platforms && !spec.platforms.includes("ios")) {
    warnings.push("Cupertino templates work best with iOS platform");
  }

  if (spec.templateId?.includes("material") && spec.platforms && !spec.platforms.includes("android")) {
    warnings.push("Material templates work best with Android platform");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Utility function to merge template defaults with user selections
 */
export function mergeSpecWithTemplate(
  userSpec: Partial<GenerationSpec>, 
  template: TemplateOption
): GenerationSpec {
  // Start with base defaults
  const base = {
    stateMgmt: "none" as StateMgmt,
    navigation: "stack" as NavigationType,
    backend: "none" as BackendType,
    auth: "none" as AuthType,
    features: [],
    platforms: template.platforms
  };

  // Apply template defaults
  const withTemplateDefaults = {
    ...base,
    ...template.defaults
  };

  // Apply user selections, but preserve template framework
  const merged = {
    templateId: userSpec.templateId || template.id, // User can override templateId
    ...withTemplateDefaults,
    ...userSpec,
    framework: template.framework // Template framework always takes precedence
  };

  return merged as GenerationSpec;
}

/**
 * Platform capability detection
 * Browser-safe version that doesn't use Node.js globals
 */
export function getPlatformCapabilities(): {
  android: boolean;
  ios: boolean;
  web: boolean;
  desktop: boolean;
} {
  // Check if we're in a Node.js environment (test environment)
  const isNodeEnv = typeof process !== 'undefined' && process.platform;
  
  return {
    android: true, // Android development available on all platforms
    ios: isNodeEnv ? process.platform === 'darwin' : true, // iOS only on macOS in Node.js env
    web: true, // Web development available everywhere
    desktop: true // Desktop development available everywhere
  };
}

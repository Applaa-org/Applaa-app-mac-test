/**
 * Mobile App Generation - Main Export Module
 * 
 * This module exports all types, utilities, and interfaces for the mobile app generation system.
 */

// Export all types
export * from './types';

// Re-export commonly used functions for convenience
export {
  validateGenerationSpec,
  mergeSpecWithTemplate,
  getPlatformCapabilities
} from './types';



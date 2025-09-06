/**
 * 🧪 JEST CONFIGURATION - INTELLIGENT PREVIEW SYSTEM
 * 
 * Specialized Jest configuration for testing the intelligent preview system
 * Optimized for testing IPC handlers, React components, and integration flows
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/preview-test-setup.ts'
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/__tests__/intelligent_preview_system.test.ts',
    '<rootDir>/src/__tests__/preview_integration.test.ts',
    '<rootDir>/src/__tests__/IntelligentPreviewPanel.test.tsx'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@ipc/(.*)$': '<rootDir>/src/ipc/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/ipc/handlers/intelligent_preview_system.ts',
    'src/ipc/utils/preview_integration.ts',
    'src/components/expo/IntelligentPreviewPanel.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.*',
    '!src/**/__tests__/**'
  ],
  
  coverageReporters: [
    'text',
    'lcov',
    'json-summary',
    'html'
  ],
  
  coverageDirectory: 'coverage/preview-system',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    'src/ipc/handlers/intelligent_preview_system.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/components/expo/IntelligentPreviewPanel.tsx': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Module resolution
  resolver: undefined,
  
  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/coverage/',
    '<rootDir>/.vite/',
    '<rootDir>/dist/'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/coverage/'
  ],
  
  // Mock configuration
  automock: false,
  
  // Preset
  preset: 'ts-jest/presets/js-with-ts-esm',
  
  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Globals
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  }
};

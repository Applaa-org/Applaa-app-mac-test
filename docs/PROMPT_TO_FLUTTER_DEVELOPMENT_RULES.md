# Prompt to Flutter App - Development Rules & Standards

## Strict Development Rules

### Rule 1: Test-Driven Development (TDD)
**MANDATORY**: Write tests BEFORE implementation

#### Implementation Order:
1. **Write failing test** that describes expected behavior
2. **Implement minimal code** to make test pass
3. **Refactor** while keeping tests green
4. **Add edge case tests** before expanding functionality

#### Test Requirements:
- **Unit tests**: Every function, hook, and component
- **Integration tests**: Every IPC handler and data flow
- **E2E tests**: Every user journey and interaction
- **Performance tests**: All time-critical operations

```typescript
// Example: TDD for Flutter Doctor
// 1. Write test first
describe('FlutterDoctor', () => {
  test('should detect installed Flutter SDK', async () => {
    const result = await flutterDoctor();
    expect(result.sdkInstalled).toBe(true);
    expect(result.sdkVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});

// 2. Implement to pass test
export async function flutterDoctor(): Promise<FlutterDoctorResult> {
  // Implementation here
}
```

#### Violation Consequences:
- **Code review rejection** for untested code
- **No merge approval** without test coverage
- **Immediate refactoring** required if tests added after

### Rule 2: Type Safety First
**MANDATORY**: No `any` types, comprehensive TypeScript usage

#### Type Requirements:
- **Strict TypeScript mode** enabled in all new files
- **Interface-first design** for all data structures
- **Comprehensive JSDoc** for all public APIs
- **Branded types** for domain-specific values

```typescript
// ✅ CORRECT: Branded types for safety
type FlutterProjectPath = string & { readonly __brand: 'FlutterProjectPath' };
type FlutterSDKVersion = string & { readonly __brand: 'FlutterSDKVersion' };

interface FlutterProject {
  readonly path: FlutterProjectPath;
  readonly sdkVersion: FlutterSDKVersion;
  readonly platforms: readonly Platform[];
}

// ❌ FORBIDDEN: any types
function processProject(project: any): any { } // NEVER ALLOWED

// ❌ FORBIDDEN: loose types
function processProject(project: object): object { } // NOT SPECIFIC ENOUGH
```

#### Error Handling:
- **Typed errors** with context information
- **Result types** for operations that can fail
- **Exhaustive switch statements** with never checks

```typescript
// ✅ CORRECT: Typed error handling
type FlutterError = 
  | { type: 'SDK_NOT_FOUND'; message: string }
  | { type: 'PROJECT_INVALID'; path: string; reason: string }
  | { type: 'COMPILATION_FAILED'; errors: CompilationError[] };

type Result<T, E = FlutterError> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

### Rule 3: Error Handling Excellence
**MANDATORY**: Comprehensive error handling with user-friendly messages

#### Error Handling Strategy:
1. **Catch all errors** at appropriate boundaries
2. **Provide context** about what operation failed
3. **Suggest solutions** when possible
4. **Log technical details** for debugging
5. **Show user-friendly messages** in UI

```typescript
// ✅ CORRECT: Comprehensive error handling
async function createFlutterProject(spec: GenerationSpec): Promise<Result<FlutterProject>> {
  try {
    // Validate inputs
    const validation = validateGenerationSpec(spec);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          type: 'INVALID_SPEC',
          message: 'Project configuration is invalid',
          details: validation.errors,
          suggestion: 'Please check your template selection and try again'
        }
      };
    }

    // Attempt creation
    const project = await executeFlutterCreate(spec);
    return { success: true, data: project };

  } catch (error) {
    logger.error('Flutter project creation failed', { spec, error });
    
    if (error instanceof FlutterSDKError) {
      return {
        success: false,
        error: {
          type: 'SDK_ERROR',
          message: 'Flutter SDK not properly configured',
          suggestion: 'Please run Flutter Doctor and install missing components'
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred during project creation',
        suggestion: 'Please try again or contact support if the problem persists'
      }
    };
  }
}
```

### Rule 4: Performance Requirements
**MANDATORY**: Meet strict performance targets

#### Performance Targets:
- **Preview startup**: <60 seconds from prompt to working preview
- **Hot reload**: <3 seconds for code changes to reflect
- **Memory usage**: <200MB for preview process
- **UI responsiveness**: <100ms for user interactions

#### Performance Monitoring:
```typescript
// ✅ REQUIRED: Performance tracking for critical operations
async function startFlutterPreview(projectPath: FlutterProjectPath): Promise<Result<PreviewInfo>> {
  const startTime = performance.now();
  
  try {
    const preview = await executeFlutterRun(projectPath);
    
    const duration = performance.now() - startTime;
    metrics.record('flutter_preview_startup', duration);
    
    if (duration > 60000) { // 60 seconds
      logger.warn('Flutter preview startup exceeded target', { duration, projectPath });
    }
    
    return { success: true, data: preview };
  } catch (error) {
    metrics.record('flutter_preview_startup_failed', performance.now() - startTime);
    throw error;
  }
}
```

#### Performance Testing:
- **Benchmark tests** for all critical operations
- **Memory leak detection** in long-running processes
- **Load testing** for concurrent operations
- **Regression testing** to prevent performance degradation

### Rule 5: React Best Practices
**MANDATORY**: Follow strict React patterns

#### Component Requirements:
- **Single Responsibility**: One clear purpose per component
- **Props interface**: TypeScript interfaces for all props
- **Error boundaries**: Wrap all major component trees
- **Loading states**: Show loading feedback for async operations

```typescript
// ✅ CORRECT: Well-structured React component
interface MobileFrameworkPickerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onFrameworkSelected: (framework: Framework) => void;
  readonly initialFramework?: Framework;
}

export const MobileFrameworkPicker: React.FC<MobileFrameworkPickerProps> = ({
  isOpen,
  onClose,
  onFrameworkSelected,
  initialFramework
}) => {
  const [step, setStep] = useState<'framework' | 'template'>('framework');
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(
    initialFramework ?? null
  );

  // Error boundary for this component tree
  return (
    <ErrorBoundary fallback={<PickerErrorFallback />}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        {step === 'framework' && (
          <FrameworkSelection
            onSelect={(framework) => {
              setSelectedFramework(framework);
              setStep('template');
            }}
          />
        )}
        {step === 'template' && selectedFramework && (
          <TemplateSelection
            framework={selectedFramework}
            onSelect={onFrameworkSelected}
          />
        )}
      </Dialog>
    </ErrorBoundary>
  );
};
```

#### Hook Requirements:
- **Custom hooks** for complex state logic
- **Dependency arrays** carefully managed
- **Cleanup functions** for all side effects
- **Error handling** within hooks

```typescript
// ✅ CORRECT: Well-structured custom hook
interface UseFlutterDoctorReturn {
  readonly doctorResult: FlutterDoctorResult | null;
  readonly isLoading: boolean;
  readonly error: FlutterError | null;
  readonly refetch: () => Promise<void>;
}

export function useFlutterDoctor(): UseFlutterDoctorReturn {
  const [doctorResult, setDoctorResult] = useState<FlutterDoctorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FlutterError | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await IpcClient.getInstance().flutterDoctor();
      setDoctorResult(result);
    } catch (err) {
      setError(err as FlutterError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, []); // Empty dependency array - only run on mount

  return {
    doctorResult,
    isLoading,
    error,
    refetch
  };
}
```

### Rule 6: IPC Architecture Standards
**MANDATORY**: Consistent IPC patterns following Applaa conventions

#### IPC Handler Structure:
```typescript
// ✅ CORRECT: Structured IPC handler
export function registerFlutterHandlers(ipcMain: Electron.IpcMain) {
  ipcMain.handle('flutter:doctor', async (): Promise<FlutterDoctorResult> => {
    try {
      const result = await executeFlutterDoctor();
      logger.info('Flutter doctor completed', { result });
      return result;
    } catch (error) {
      logger.error('Flutter doctor failed', { error });
      throw new Error(`[flutter:doctor] ${error.message}`);
    }
  });

  ipcMain.handle('flutter:create-project', async (
    event: Electron.IpcMainInvokeEvent,
    options: ProjectCreationOptions
  ): Promise<FlutterProject> => {
    try {
      // Validate inputs
      const validation = validateProjectCreationOptions(options);
      if (!validation.valid) {
        throw new Error(`Invalid project options: ${validation.errors.join(', ')}`);
      }

      // Execute with proper error handling
      const project = await createFlutterProjectImpl(options);
      
      logger.info('Flutter project created successfully', { 
        projectPath: project.path,
        template: options.spec.templateId 
      });
      
      return project;
    } catch (error) {
      logger.error('Flutter project creation failed', { options, error });
      throw new Error(`[flutter:create-project] ${error.message}`);
    }
  });
}
```

#### Client-Side IPC:
```typescript
// ✅ CORRECT: Type-safe IPC client methods
export class IpcClient {
  async flutterDoctor(): Promise<FlutterDoctorResult> {
    return this.ipcRenderer.invoke('flutter:doctor');
  }

  async createFlutterProject(options: ProjectCreationOptions): Promise<FlutterProject> {
    return this.ipcRenderer.invoke('flutter:create-project', options);
  }

  async startFlutterPreview(projectPath: FlutterProjectPath): Promise<PreviewInfo> {
    return this.ipcRenderer.invoke('flutter:start-preview', projectPath);
  }
}
```

### Rule 7: File Organization Standards
**MANDATORY**: Consistent file and folder structure

#### Directory Structure:
```
src/
├── components/mobile/              # Mobile-specific UI components
│   ├── __tests__/                 # Component tests co-located
│   ├── MobileFrameworkPicker.tsx
│   ├── MobileFrameworkPicker.test.tsx
│   └── index.ts                   # Barrel exports
├── hooks/mobile/                  # Mobile-specific hooks
│   ├── __tests__/
│   ├── useMobileCreation.ts
│   ├── useMobileCreation.test.ts
│   └── index.ts
├── ipc/handlers/mobile/           # Mobile IPC handlers
│   ├── __tests__/
│   ├── flutter_environment_handlers.ts
│   ├── flutter_environment_handlers.test.ts
│   └── index.ts
└── lib/mobile/                    # Mobile utilities and types
    ├── __tests__/
    ├── types.ts
    ├── flutter-utils.ts
    ├── flutter-utils.test.ts
    └── index.ts
```

#### File Naming:
- **kebab-case** for files: `flutter-project-manager.ts`
- **PascalCase** for components: `MobileFrameworkPicker.tsx`
- **camelCase** for functions and variables: `createFlutterProject`
- **SCREAMING_SNAKE_CASE** for constants: `FLUTTER_MIN_VERSION`

#### Import Organization:
```typescript
// ✅ CORRECT: Import order
// 1. Node modules
import React, { useState, useCallback } from 'react';
import { z } from 'zod';

// 2. Internal modules (absolute imports)
import { IpcClient } from '@/ipc/ipc_client';
import { FlutterDoctorResult } from '@/lib/mobile/types';

// 3. Relative imports
import './MobileFrameworkPicker.css';
```

### Rule 8: Documentation Requirements
**MANDATORY**: Comprehensive documentation for all public APIs

#### Documentation Standards:
```typescript
/**
 * Creates a new Flutter project based on the provided specification.
 * 
 * This function handles the complete project creation workflow:
 * - Validates the generation specification
 * - Creates the project directory structure
 * - Generates template files
 * - Installs dependencies
 * - Configures platform-specific settings
 * 
 * @param spec - The project generation specification
 * @param options - Additional creation options
 * @returns Promise that resolves to the created project info
 * 
 * @throws {FlutterSDKError} When Flutter SDK is not available
 * @throws {InvalidSpecError} When the generation spec is invalid
 * @throws {ProjectCreationError} When project creation fails
 * 
 * @example
 * ```typescript
 * const spec: GenerationSpec = {
 *   framework: 'flutter',
 *   templateId: 'material3-app',
 *   stateMgmt: 'provider',
 *   navigation: 'tabs',
 *   platforms: ['android', 'ios']
 * };
 * 
 * const project = await createFlutterProject(spec);
 * console.log(`Project created at: ${project.path}`);
 * ```
 */
export async function createFlutterProject(
  spec: GenerationSpec,
  options: ProjectCreationOptions = {}
): Promise<FlutterProject> {
  // Implementation...
}
```

### Rule 9: Testing Standards
**MANDATORY**: Comprehensive testing strategy

#### Test Categories:

##### Unit Tests:
```typescript
// ✅ CORRECT: Comprehensive unit test
describe('FlutterProjectManager', () => {
  describe('createProject', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockFileSystem.reset();
    });

    test('should create project with valid specification', async () => {
      // Arrange
      const spec = createValidGenerationSpec();
      mockFlutterCommand.mockResolvedValue({ success: true });

      // Act
      const result = await createFlutterProject(spec);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.path).toBeDefined();
      expect(mockFlutterCommand).toHaveBeenCalledWith('create', expect.any(Array));
    });

    test('should handle Flutter SDK not found error', async () => {
      // Arrange
      const spec = createValidGenerationSpec();
      mockFlutterCommand.mockRejectedValue(new FlutterSDKError('SDK not found'));

      // Act
      const result = await createFlutterProject(spec);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.type).toBe('SDK_NOT_FOUND');
    });
  });
});
```

##### Integration Tests:
```typescript
// ✅ CORRECT: IPC integration test
describe('Flutter IPC Integration', () => {
  test('should complete full creation workflow', async () => {
    // Arrange
    const ipcClient = new IpcClient();
    const spec = createValidGenerationSpec();

    // Act
    const doctorResult = await ipcClient.flutterDoctor();
    expect(doctorResult.sdkInstalled).toBe(true);

    const project = await ipcClient.createFlutterProject({ spec });
    expect(project.path).toBeDefined();

    const preview = await ipcClient.startFlutterPreview(project.path);
    expect(preview.url).toMatch(/^http:\/\/localhost:\d+/);
  });
});
```

##### E2E Tests:
```typescript
// ✅ CORRECT: End-to-end test
test('Flutter app creation flow', async ({ page }) => {
  // Navigate to home page
  await page.goto('/');

  // Enter Flutter-related prompt
  await page.fill('[data-testid="chat-input"]', 'Create a Flutter todo app with material design');
  await page.click('[data-testid="submit-button"]');

  // Verify framework picker opens
  await expect(page.locator('[data-testid="mobile-framework-picker"]')).toBeVisible();

  // Select Flutter
  await page.click('[data-testid="framework-flutter"]');

  // Select template
  await page.click('[data-testid="template-material3-app"]');

  // Verify project creation starts
  await expect(page.locator('[data-testid="creating-project"]')).toBeVisible();

  // Wait for preview to load (with timeout)
  await expect(page.locator('[data-testid="flutter-preview"]')).toBeVisible({ timeout: 60000 });

  // Verify preview is functional
  const previewFrame = page.frameLocator('[data-testid="flutter-preview-iframe"]');
  await expect(previewFrame.locator('text=Todo App')).toBeVisible();
});
```

### Rule 10: Performance Monitoring
**MANDATORY**: Continuous performance tracking

#### Performance Metrics:
```typescript
// ✅ REQUIRED: Performance tracking
class PerformanceTracker {
  static startTimer(operation: string): PerformanceTimer {
    return {
      operation,
      startTime: performance.now(),
      end: (metadata?: Record<string, any>) => {
        const duration = performance.now() - this.startTime;
        metrics.record(operation, duration, metadata);
        
        // Alert on performance degradation
        if (duration > getPerformanceThreshold(operation)) {
          logger.warn(`Performance threshold exceeded`, {
            operation,
            duration,
            threshold: getPerformanceThreshold(operation),
            metadata
          });
        }
      }
    };
  }
}

// Usage in critical operations
export async function createFlutterProject(spec: GenerationSpec): Promise<Result<FlutterProject>> {
  const timer = PerformanceTracker.startTimer('flutter_project_creation');
  
  try {
    const project = await createProjectImpl(spec);
    timer.end({ templateId: spec.templateId, platforms: spec.platforms });
    return { success: true, data: project };
  } catch (error) {
    timer.end({ error: error.message });
    throw error;
  }
}
```

## Code Review Checklist

### Before Submitting PR:
- [ ] All tests pass locally
- [ ] Code coverage meets 85% minimum
- [ ] Performance tests pass
- [ ] TypeScript compiles without errors or warnings
- [ ] ESLint passes without violations
- [ ] Documentation updated for public APIs
- [ ] Error handling tested for all failure modes

### Reviewer Checklist:
- [ ] Code follows all development rules
- [ ] Tests adequately cover new functionality
- [ ] Error handling is comprehensive
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Documentation is accurate and complete
- [ ] Breaking changes are documented

## Enforcement

### Automated Enforcement:
- **Pre-commit hooks**: Run linting, formatting, and basic tests
- **CI pipeline**: Full test suite, coverage reporting, performance benchmarks
- **PR gates**: Require passing tests and reviews before merge

### Manual Enforcement:
- **Code reviews**: Mandatory review by senior team member
- **Architecture reviews**: Complex changes reviewed by tech lead
- **Performance reviews**: Performance-critical changes benchmarked

### Consequences for Rule Violations:
1. **First violation**: Code review feedback and guidance
2. **Repeated violations**: Additional training and mentoring
3. **Persistent violations**: Escalation to team lead
4. **Critical violations**: Immediate fix required before any other work

---

*These development rules ensure we build a world-class Flutter integration that is maintainable, performant, and reliable. Adherence to these standards is not optional - they are fundamental to our success.*



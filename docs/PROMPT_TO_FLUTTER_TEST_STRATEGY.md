# Prompt to Flutter App - Comprehensive Test Strategy

## Test Architecture Overview

### Testing Pyramid Structure
```
                    E2E Tests (10%)
                   ├─ User Journey Tests
                   ├─ Cross-Platform Tests
                   └─ Performance Tests
                
              Integration Tests (20%)
             ├─ IPC Handler Tests
             ├─ Component Integration
             ├─ Hook Integration
             └─ Service Integration
        
    Unit Tests (70%)
   ├─ Component Tests
   ├─ Hook Tests
   ├─ Utility Function Tests
   ├─ IPC Handler Logic Tests
   └─ Data Model Tests
```

### Test Coverage Requirements
- **Unit Tests**: 85% minimum coverage
- **Integration Tests**: 100% coverage of IPC flows
- **E2E Tests**: 100% coverage of user journeys
- **Performance Tests**: All critical operations benchmarked

## Unit Test Suite Design

### 1. Data Model Tests

#### GenerationSpec Validation
```typescript
// src/lib/mobile/__tests__/types.test.ts
import { GenerationSpec, validateGenerationSpec, Framework } from '../types';

describe('GenerationSpec', () => {
  describe('validateGenerationSpec', () => {
    test('should validate complete valid spec', () => {
      const spec: GenerationSpec = {
        framework: 'flutter',
        templateId: 'material3-app',
        stateMgmt: 'provider',
        navigation: 'tabs',
        backend: 'none',
        auth: 'none',
        features: ['responsive', 'dark-mode'],
        platforms: ['android', 'ios'],
        themeConfig: {
          primaryColor: '#2196F3',
          useMaterial3: true
        }
      };

      const result = validateGenerationSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject spec with invalid framework', () => {
      const spec = {
        framework: 'invalid' as Framework,
        templateId: 'material3-app'
      } as GenerationSpec;

      const result = validateGenerationSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid framework: invalid');
    });

    test('should reject spec with missing required fields', () => {
      const spec = {
        framework: 'flutter'
        // Missing templateId
      } as GenerationSpec;

      const result = validateGenerationSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('templateId is required');
    });

    test('should validate platform combinations', () => {
      const spec: GenerationSpec = {
        framework: 'flutter',
        templateId: 'cupertino-app',
        platforms: ['web', 'desktop'] // Invalid for Cupertino
      } as GenerationSpec;

      const result = validateGenerationSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cupertino templates require iOS platform');
    });
  });

  describe('GenerationSpec transformations', () => {
    test('should merge template defaults with user selections', () => {
      const userSpec: Partial<GenerationSpec> = {
        framework: 'flutter',
        templateId: 'material3-app'
      };

      const template: TemplateOption = {
        id: 'material3-app',
        defaults: {
          stateMgmt: 'provider',
          navigation: 'tabs',
          platforms: ['android', 'ios']
        }
      } as TemplateOption;

      const result = mergeSpecWithTemplate(userSpec, template);
      
      expect(result.stateMgmt).toBe('provider');
      expect(result.navigation).toBe('tabs');
      expect(result.platforms).toEqual(['android', 'ios']);
    });
  });
});
```

#### Template Registry Tests
```typescript
// src/data/mobile/__tests__/templates.test.ts
import { FLUTTER_TEMPLATES, getTemplateById, getTemplatesByCategory } from '../templates';

describe('Flutter Templates', () => {
  test('should have at least 8 templates', () => {
    expect(FLUTTER_TEMPLATES).toHaveLength.greaterThanOrEqual(8);
  });

  test('should have unique template IDs', () => {
    const ids = FLUTTER_TEMPLATES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('should have valid template structure', () => {
    FLUTTER_TEMPLATES.forEach(template => {
      expect(template.id).toBeTruthy();
      expect(template.title).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.framework).toBe('flutter');
      expect(template.category).toMatch(/^(basic|navigation|state|backend|auth|feature)$/);
      expect(Array.isArray(template.platforms)).toBe(true);
      expect(template.platforms.length).toBeGreaterThan(0);
    });
  });

  test('should get template by ID', () => {
    const template = getTemplateById('material3-app');
    expect(template).toBeDefined();
    expect(template?.id).toBe('material3-app');
  });

  test('should filter templates by category', () => {
    const basicTemplates = getTemplatesByCategory('basic');
    expect(basicTemplates.length).toBeGreaterThan(0);
    basicTemplates.forEach(template => {
      expect(template.category).toBe('basic');
    });
  });
});
```

### 2. React Component Tests

#### MobileFrameworkPicker Tests
```typescript
// src/components/mobile/__tests__/MobileFrameworkPicker.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileFrameworkPicker } from '../MobileFrameworkPicker';

// Mock dependencies
jest.mock('@/hooks/mobile/useTemplateRegistry');
jest.mock('@/hooks/mobile/useMobileCreation');

const mockUseTemplateRegistry = useTemplateRegistry as jest.MockedFunction<typeof useTemplateRegistry>;
const mockUseMobileCreation = useMobileCreation as jest.MockedFunction<typeof useMobileCreation>;

describe('MobileFrameworkPicker', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onFrameworkSelected: jest.fn(),
    initialPrompt: 'Create a Flutter todo app'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTemplateRegistry.mockReturnValue({
      templates: MOCK_TEMPLATES,
      isLoading: false,
      error: null
    });
    mockUseMobileCreation.mockReturnValue({
      createApp: jest.fn(),
      isCreating: false,
      error: null
    });
  });

  test('should render framework selection step initially', () => {
    render(<MobileFrameworkPicker {...defaultProps} />);

    expect(screen.getByText('Choose Framework')).toBeInTheDocument();
    expect(screen.getByTestId('framework-expo')).toBeInTheDocument();
    expect(screen.getByTestId('framework-flutter')).toBeInTheDocument();
  });

  test('should navigate to template selection when framework selected', async () => {
    render(<MobileFrameworkPicker {...defaultProps} />);

    fireEvent.click(screen.getByTestId('framework-flutter'));

    await waitFor(() => {
      expect(screen.getByText('Choose Template')).toBeInTheDocument();
    });

    expect(screen.queryByText('Choose Framework')).not.toBeInTheDocument();
  });

  test('should filter templates by selected framework', async () => {
    render(<MobileFrameworkPicker {...defaultProps} />);

    fireEvent.click(screen.getByTestId('framework-flutter'));

    await waitFor(() => {
      expect(screen.getByTestId('template-material3-app')).toBeInTheDocument();
      expect(screen.queryByTestId('template-expo-basic')).not.toBeInTheDocument();
    });
  });

  test('should call onFrameworkSelected with complete spec', async () => {
    const onFrameworkSelected = jest.fn();
    render(
      <MobileFrameworkPicker 
        {...defaultProps} 
        onFrameworkSelected={onFrameworkSelected}
      />
    );

    // Select Flutter
    fireEvent.click(screen.getByTestId('framework-flutter'));

    await waitFor(() => {
      expect(screen.getByTestId('template-material3-app')).toBeInTheDocument();
    });

    // Select template
    fireEvent.click(screen.getByTestId('template-material3-app'));

    expect(onFrameworkSelected).toHaveBeenCalledWith({
      framework: 'flutter',
      templateId: 'material3-app',
      stateMgmt: 'provider',
      navigation: 'tabs',
      backend: 'none',
      auth: 'none',
      features: expect.any(Array),
      platforms: expect.any(Array)
    });
  });

  test('should handle template loading error', () => {
    mockUseTemplateRegistry.mockReturnValue({
      templates: [],
      isLoading: false,
      error: new Error('Failed to load templates')
    });

    render(<MobileFrameworkPicker {...defaultProps} />);

    fireEvent.click(screen.getByTestId('framework-flutter'));

    expect(screen.getByText(/Failed to load templates/)).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  test('should support keyboard navigation', async () => {
    render(<MobileFrameworkPicker {...defaultProps} />);

    const flutterCard = screen.getByTestId('framework-flutter');
    flutterCard.focus();
    fireEvent.keyDown(flutterCard, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Choose Template')).toBeInTheDocument();
    });
  });
});
```

#### TemplateCard Tests
```typescript
// src/components/mobile/__tests__/TemplateCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateCard } from '../TemplateCard';

describe('TemplateCard', () => {
  const mockTemplate: TemplateOption = {
    id: 'material3-app',
    title: 'Material 3 App',
    description: 'Modern Material Design 3 application',
    framework: 'flutter',
    category: 'basic',
    tags: ['material3', 'responsive'],
    platforms: ['android', 'ios'],
    dependencies: ['material', 'provider'],
    preview_image: '/templates/material3-preview.png'
  };

  test('should render template information', () => {
    render(
      <TemplateCard 
        template={mockTemplate}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Material 3 App')).toBeInTheDocument();
    expect(screen.getByText('Modern Material Design 3 application')).toBeInTheDocument();
    expect(screen.getByText('material3')).toBeInTheDocument();
    expect(screen.getByText('responsive')).toBeInTheDocument();
  });

  test('should show selected state', () => {
    render(
      <TemplateCard 
        template={mockTemplate}
        isSelected={true}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByTestId('template-card')).toHaveClass('selected');
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  test('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(
      <TemplateCard 
        template={mockTemplate}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId('template-card'));
    expect(onSelect).toHaveBeenCalledWith(mockTemplate);
  });

  test('should show platform badges', () => {
    render(
      <TemplateCard 
        template={mockTemplate}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Android')).toBeInTheDocument();
    expect(screen.getByText('iOS')).toBeInTheDocument();
  });

  test('should show preview image with fallback', () => {
    render(
      <TemplateCard 
        template={{...mockTemplate, preview_image: undefined}}
        isSelected={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByTestId('template-preview')).toBeInTheDocument();
    expect(screen.getByTestId('placeholder-icon')).toBeInTheDocument();
  });
});
```

### 3. React Hook Tests

#### useMobileCreation Tests
```typescript
// src/hooks/mobile/__tests__/useMobileCreation.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMobileCreation } from '../useMobileCreation';
import { IpcClient } from '@/ipc/ipc_client';

// Mock IPC client
jest.mock('@/ipc/ipc_client');
const mockIpcClient = IpcClient.getInstance as jest.MockedFunction<typeof IpcClient.getInstance>;

describe('useMobileCreation', () => {
  const mockIpc = {
    createFlutterProject: jest.fn(),
    startFlutterPreview: jest.fn(),
    generateAppNames: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcClient.mockReturnValue(mockIpc as any);
  });

  test('should create Flutter app successfully', async () => {
    const mockProject = {
      path: '/test/flutter-app',
      name: 'Test Flutter App'
    };
    
    mockIpc.createFlutterProject.mockResolvedValue(mockProject);
    mockIpc.generateAppNames.mockResolvedValue([
      { displayName: 'Task Master', packageId: 'com.applaa.taskmaster', slug: 'task-master' }
    ]);

    const { result } = renderHook(() => useMobileCreation());

    const spec: GenerationSpec = {
      framework: 'flutter',
      templateId: 'material3-app',
      stateMgmt: 'provider',
      navigation: 'tabs',
      backend: 'none',
      auth: 'none',
      features: [],
      platforms: ['android', 'ios']
    };

    await act(async () => {
      await result.current.createApp('Create a Flutter todo app', spec);
    });

    expect(mockIpc.createFlutterProject).toHaveBeenCalledWith({
      prompt: 'Create a Flutter todo app',
      spec,
      displayName: 'Task Master',
      packageId: 'com.applaa.taskmaster',
      slug: 'task-master'
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should handle creation failure', async () => {
    const error = new Error('Flutter SDK not found');
    mockIpc.createFlutterProject.mockRejectedValue(error);

    const { result } = renderHook(() => useMobileCreation());

    const spec: GenerationSpec = {
      framework: 'flutter',
      templateId: 'material3-app'
    } as GenerationSpec;

    await act(async () => {
      await result.current.createApp('Create a Flutter app', spec);
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBe(error);
  });

  test('should track creation progress', async () => {
    let progressCallback: ((progress: number) => void) | undefined;
    
    mockIpc.createFlutterProject.mockImplementation((options) => {
      progressCallback = options.onProgress;
      return new Promise(resolve => {
        setTimeout(() => {
          progressCallback?.(50);
          setTimeout(() => {
            progressCallback?.(100);
            resolve({ path: '/test/app', name: 'Test App' });
          }, 100);
        }, 100);
      });
    });

    const { result } = renderHook(() => useMobileCreation());

    act(() => {
      result.current.createApp('Create app', {} as GenerationSpec);
    });

    await waitFor(() => {
      expect(result.current.progress).toBe(50);
    });

    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });
  });
});
```

#### useFlutterDoctor Tests
```typescript
// src/hooks/mobile/__tests__/useFlutterDoctor.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFlutterDoctor } from '../useFlutterDoctor';
import { IpcClient } from '@/ipc/ipc_client';

jest.mock('@/ipc/ipc_client');
const mockIpcClient = IpcClient.getInstance as jest.MockedFunction<typeof IpcClient.getInstance>;

describe('useFlutterDoctor', () => {
  const mockIpc = {
    flutterDoctor: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcClient.mockReturnValue(mockIpc as any);
  });

  test('should run doctor check on mount', async () => {
    const mockResult: FlutterDoctorResult = {
      sdkInstalled: true,
      sdkVersion: '3.10.0',
      androidToolchain: { installed: true, issues: [] },
      iosToolchain: { installed: true, issues: [] },
      webSupport: true,
      ideSupport: [],
      issues: []
    };

    mockIpc.flutterDoctor.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useFlutterDoctor());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.doctorResult).toEqual(mockResult);
    expect(result.current.error).toBeNull();
    expect(mockIpc.flutterDoctor).toHaveBeenCalledTimes(1);
  });

  test('should handle doctor check failure', async () => {
    const error = new Error('Flutter command not found');
    mockIpc.flutterDoctor.mockRejectedValue(error);

    const { result } = renderHook(() => useFlutterDoctor());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.doctorResult).toBeNull();
    expect(result.current.error).toBe(error);
  });

  test('should support manual refetch', async () => {
    const mockResult: FlutterDoctorResult = {
      sdkInstalled: false,
      issues: [{ type: 'error', message: 'SDK not found' }]
    } as FlutterDoctorResult;

    mockIpc.flutterDoctor.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useFlutterDoctor());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate SDK installation
    const updatedResult = { ...mockResult, sdkInstalled: true, issues: [] };
    mockIpc.flutterDoctor.mockResolvedValue(updatedResult);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.doctorResult).toEqual(updatedResult);
    expect(mockIpc.flutterDoctor).toHaveBeenCalledTimes(2);
  });
});
```

### 4. IPC Handler Tests

#### Flutter Environment Handler Tests
```typescript
// src/ipc/handlers/mobile/__tests__/flutter_environment_handlers.test.ts
import { executeFlutterDoctor, checkFlutterSDK } from '../flutter_environment_handlers';
import { execAsync } from '@/ipc/utils/runShellCommand';

jest.mock('@/ipc/utils/runShellCommand');
const mockExecAsync = execAsync as jest.MockedFunction<typeof execAsync>;

describe('Flutter Environment Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeFlutterDoctor', () => {
    test('should parse doctor output correctly', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.10.0, on macOS 13.4)
[✓] Android toolchain - develop for Android devices (Android SDK version 33.0.0)
[✓] Xcode - develop for iOS and macOS (Xcode 14.3)
[✓] Chrome - develop for the web
[✓] Android Studio (version 2022.2)
[✓] VS Code (version 1.78.0)
[✓] Connected device (1 available)
[✓] Network resources

• No issues found!
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(true);
      expect(result.sdkVersion).toBe('3.10.0');
      expect(result.androidToolchain.installed).toBe(true);
      expect(result.iosToolchain.installed).toBe(true);
      expect(result.webSupport).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should handle doctor issues correctly', async () => {
      const mockOutput = `
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.10.0, on Windows 10)
[✗] Android toolchain - develop for Android devices
    ✗ Unable to locate Android SDK.
      Install Android Studio from: https://developer.android.com/studio/index.html
[!] Chrome - develop for the web (Cannot find Chrome executable)
[✓] VS Code (version 1.78.0)

! Doctor found issues in 2 categories.
      `;

      mockExecAsync.mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(true);
      expect(result.androidToolchain.installed).toBe(false);
      expect(result.webSupport).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].type).toBe('error');
      expect(result.issues[0].category).toBe('Android toolchain');
    });

    test('should handle Flutter command not found', async () => {
      mockExecAsync.mockRejectedValue(new Error('flutter: command not found'));

      const result = await executeFlutterDoctor();

      expect(result.sdkInstalled).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('error');
      expect(result.issues[0].message).toContain('Flutter SDK not found');
    });
  });

  describe('checkFlutterSDK', () => {
    test('should detect Flutter version correctly', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Flutter 3.10.0 • channel stable',
        stderr: ''
      });

      const result = await checkFlutterSDK();

      expect(result.installed).toBe(true);
      expect(result.version).toBe('3.10.0');
      expect(result.channel).toBe('stable');
    });

    test('should handle missing Flutter SDK', async () => {
      mockExecAsync.mockRejectedValue(new Error('command not found'));

      const result = await checkFlutterSDK();

      expect(result.installed).toBe(false);
      expect(result.version).toBeUndefined();
    });
  });
});
```

### 5. Performance Tests

#### Creation Performance Tests
```typescript
// src/__tests__/performance/flutter-creation.performance.test.ts
import { performance } from 'perf_hooks';
import { createFlutterProject } from '@/ipc/handlers/mobile/flutter_project_handlers';

describe('Flutter Creation Performance', () => {
  test('should create project within performance target', async () => {
    const spec: GenerationSpec = {
      framework: 'flutter',
      templateId: 'minimal',
      stateMgmt: 'none',
      navigation: 'stack',
      backend: 'none',
      auth: 'none',
      features: [],
      platforms: ['android']
    };

    const startTime = performance.now();
    const result = await createFlutterProject(spec);
    const duration = performance.now() - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(30000); // 30 seconds target
  });

  test('should start preview within performance target', async () => {
    // Assume project already exists
    const projectPath = '/test/flutter-project';

    const startTime = performance.now();
    const preview = await startFlutterPreview(projectPath);
    const duration = performance.now() - startTime;

    expect(preview.url).toBeDefined();
    expect(duration).toBeLessThan(60000); // 60 seconds target
  });

  test('should handle hot reload within performance target', async () => {
    const projectPath = '/test/flutter-project';
    await startFlutterPreview(projectPath); // Start preview first

    // Simulate file change
    const startTime = performance.now();
    await triggerHotReload(projectPath);
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(3000); // 3 seconds target
  });
});
```

## Integration Test Suite Design

### 1. IPC Integration Tests

```typescript
// src/__tests__/integration/flutter-ipc.integration.test.ts
import { IpcClient } from '@/ipc/ipc_client';
import { setupTestEnvironment, cleanupTestEnvironment } from '@/test-utils/setup';

describe('Flutter IPC Integration', () => {
  let ipcClient: IpcClient;

  beforeAll(async () => {
    await setupTestEnvironment();
    ipcClient = IpcClient.getInstance();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  test('should complete full Flutter workflow', async () => {
    // 1. Check Flutter doctor
    const doctorResult = await ipcClient.flutterDoctor();
    if (!doctorResult.sdkInstalled) {
      console.warn('Flutter SDK not installed, skipping integration test');
      return;
    }

    // 2. Create project
    const spec: GenerationSpec = {
      framework: 'flutter',
      templateId: 'material3-app',
      stateMgmt: 'provider',
      navigation: 'tabs',
      backend: 'none',
      auth: 'none',
      features: ['responsive'],
      platforms: ['android', 'ios', 'web']
    };

    const project = await ipcClient.createFlutterProject({
      prompt: 'Create a material design todo app',
      spec,
      displayName: 'Integration Test App',
      packageId: 'com.test.integration',
      slug: 'integration-test-app'
    });

    expect(project.path).toBeTruthy();
    expect(fs.existsSync(project.path)).toBe(true);

    // 3. Start preview
    const preview = await ipcClient.startFlutterPreview(project.path);
    expect(preview.url).toMatch(/^http:\/\/localhost:\d+/);

    // 4. Test hot reload
    const reloadResult = await ipcClient.triggerHotReload(project.path);
    expect(reloadResult.success).toBe(true);

    // 5. Stop preview
    await ipcClient.stopFlutterPreview(project.path);
  }, 120000); // 2 minute timeout

  test('should handle errors gracefully', async () => {
    // Test with invalid project path
    const result = await ipcClient.startFlutterPreview('/nonexistent/path');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 2. Component Integration Tests

```typescript
// src/__tests__/integration/mobile-creation-flow.integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@/pages/home';
import { TestWrapper } from '@/test-utils/TestWrapper';

describe('Mobile Creation Flow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  test('should complete mobile app creation flow', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      </QueryClientProvider>
    );

    // Enter Flutter-related prompt
    const chatInput = screen.getByTestId('chat-input');
    fireEvent.change(chatInput, { 
      target: { value: 'Create a Flutter shopping app with authentication' }
    });
    fireEvent.click(screen.getByTestId('submit-button'));

    // Wait for framework picker to open
    await waitFor(() => {
      expect(screen.getByTestId('mobile-framework-picker')).toBeInTheDocument();
    });

    // Select Flutter framework
    fireEvent.click(screen.getByTestId('framework-flutter'));

    // Wait for template selection
    await waitFor(() => {
      expect(screen.getByText('Choose Template')).toBeInTheDocument();
    });

    // Select authentication template
    fireEvent.click(screen.getByTestId('template-auth-app'));

    // Wait for creation to start
    await waitFor(() => {
      expect(screen.getByTestId('creating-project')).toBeInTheDocument();
    });

    // Wait for completion (with generous timeout)
    await waitFor(() => {
      expect(screen.getByTestId('project-created')).toBeInTheDocument();
    }, { timeout: 60000 });

    // Verify preview loads
    expect(screen.getByTestId('flutter-preview')).toBeInTheDocument();
  });
});
```

## E2E Test Suite Design

### 1. User Journey Tests

```typescript
// e2e-tests/flutter-app-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Flutter App Creation Flow', () => {
  test('should create Flutter app from prompt', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Enter Flutter-specific prompt
    await page.fill('[data-testid="chat-input"]', 
      'Create a Flutter fitness tracking app with charts and workout plans'
    );
    await page.click('[data-testid="submit-button"]');

    // Verify framework picker opens
    await expect(page.locator('[data-testid="mobile-framework-picker"]'))
      .toBeVisible({ timeout: 5000 });

    // Select Flutter framework
    await page.click('[data-testid="framework-flutter"]');

    // Verify template selection
    await expect(page.locator('text=Choose Template')).toBeVisible();

    // Select feature-rich template
    await page.click('[data-testid="template-backend-ready"]');

    // Verify creation process starts
    await expect(page.locator('[data-testid="creating-project"]')).toBeVisible();

    // Wait for preview to load (generous timeout)
    await expect(page.locator('[data-testid="flutter-preview"]'))
      .toBeVisible({ timeout: 90000 });

    // Verify preview is functional
    const previewFrame = page.frameLocator('[data-testid="flutter-preview-iframe"]');
    await expect(previewFrame.locator('text=Fitness Tracker')).toBeVisible({ timeout: 30000 });

    // Test hot reload by making a code change
    await page.click('[data-testid="code-tab"]');
    await page.fill('[data-testid="code-editor"]', 'Updated content');
    await page.keyboard.press('Control+S');

    // Verify hot reload happens
    await expect(previewFrame.locator('text=Updated content'))
      .toBeVisible({ timeout: 5000 });
  });

  test('should handle Flutter SDK not installed', async ({ page }) => {
    // Mock Flutter doctor to return SDK not found
    await page.route('**/flutter:doctor', route => {
      route.fulfill({
        json: {
          sdkInstalled: false,
          issues: [{ type: 'error', message: 'Flutter SDK not found' }]
        }
      });
    });

    await page.goto('/');
    await page.fill('[data-testid="chat-input"]', 'Create a Flutter app');
    await page.click('[data-testid="submit-button"]');

    // Should show installation guide
    await expect(page.locator('text=Flutter SDK Required')).toBeVisible();
    await expect(page.locator('[data-testid="install-flutter-guide"]')).toBeVisible();
  });
});
```

### 2. Cross-Platform Tests

```typescript
// e2e-tests/cross-platform.spec.ts
import { test, expect, devices } from '@playwright/test';

const platforms = [
  { name: 'Windows', userAgent: 'Windows NT 10.0' },
  { name: 'macOS', userAgent: 'Macintosh; Intel Mac OS X' }
];

platforms.forEach(platform => {
  test.describe(`Flutter Creation on ${platform.name}`, () => {
    test.use({ userAgent: platform.userAgent });

    test('should work correctly on platform', async ({ page }) => {
      await page.goto('/');

      // Test platform-specific behavior
      await page.fill('[data-testid="chat-input"]', 'Create a Flutter app');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('[data-testid="mobile-framework-picker"]')).toBeVisible();
      
      // Platform-specific assertions
      if (platform.name === 'macOS') {
        await expect(page.locator('text=iOS Development')).toBeVisible();
      } else {
        await expect(page.locator('text=Android Development')).toBeVisible();
      }
    });
  });
});
```

### 3. Performance E2E Tests

```typescript
// e2e-tests/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Flutter Performance', () => {
  test('should meet performance targets', async ({ page }) => {
    // Track navigation timing
    await page.goto('/');

    const startTime = Date.now();

    // Create Flutter app
    await page.fill('[data-testid="chat-input"]', 'Create a simple Flutter app');
    await page.click('[data-testid="submit-button"]');
    await page.click('[data-testid="framework-flutter"]');
    await page.click('[data-testid="template-minimal"]');

    // Wait for preview
    await expect(page.locator('[data-testid="flutter-preview"]'))
      .toBeVisible({ timeout: 60000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Assert performance target
    expect(totalTime).toBeLessThan(60000); // 60 seconds

    // Test hot reload performance
    const hotReloadStart = Date.now();
    await page.click('[data-testid="code-tab"]');
    await page.fill('[data-testid="code-editor"]', 'Test change');
    await page.keyboard.press('Control+S');

    await expect(page.frameLocator('[data-testid="flutter-preview-iframe"]')
      .locator('text=Test change')).toBeVisible({ timeout: 5000 });

    const hotReloadTime = Date.now() - hotReloadStart;
    expect(hotReloadTime).toBeLessThan(3000); // 3 seconds
  });
});
```

## Test Execution Strategy

### 1. Local Development
```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run all tests
npm run test:all
```

### 2. CI/CD Pipeline
```yaml
# .github/workflows/flutter-tests.yml
name: Flutter Feature Tests

on:
  pull_request:
    paths:
      - 'src/components/mobile/**'
      - 'src/hooks/mobile/**'
      - 'src/ipc/handlers/mobile/**'
      - 'src/lib/mobile/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit:mobile
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration:mobile

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e:mobile
```

### 3. Test Data Management
```typescript
// test-utils/fixtures/flutter-fixtures.ts
export const MOCK_GENERATION_SPECS: Record<string, GenerationSpec> = {
  minimal: {
    framework: 'flutter',
    templateId: 'minimal',
    stateMgmt: 'none',
    navigation: 'stack',
    backend: 'none',
    auth: 'none',
    features: [],
    platforms: ['android']
  },
  
  fullFeature: {
    framework: 'flutter',
    templateId: 'backend-ready',
    stateMgmt: 'riverpod',
    navigation: 'tabs',
    backend: 'rest',
    auth: 'oauth',
    features: ['responsive', 'dark-mode', 'offline'],
    platforms: ['android', 'ios', 'web']
  }
};

export const MOCK_FLUTTER_DOCTOR_RESULTS: Record<string, FlutterDoctorResult> = {
  allGood: {
    sdkInstalled: true,
    sdkVersion: '3.10.0',
    androidToolchain: { installed: true, issues: [] },
    iosToolchain: { installed: true, issues: [] },
    webSupport: true,
    ideSupport: [{ name: 'VS Code', installed: true }],
    issues: []
  },
  
  missingSDK: {
    sdkInstalled: false,
    issues: [{ type: 'error', message: 'Flutter SDK not found', category: 'SDK' }]
  }
};
```

## Test Quality Gates

### Coverage Requirements
- **Unit Tests**: 85% line coverage minimum
- **Branch Coverage**: 80% minimum
- **Integration Coverage**: 100% of IPC flows
- **E2E Coverage**: 100% of user journeys

### Performance Requirements
- **Test Execution Time**: Full suite <10 minutes
- **Individual Test Time**: <30 seconds per test
- **Parallel Execution**: Support for concurrent test runs

### Reliability Requirements
- **Flaky Test Rate**: <1% of test runs
- **Test Isolation**: No test dependencies
- **Environment Independence**: Tests work in any environment

---

*This comprehensive test strategy ensures the Flutter feature is thoroughly validated at every level, from individual functions to complete user workflows, maintaining the highest quality standards while supporting rapid development.*



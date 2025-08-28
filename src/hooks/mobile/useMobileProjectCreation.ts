/**
 * Mobile Project Creation React Hook
 * 
 * Provides a React hook for creating mobile projects with proper integration
 * into the existing Applaa app creation flow, smart naming, and progress tracking.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IpcClient } from '@/ipc/ipc_client';
import { useFlutterProjectCreation } from './useFlutterEnvironment';
import type { 
  Framework, 
  TemplateOption, 
  Platform, 
  GenerationSpec,
  ProjectCreationOptions 
} from '@/lib/mobile/types';

/**
 * Mobile project creation options
 */
export interface MobileProjectCreationRequest {
  /** Target framework */
  framework: Framework;
  
  /** Selected template */
  template: TemplateOption;
  
  /** Target platforms */
  platforms: Platform[];
  
  /** User's original prompt */
  userPrompt: string;
  
  /** Custom project name (optional) */
  customName?: string;
  
  /** Custom package ID (optional) */
  customPackageId?: string;
}

/**
 * Project creation progress information
 */
export interface ProjectCreationProgress {
  /** Current step */
  step: string;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Detailed message */
  message: string;
  
  /** Current phase */
  phase: 'generating-name' | 'creating-project' | 'configuring' | 'installing-deps' | 'finalizing' | 'complete';
}

/**
 * Hook return type
 */
interface UseMobileProjectCreationReturn {
  /** Create a mobile project */
  createProject: (request: MobileProjectCreationRequest) => Promise<void>;
  
  /** Whether project creation is in progress */
  isCreating: boolean;
  
  /** Current progress information */
  progress: ProjectCreationProgress | null;
  
  /** Error from project creation */
  error: Error | null;
  
  /** Reset creation state */
  reset: () => void;
}

/**
 * Default progress state
 */
const DEFAULT_PROGRESS: ProjectCreationProgress = {
  step: 'Preparing...',
  progress: 0,
  message: 'Initializing project creation',
  phase: 'generating-name'
};

/**
 * Hook for mobile project creation
 */
export function useMobileProjectCreation(): UseMobileProjectCreationReturn {
  const [progress, setProgress] = useState<ProjectCreationProgress | null>(null);
  const queryClient = useQueryClient();
  const ipcClient = IpcClient.getInstance();
  const flutterProjectCreation = useFlutterProjectCreation();

  // Main project creation mutation
  const createProjectMutation = useMutation({
    mutationFn: async (request: MobileProjectCreationRequest) => {
      console.log('[MobileProject] Starting creation for:', request.framework, request.template.id);

      // Step 1: Generate smart app names
      setProgress({
        step: 'Generating project name...',
        progress: 10,
        message: 'Creating a meaningful name for your app',
        phase: 'generating-name'
      });

      const nameResult = await ipcClient.generateAppNames({
        prompt: request.userPrompt,
        framework: request.framework,
        template: request.template.id
      });

      const appNames = nameResult.suggestions && nameResult.suggestions.length > 0 
        ? nameResult.suggestions[0] // Use first suggestion
        : {
            displayName: request.customName || 'My Mobile App',
            packageId: request.customPackageId || 'com.applaa.myapp',
            slug: request.customName?.toLowerCase().replace(/\s+/g, '-') || 'my-mobile-app'
          };

      // Step 2: Create GenerationSpec
      setProgress({
        step: 'Preparing project configuration...',
        progress: 20,
        message: 'Setting up project specifications',
        phase: 'creating-project'
      });

      const generationSpec: GenerationSpec = {
        framework: request.framework,
        templateId: request.template.id,
        stateMgmt: request.template.defaults?.stateMgmt || 'none',
        navigation: request.template.defaults?.navigation || 'stack',
        backend: request.template.defaults?.backend || 'none',
        auth: request.template.defaults?.auth || 'none',
        features: request.template.defaults?.features || [],
        platforms: request.platforms,
        customPackages: [],
        themeConfig: request.template.defaults?.themeConfig
      };

      // Step 3: Create the project
      if (request.framework === 'flutter') {
        setProgress({
          step: 'Creating Flutter project...',
          progress: 30,
          message: 'Generating Flutter project structure',
          phase: 'creating-project'
        });

        const projectOptions: ProjectCreationOptions = {
          prompt: request.userPrompt,
          spec: generationSpec,
          displayName: appNames.displayName,
          packageId: appNames.packageId,
          slug: appNames.slug,
          onProgress: (progressPercent, message) => {
            setProgress({
              step: 'Creating Flutter project...',
              progress: 30 + (progressPercent * 0.5), // Scale to 30-80%
              message: message || 'Setting up Flutter project',
              phase: progressPercent < 50 ? 'creating-project' : 
                     progressPercent < 80 ? 'configuring' : 'installing-deps'
            });
          }
        };

        const flutterProject = await flutterProjectCreation.mutateAsync(projectOptions);
        
        // Step 4: Register with Applaa's app system
        setProgress({
          step: 'Registering with Applaa...',
          progress: 85,
          message: 'Adding project to Applaa workspace',
          phase: 'finalizing'
        });

        await ipcClient.createApp({
          name: appNames.displayName,
          displayName: appNames.displayName,
          packageId: appNames.packageId,
          slug: appNames.slug,
          framework: 'flutter',
          path: flutterProject.path,
          template: request.template.id,
          platforms: request.platforms
        });
      } else if (request.framework === 'expo') {
        // Implement proper Expo project creation
        setProgress({
          step: 'Creating Expo project...',
          progress: 40,
          message: 'Setting up Expo Router project with beautiful mobile UI',
          phase: 'creating-project'
        });

        // CRITICAL: Update settings to use Expo template before creating app
        await ipcClient.setUserSettings({
          selectedPlatform: 'expo',
          selectedTemplateId: 'expo-base-master'
        });

        // Create Expo app using the proper template system
        const expoApp = await ipcClient.createApp({
          name: appNames.slug, // Use slug as the folder name
          displayName: appNames.displayName,
          packageId: appNames.packageId,
          slug: appNames.slug,
          framework: 'expo', // This will set appType to 'mobile'
          appType: 'mobile',
          template: request.template.id,
          platforms: request.platforms,
          initialPrompt: request.userPrompt
        });

        setProgress({
          step: 'Configuring Expo project...',
          progress: 70,
          message: 'Applying mobile-first design and navigation',
          phase: 'creating-project'
        });

        // The createFromTemplate will handle the actual file creation
        console.log('[MobileProject] Expo project created:', expoApp);
      }

      // Step 5: Finalize
      setProgress({
        step: 'Project created successfully!',
        progress: 100,
        message: `${request.framework === 'flutter' ? 'Flutter' : 'Expo'} project is ready`,
        phase: 'complete'
      });

      console.log('[MobileProject] Creation completed successfully');
    },
    onSuccess: () => {
      // Invalidate apps list to show new project
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      
      // Keep progress visible for a moment
      setTimeout(() => {
        setProgress(null);
      }, 2000);
    },
    onError: (error) => {
      console.error('[MobileProject] Creation failed:', error);
      
      setProgress({
        step: 'Project creation failed',
        progress: 0,
        message: error.message || 'An unexpected error occurred',
        phase: 'generating-name'
      });
    }
  });

  // Create project function
  const createProject = useCallback(async (request: MobileProjectCreationRequest) => {
    setProgress(DEFAULT_PROGRESS);
    await createProjectMutation.mutateAsync(request);
  }, [createProjectMutation]);

  // Reset function
  const reset = useCallback(() => {
    setProgress(null);
    createProjectMutation.reset();
  }, [createProjectMutation]);

  return {
    createProject,
    isCreating: createProjectMutation.isPending,
    progress,
    error: createProjectMutation.error,
    reset
  };
}

/**
 * Hook for mobile project creation with template validation
 */
export function useMobileProjectCreationWithValidation() {
  const baseHook = useMobileProjectCreation();
  
  const createProjectWithValidation = useCallback(async (request: MobileProjectCreationRequest) => {
    // Validate the request
    const validation = validateMobileProjectRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid project request: ${validation.errors.join(', ')}`);
    }

    // Proceed with creation
    return baseHook.createProject(request);
  }, [baseHook]);

  return {
    ...baseHook,
    createProject: createProjectWithValidation
  };
}

/**
 * Validate mobile project creation request
 */
function validateMobileProjectRequest(request: MobileProjectCreationRequest): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate framework
  if (!request.framework) {
    errors.push('Framework is required');
  }

  // Validate template
  if (!request.template) {
    errors.push('Template is required');
  } else {
    if (request.template.framework !== request.framework) {
      errors.push('Template framework does not match selected framework');
    }
  }

  // Validate platforms
  if (!request.platforms || request.platforms.length === 0) {
    errors.push('At least one platform must be selected');
  } else {
    // Check if platforms are supported by framework
    const supportedPlatforms = request.template?.platforms || [];
    const unsupportedPlatforms = request.platforms.filter(p => !supportedPlatforms.includes(p));
    
    if (unsupportedPlatforms.length > 0) {
      warnings.push(`Platforms ${unsupportedPlatforms.join(', ')} may not be fully supported by this template`);
    }
  }

  // Validate prompt
  if (!request.userPrompt.trim()) {
    warnings.push('No user prompt provided - using template defaults');
  }

  // Validate custom naming
  if (request.customPackageId && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(request.customPackageId)) {
    errors.push('Invalid package ID format');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Hook for tracking mobile project creation analytics
 */
export function useMobileProjectAnalytics() {
  const ipcClient = IpcClient.getInstance();

  const trackProjectCreation = useCallback(async (
    framework: Framework,
    template: TemplateOption,
    platforms: Platform[],
    success: boolean,
    duration?: number
  ) => {
    try {
      // Track the creation event (if analytics system exists)
      console.log('[Analytics] Mobile project creation:', {
        framework,
        template: template.id,
        platforms,
        success,
        duration
      });

      // Could send to PostHog or other analytics service
      // await ipcClient.trackEvent('mobile_project_created', { ... });
    } catch (error) {
      console.warn('[Analytics] Failed to track project creation:', error);
    }
  }, [ipcClient]);

  return {
    trackProjectCreation
  };
}



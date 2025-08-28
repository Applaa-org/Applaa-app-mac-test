/**
 * Flutter Project IPC Handlers
 * 
 * Handles Flutter project creation, validation, and management.
 * Provides comprehensive project lifecycle management.
 */

import path from 'path';
import fs from 'fs';
import { execAsync } from '@/ipc/utils/runShellCommand';
import type { 
  GenerationSpec,
  ProjectCreationOptions,
  FlutterProject,
  Result,
  MobileError,
  Platform
} from '@/lib/mobile/types';

/**
 * Project validation result
 */
interface ProjectValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  projectType?: 'flutter' | 'unknown';
}

/**
 * Project dependencies info
 */
interface ProjectDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  flutterVersion: string;
  dartVersion: string;
}

/**
 * Create a new Flutter project based on GenerationSpec
 */
export async function createFlutterProject(options: ProjectCreationOptions): Promise<Result<FlutterProject>> {
  try {
    const { spec, displayName, packageId, slug } = options;
    
    // Validate inputs
    const validation = await validateProjectCreationOptions(options);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          type: 'INVALID_SPEC',
          message: 'Invalid project creation options',
          details: validation.issues
        }
      };
    }

    // Generate project path
    const projectPath = await generateProjectPath(slug);
    
    // Report progress
    options.onProgress?.(10, 'Creating Flutter project structure...');

    // Create base Flutter project
    await createBaseFlutterProject(projectPath, packageId, displayName);
    
    options.onProgress?.(30, 'Configuring project settings...');
    
    // Configure project based on spec
    await configureProjectFromSpec(projectPath, spec);
    
    options.onProgress?.(60, 'Installing dependencies...');
    
    // Install dependencies based on template
    await installProjectDependencies(projectPath, spec);
    
    options.onProgress?.(80, 'Applying template modifications...');
    
    // Apply template-specific modifications
    await applyTemplateModifications(projectPath, spec);
    
    options.onProgress?.(100, 'Project created successfully!');

    // Get Flutter version info
    const flutterVersion = await getProjectFlutterVersion(projectPath);

    const project: FlutterProject = {
      path: projectPath,
      name: displayName,
      packageId,
      flutterVersion: flutterVersion || 'unknown',
      platforms: spec.platforms,
      config: spec
    };

    return {
      success: true,
      data: project
    };

  } catch (error) {
    console.error('Flutter project creation failed:', error);
    
    return {
      success: false,
      error: {
        type: 'PROJECT_CREATION_FAILED',
        reason: error instanceof Error ? error.message : String(error),
        suggestion: 'Check Flutter installation and try again'
      }
    };
  }
}

/**
 * Validate project creation options
 */
async function validateProjectCreationOptions(options: ProjectCreationOptions): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Validate spec
  if (!options.spec) {
    issues.push('GenerationSpec is required');
  } else {
    if (options.spec.framework !== 'flutter') {
      issues.push('Only Flutter framework is supported');
    }
    
    if (!options.spec.templateId) {
      issues.push('Template ID is required');
    }
    
    if (!options.spec.platforms || options.spec.platforms.length === 0) {
      issues.push('At least one platform must be specified');
    }
  }

  // Validate naming
  if (!options.displayName || options.displayName.trim() === '') {
    issues.push('Display name is required');
  }

  if (!options.packageId) {
    issues.push('Package ID is required');
  } else if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(options.packageId)) {
    issues.push('Invalid package ID format');
  }

  if (!options.slug) {
    issues.push('Project slug is required');
  } else if (!/^[a-z0-9-]+$/.test(options.slug)) {
    issues.push('Invalid slug format (lowercase letters, numbers, and hyphens only)');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Generate unique project path
 */
async function generateProjectPath(slug: string): Promise<string> {
  const appsDir = process.env.APPLAA_APPS_DIR || path.join(process.cwd(), 'apps');
  let projectPath = path.join(appsDir, slug);
  let counter = 1;

  // Ensure unique path
  while (fs.existsSync(projectPath)) {
    projectPath = path.join(appsDir, `${slug}-${counter}`);
    counter++;
  }

  return projectPath;
}

/**
 * Create base Flutter project using flutter create command
 */
async function createBaseFlutterProject(
  projectPath: string, 
  packageId: string, 
  displayName: string
): Promise<void> {
  const projectDir = path.dirname(projectPath);
  const projectName = path.basename(projectPath);

  // Ensure parent directory exists
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Create Flutter project
  const createCmd = [
    'flutter create',
    '--org', packageId.split('.').slice(0, -1).join('.'),
    '--project-name', projectName.replace(/-/g, '_'), // Flutter requires underscores
    '--description', `"${displayName} - Generated by Applaa"`,
    projectName
  ].join(' ');

  await execAsync(createCmd, { 
    cwd: projectDir,
    timeout: 120000 // 2 minutes timeout
  });
}

/**
 * Configure project based on GenerationSpec
 */
async function configureProjectFromSpec(projectPath: string, spec: GenerationSpec): Promise<void> {
  // Configure platforms
  await configurePlatforms(projectPath, spec.platforms);
  
  // Configure theme if specified
  if (spec.themeConfig) {
    await configureTheme(projectPath, spec.themeConfig);
  }
  
  // Configure navigation structure
  await configureNavigation(projectPath, spec.navigation);
}

/**
 * Configure supported platforms
 */
async function configurePlatforms(projectPath: string, platforms: Platform[]): Promise<void> {
  const supportedPlatforms = ['android', 'ios', 'web', 'windows', 'macos', 'linux'];
  
  for (const platform of supportedPlatforms) {
    if (platforms.includes(platform as Platform)) {
      // Enable platform if not already enabled
      try {
        await execAsync(`flutter config --enable-${platform}-desktop`, { 
          cwd: projectPath,
          timeout: 30000 
        });
      } catch (error) {
        // Some platforms might not support enabling, that's okay
        console.warn(`Could not enable ${platform} platform:`, error);
      }
    }
  }

  // Create platform-specific directories if needed
  for (const platform of platforms) {
    const platformDir = path.join(projectPath, platform);
    if (!fs.existsSync(platformDir) && platform !== 'android' && platform !== 'ios') {
      // Android and iOS are created by default, others might need explicit creation
      try {
        await execAsync(`flutter create --platforms=${platform} .`, { 
          cwd: projectPath,
          timeout: 60000 
        });
      } catch (error) {
        console.warn(`Could not create ${platform} platform:`, error);
      }
    }
  }
}

/**
 * Configure app theme
 */
async function configureTheme(projectPath: string, themeConfig: NonNullable<GenerationSpec['themeConfig']>): Promise<void> {
  const mainDartPath = path.join(projectPath, 'lib', 'main.dart');
  
  if (!fs.existsSync(mainDartPath)) {
    console.warn('main.dart not found, skipping theme configuration');
    return;
  }

  let mainContent = fs.readFileSync(mainDartPath, 'utf8');

  // Configure Material 3
  if (themeConfig.useMaterial3) {
    mainContent = mainContent.replace(
      /theme:\s*ThemeData\([^)]*\)/,
      `theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: ${themeConfig.primaryColor ? `Color(0xFF${themeConfig.primaryColor.replace('#', '')})` : 'Colors.blue'},
      )`
    );
  }

  // Configure dark mode
  if (themeConfig.darkMode) {
    const darkThemeInsert = `darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorSchemeSeed: ${themeConfig.primaryColor ? `Color(0xFF${themeConfig.primaryColor.replace('#', '')})` : 'Colors.blue'},
      ),
      themeMode: ThemeMode.system,`;
    
    mainContent = mainContent.replace(
      /(theme:\s*ThemeData\([^}]*}\s*\),)/,
      `$1\n      ${darkThemeInsert}`
    );
  }

  fs.writeFileSync(mainDartPath, mainContent);
}

/**
 * Configure navigation structure
 */
async function configureNavigation(projectPath: string, navigationType: GenerationSpec['navigation']): Promise<void> {
  // This would involve creating the appropriate navigation structure
  // For now, we'll keep the default and plan to enhance this in template-specific modifications
  console.log(`Configuring ${navigationType} navigation for project at ${projectPath}`);
}

/**
 * Install project dependencies based on spec
 */
async function installProjectDependencies(projectPath: string, spec: GenerationSpec): Promise<void> {
  const pubspecPath = path.join(projectPath, 'pubspec.yaml');
  
  if (!fs.existsSync(pubspecPath)) {
    throw new Error('pubspec.yaml not found');
  }

  let pubspecContent = fs.readFileSync(pubspecPath, 'utf8');

  // Add dependencies based on features
  const dependencies = getDependenciesForSpec(spec);
  
  for (const [name, version] of Object.entries(dependencies)) {
    if (!pubspecContent.includes(`  ${name}:`)) {
      // Add dependency to pubspec.yaml
      pubspecContent = pubspecContent.replace(
        /dependencies:\s*\n/,
        `dependencies:\n  ${name}: ${version}\n`
      );
    }
  }

  fs.writeFileSync(pubspecPath, pubspecContent);

  // Run flutter pub get
  await execAsync('flutter pub get', { 
    cwd: projectPath,
    timeout: 120000 
  });
}

/**
 * Get dependencies mapping based on GenerationSpec
 */
function getDependenciesForSpec(spec: GenerationSpec): Record<string, string> {
  const dependencies: Record<string, string> = {};

  // State management dependencies
  switch (spec.stateMgmt) {
    case 'provider':
      dependencies.provider = '^6.1.1';
      break;
    case 'riverpod':
      dependencies.flutter_riverpod = '^2.4.9';
      dependencies.riverpod_annotation = '^2.3.3';
      break;
    case 'bloc':
      dependencies.flutter_bloc = '^8.1.3';
      dependencies.bloc = '^8.1.2';
      break;
  }

  // Backend dependencies
  switch (spec.backend) {
    case 'rest':
      dependencies.http = '^1.1.0';
      dependencies.json_annotation = '^4.8.1';
      break;
    case 'graphql':
      dependencies.graphql_flutter = '^5.1.2';
      break;
    case 'firebase':
      dependencies.firebase_core = '^2.24.2';
      dependencies.cloud_firestore = '^4.13.6';
      break;
  }

  // Auth dependencies
  switch (spec.auth) {
    case 'email':
      dependencies.firebase_auth = '^4.15.3';
      break;
    case 'oauth':
      dependencies.google_sign_in = '^6.1.6';
      dependencies.sign_in_with_apple = '^5.0.0';
      break;
  }

  // Navigation dependencies
  if (spec.navigation !== 'stack') {
    dependencies.go_router = '^12.1.3';
  }

  // Feature-based dependencies
  if (spec.features.includes('responsive')) {
    dependencies.responsive_framework = '^1.1.1';
  }

  if (spec.features.includes('image-caching')) {
    dependencies.cached_network_image = '^3.3.0';
  }

  return dependencies;
}

/**
 * Apply template-specific modifications
 */
async function applyTemplateModifications(projectPath: string, spec: GenerationSpec): Promise<void> {
  // This is where we would apply template-specific code generation
  // For now, we'll create a basic structure
  console.log(`Applying template modifications for ${spec.templateId} at ${projectPath}`);
  
  // Create basic folder structure
  const libPath = path.join(projectPath, 'lib');
  const directories = ['screens', 'widgets', 'models', 'services'];
  
  for (const dir of directories) {
    const dirPath = path.join(libPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * Get Flutter version for a project
 */
async function getProjectFlutterVersion(projectPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('flutter --version', { 
      cwd: projectPath,
      timeout: 10000 
    });
    
    const match = stdout.match(/Flutter ([\d.]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Validate existing Flutter project
 */
export async function validateFlutterProject(projectPath: string): Promise<Result<ProjectValidationResult>> {
  try {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check if directory exists
    if (!fs.existsSync(projectPath)) {
      return {
        success: true,
        data: {
          valid: false,
          issues: ['Project directory does not exist'],
          warnings: []
        }
      };
    }

    // Check for pubspec.yaml
    const pubspecPath = path.join(projectPath, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) {
      issues.push('pubspec.yaml not found');
    } else {
      const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
      if (!pubspecContent.includes('flutter:')) {
        issues.push('Not a Flutter project (flutter dependency not found in pubspec.yaml)');
      }
    }

    // Check for lib directory
    const libPath = path.join(projectPath, 'lib');
    if (!fs.existsSync(libPath)) {
      issues.push('lib directory not found');
    }

    // Check for main.dart
    const mainPath = path.join(libPath, 'main.dart');
    if (!fs.existsSync(mainPath)) {
      warnings.push('main.dart not found in lib directory');
    }

    // Check dependencies
    try {
      await execAsync('flutter pub deps', { 
        cwd: projectPath,
        timeout: 30000 
      });
    } catch {
      warnings.push('Dependencies may need to be installed (run flutter pub get)');
    }

    return {
      success: true,
      data: {
        valid: issues.length === 0,
        issues,
        warnings,
        projectType: issues.length === 0 ? 'flutter' : 'unknown'
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        type: 'PROJECT_CREATION_FAILED',
        reason: 'Failed to validate project',
        suggestion: 'Check project path and permissions'
      }
    };
  }
}

/**
 * Get project dependencies information
 */
export async function getProjectDependencies(projectPath: string): Promise<Result<ProjectDependencies>> {
  try {
    const pubspecPath = path.join(projectPath, 'pubspec.yaml');
    
    if (!fs.existsSync(pubspecPath)) {
      return {
        success: false,
        error: {
          type: 'PROJECT_CREATION_FAILED',
          reason: 'pubspec.yaml not found',
          suggestion: 'Ensure this is a valid Flutter project'
        }
      };
    }

    const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
    
    // Parse dependencies (simplified YAML parsing)
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {};
    
    const dependenciesMatch = pubspecContent.match(/dependencies:\s*\n([\s\S]*?)(?=\n\w|$)/);
    if (dependenciesMatch) {
      const depLines = dependenciesMatch[1].split('\n');
      for (const line of depLines) {
        const match = line.match(/^\s+([^:]+):\s*(.+)$/);
        if (match && !match[1].includes('flutter')) {
          dependencies[match[1].trim()] = match[2].trim();
        }
      }
    }

    // Get Flutter and Dart versions
    const { stdout } = await execAsync('flutter --version', { 
      cwd: projectPath,
      timeout: 10000 
    });
    
    const flutterMatch = stdout.match(/Flutter ([\d.]+)/);
    const dartMatch = stdout.match(/Dart ([\d.]+)/);

    return {
      success: true,
      data: {
        dependencies,
        devDependencies,
        flutterVersion: flutterMatch?.[1] || 'unknown',
        dartVersion: dartMatch?.[1] || 'unknown'
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        type: 'PROJECT_CREATION_FAILED',
        reason: 'Failed to get project dependencies',
        suggestion: 'Check project path and Flutter installation'
      }
    };
  }
}



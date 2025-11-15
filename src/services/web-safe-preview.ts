import { Problem } from '../ipc/ipc_types';

export interface WebCompatibilityIssue {
  type: 'native-module' | 'platform-api' | 'gesture' | 'device-feature';
  severity: 'error' | 'warning';
  module: string;
  replacement: string;
  description: string;
  autoFixable: boolean;
}

export class WebSafePreviewValidator {
  private static instance: WebSafePreviewValidator;
  
  public static getInstance(): WebSafePreviewValidator {
    if (!WebSafePreviewValidator.instance) {
      WebSafePreviewValidator.instance = new WebSafePreviewValidator();
    }
    return WebSafePreviewValidator.instance;
  }

  /**
   * Native modules that break in web preview
   */
  private readonly NATIVE_MODULES = {
    // Gesture and Touch
    'react-native-gesture-handler': {
      replacement: 'Web-compatible touch events',
      description: 'Gesture handler not available in web preview',
      autoFixable: true
    },
    'react-native-reanimated': {
      replacement: 'CSS animations or basic React animations',
      description: 'Reanimated not available in web preview',
      autoFixable: true
    },
    
    // Device APIs
    'expo-haptics': {
      replacement: 'Visual feedback (vibration API if available)',
      description: 'Haptic feedback not available in web preview',
      autoFixable: true
    },
    'expo-camera': {
      replacement: 'Web camera API or placeholder',
      description: 'Camera not available in web preview',
      autoFixable: true
    },
    'expo-location': {
      replacement: 'Geolocation API or mock location',
      description: 'Location services not available in web preview',
      autoFixable: true
    },
    'expo-notifications': {
      replacement: 'Web notifications API',
      description: 'Push notifications not available in web preview',
      autoFixable: true
    },
    'expo-sensors': {
      replacement: 'Mock sensor data',
      description: 'Device sensors not available in web preview',
      autoFixable: true
    },
    'expo-barcode-scanner': {
      replacement: 'Web camera + barcode library',
      description: 'Barcode scanner not available in web preview',
      autoFixable: true
    },
    
    // Platform-specific
    'react-native-device-info': {
      replacement: 'Web device detection',
      description: 'Device info not available in web preview',
      autoFixable: true
    },
    'react-native-keychain': {
      replacement: 'localStorage or secure storage polyfill',
      description: 'Keychain not available in web preview',
      autoFixable: true
    }
  };

  /**
   * Platform APIs that need web alternatives
   */
  private readonly PLATFORM_APIS = {
    'Haptics.': {
      replacement: 'Platform.OS === "web" ? visualFeedback() : Haptics.impactAsync()',
      description: 'Haptic feedback needs platform check for web',
      autoFixable: true
    },
    'Camera.': {
      replacement: 'Platform.OS === "web" ? webCameraAPI() : Camera.takePicture()',
      description: 'Camera API needs web alternative',
      autoFixable: true
    },
    'Location.': {
      replacement: 'Platform.OS === "web" ? navigator.geolocation : Location.getCurrentPosition()',
      description: 'Location API needs web alternative',
      autoFixable: true
    }
  };

  /**
   * Check file content for web compatibility issues
   */
  checkWebCompatibility(filePath: string, content: string): WebCompatibilityIssue[] {
    const issues: WebCompatibilityIssue[] = [];

    // Check for native module imports
    for (const [module, info] of Object.entries(this.NATIVE_MODULES)) {
      if (content.includes(`from '${module}'`) || content.includes(`import '${module}'`)) {
        issues.push({
          type: 'native-module',
          severity: 'error',
          module,
          replacement: info.replacement,
          description: info.description,
          autoFixable: info.autoFixable
        });
      }
    }

    // Check for platform API usage without Platform.OS checks
    for (const [api, info] of Object.entries(this.PLATFORM_APIS)) {
      if (content.includes(api) && !content.includes('Platform.OS')) {
        issues.push({
          type: 'platform-api',
          severity: 'error',
          module: api.replace('.', ''),
          replacement: info.replacement,
          description: info.description,
          autoFixable: info.autoFixable
        });
      }
    }

    // Check for gesture-specific code
    if (content.includes('PanGestureHandler') || content.includes('SwipeGestureHandler')) {
      issues.push({
        type: 'gesture',
        severity: 'error',
        module: 'react-native-gesture-handler',
        replacement: 'Web touch events or CSS transitions',
        description: 'Native gesture handlers not available in web preview',
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * Convert web compatibility issues to Problems for Problems Tab
   */
  convertToProblems(filePath: string, issues: WebCompatibilityIssue[]): Problem[] {
    return issues.map((issue, index) => ({
      file: filePath,
      line: 1, // We'll need to find actual line numbers
      column: 1,
      message: `Web Preview Issue: ${issue.description}`,
      severity: issue.severity,
      code: `WEB_PREVIEW_${issue.type.toUpperCase()}`,
      autoFixable: issue.autoFixable,
      source: 'web-compatibility'
    }));
  }

  /**
   * Generate web-safe code replacements
   */
  generateWebSafeCode(originalCode: string, issues: WebCompatibilityIssue[]): string {
    let modifiedCode = originalCode;

    // Add Platform import if not present
    if (issues.some(issue => issue.type === 'platform-api') && !modifiedCode.includes('Platform')) {
      modifiedCode = `import { Platform } from 'react-native';\n${modifiedCode}`;
    }

    // Replace native module imports with web-safe alternatives
    for (const issue of issues) {
      if (issue.type === 'native-module') {
        modifiedCode = this.replaceNativeModuleImport(modifiedCode, issue);
      } else if (issue.type === 'platform-api') {
        modifiedCode = this.replacePlatformAPI(modifiedCode, issue);
      } else if (issue.type === 'gesture') {
        modifiedCode = this.replaceGestureHandler(modifiedCode, issue);
      }
    }

    return modifiedCode;
  }

  private replaceNativeModuleImport(code: string, issue: WebCompatibilityIssue): string {
    const moduleName = issue.module;
    
    // Replace import statements
    code = code.replace(
      new RegExp(`import.*from\\s*['"]${moduleName}['"]`, 'g'),
      `// Web Preview: ${moduleName} replaced with web-safe alternative
// import ${moduleName} from '${moduleName}'; // Disabled for web preview`
    );

    // Add web-safe replacement
    code += `\n\n// Web Preview Replacement for ${moduleName}
const webSafe${this.capitalize(moduleName)} = {
  // ${issue.replacement}
  // This will be replaced with actual implementation when running on device
};\n`;

    return code;
  }

  private replacePlatformAPI(code: string, issue: WebCompatibilityIssue): string {
    // This would contain more sophisticated replacement logic
    // For now, we'll add a comment about the issue
    code += `\n\n// Web Preview: ${issue.module} needs platform check
// Original: ${issue.module}
// Web Safe: ${issue.replacement}\n`;

    return code;
  }

  private replaceGestureHandler(code: string, issue: WebCompatibilityIssue): string {
    // Replace gesture handlers with web-safe touch events
    code = code.replace(
      /PanGestureHandler|SwipeGestureHandler/g,
      'WebSafeGestureHandler // Replaced for web preview'
    );

    code += `\n\n// Web Preview: Gesture handlers replaced with web-safe alternatives
const WebSafeGestureHandler = ({ children, onSwipe, ...props }) => {
  const handleTouchEnd = (e) => {
    // Basic web touch handling
    if (onSwipe) onSwipe(e);
  };
  
  return (
    <div onTouchEnd={handleTouchEnd} {...props}>
      {children}
    </div>
  );
};\n`;

    return code;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Check if file should be excluded from web preview
   */
  shouldExcludeFromWebPreview(filePath: string): boolean {
    const excludePatterns = [
      /camera/i,
      /sensor/i,
      /haptic/i,
      /gesture/i,
      /native/i
    ];

    return excludePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Generate web preview warning message
   */
  generateWebPreviewWarning(issues: WebCompatibilityIssue[]): string {
    if (issues.length === 0) return '';

    const nativeModules = issues.filter(i => i.type === 'native-module');
    const platformAPIs = issues.filter(i => i.type === 'platform-api');

    let warning = '🌐 **Web Preview Notice:**\n\n';
    
    if (nativeModules.length > 0) {
      warning += `**Native Modules Detected (${nativeModules.length}):**\n`;
      nativeModules.forEach(issue => {
        warning += `- ${issue.module}: ${issue.description}\n`;
      });
      warning += '\n';
    }

    if (platformAPIs.length > 0) {
      warning += `**Platform APIs Detected (${platformAPIs.length}):**\n`;
      platformAPIs.forEach(issue => {
        warning += `- ${issue.module}: ${issue.description}\n`;
      });
      warning += '\n';
    }

    warning += `**Note:** These features work perfectly on real devices but are replaced with web-safe alternatives in this preview. The actual app will have full native functionality!\n\n`;
    
    if (issues.some(i => i.autoFixable)) {
      warning += '🔧 **Auto-fix available:** Click "Fix for Web Preview" to apply web-safe replacements.';
    }

    return warning;
  }
}

export const webSafePreviewValidator = WebSafePreviewValidator.getInstance();

/**
 * Flutter Environment IPC Handlers
 * 
 * Handles Flutter SDK detection, validation, and environment setup.
 * Provides comprehensive Flutter Doctor functionality and SDK management.
 */

import { execAsync } from '@/ipc/utils/runShellCommand';
import type { 
  FlutterDoctorResult, 
  ToolchainStatus, 
  IDEStatus, 
  DoctorIssue,
  Result,
  MobileError
} from '@/lib/mobile/types';

/**
 * SDK check result interface
 */
interface SDKCheckResult {
  installed: boolean;
  version?: string;
  channel?: string;
  path?: string;
}

/**
 * Detailed version information
 */
interface FlutterVersionInfo {
  flutter: string;
  channel: string;
  dart: string;
  framework: string;
  engine: string;
  tools: string;
}

/**
 * SDK installation guidance
 */
interface SDKInstallationGuide {
  platform: string;
  downloadUrl: string;
  instructions: string[];
  requirements: string[];
  postInstallSteps: string[];
}

/**
 * Execute Flutter Doctor and parse comprehensive results
 */
export async function executeFlutterDoctor(): Promise<FlutterDoctorResult> {
  try {
    const { stdout, stderr } = await execAsync('flutter doctor', { timeout: 30000 });
    
    return parseFlutterDoctorOutput(stdout);
  } catch (error) {
    console.error('Flutter doctor execution failed:', error);
    
    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
      return {
        sdkInstalled: false,
        androidToolchain: { installed: false, issues: [] },
        iosToolchain: { installed: false, issues: [] },
        webSupport: false,
        ideSupport: [],
        issues: [{
          type: 'error',
          category: 'Flutter SDK',
          message: 'Flutter SDK not found in system PATH',
          suggestion: 'Install Flutter SDK and add it to your system PATH. Visit https://docs.flutter.dev/get-started/install'
        }]
      };
    }
    
    if (errorMessage.includes('Permission denied')) {
      return {
        sdkInstalled: false,
        androidToolchain: { installed: false, issues: [] },
        iosToolchain: { installed: false, issues: [] },
        webSupport: false,
        ideSupport: [],
        issues: [{
          type: 'error',
          category: 'Permissions',
          message: 'Permission denied when running Flutter commands',
          suggestion: 'Check file permissions and ensure Flutter SDK directory is accessible'
        }]
      };
    }
    
    // Generic error fallback
    return {
      sdkInstalled: false,
      androidToolchain: { installed: false, issues: [] },
      iosToolchain: { installed: false, issues: [] },
      webSupport: false,
      ideSupport: [],
      issues: [{
        type: 'error',
        category: 'Unknown',
        message: `Flutter doctor failed: ${errorMessage}`,
        suggestion: 'Check Flutter installation and try running "flutter doctor" manually'
      }]
    };
  }
}

/**
 * Parse Flutter Doctor output into structured result
 */
function parseFlutterDoctorOutput(output: string): FlutterDoctorResult {
  const lines = output.split('\n').map(line => line.trim());
  
  const result: FlutterDoctorResult = {
    sdkInstalled: false,
    androidToolchain: { installed: false, issues: [] },
    iosToolchain: { installed: false, issues: [] },
    webSupport: false,
    ideSupport: [],
    issues: []
  };

  let currentCategory = '';
  let inSummary = false;

  for (const line of lines) {
    // Start of doctor summary
    if (line.includes('Doctor summary')) {
      inSummary = true;
      continue;
    }

    if (!inSummary) continue;

    // Parse Flutter SDK line
    if (line.includes('[✓] Flutter (')) {
      result.sdkInstalled = true;
      const versionMatch = line.match(/Channel\s+(\w+),\s+([\d.]+)/);
      if (versionMatch) {
        result.channel = versionMatch[1];
        result.sdkVersion = versionMatch[2];
      }
      continue;
    }

    // Parse Android toolchain
    if (line.includes('Android toolchain')) {
      currentCategory = 'Android toolchain';
      if (line.startsWith('[✓]')) {
        result.androidToolchain.installed = true;
        const versionMatch = line.match(/Android SDK version ([\d.]+)/);
        if (versionMatch) {
          result.androidToolchain.version = versionMatch[1];
        }
      } else if (line.startsWith('[✗]')) {
        result.androidToolchain.installed = false;
      }
      continue;
    }

    // Parse iOS toolchain (Xcode)
    if (line.includes('Xcode')) {
      currentCategory = 'Xcode';
      if (line.startsWith('[✓]')) {
        result.iosToolchain.installed = true;
        const versionMatch = line.match(/Xcode ([\d.]+)/);
        if (versionMatch) {
          result.iosToolchain.version = versionMatch[1];
        }
      } else if (line.startsWith('[✗]')) {
        result.iosToolchain.installed = false;
      }
      continue;
    }

    // Parse Chrome/Web support
    if (line.includes('Chrome')) {
      currentCategory = 'Chrome';
      if (line.startsWith('[✓]')) {
        result.webSupport = true;
      } else if (line.startsWith('[✗]') || line.startsWith('[!]')) {
        result.webSupport = false;
      }
      continue;
    }

    // Parse IDE support
    if (line.includes('Android Studio')) {
      const installed = line.startsWith('[✓]');
      const versionMatch = line.match(/version ([\d.]+)/);
      result.ideSupport.push({
        name: 'Android Studio',
        installed,
        version: versionMatch?.[1],
        flutterPlugin: installed, // Assume if installed
        dartPlugin: installed
      });
      continue;
    }

    if (line.includes('VS Code')) {
      const installed = line.startsWith('[✓]');
      const versionMatch = line.match(/version ([\d.]+)/);
      result.ideSupport.push({
        name: 'VS Code',
        installed,
        version: versionMatch?.[1],
        flutterPlugin: installed,
        dartPlugin: installed
      });
      continue;
    }

    // Parse issues
    if (line.startsWith('✗') || line.startsWith('!')) {
      const issueType = line.startsWith('✗') ? 'error' : 'warning';
      const message = line.substring(2).trim();
      
      result.issues.push({
        type: issueType,
        category: currentCategory || 'General',
        message,
        suggestion: generateSuggestionForIssue(message)
      });
      continue;
    }

    // Parse detailed issue descriptions
    if (currentCategory && line.startsWith('Install ') || line.startsWith('Download ')) {
      const lastIssue = result.issues[result.issues.length - 1];
      if (lastIssue && lastIssue.category === currentCategory) {
        lastIssue.suggestion = line.trim();
      }
    }
  }

  return result;
}

/**
 * Generate helpful suggestions for common issues
 */
function generateSuggestionForIssue(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('android sdk')) {
    return 'Install Android Studio from https://developer.android.com/studio/index.html';
  }
  
  if (lowerMessage.includes('xcode')) {
    return 'Install Xcode from the Mac App Store';
  }
  
  if (lowerMessage.includes('chrome')) {
    return 'Install Google Chrome from https://www.google.com/chrome/';
  }
  
  if (lowerMessage.includes('cmdline-tools')) {
    return 'Run "flutter doctor --android-licenses" to accept Android licenses';
  }
  
  return 'See detailed instructions by running "flutter doctor -v"';
}

/**
 * Quick Flutter SDK check
 */
export async function checkFlutterSDK(): Promise<SDKCheckResult> {
  try {
    const { stdout } = await execAsync('flutter --version', { timeout: 10000 });
    
    const versionMatch = stdout.match(/Flutter ([\d.]+)\s+•\s+channel\s+(\w+)/);
    if (versionMatch) {
      return {
        installed: true,
        version: versionMatch[1],
        channel: versionMatch[2]
      };
    }
    
    return { installed: false };
  } catch (error) {
    console.error('Flutter SDK check failed:', error);
    return { installed: false };
  }
}

/**
 * Get detailed Flutter version information
 */
export async function getFlutterVersion(): Promise<Result<FlutterVersionInfo>> {
  try {
    const { stdout } = await execAsync('flutter --version', { timeout: 10000 });
    
    const lines = stdout.split('\n').map(line => line.trim());
    const versionInfo: Partial<FlutterVersionInfo> = {};
    
    for (const line of lines) {
      if (line.startsWith('Flutter ')) {
        const match = line.match(/Flutter ([\d.]+)\s+•\s+channel\s+(\w+)/);
        if (match) {
          versionInfo.flutter = match[1];
          versionInfo.channel = match[2];
        }
      } else if (line.startsWith('Framework')) {
        const match = line.match(/revision\s+([a-f0-9]+)/);
        if (match) {
          versionInfo.framework = match[1];
        }
      } else if (line.startsWith('Engine')) {
        const match = line.match(/revision\s+([a-f0-9]+)/);
        if (match) {
          versionInfo.engine = match[1];
        }
      } else if (line.startsWith('Tools')) {
        const dartMatch = line.match(/Dart ([\d.]+)/);
        if (dartMatch) {
          versionInfo.dart = dartMatch[1];
        }
        versionInfo.tools = line;
      }
    }
    
    if (versionInfo.flutter && versionInfo.channel && versionInfo.dart) {
      return {
        success: true,
        data: versionInfo as FlutterVersionInfo
      };
    }
    
    return {
      success: false,
      error: {
        type: 'SDK_NOT_FOUND',
        framework: 'flutter',
        suggestion: 'Flutter SDK not found or version information incomplete'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'SDK_NOT_FOUND',
        framework: 'flutter',
        suggestion: 'Unable to get Flutter version. Ensure Flutter is installed and in PATH.'
      }
    };
  }
}

/**
 * Provide platform-specific Flutter SDK installation guidance
 */
export async function installFlutterSDK(): Promise<Result<SDKInstallationGuide>> {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return {
        success: true,
        data: {
          platform: 'windows',
          downloadUrl: 'https://docs.flutter.dev/get-started/install/windows',
          instructions: [
            'Download Flutter SDK for Windows',
            'Extract the zip file to a desired location (e.g., C:\\flutter)',
            'Add Flutter to your PATH environment variable',
            'Run "flutter doctor" to verify installation'
          ],
          requirements: [
            'Windows 10 or later (64-bit)',
            'Git for Windows',
            'Windows PowerShell 5.0 or newer'
          ],
          postInstallSteps: [
            'Install Android Studio for Android development',
            'Install Visual Studio Code with Flutter extension',
            'Run "flutter doctor" to check for any missing dependencies'
          ]
        }
      };
      
    case 'darwin':
      return {
        success: true,
        data: {
          platform: 'macos',
          downloadUrl: 'https://docs.flutter.dev/get-started/install/macos',
          instructions: [
            'Download Flutter SDK for macOS',
            'Extract the zip file to a desired location (e.g., ~/development)',
            'Add Flutter to your PATH in ~/.zshrc or ~/.bash_profile',
            'Run "flutter doctor" to verify installation'
          ],
          requirements: [
            'macOS 10.14 (Mojave) or later',
            'Xcode (for iOS development)',
            'Git',
            'CocoaPods (for iOS development)'
          ],
          postInstallSteps: [
            'Install Xcode from the Mac App Store',
            'Install Android Studio for Android development',
            'Install CocoaPods: sudo gem install cocoapods',
            'Accept Xcode license: sudo xcodebuild -license'
          ]
        }
      };
      
    case 'linux':
      return {
        success: true,
        data: {
          platform: 'linux',
          downloadUrl: 'https://docs.flutter.dev/get-started/install/linux',
          instructions: [
            'Download Flutter SDK for Linux',
            'Extract the tar file to a desired location (e.g., ~/development)',
            'Add Flutter to your PATH in ~/.bashrc or ~/.zshrc',
            'Run "flutter doctor" to verify installation'
          ],
          requirements: [
            'Ubuntu 18.04 LTS or later (64-bit)',
            'Git',
            'curl',
            'unzip'
          ],
          postInstallSteps: [
            'Install Android Studio for Android development',
            'Install Visual Studio Code with Flutter extension',
            'Install Chrome for web development',
            'Run "flutter doctor" to check for any missing dependencies'
          ]
        }
      };
      
    default:
      return {
        success: false,
        error: {
          type: 'PLATFORM_NOT_SUPPORTED',
          platform: platform,
          framework: 'flutter'
        }
      };
  }
}

/**
 * Check if Flutter is available in PATH
 */
export async function isFlutterInPath(): Promise<boolean> {
  try {
    await execAsync('flutter --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Flutter installation path
 */
export async function getFlutterPath(): Promise<Result<string>> {
  try {
    const { stdout } = await execAsync('where flutter', { timeout: 5000 });
    const path = stdout.trim().split('\n')[0];
    
    return {
      success: true,
      data: path
    };
  } catch {
    try {
      // Try Unix-style which command
      const { stdout } = await execAsync('which flutter', { timeout: 5000 });
      const path = stdout.trim();
      
      return {
        success: true,
        data: path
      };
    } catch {
      return {
        success: false,
        error: {
          type: 'SDK_NOT_FOUND',
          framework: 'flutter',
          suggestion: 'Flutter not found in PATH'
        }
      };
    }
  }
}

/**
 * Validate Flutter environment for development
 */
export async function validateFlutterEnvironment(): Promise<Result<{
  ready: boolean;
  issues: string[];
  recommendations: string[];
}>> {
  try {
    const doctorResult = await executeFlutterDoctor();
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (!doctorResult.sdkInstalled) {
      issues.push('Flutter SDK not installed');
      recommendations.push('Install Flutter SDK from https://docs.flutter.dev/get-started/install');
    }
    
    if (!doctorResult.androidToolchain.installed) {
      issues.push('Android toolchain not configured');
      recommendations.push('Install Android Studio and accept Android licenses');
    }
    
    if (process.platform === 'darwin' && !doctorResult.iosToolchain.installed) {
      issues.push('iOS development not configured');
      recommendations.push('Install Xcode from the Mac App Store');
    }
    
    if (!doctorResult.webSupport) {
      recommendations.push('Install Chrome for web development support');
    }
    
    const hasIDE = doctorResult.ideSupport.some(ide => ide.installed);
    if (!hasIDE) {
      recommendations.push('Install an IDE like VS Code or Android Studio with Flutter plugins');
    }
    
    return {
      success: true,
      data: {
        ready: issues.length === 0,
        issues,
        recommendations
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'UNKNOWN_ERROR',
        reason: 'Failed to validate Flutter environment',
        suggestion: 'Check Flutter installation manually'
      }
    };
  }
}



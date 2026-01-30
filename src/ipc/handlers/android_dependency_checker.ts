import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ipcMain } from 'electron';
import log from 'electron-log';

const logger = log.scope('android-dependency-checker');

interface AndroidDependencyStatus {
  androidSdk: {
    installed: boolean;
    path?: string;
    version?: string;
    issues: string[];
  };
  androidNdk: {
    installed: boolean;
    path?: string;
    version?: string;
    issues: string[];
  };
  java: {
    installed: boolean;
    version?: string;
    path?: string;
    issues: string[];
  };
  gradle: {
    installed: boolean;
    version?: string;
    issues: string[];
  };
  environment: {
    androidHome?: string;
    javaHome?: string;
    pathIncludesAndroid: boolean;
    pathIncludesJava: boolean;
    issues: string[];
  };
  overall: {
    ready: boolean;
    missingDependencies: string[];
    recommendations: string[];
  };
}

interface IOSDependencyStatus {
  xcode: {
    installed: boolean;
    path?: string;
    version?: string;
    issues: string[];
  };
  commandLineTools: {
    installed: boolean;
    version?: string;
    issues: string[];
  };
  cocoapods: {
    installed: boolean;
    version?: string;
    issues: string[];
  };
  environment: {
    developerDir?: string;
    pathIncludesXcode: boolean;
    issues: string[];
  };
  overall: {
    ready: boolean;
    missingDependencies: string[];
    recommendations: string[];
  };
}

interface BuildDependencyStatus {
  android: AndroidDependencyStatus;
  ios: IOSDependencyStatus;
  overall: {
    ready: boolean;
    missingDependencies: string[];
    recommendations: string[];
  };
}

/**
 * Check if Android SDK is installed and accessible
 */
async function checkAndroidSdk(): Promise<{
  installed: boolean;
  path?: string;
  version?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let sdkPath: string | undefined;
  let version: string | undefined;

  try {
    // Check ANDROID_HOME environment variable
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (androidHome && fs.existsSync(androidHome)) {
      sdkPath = androidHome;
      installed = true;
      
      // Try to get SDK version from source.properties
      const versionFile = path.join(androidHome, 'sources', 'android-34', 'source.properties');
      if (fs.existsSync(versionFile)) {
        try {
          const content = fs.readFileSync(versionFile, 'utf8');
          const apiLevelMatch = content.match(/AndroidVersion\.ApiLevel=(\d+)/);
          if (apiLevelMatch) {
            version = `API ${apiLevelMatch[1]}`;
          } else {
            version = 'API 34'; // Default fallback
          }
        } catch (error) {
          version = 'API 34'; // Default fallback
        }
      }
    } else {
      issues.push('ANDROID_HOME environment variable not set');
    }

    // Check common installation paths
    if (!installed) {
      const commonPaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'), // Windows
        path.join(os.homedir(), 'Library', 'Android', 'sdk'), // macOS
        path.join(os.homedir(), 'Android', 'Sdk'), // Linux/macOS
        '/usr/local/android-sdk', // Linux
        '/opt/android-sdk', // Linux
      ];

      for (const commonPath of commonPaths) {
        if (fs.existsSync(commonPath)) {
          sdkPath = commonPath;
          installed = true;
          break;
        }
      }
    }

    if (!installed) {
      issues.push('Android SDK not found in common locations');
    }

    // Check if SDK tools are available
    if (installed && sdkPath) {
      const sdkManager = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', 'sdkmanager');
      const platformTools = path.join(sdkPath, 'platform-tools', 'adb');
      
      if (!fs.existsSync(sdkManager)) {
        issues.push('SDK Manager not found - install command line tools');
      }
      if (!fs.existsSync(platformTools)) {
        issues.push('Platform tools not found - install platform tools');
      }
    }

  } catch (error: any) {
    issues.push(`Error checking Android SDK: ${error.message}`);
  }

  return { installed, path: sdkPath, version, issues };
}

/**
 * Check if Android NDK is installed
 */
async function checkAndroidNdk(): Promise<{
  installed: boolean;
  path?: string;
  version?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let ndkPath: string | undefined;
  let version: string | undefined;

  try {
    // Check ANDROID_NDK_HOME environment variable
    const ndkHome = process.env.ANDROID_NDK_HOME;
    if (ndkHome && fs.existsSync(ndkHome)) {
      ndkPath = ndkHome;
      installed = true;
    }

    // Check common NDK locations
    if (!installed) {
      const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      if (androidHome) {
        const ndkDir = path.join(androidHome, 'ndk');
        if (fs.existsSync(ndkDir)) {
          // Find the latest NDK version
          const versions = fs.readdirSync(ndkDir).filter(name => 
            fs.statSync(path.join(ndkDir, name)).isDirectory() && 
            /^\d+\.\d+\.\d+/.test(name)
          ).sort().reverse();
          
          if (versions.length > 0) {
            ndkPath = path.join(ndkDir, versions[0]);
            version = versions[0];
            installed = true;
          }
        }
      }
    }

    if (!installed) {
      issues.push('Android NDK not found');
    }

  } catch (error: any) {
    issues.push(`Error checking Android NDK: ${error.message}`);
  }

  return { installed, path: ndkPath, version, issues };
}

/**
 * Check if Java is installed and accessible
 */
async function checkJava(): Promise<{
  installed: boolean;
  version?: string;
  path?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let version: string | undefined;
  let javaPath: string | undefined;

  try {
    // Check multiple possible Java installations
    const possibleJavaPaths = [
      process.env.JAVA_HOME,
      '/opt/homebrew/opt/openjdk@11',
      '/opt/homebrew/opt/openjdk@17',
      '/opt/homebrew/opt/openjdk@21',
      '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
      '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home',
      '/Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home',
      '/usr/libexec/java_home'
    ].filter(Boolean);

    // First, try to find Java via java_home (macOS specific)
    try {
      const javaHomeResult = await new Promise<string>((resolve) => {
        const javaHome = spawn('/usr/libexec/java_home', [], { stdio: 'pipe' });
        let output = '';
        
        javaHome.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        javaHome.on('close', (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            resolve('');
          }
        });
        
        javaHome.on('error', () => {
          resolve('');
        });
      });
      
      if (javaHomeResult) {
        javaPath = javaHomeResult;
        installed = true;
        
        // Get version from the found Java
        try {
          const versionResult = await new Promise<string>((resolve) => {
            const java = spawn(path.join(javaHomeResult, 'bin', 'java'), ['-version'], { stdio: 'pipe' });
            let output = '';
            
            java.stderr?.on('data', (data) => {
              output += data.toString();
            });
            
            java.on('close', (code) => {
              if (code === 0) {
                resolve(output);
              } else {
                resolve('');
              }
            });
            
            java.on('error', () => {
              resolve('');
            });
          });
          
          if (versionResult) {
            const versionMatch = versionResult.match(/version "([^"]+)"/);
            if (versionMatch) {
              version = versionMatch[1];
            }
          }
        } catch (error) {
          issues.push('Could not determine Java version');
        }
      }
    } catch (error) {
      // java_home not available, continue with other methods
    }

    // If not found via java_home, check JAVA_HOME
    if (!installed && process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
      javaPath = process.env.JAVA_HOME;
      installed = true;
      
      try {
        const versionResult = await new Promise<string>((resolve) => {
          const java = spawn(path.join(process.env.JAVA_HOME!, 'bin', 'java'), ['-version'], { stdio: 'pipe' });
          let output = '';
          
          java.stderr?.on('data', (data) => {
            output += data.toString();
          });
          
          java.on('close', (code) => {
            if (code === 0) {
              resolve(output);
            } else {
              resolve('');
            }
          });
          
          java.on('error', () => {
            resolve('');
          });
        });
        
        if (versionResult) {
          const versionMatch = versionResult.match(/version "([^"]+)"/);
          if (versionMatch) {
            version = versionMatch[1];
          }
        }
      } catch (error) {
        issues.push('Could not determine Java version from JAVA_HOME');
      }
    }

    // If still not found, try PATH
    if (!installed) {
      try {
        const javaVersion = await new Promise<string>((resolve) => {
          const java = spawn('java', ['-version'], { stdio: 'pipe' });
          let output = '';
          
          java.stderr?.on('data', (data) => {
            output += data.toString();
          });
          
          java.on('close', (code) => {
            if (code === 0) {
              resolve(output);
            } else {
              resolve('');
            }
          });
          
          java.on('error', () => {
            resolve('');
          });
        });

        if (javaVersion) {
          installed = true;
          const versionMatch = javaVersion.match(/version "([^"]+)"/);
          if (versionMatch) {
            version = versionMatch[1];
          }
          
          // Try to find the actual path
          try {
            const whichResult = await new Promise<string>((resolve) => {
              const which = spawn('which', ['java'], { stdio: 'pipe' });
              let output = '';
              
              which.stdout?.on('data', (data) => {
                output += data.toString();
              });
              
              which.on('close', (code) => {
                if (code === 0) {
                  resolve(output.trim());
                } else {
                  resolve('');
                }
              });
              
              which.on('error', () => {
                resolve('');
              });
            });
            
            if (whichResult) {
              javaPath = whichResult;
            }
          } catch (error) {
            // Ignore which command errors
          }
        }
      } catch (error) {
        issues.push('Java not found in PATH');
      }
    }

    if (!installed) {
      issues.push('Java Development Kit not found');
    }

    // Check if it's a supported version (Java 8, 11, or 17)
    if (version) {
      const majorVersion = parseInt(version.split('.')[0]);
      if (majorVersion < 8 || majorVersion > 17) {
        issues.push(`Java version ${version} may not be compatible with Android builds`);
      }
    }

  } catch (error: any) {
    issues.push(`Error checking Java: ${error.message}`);
  }

  return { installed, version, path: javaPath, issues };
}

/**
 * Check if Gradle is installed
 */
async function checkGradle(): Promise<{
  installed: boolean;
  version?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let version: string | undefined;

  try {
    // First try global gradle command
    let gradleVersion = await new Promise<string>((resolve) => {
      const gradle = spawn('gradle', ['--version'], { stdio: 'pipe' });
      let output = '';
      
      gradle.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      gradle.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          resolve('');
        }
      });
      
      gradle.on('error', () => {
        resolve('');
      });
    });

    // If global gradle not found, check for gradle wrapper in common project locations
    if (!gradleVersion) {
      const commonProjectPaths = [
        process.cwd(), // Current working directory
        path.join(os.homedir(), 'applaa-workspace'), // Applaa workspace
        path.join(os.homedir(), 'applaa-workspace', 'apps', 'mobile'), // Mobile apps
      ];
      
      for (const projectPath of commonProjectPaths) {
        const gradlewPath = path.join(projectPath, 'gradlew');
        if (fs.existsSync(gradlewPath)) {
          gradleVersion = await new Promise<string>((resolve) => {
            const gradlew = spawn(gradlewPath, ['--version'], { 
              stdio: 'pipe',
              cwd: projectPath 
            });
            let output = '';
            
            gradlew.stdout?.on('data', (data) => {
              output += data.toString();
            });
            
            gradlew.on('close', (code) => {
              if (code === 0) {
                resolve(output);
              } else {
                resolve('');
              }
            });
            
            gradlew.on('error', () => {
              resolve('');
            });
          });
          
          if (gradleVersion) {
            break; // Found gradle wrapper, stop searching
          }
        }
      }
    }

    if (gradleVersion) {
      installed = true;
      const versionMatch = gradleVersion.match(/Gradle (\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    } else {
      issues.push('Gradle not found in PATH');
    }

  } catch (error: any) {
    issues.push(`Error checking Gradle: ${error.message}`);
  }

  return { installed, version, issues };
}

/**
 * Check environment variables and PATH
 */
function checkEnvironment(): {
  androidHome?: string;
  javaHome?: string;
  pathIncludesAndroid: boolean;
  pathIncludesJava: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const javaHome = process.env.JAVA_HOME;
  const pathEnv = process.env.PATH || '';

  return {
    androidHome,
    javaHome,
    pathIncludesAndroid: pathEnv.includes('android') || pathEnv.includes('Android'),
    pathIncludesJava: pathEnv.includes('java') || pathEnv.includes('Java'),
    issues
  };
}

/**
 * Check if Xcode is installed (macOS only)
 */
async function checkXcode(): Promise<{
  installed: boolean;
  path?: string;
  version?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let xcodePath: string | undefined;
  let version: string | undefined;

  if (process.platform !== 'darwin') {
    issues.push('iOS builds are only supported on macOS');
    return { installed: false, issues };
  }

  try {
    // Check if Xcode app exists
    const xcodeAppPath = '/Applications/Xcode.app';
    if (fs.existsSync(xcodeAppPath)) {
      installed = true;
      xcodePath = xcodeAppPath;
      
      // Try to get Xcode version
      try {
        const versionResult = await new Promise<string>((resolve) => {
          const xcodebuild = spawn('xcodebuild', ['-version'], { stdio: 'pipe' });
          let output = '';
          
          xcodebuild.stdout?.on('data', (data) => {
            output += data.toString();
          });
          
          xcodebuild.on('close', (code) => {
            if (code === 0) {
              resolve(output);
            } else {
              resolve('');
            }
          });
          
          xcodebuild.on('error', () => {
            resolve('');
          });
        });
        
        if (versionResult) {
          const versionMatch = versionResult.match(/Xcode (\d+\.\d+)/);
          if (versionMatch) {
            version = versionMatch[1];
          }
        }
      } catch (error) {
        issues.push('Could not determine Xcode version');
      }
    } else {
      issues.push('Xcode app not found in /Applications/Xcode.app');
    }

  } catch (error: any) {
    issues.push(`Error checking Xcode: ${error.message}`);
  }

  return { installed, path: xcodePath, version, issues };
}

/**
 * Check if Xcode Command Line Tools are installed
 */
async function checkXcodeCommandLineTools(): Promise<{
  installed: boolean;
  version?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let version: string | undefined;

  if (process.platform !== 'darwin') {
    issues.push('iOS builds are only supported on macOS');
    return { installed: false, issues };
  }

  try {
    // Check if xcodebuild is available
    const xcodebuildResult = await new Promise<string>((resolve) => {
      const xcodebuild = spawn('xcodebuild', ['-version'], { stdio: 'pipe' });
      let output = '';
      
      xcodebuild.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      xcodebuild.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          resolve('');
        }
      });
      
      xcodebuild.on('error', () => {
        resolve('');
      });
    });

    if (xcodebuildResult) {
      installed = true;
      const versionMatch = xcodebuildResult.match(/Xcode (\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    } else {
      issues.push('xcodebuild command not found - install Xcode Command Line Tools');
    }

  } catch (error: any) {
    issues.push(`Error checking Xcode Command Line Tools: ${error.message}`);
  }

  return { installed, version, issues };
}

/**
 * Check if CocoaPods is installed
 */
async function checkCocoaPods(): Promise<{
  installed: boolean;
  version?: string;
  issues: string[];
}> {
  const issues: string[] = [];
  let installed = false;
  let version: string | undefined;

  try {
    const podResult = await new Promise<string>((resolve) => {
      const pod = spawn('pod', ['--version'], { stdio: 'pipe' });
      let output = '';
      
      pod.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      pod.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          resolve('');
        }
      });
      
      pod.on('error', () => {
        resolve('');
      });
    });

    if (podResult) {
      installed = true;
      version = podResult.trim();
    } else {
      issues.push('CocoaPods not found - install with: sudo gem install cocoapods');
    }

  } catch (error: any) {
    issues.push(`Error checking CocoaPods: ${error.message}`);
  }

  return { installed, version, issues };
}

/**
 * Check iOS build environment
 */
function checkIOSEnvironment(): {
  developerDir?: string;
  pathIncludesXcode: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const developerDir = process.env.DEVELOPER_DIR;
  const pathEnv = process.env.PATH || '';

  return {
    developerDir,
    pathIncludesXcode: pathEnv.includes('Xcode') || pathEnv.includes('xcode'),
    issues
  };
}

/**
 * Check all iOS build dependencies
 */
async function checkIOSDependencies(): Promise<IOSDependencyStatus> {
  logger.info('🍎 Checking iOS build dependencies...');

  const [xcode, commandLineTools, cocoapods] = await Promise.all([
    checkXcode(),
    checkXcodeCommandLineTools(),
    checkCocoaPods()
  ]);

  const environment = checkIOSEnvironment();

  // Determine overall readiness
  const missingDependencies: string[] = [];
  const recommendations: string[] = [];

  if (!xcode.installed) {
    missingDependencies.push('Xcode');
    recommendations.push('Install Xcode from the Mac App Store');
  }

  if (!commandLineTools.installed) {
    missingDependencies.push('Xcode Command Line Tools');
    recommendations.push('Run: sudo xcode-select --install');
  }

  if (!cocoapods.installed) {
    missingDependencies.push('CocoaPods');
    recommendations.push('Install CocoaPods: sudo gem install cocoapods');
  }

  const ready = xcode.installed && commandLineTools.installed && cocoapods.installed;

  return {
    xcode,
    commandLineTools,
    cocoapods,
    environment,
    overall: {
      ready,
      missingDependencies,
      recommendations
    }
  };
}

/**
 * Main function to check all Android build dependencies
 */
export async function checkAndroidDependencies(): Promise<AndroidDependencyStatus> {
  logger.info('🔍 Checking Android build dependencies...');

  const [androidSdk, androidNdk, java, gradle] = await Promise.all([
    checkAndroidSdk(),
    checkAndroidNdk(),
    checkJava(),
    checkGradle()
  ]);

  const environment = checkEnvironment();

  // Determine overall readiness
  const missingDependencies: string[] = [];
  const recommendations: string[] = [];

  if (!androidSdk.installed) {
    missingDependencies.push('Android SDK');
    recommendations.push('Install Android Studio or Android SDK command line tools');
  }

  if (!androidNdk.installed) {
    missingDependencies.push('Android NDK');
    recommendations.push('Install Android NDK through Android Studio SDK Manager');
  }

  if (!java.installed) {
    missingDependencies.push('Java Development Kit');
    recommendations.push('Install OpenJDK 11 or Oracle JDK 11');
  }

  if (!gradle.installed) {
    missingDependencies.push('Gradle');
    recommendations.push('Install Gradle or use Gradle Wrapper (included in project)');
  }

  // Add environment-specific recommendations
  if (!environment.androidHome) {
    recommendations.push('Set ANDROID_HOME environment variable');
  }

  if (!environment.javaHome) {
    recommendations.push('Set JAVA_HOME environment variable');
  }

  const ready = missingDependencies.length === 0 && 
                androidSdk.issues.length === 0 && 
                java.issues.length === 0;

  const status: AndroidDependencyStatus = {
    androidSdk,
    androidNdk,
    java,
    gradle,
    environment,
    overall: {
      ready,
      missingDependencies,
      recommendations
    }
  };

  logger.info(`✅ Android dependency check complete. Ready: ${ready}`);
  return status;
}

/**
 * Check all build dependencies (Android + iOS)
 */
export async function checkAllBuildDependencies(): Promise<BuildDependencyStatus> {
  logger.info('🔍 Checking all build dependencies...');

  const [android, ios] = await Promise.all([
    checkAndroidDependencies(),
    checkIOSDependencies()
  ]);

  // Determine overall readiness
  const missingDependencies: string[] = [
    ...android.overall.missingDependencies,
    ...ios.overall.missingDependencies
  ];

  const recommendations: string[] = [
    ...android.overall.recommendations,
    ...ios.overall.recommendations
  ];

  const ready = android.overall.ready && ios.overall.ready;

  const status: BuildDependencyStatus = {
    android,
    ios,
    overall: {
      ready,
      missingDependencies,
      recommendations
    }
  };

  logger.info(`✅ Build dependency check complete. Ready: ${ready}`);
  return status;
}

/**
 * Get installation instructions for missing dependencies
 */
export function getInstallationInstructions(): {
  windows: string[];
  macos: string[];
  linux: string[];
} {
  return {
    windows: [
      '1. Download Android Studio from https://developer.android.com/studio',
      '2. Install Android Studio with default settings',
      '3. Open Android Studio and go to SDK Manager',
      '4. Install Android SDK, NDK, and Build Tools',
      '5. Set ANDROID_HOME environment variable to SDK location',
      '6. Install OpenJDK 11 from https://adoptium.net/',
      '7. Set JAVA_HOME environment variable to JDK location'
    ],
    macos: [
      '1. Install Android Studio: brew install --cask android-studio',
      '2. Or download from https://developer.android.com/studio',
      '3. Open Android Studio and install SDK components',
      '4. Install Java: brew install openjdk@11',
      '5. Set environment variables in ~/.zshrc or ~/.bash_profile:',
      '   export ANDROID_HOME=$HOME/Library/Android/sdk',
      '   export JAVA_HOME=/opt/homebrew/opt/openjdk@11',
      '   export PATH=$PATH:$ANDROID_HOME/emulator',
      '   export PATH=$PATH:$ANDROID_HOME/tools',
      '   export PATH=$PATH:$ANDROID_HOME/platform-tools'
    ],
    linux: [
      '1. Install Android Studio: snap install android-studio --classic',
      '2. Or download from https://developer.android.com/studio',
      '3. Install Java: sudo apt install openjdk-11-jdk',
      '4. Set environment variables in ~/.bashrc:',
      '   export ANDROID_HOME=$HOME/Android/Sdk',
      '   export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64',
      '   export PATH=$PATH:$ANDROID_HOME/emulator',
      '   export PATH=$PATH:$ANDROID_HOME/tools',
      '   export PATH=$PATH:$ANDROID_HOME/platform-tools'
    ]
  };
}

/**
 * Register IPC handlers for Android dependency checking
 */
export function registerAndroidDependencyHandlers() {

  // Check Android build dependencies
  ipcMain.handle('android:check-dependencies', async () => {
    try {
      logger.info('📱 Checking Android dependencies...');
      const status = await checkAndroidDependencies();
      logger.info('✅ Android dependency check completed');
      return { success: true, status };
    } catch (error: any) {
      logger.error('Failed to check Android dependencies:', error);
      return { success: false, error: error.message };
    }
  });

  // Get installation instructions
  ipcMain.handle('android:get-installation-instructions', async () => {
    try {
      logger.info('📋 Getting installation instructions...');
      const instructions = getInstallationInstructions();
      logger.info('✅ Installation instructions retrieved');
      return { success: true, instructions };
    } catch (error: any) {
      logger.error('Failed to get installation instructions:', error);
      return { success: false, error: error.message };
    }
  });

  // Check iOS build dependencies (macOS only)
  ipcMain.handle('ios:check-dependencies', async () => {
    try {
      logger.info('🍎 Checking iOS dependencies...');
      const status = await checkIOSDependencies();
      logger.info('✅ iOS dependency check completed');
      return { success: true, status };
    } catch (error: any) {
      logger.error('Failed to check iOS dependencies:', error);
      return { success: false, error: error.message };
    }
  });

  // Check all build dependencies (Android + iOS)
  ipcMain.handle('build:check-all-dependencies', async () => {
    try {
      logger.info('🔍 Checking all build dependencies...');
      const status = await checkAllBuildDependencies();
      logger.info('✅ All build dependency check completed');
      return { success: true, status };
    } catch (error: any) {
      logger.error('Failed to check all build dependencies:', error);
      return { success: false, error: error.message };
    }
  });

}

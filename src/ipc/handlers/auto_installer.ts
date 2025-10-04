import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ipcMain } from 'electron';
import log from 'electron-log';

const logger = log.scope('auto-installer');

interface InstallationResult {
  success: boolean;
  message: string;
  installed: string[];
  errors: string[];
  logs: string[];
}

interface AutoInstallerOptions {
  platform: 'windows' | 'macos' | 'linux';
  packageManager: 'brew' | 'apt' | 'yum' | 'choco' | 'winget' | 'snap';
  force: boolean;
}

/**
 * Auto-installer for build dependencies
 */
export class AutoInstaller {
  private platform: string;
  private homeDir: string;
  private logs: string[] = [];

  constructor() {
    this.platform = process.platform;
    this.homeDir = os.homedir();
  }

  /**
   * Install Android build dependencies automatically
   */
  async installAndroidDependencies(options: Partial<AutoInstallerOptions> = {}): Promise<InstallationResult> {
    this.logs = [];
    const installed: string[] = [];
    const errors: string[] = [];

    try {
      logger.info('🚀 Starting Android dependencies auto-installation...');
      this.logs.push('🚀 Starting Android dependencies auto-installation...');

      if (this.platform === 'darwin') {
        await this.installAndroidOnMacOS(installed, errors);
      } else if (this.platform === 'linux') {
        await this.installAndroidOnLinux(installed, errors);
      } else if (this.platform === 'win32') {
        await this.installAndroidOnWindows(installed, errors);
      } else {
        errors.push(`Unsupported platform: ${this.platform}`);
      }

      // Set up environment variables
      await this.setupAndroidEnvironment();

      return {
        success: errors.length === 0,
        message: errors.length > 0 ? errors.join('; ') : 'Android dependencies installed successfully',
        installed,
        errors,
        logs: this.logs
      };

    } catch (error: any) {
      logger.error('Failed to install Android dependencies:', error);
      return {
        success: false,
        message: error.message,
        installed,
        errors: [...errors, error.message],
        logs: this.logs
      };
    }
  }

  /**
   * Install iOS build dependencies automatically (macOS only)
   */
  async installIOSDependencies(options: Partial<AutoInstallerOptions> = {}): Promise<InstallationResult> {
    this.logs = [];
    const installed: string[] = [];
    const errors: string[] = [];

    if (this.platform !== 'darwin') {
      return {
        success: false,
        message: 'iOS builds are only supported on macOS',
        installed: [],
        errors: ['iOS builds are only supported on macOS'],
        logs: ['iOS builds are only supported on macOS']
      };
    }

    try {
      logger.info('🍎 Starting iOS dependencies auto-installation...');
      this.logs.push('🍎 Starting iOS dependencies auto-installation...');

      // Install Xcode Command Line Tools
      await this.installXcodeCommandLineTools(installed, errors);

      // Install CocoaPods
      await this.installCocoaPods(installed, errors);

      return {
        success: errors.length === 0,
        message: errors.length > 0 ? errors.join('; ') : 'iOS dependencies installed successfully',
        installed,
        errors,
        logs: this.logs
      };

    } catch (error: any) {
      logger.error('Failed to install iOS dependencies:', error);
      return {
        success: false,
        message: error.message,
        installed,
        errors: [...errors, error.message],
        logs: this.logs
      };
    }
  }

  /**
   * Install Android dependencies on macOS
   */
  private async installAndroidOnMacOS(installed: string[], errors: string[]): Promise<void> {
    try {
      // Check if Homebrew is available
      if (!await this.isCommandAvailable('brew')) {
        this.logs.push('Installing Homebrew...');
        await this.installHomebrew();
        installed.push('Homebrew');
      }

      // Install Java
      this.logs.push('Installing Java (OpenJDK 11)...');
      await this.runCommand('brew', ['install', 'openjdk@11']);
      installed.push('Java (OpenJDK 11)');

      // Install Android Studio
      this.logs.push('Installing Android Studio...');
      await this.runCommand('brew', ['install', '--cask', 'android-studio']);
      installed.push('Android Studio');

      // Note: User needs to manually open Android Studio to install SDK/NDK
      this.logs.push('⚠️ Please open Android Studio and install SDK/NDK through SDK Manager');

    } catch (error: any) {
      errors.push(`macOS installation failed: ${error.message}`);
    }
  }

  /**
   * Install Android dependencies on Linux
   */
  private async installAndroidOnLinux(installed: string[], errors: string[]): Promise<void> {
    try {
      // Detect package manager
      let packageManager = 'apt';
      if (await this.isCommandAvailable('yum')) {
        packageManager = 'yum';
      } else if (await this.isCommandAvailable('dnf')) {
        packageManager = 'dnf';
      }

      // Install Java
      this.logs.push(`Installing Java using ${packageManager}...`);
      if (packageManager === 'apt') {
        await this.runCommand('sudo', ['apt', 'update']);
        await this.runCommand('sudo', ['apt', 'install', '-y', 'openjdk-11-jdk']);
      } else if (packageManager === 'yum') {
        await this.runCommand('sudo', ['yum', 'install', '-y', 'java-11-openjdk-devel']);
      } else if (packageManager === 'dnf') {
        await this.runCommand('sudo', ['dnf', 'install', '-y', 'java-11-openjdk-devel']);
      }
      installed.push('Java (OpenJDK 11)');

      // Install Android Studio via snap
      if (await this.isCommandAvailable('snap')) {
        this.logs.push('Installing Android Studio via snap...');
        await this.runCommand('sudo', ['snap', 'install', 'android-studio', '--classic']);
        installed.push('Android Studio');
      } else {
        this.logs.push('⚠️ Please install Android Studio manually from https://developer.android.com/studio');
      }

    } catch (error: any) {
      errors.push(`Linux installation failed: ${error.message}`);
    }
  }

  /**
   * Install Android dependencies on Windows
   */
  private async installAndroidOnWindows(installed: string[], errors: string[]): Promise<void> {
    try {
      // Check for package managers
      if (await this.isCommandAvailable('choco')) {
        // Install via Chocolatey
        this.logs.push('Installing Java via Chocolatey...');
        await this.runCommand('choco', ['install', 'openjdk11', '-y']);
        installed.push('Java (OpenJDK 11)');

        this.logs.push('Installing Android Studio via Chocolatey...');
        await this.runCommand('choco', ['install', 'androidstudio', '-y']);
        installed.push('Android Studio');

      } else if (await this.isCommandAvailable('winget')) {
        // Install via Winget
        this.logs.push('Installing Java via Winget...');
        await this.runCommand('winget', ['install', 'EclipseAdoptium.Temurin.11.JDK']);
        installed.push('Java (OpenJDK 11)');

        this.logs.push('Installing Android Studio via Winget...');
        await this.runCommand('winget', ['install', 'Google.AndroidStudio']);
        installed.push('Android Studio');

      } else {
        this.logs.push('⚠️ Please install Android Studio manually from https://developer.android.com/studio');
        this.logs.push('⚠️ Please install Java manually from https://adoptium.net/');
      }

    } catch (error: any) {
      errors.push(`Windows installation failed: ${error.message}`);
    }
  }

  /**
   * Install Xcode Command Line Tools
   */
  private async installXcodeCommandLineTools(installed: string[], errors: string[]): Promise<void> {
    try {
      this.logs.push('Installing Xcode Command Line Tools...');
      await this.runCommand('sudo', ['xcode-select', '--install']);
      installed.push('Xcode Command Line Tools');
    } catch (error: any) {
      errors.push(`Xcode Command Line Tools installation failed: ${error.message}`);
    }
  }

  /**
   * Install CocoaPods
   */
  private async installCocoaPods(installed: string[], errors: string[]): Promise<void> {
    try {
      this.logs.push('Installing CocoaPods...');
      await this.runCommand('sudo', ['gem', 'install', 'cocoapods']);
      installed.push('CocoaPods');
    } catch (error: any) {
      errors.push(`CocoaPods installation failed: ${error.message}`);
    }
  }

  /**
   * Install Homebrew on macOS
   */
  private async installHomebrew(): Promise<void> {
    const installScript = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
    await this.runCommand('bash', ['-c', installScript]);
  }

  /**
   * Set up Android environment variables
   */
  private async setupAndroidEnvironment(): Promise<void> {
    const shellConfig = this.platform === 'darwin' ? '.zshrc' : '.bashrc';
    const configPath = path.join(this.homeDir, shellConfig);

    let androidHome = '';
    let javaHome = '';

    if (this.platform === 'darwin') {
      androidHome = path.join(this.homeDir, 'Library', 'Android', 'sdk');
      javaHome = '/opt/homebrew/opt/openjdk@11';
    } else if (this.platform === 'linux') {
      androidHome = path.join(this.homeDir, 'Android', 'Sdk');
      javaHome = '/usr/lib/jvm/java-11-openjdk-amd64';
    } else if (this.platform === 'win32') {
      androidHome = path.join(this.homeDir, 'AppData', 'Local', 'Android', 'Sdk');
      javaHome = 'C:\\Program Files\\Eclipse Adoptium\\jdk-11.0.20.8-hotspot';
    }

    const envScript = `
# Android Build Environment Setup
export ANDROID_HOME="${androidHome}"
export ANDROID_SDK_ROOT="${androidHome}"
export JAVA_HOME="${javaHome}"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/tools"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$JAVA_HOME/bin"
`;

    try {
      let existingConfig = '';
      if (fs.existsSync(configPath)) {
        existingConfig = fs.readFileSync(configPath, 'utf8');
      }

      if (!existingConfig.includes('ANDROID_HOME')) {
        fs.appendFileSync(configPath, envScript);
        this.logs.push(`✅ Added Android environment variables to ${shellConfig}`);
      }
    } catch (error) {
      this.logs.push(`⚠️ Could not update shell configuration: ${error}`);
    }
  }

  /**
   * Check if a command is available
   */
  private async isCommandAvailable(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version'], { stdio: 'pipe' });
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  /**
   * Run a command and return result
   */
  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.logs.push(text.trim());
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        this.logs.push(`ERROR: ${text.trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

/**
 * Register IPC handlers for auto-installation
 */
export function registerAutoInstallerHandlers() {
  const installer = new AutoInstaller();

  // Install Android dependencies
  ipcMain.handle('auto-installer:install-android', async () => {
    try {
      logger.info('🔧 Auto-installing Android dependencies...');
      const result = await installer.installAndroidDependencies();
      logger.info('Android auto-installation completed:', result);
      return { success: true, result };
    } catch (error: any) {
      logger.error('Failed to auto-install Android dependencies:', error);
      return { success: false, error: error.message };
    }
  });

  // Install iOS dependencies
  ipcMain.handle('auto-installer:install-ios', async () => {
    try {
      logger.info('🔧 Auto-installing iOS dependencies...');
      const result = await installer.installIOSDependencies();
      logger.info('iOS auto-installation completed:', result);
      return { success: true, result };
    } catch (error: any) {
      logger.error('Failed to auto-install iOS dependencies:', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('✅ Auto-installer handlers registered');
}

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
      this.logs.push(`🖥️ Detected platform: ${this.platform}`);

      if (this.platform === 'darwin') {
        this.logs.push('🍎 Installing on macOS...');
        await this.installAndroidOnMacOS(installed, errors);
      } else if (this.platform === 'linux') {
        this.logs.push('🐧 Installing on Linux...');
        await this.installAndroidOnLinux(installed, errors);
      } else if (this.platform === 'win32') {
        this.logs.push('🪟 Installing on Windows...');
        await this.installAndroidOnWindows(installed, errors);
      } else {
        const errorMsg = `Unsupported platform: ${this.platform}`;
        errors.push(errorMsg);
        this.logs.push(`❌ ${errorMsg}`);
      }

      // Set up environment variables
      this.logs.push('🔧 Setting up environment variables...');
      await this.setupAndroidEnvironment();
      this.logs.push('✅ Environment variables configured');

      const success = errors.length === 0;
      this.logs.push(success ? '🎉 Android installation completed successfully!' : '❌ Android installation failed');

      return {
        success,
        message: success ? 'Android dependencies installed successfully' : errors.join('; '),
        installed,
        errors,
        logs: this.logs
      };

    } catch (error: any) {
      logger.error('Failed to install Android dependencies:', error);
      this.logs.push(`❌ Installation failed: ${error.message}`);
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
      const errorMsg = 'iOS builds are only supported on macOS';
      this.logs.push(`❌ ${errorMsg}`);
      return {
        success: false,
        message: errorMsg,
        installed: [],
        errors: [errorMsg],
        logs: this.logs
      };
    }

    try {
      logger.info('🍎 Starting iOS dependencies auto-installation...');
      this.logs.push('🍎 Starting iOS dependencies auto-installation...');
      this.logs.push('🖥️ Detected platform: macOS');

      // Install Xcode Command Line Tools
      this.logs.push('🔧 Installing Xcode Command Line Tools...');
      await this.installXcodeCommandLineTools(installed, errors);

      // Install CocoaPods
      this.logs.push('📦 Installing CocoaPods...');
      await this.installCocoaPods(installed, errors);

      const success = errors.length === 0;
      this.logs.push(success ? '🎉 iOS installation completed successfully!' : '❌ iOS installation failed');

      return {
        success,
        message: success ? 'iOS dependencies installed successfully' : errors.join('; '),
        installed,
        errors,
        logs: this.logs
      };

    } catch (error: any) {
      logger.error('Failed to install iOS dependencies:', error);
      this.logs.push(`❌ Installation failed: ${error.message}`);
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
      this.logs.push('🔍 Checking for Homebrew...');
      if (!await this.isCommandAvailable('brew')) {
        this.logs.push('📦 Homebrew not found, installing...');
        await this.installHomebrew();
        this.logs.push('✅ Homebrew installed successfully');
        installed.push('Homebrew');
      } else {
        this.logs.push('✅ Homebrew already installed');
      }

      // Check if Java is already installed
      this.logs.push('☕ Checking for Java (OpenJDK 11)...');
      const javaInstalled = await this.isCommandAvailable('java');
      if (javaInstalled) {
        this.logs.push('✅ Java already installed');
        installed.push('Java (OpenJDK 11)');
      } else {
        this.logs.push('☕ Installing Java (OpenJDK 11)...');
        this.logs.push('📥 Running: brew install openjdk@11');
        await this.runCommand('brew', ['install', 'openjdk@11']);
        this.logs.push('✅ Java (OpenJDK 11) installed successfully');
        installed.push('Java (OpenJDK 11)');
      }

      // Check if Android Studio is already installed
      this.logs.push('📱 Checking for Android Studio...');
      if (fs.existsSync('/Applications/Android Studio.app')) {
        this.logs.push('✅ Android Studio already installed');
        installed.push('Android Studio');
      } else {
        this.logs.push('📱 Installing Android Studio...');
        this.logs.push('📥 Running: brew install --cask android-studio');
        
        try {
          await this.runCommand('brew', ['install', '--cask', 'android-studio']);
          this.logs.push('✅ Android Studio installed successfully');
          installed.push('Android Studio');
        } catch (error: any) {
          if (error.message.includes('already locked')) {
            this.logs.push('⚠️ Another brew process is running. Waiting for it to complete...');
            this.logs.push('⏳ Please wait for the current installation to finish, then try again.');
            this.logs.push('💡 You can also run: brew install --cask android-studio manually');
            this.logs.push('🔧 Or try: brew cleanup && brew install --cask android-studio');
            
            // Don't fail the entire installation for this
            this.logs.push('⚠️ Skipping Android Studio installation due to lock conflict');
          } else {
            throw error;
          }
        }
      }

      // Note: User needs to manually open Android Studio to install SDK/NDK
      this.logs.push('⚠️ Next step: Open Android Studio and install SDK/NDK through SDK Manager');
      this.logs.push('📋 SDK Manager → SDK Tools → Check "Android SDK Build-Tools" and "NDK"');

    } catch (error: any) {
      const errorMsg = `macOS installation failed: ${error.message}`;
      errors.push(errorMsg);
      this.logs.push(`❌ ${errorMsg}`);
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
      this.logs.push('🔧 Checking for Xcode Command Line Tools...');
      
      // Check if already installed
      if (await this.isCommandAvailable('xcodebuild')) {
        this.logs.push('✅ Xcode Command Line Tools already installed');
        return;
      }
      
      this.logs.push('📦 Installing Xcode Command Line Tools...');
      this.logs.push('📥 Running: sudo xcode-select --install');
      await this.runCommand('sudo', ['xcode-select', '--install']);
      this.logs.push('✅ Xcode Command Line Tools installed successfully');
      installed.push('Xcode Command Line Tools');
    } catch (error: any) {
      const errorMsg = `Xcode Command Line Tools installation failed: ${error.message}`;
      errors.push(errorMsg);
      this.logs.push(`❌ ${errorMsg}`);
    }
  }

  /**
   * Install CocoaPods
   */
  private async installCocoaPods(installed: string[], errors: string[]): Promise<void> {
    try {
      this.logs.push('📦 Checking for CocoaPods...');
      
      // Check if already installed
      if (await this.isCommandAvailable('pod')) {
        this.logs.push('✅ CocoaPods already installed');
        return;
      }
      
      this.logs.push('📦 Installing CocoaPods...');
      this.logs.push('📥 Running: sudo gem install cocoapods');
      await this.runCommand('sudo', ['gem', 'install', 'cocoapods']);
      this.logs.push('✅ CocoaPods installed successfully');
      installed.push('CocoaPods');
    } catch (error: any) {
      const errorMsg = `CocoaPods installation failed: ${error.message}`;
      errors.push(errorMsg);
      this.logs.push(`❌ ${errorMsg}`);
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
        // Show real-time output
        const lines = text.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          this.logs.push(`📤 ${line.trim()}`);
        });
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        // Show real-time error output
        const lines = text.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          this.logs.push(`⚠️ ${line.trim()}`);
        });
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logs.push(`✅ Command completed successfully`);
          resolve();
        } else {
          const errorMsg = `Command failed with code ${code}: ${errorOutput}`;
          this.logs.push(`❌ ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });

      child.on('error', (error) => {
        const errorMsg = `Command error: ${error.message}`;
        this.logs.push(`❌ ${errorMsg}`);
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

}

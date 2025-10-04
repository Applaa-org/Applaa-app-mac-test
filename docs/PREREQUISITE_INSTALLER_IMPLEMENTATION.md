# 🚀 Prerequisite Installer Implementation

## Overview

The Prerequisite Installer is a comprehensive, hierarchical dependency installation system designed for non-technical users. It automatically installs all required build dependencies in the correct order, ensuring a smooth development experience.

## 🎯 Key Features

### **Hierarchical Installation**
- **Phase 1: System Level** - Node.js, Git (required for everything)
- **Phase 2: Development Tools** - NPM, PNPM (depends on system)
- **Phase 3: Android Development** - Java, Android Studio, SDK, NDK (depends on system + development)
- **Phase 4: iOS Development** - Xcode, Command Line Tools, CocoaPods (depends on system + development, macOS only)
- **Phase 5: Expo Tools** - Expo CLI (depends on everything)

### **Smart Dependency Detection**
- Automatically detects already installed dependencies
- Skips unnecessary installations
- Provides detailed status information
- Shows installation paths and versions

### **Real-time Progress Tracking**
- Live installation logs
- Progress indicators
- Error handling and recovery
- Installation time tracking

### **User-Friendly Interface**
- Visual status indicators
- Category-based organization
- One-click installation
- Clear error messages

## 🏗️ Architecture

### **Core Components**

#### 1. **Hermetic Runtime Integration** (`src/lib/hermetic-runtime.ts`)
```typescript
// Main functions
export async function checkPrerequisites(): Promise<PrerequisiteStatus[]>
export async function installPrerequisites(options): Promise<PrerequisiteInstallResult>

// Individual checkers
async function checkNodeJS(): Promise<PrerequisiteStatus>
async function checkJava(): Promise<PrerequisiteStatus>
async function checkAndroidSDK(): Promise<PrerequisiteStatus>
// ... and more
```

#### 2. **IPC Handlers** (`src/ipc/handlers/prerequisite_installer.ts`)
```typescript
// IPC channels
ipcMain.handle('prerequisites:check', ...)
ipcMain.handle('prerequisites:install', ...)
ipcMain.handle('prerequisites:status', ...)
ipcMain.handle('prerequisites:progress', ...)
```

#### 3. **React Component** (`src/components/settings/PrerequisiteInstaller.tsx`)
- Real-time status display
- Installation progress tracking
- Category-based organization
- Error handling and recovery

#### 4. **IPC Client** (`src/ipc/ipc_client.ts`)
```typescript
// Client methods
public async checkPrerequisites(): Promise<any>
public async installPrerequisites(options): Promise<any>
public async getPrerequisitesStatus(): Promise<any>
public async getPrerequisitesProgress(): Promise<any>
```

## 📋 Prerequisites Categories

### **System Prerequisites** (Required for everything)
- **Node.js** - JavaScript runtime
- **Git** - Version control system

### **Development Tools** (Required for development)
- **NPM** - Package manager (comes with Node.js)
- **PNPM** - Fast package manager (optional but recommended)

### **Android Development** (Required for Android builds)
- **Java (OpenJDK)** - Java Development Kit
- **Android Studio** - Android development IDE
- **Android SDK** - Software Development Kit
- **Android NDK** - Native Development Kit
- **Android Build Tools** - Build tools and utilities

### **iOS Development** (Required for iOS builds, macOS only)
- **Xcode** - iOS development IDE
- **Xcode Command Line Tools** - Command line utilities
- **CocoaPods** - Dependency manager for iOS

### **Expo Development** (Required for Expo development)
- **Expo CLI** - Expo command line interface

## 🔧 Installation Process

### **Phase 1: System Level**
```bash
# Node.js installation
brew install node  # macOS
sudo apt install nodejs  # Linux

# Git installation
brew install git  # macOS
sudo apt install git  # Linux
```

### **Phase 2: Development Tools**
```bash
# NPM comes with Node.js
# PNPM installation
npm install -g pnpm
```

### **Phase 3: Android Development**
```bash
# Java installation
brew install openjdk@11  # macOS
sudo apt install openjdk-11-jdk  # Linux

# Android Studio installation
brew install --cask android-studio  # macOS
# Manual installation on Linux/Windows

# Environment setup
export JAVA_HOME="/opt/homebrew/opt/openjdk@11"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
```

### **Phase 4: iOS Development** (macOS only)
```bash
# Xcode Command Line Tools
xcode-select --install

# CocoaPods
sudo gem install cocoapods
```

### **Phase 5: Expo Tools**
```bash
# Expo CLI
npm install -g @expo/cli
```

## 🎨 User Interface

### **Status Display**
- ✅ **Green** - Installed and ready
- ❌ **Red** - Required but missing
- ⚠️ **Yellow** - Optional but recommended

### **Category Organization**
- **System** - Blue theme
- **Development** - Green theme
- **Android** - Orange theme
- **iOS** - Purple theme

### **Installation Progress**
- Real-time log streaming
- Progress indicators
- Error handling
- Time tracking

## 🚀 Usage

### **Automatic Installation**
```typescript
// Install all prerequisites
const result = await ipcClient.installPrerequisites();

// Install specific category
const result = await ipcClient.installPrerequisites({
  skipSystem: true,
  skipDevelopment: true,
  skipAndroid: false,
  skipIOS: true,
  skipExpo: true
});
```

### **Status Checking**
```typescript
// Check all prerequisites
const prerequisites = await ipcClient.checkPrerequisites();

// Get quick status
const status = await ipcClient.getPrerequisitesStatus();
// Returns: { ready: boolean, missing: string[], total: number, installed: number }
```

### **Progress Tracking**
```typescript
// Get installation progress
const progress = await ipcClient.getPrerequisitesProgress();
// Returns: { phase: string, current: string, progress: number, logs: string[] }
```

## 🔍 Dependency Detection

### **Node.js Detection**
```typescript
async function checkNodeJS(): Promise<PrerequisiteStatus> {
  const installed = await isCommandAvailable('node');
  // Check version, path, etc.
}
```

### **Java Detection**
```typescript
async function checkJava(): Promise<PrerequisiteStatus> {
  // Check multiple possible Java installations
  const possibleJavaPaths = [
    process.env.JAVA_HOME,
    '/opt/homebrew/opt/openjdk@11',
    '/opt/homebrew/opt/openjdk@17',
    '/usr/libexec/java_home'
  ];
  // ... detection logic
}
```

### **Android SDK Detection**
```typescript
async function checkAndroidSDK(): Promise<PrerequisiteStatus> {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const installed = !!(androidHome && fs.existsSync(androidHome));
  // ... detection logic
}
```

## 🛠️ Platform Support

### **macOS**
- Homebrew package manager
- Xcode and Command Line Tools
- Android Studio via Homebrew Cask
- Java via Homebrew

### **Linux**
- APT package manager
- Manual Android Studio installation
- Java via APT
- Git via APT

### **Windows**
- Manual installation required
- Chocolatey/Winget support (future)
- Android Studio manual installation

## 📊 Installation Results

### **Success Metrics**
```typescript
interface PrerequisiteInstallResult {
  success: boolean;
  installed: string[];      // Successfully installed
  failed: string[];         // Failed installations
  skipped: string[];        // Already installed
  logs: string[];          // Installation logs
  totalTime: number;       // Total installation time
}
```

### **Status Information**
```typescript
interface PrerequisiteStatus {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  required: boolean;
  category: 'system' | 'development' | 'android' | 'ios';
  installCommand?: string;
  installMessage?: string;
}
```

## 🔧 Configuration

### **Installation Options**
```typescript
interface InstallOptions {
  skipSystem?: boolean;      // Skip system prerequisites
  skipDevelopment?: boolean; // Skip development tools
  skipAndroid?: boolean;      // Skip Android development
  skipIOS?: boolean;         // Skip iOS development
  skipExpo?: boolean;        // Skip Expo tools
  forceReinstall?: boolean;  // Force reinstall existing
}
```

### **Environment Variables**
```bash
# Java
export JAVA_HOME="/opt/homebrew/opt/openjdk@11"

# Android
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# PATH updates
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
```

## 🚨 Error Handling

### **Common Issues**
1. **Permission Denied** - Requires sudo for system installations
2. **Network Issues** - Package manager connectivity problems
3. **Disk Space** - Insufficient storage for large installations
4. **Version Conflicts** - Multiple versions of same tool

### **Solutions**
1. **Retry Logic** - Automatic retry for transient failures
2. **Fallback Methods** - Alternative installation methods
3. **User Guidance** - Clear error messages and solutions
4. **Progress Preservation** - Resume from last successful step

## 📈 Performance

### **Installation Times**
- **System Prerequisites**: ~2-5 minutes
- **Development Tools**: ~1-2 minutes
- **Android Development**: ~10-20 minutes
- **iOS Development**: ~5-10 minutes
- **Expo Tools**: ~1-2 minutes

### **Total Time**: ~20-40 minutes (first time)

### **Optimization Strategies**
- Parallel installation where possible
- Skip already installed dependencies
- Use package manager caching
- Resume from failures

## 🔮 Future Enhancements

### **Planned Features**
1. **Windows Support** - Chocolatey/Winget integration
2. **Docker Support** - Containerized development environments
3. **Version Management** - Multiple version support
4. **Cloud Installation** - Remote dependency installation
5. **Custom Scripts** - User-defined installation scripts

### **Advanced Features**
1. **Dependency Graph** - Visual dependency relationships
2. **Health Checks** - Continuous dependency monitoring
3. **Auto-Updates** - Automatic dependency updates
4. **Backup/Restore** - Environment state management

## 🎯 Benefits

### **For Non-Technical Users**
- **One-Click Setup** - No technical knowledge required
- **Automatic Detection** - Smart dependency detection
- **Clear Guidance** - Step-by-step instructions
- **Error Recovery** - Automatic error handling

### **For Technical Users**
- **Time Saving** - Automated installation process
- **Consistency** - Standardized development environments
- **Reliability** - Tested installation procedures
- **Flexibility** - Customizable installation options

### **For Teams**
- **Standardization** - Consistent development environments
- **Onboarding** - Faster new developer setup
- **Maintenance** - Centralized dependency management
- **Documentation** - Automatic environment documentation

## 🚀 Getting Started

### **For Users**
1. Open the Publish Panel in your app
2. Navigate to the Prerequisite Installer section
3. Click "Install All Prerequisites"
4. Wait for installation to complete
5. Start building your apps!

### **For Developers**
1. Import the PrerequisiteInstaller component
2. Add to your settings/preferences panel
3. Configure installation options
4. Handle installation results
5. Provide user feedback

## 📚 API Reference

### **Hermetic Runtime Functions**
```typescript
// Check all prerequisites
export async function checkPrerequisites(): Promise<PrerequisiteStatus[]>

// Install prerequisites
export async function installPrerequisites(options: InstallOptions): Promise<PrerequisiteInstallResult>
```

### **IPC Client Methods**
```typescript
// Check prerequisites
public async checkPrerequisites(): Promise<any>

// Install prerequisites
public async installPrerequisites(options): Promise<any>

// Get status
public async getPrerequisitesStatus(): Promise<any>

// Get progress
public async getPrerequisitesProgress(): Promise<any>
```

### **React Component Props**
```typescript
interface PrerequisiteInstallerProps {
  // No props required - fully self-contained
}
```

## 🎉 Conclusion

The Prerequisite Installer provides a comprehensive, user-friendly solution for setting up development environments. It eliminates the technical barriers that prevent non-technical users from getting started with app development, while providing powerful features for technical users.

The hierarchical installation process ensures dependencies are installed in the correct order, while the real-time progress tracking keeps users informed throughout the process. The smart detection system avoids unnecessary installations and provides clear status information.

This implementation is fully integrated into the hermetic runtime system, making it a core part of the Applaa development experience.

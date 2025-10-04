# Android Local Build Dependencies Guide

## 🔍 Problem Analysis

The local Android build functionality in your app works on your system but fails on other users' systems because it requires several system-level dependencies that are not automatically installed.

## 📋 Required Dependencies

### 1. **Android SDK (Software Development Kit)**
- **Purpose**: Core Android development tools
- **Components**: SDK Platform, Build Tools, Platform Tools
- **Environment Variable**: `ANDROID_HOME` or `ANDROID_SDK_ROOT`
- **Common Paths**:
  - Windows: `%LOCALAPPDATA%\Android\Sdk`
  - macOS: `~/Library/Android/sdk`
  - Linux: `~/Android/Sdk`

### 2. **Android NDK (Native Development Kit)**
- **Purpose**: For native C/C++ code compilation
- **Required for**: React Native native modules, Expo native code
- **Installation**: Through Android Studio SDK Manager
- **Environment Variable**: `ANDROID_NDK_HOME`

### 3. **Java Development Kit (JDK)**
- **Purpose**: Required for Android builds
- **Supported Versions**: Java 8, 11, or 17
- **Environment Variable**: `JAVA_HOME`
- **Common Installations**:
  - OpenJDK 11 (recommended)
  - Oracle JDK 11
  - Amazon Corretto 11

### 4. **Gradle**
- **Purpose**: Build automation tool
- **Installation**: Usually included with Android Studio
- **Alternative**: Gradle Wrapper (included in project)

## 🚨 Current Issues in Your Implementation

1. **Hardcoded NDK Version**: Code uses `26.1.10909125` which may not exist on other systems
2. **No Dependency Verification**: Build process doesn't check if tools are installed
3. **Missing Environment Setup**: No verification of `ANDROID_HOME`, `JAVA_HOME`
4. **No Auto-Installation**: Missing tools aren't automatically installed

## 💡 Solution Implementation

### 1. **Android Dependency Checker**
Created `src/ipc/handlers/android_dependency_checker.ts` that:
- ✅ Checks Android SDK installation and version
- ✅ Verifies Android NDK availability
- ✅ Validates Java installation and version
- ✅ Confirms Gradle availability
- ✅ Checks environment variables
- ✅ Provides detailed error messages and recommendations

### 2. **React Component**
Created `src/components/AndroidDependencyChecker.tsx` that:
- ✅ Displays real-time dependency status
- ✅ Shows installation instructions
- ✅ Provides platform-specific guidance
- ✅ Links to official download pages

### 3. **IPC Integration**
Added IPC handlers:
- ✅ `android:check-dependencies` - Check all dependencies
- ✅ `android:get-installation-instructions` - Get setup instructions

## 🛠️ Installation Instructions by Platform

### **Windows**
1. Download Android Studio from https://developer.android.com/studio
2. Install Android Studio with default settings
3. Open Android Studio and go to SDK Manager
4. Install Android SDK, NDK, and Build Tools
5. Set ANDROID_HOME environment variable to SDK location
6. Install OpenJDK 11 from https://adoptium.net/
7. Set JAVA_HOME environment variable to JDK location

### **macOS**
1. Install Android Studio: `brew install --cask android-studio`
2. Or download from https://developer.android.com/studio
3. Open Android Studio and install SDK components
4. Install Java: `brew install openjdk@11`
5. Set environment variables in `~/.zshrc` or `~/.bash_profile`:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export JAVA_HOME=/opt/homebrew/opt/openjdk@11
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### **Linux**
1. Install Android Studio: `snap install android-studio --classic`
2. Or download from https://developer.android.com/studio
3. Install Java: `sudo apt install openjdk-11-jdk`
4. Set environment variables in `~/.bashrc`:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

## 🔧 Usage in Your App

### **Add to Preview Panel**
```tsx
import { AndroidDependencyChecker } from '@/components/AndroidDependencyChecker';

// In your preview panel component
<AndroidDependencyChecker />
```

### **Check Dependencies Programmatically**
```typescript
import { IpcClient } from '@/ipc/ipc_client';

// Check dependencies
const result = await IpcClient.getInstance().checkAndroidDependencies();
if (result.success) {
  const status = result.status;
  console.log('Android SDK ready:', status.androidSdk.installed);
  console.log('Java ready:', status.java.installed);
  console.log('Overall ready:', status.overall.ready);
}
```

## 🎯 Benefits

1. **Proactive Detection**: Users know what's missing before attempting builds
2. **Clear Instructions**: Platform-specific installation guidance
3. **Real-time Status**: Live dependency checking
4. **Better UX**: No more mysterious build failures
5. **Cross-platform**: Works on Windows, macOS, and Linux

## 🚀 Next Steps

1. **Integrate the component** into your preview panel
2. **Test on different systems** to verify detection works
3. **Add auto-installation** for common tools (optional)
4. **Create setup wizard** for first-time users
5. **Add dependency caching** to avoid repeated checks

## 📊 Expected Results

- ✅ **Before**: Builds fail silently with cryptic errors
- ✅ **After**: Clear dependency status with installation guidance
- ✅ **User Experience**: Users can self-diagnose and fix issues
- ✅ **Support**: Reduced support requests for build failures

This solution addresses the core issue of missing Android build dependencies and provides users with the tools they need to successfully set up their development environment.

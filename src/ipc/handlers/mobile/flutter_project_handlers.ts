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

    // Use custom project path if provided, otherwise generate one
    const projectPath = options.projectPath || await generateProjectPath(slug);
    console.log(`[DEBUG] Using project path: ${projectPath}`);
    
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
 * Check if Flutter CLI is available
 */
async function isFlutterCliAvailable(): Promise<boolean> {
  try {
    await execAsync('flutter --version', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create base Flutter project using flutter create command or manual fallback
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

  // Check if Flutter CLI is available
  const flutterAvailable = await isFlutterCliAvailable();
  
  if (flutterAvailable) {
    // Use Flutter CLI if available
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
  } else {
    // Fallback: Create Flutter project structure manually
    console.log('Flutter CLI not available, creating project structure manually...');
    await createFlutterProjectManually(projectPath, packageId, displayName);
  }
}

/**
 * Create Flutter project structure manually when Flutter CLI is not available
 */
async function createFlutterProjectManually(
  projectPath: string,
  packageId: string,
  displayName: string
): Promise<void> {
  console.log(`[DEBUG] Creating Flutter project manually at: ${projectPath}`);
  console.log(`[DEBUG] Package ID: ${packageId}, Display Name: ${displayName}`);
  
  const projectName = path.basename(projectPath).replace(/-/g, '_');
  console.log(`[DEBUG] Project name: ${projectName}`);
  
  // Create directory structure
  const directories = [
    'lib',
    'android/app/src/main/kotlin',
    'android/app/src/main/res/values',
    'android/app/src/main/res/mipmap-hdpi',
    'android/app/src/main/res/mipmap-mdpi',
    'android/app/src/main/res/mipmap-xhdpi',
    'android/app/src/main/res/mipmap-xxhdpi',
    'android/app/src/main/res/mipmap-xxxhdpi',
    'ios/Runner',
    'ios/Runner/Assets.xcassets/AppIcon.appiconset',
    'test',
    'assets/images'
  ];

  for (const dir of directories) {
    const fullPath = path.join(projectPath, dir);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Create pubspec.yaml
  const pubspecContent = `name: ${projectName}
description: "${displayName} - Generated by Applaa"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.1.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.4.2
  connectivity_plus: ^5.0.1
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
`;

  const pubspecFilePath = path.join(projectPath, 'pubspec.yaml');
  fs.writeFileSync(pubspecFilePath, pubspecContent);
  console.log(`[DEBUG] Created pubspec.yaml at: ${pubspecFilePath}`);
  console.log(`[DEBUG] pubspec.yaml exists after creation: ${fs.existsSync(pubspecFilePath)}`);

  // Create main.dart with webview functionality
  const mainDartContent = `import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:io' show Platform;

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isDarkMode = false;

  @override
  Widget build(BuildContext context) {
    // Platform-Specific UI
    if (Platform.isIOS) {
      return CupertinoApp(
        title: '${displayName}',
        theme: CupertinoThemeData(
          brightness: _isDarkMode ? Brightness.dark : Brightness.light,
        ),
        home: MainScreen(onThemeChanged: (isDark) => setState(() => _isDarkMode = isDark)),
        debugShowCheckedModeBanner: false,
      );
    } else {
      return MaterialApp(
        title: '${displayName}',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          brightness: Brightness.light,
          useMaterial3: true,
        ),
        darkTheme: ThemeData(
          primarySwatch: Colors.blue,
          brightness: Brightness.dark,
          useMaterial3: true,
        ),
        themeMode: _isDarkMode ? ThemeMode.dark : ThemeMode.light,
        home: MainScreen(onThemeChanged: (isDark) => setState(() => _isDarkMode = isDark)),
        debugShowCheckedModeBanner: false,
      );
    }
  }
}

class MainScreen extends StatefulWidget {
  final Function(bool) onThemeChanged;
  
  MainScreen({required this.onThemeChanged});

  @override
  _MainScreenState createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  late WebViewController _controller;
  bool _isLoading = true;
  bool _isOffline = false;
  String _currentUrl = 'http://localhost:5173'; // Will be updated by upgrade handler
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _initializeWebView();
    _checkConnectivity();
  }

  void _initializeWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(_currentUrl));
  }

  void _checkConnectivity() async {
    var connectivityResult = await Connectivity().checkConnectivity();
    setState(() {
      _isOffline = connectivityResult == ConnectivityResult.none;
    });
    
    // Listen for connectivity changes
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      setState(() {
        _isOffline = result == ConnectivityResult.none;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    // Platform-Specific UI
    if (Platform.isIOS) {
      return _buildIOSLayout();
    } else {
      return _buildAndroidLayout();
    }
  }

  Widget _buildAndroidLayout() {
    return Scaffold(
      appBar: AppBar(
        title: Text('${displayName}'),
        actions: [
          IconButton(
            icon: Icon(Icons.search),
            onPressed: _showSearch,
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _refreshWebView,
          ),
        ],
      ),
      drawer: _buildNavigationDrawer(),
      body: _buildWebViewBody(),
    );
  }

  Widget _buildIOSLayout() {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('${displayName}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: Icon(CupertinoIcons.search),
              onPressed: _showSearch,
            ),
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: Icon(CupertinoIcons.refresh),
              onPressed: _refreshWebView,
            ),
          ],
        ),
      ),
      child: SafeArea(child: _buildWebViewBody()),
    );
  }

  Widget _buildWebViewBody() {
    if (_isOffline) {
      return _buildOfflineScreen();
    }

    return RefreshIndicator(
      // Pull-to-Refresh
      onRefresh: () async {
        await _controller.reload();
      },
      child: Stack(
        children: [
          WebViewWidget(controller: _controller),
          
          // Native Loading States
          if (_isLoading)
            Container(
              color: Theme.of(context).scaffoldBackgroundColor,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Platform.isIOS 
                      ? CupertinoActivityIndicator(radius: 20)
                      : CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text(
                      'Loading ${displayName}...',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNavigationDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue, Colors.blueAccent],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.web, size: 40, color: Colors.white),
                SizedBox(height: 10),
                Text(
                  '${displayName}',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Enhanced Web App',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          
          ListTile(
            leading: Icon(Icons.home),
            title: Text('Home'),
            onTap: () {
              _controller.loadRequest(Uri.parse(_currentUrl));
              Navigator.pop(context);
            },
          ),
          
          ListTile(
            leading: Icon(Icons.search),
            title: Text('Search'),
            onTap: () {
              Navigator.pop(context);
              _showSearch();
            },
          ),
          
          Divider(),
          
          // Theme Switching
          ListTile(
            leading: Icon(Icons.dark_mode),
            title: Text('Dark Mode'),
            trailing: Switch(
              value: Theme.of(context).brightness == Brightness.dark,
              onChanged: widget.onThemeChanged,
            ),
          ),
          
          ListTile(
            leading: Icon(Icons.wifi_off),
            title: Text('Offline Mode'),
            subtitle: Text(_isOffline ? 'Currently offline' : 'Online'),
            trailing: Icon(
              _isOffline ? Icons.signal_wifi_off : Icons.signal_wifi_4_bar,
              color: _isOffline ? Colors.red : Colors.green,
            ),
          ),
          
          Divider(),
          
          ListTile(
            leading: Icon(Icons.info),
            title: Text('About'),
            onTap: _showAbout,
          ),
        ],
      ),
    );
  }

  // Offline Support
  Widget _buildOfflineScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'No Internet Connection',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          SizedBox(height: 8),
          Text(
            'Please check your connection and try again',
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              _checkConnectivity();
              if (!_isOffline) {
                _controller.reload();
              }
            },
            child: Text('Retry'),
          ),
        ],
      ),
    );
  }

  // Native Search (in WebView)
  void _showSearch() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Search in Page'),
        content: TextField(
          onChanged: (value) => _searchQuery = value,
          decoration: InputDecoration(
            hintText: 'Enter search term...',
            prefixIcon: Icon(Icons.search),
          ),
          onSubmitted: (value) {
            _performSearch(value);
            Navigator.pop(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _performSearch(_searchQuery);
              Navigator.pop(context);
            },
            child: Text('Search'),
          ),
        ],
      ),
    );
  }

  void _performSearch(String query) {
    if (query.isNotEmpty) {
      // Inject JavaScript to search in the WebView
      _controller.runJavaScript('''
        window.find('$query', false, false, true);
      ''');
    }
  }

  void _refreshWebView() async {
    await _controller.reload();
  }

  void _showAbout() {
    Navigator.pop(context);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('About ${displayName}'),
        content: Text('Version 1.0.0\\nBuilt with Flutter & Applaa\\nEnhanced Web App Experience'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }
}`;

  fs.writeFileSync(path.join(projectPath, 'lib', 'main.dart'), mainDartContent);

  // Create Android files
  await createAndroidFiles(projectPath, packageId, displayName);
  
  // Create iOS files
  await createIOSFiles(projectPath, packageId, displayName);
  
  // Create analysis_options.yaml
  const analysisOptionsContent = `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    prefer_single_quotes: true
`;

  fs.writeFileSync(path.join(projectPath, 'analysis_options.yaml'), analysisOptionsContent);
}

/**
 * Create Android platform files
 */
async function createAndroidFiles(projectPath: string, packageId: string, displayName: string): Promise<void> {
  const packagePath = packageId.split('.').join('/');
  
  // Create build.gradle (project level)
  const projectBuildGradle = `buildscript {
    ext.kotlin_version = '1.7.10'
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.buildDir = '../build'
subprojects {
    project.buildDir = "\${rootProject.buildDir}/\${project.name}"
}
subprojects {
    project.evaluationDependsOn(':app')
}

tasks.register("clean", Delete) {
    delete rootProject.buildDir
}`;

  fs.writeFileSync(path.join(projectPath, 'android', 'build.gradle'), projectBuildGradle);

  // Create app build.gradle
  const appBuildGradle = `def localProperties = new Properties()
def localPropertiesFile = rootProject.file('local.properties')
if (localPropertiesFile.exists()) {
    localPropertiesFile.withReader('UTF-8') { reader ->
        localProperties.load(reader)
    }
}

def flutterRoot = localProperties.getProperty('flutter.sdk')
if (flutterRoot == null) {
    throw new GradleException("Flutter SDK not found. Define location with flutter.sdk in the local.properties file.")
}

def flutterVersionCode = localProperties.getProperty('flutter.versionCode')
if (flutterVersionCode == null) {
    flutterVersionCode = '1'
}

def flutterVersionName = localProperties.getProperty('flutter.versionName')
if (flutterVersionName == null) {
    flutterVersionName = '1.0'
}

apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply from: "$flutterRoot/packages/flutter_tools/gradle/flutter.gradle"

android {
    namespace "${packageId}"
    compileSdkVersion flutter.compileSdkVersion
    ndkVersion flutter.ndkVersion

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    defaultConfig {
        applicationId "${packageId}"
        minSdkVersion flutter.minSdkVersion
        targetSdkVersion flutter.targetSdkVersion
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug
        }
    }
}

flutter {
    source '../..'
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
}`;

  fs.writeFileSync(path.join(projectPath, 'android', 'app', 'build.gradle'), appBuildGradle);

  // Create AndroidManifest.xml
  const androidManifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:label="${displayName}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>`;

  fs.writeFileSync(path.join(projectPath, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), androidManifest);

  // Create MainActivity.kt
  const mainActivity = `package ${packageId}

import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {
}`;

  const kotlinDir = path.join(projectPath, 'android', 'app', 'src', 'main', 'kotlin', ...packageId.split('.'));
  fs.mkdirSync(kotlinDir, { recursive: true });
  fs.writeFileSync(path.join(kotlinDir, 'MainActivity.kt'), mainActivity);

  // Create gradle.properties
  const gradleProperties = `org.gradle.jvmargs=-Xmx1536M
android.useAndroidX=true
android.enableJetifier=true`;

  fs.writeFileSync(path.join(projectPath, 'android', 'gradle.properties'), gradleProperties);

  // Create settings.gradle
  const settingsGradle = `include ':app'

def localPropertiesFile = new File(rootProject.projectDir, "local.properties")
def properties = new Properties()

assert localPropertiesFile.exists()
localPropertiesFile.withReader("UTF-8") { reader -> properties.load(reader) }

def flutterSdkPath = properties.getProperty("flutter.sdk")
assert flutterSdkPath != null, "flutter.sdk not set in local.properties"
apply from: "$flutterSdkPath/packages/flutter_tools/gradle/app_plugin_loader.gradle"`;

  fs.writeFileSync(path.join(projectPath, 'android', 'settings.gradle'), settingsGradle);
}

/**
 * Create iOS platform files
 */
async function createIOSFiles(projectPath: string, packageId: string, displayName: string): Promise<void> {
  // Create Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${displayName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${path.basename(projectPath).replace(/-/g, '_')}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(FLUTTER_BUILD_NAME)</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>$(FLUTTER_BUILD_NUMBER)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>CADisableMinimumFrameDurationOnPhone</key>
	<true/>
	<key>UIApplicationSupportsIndirectInputEvents</key>
	<true/>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
</dict>
</plist>`;

  fs.writeFileSync(path.join(projectPath, 'ios', 'Runner', 'Info.plist'), infoPlist);
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
  
  console.log(`[DEBUG] Looking for pubspec.yaml at: ${pubspecPath}`);
  console.log(`[DEBUG] Project path: ${projectPath}`);
  console.log(`[DEBUG] pubspec.yaml exists: ${fs.existsSync(pubspecPath)}`);
  
  if (!fs.existsSync(pubspecPath)) {
    // Check if we're in a manually created project that already has all dependencies
    console.log(`[DEBUG] pubspec.yaml not found at ${pubspecPath}`);
    console.log(`[DEBUG] Checking if this is a manually created project...`);
    
    // List contents of project directory for debugging
    if (fs.existsSync(projectPath)) {
      const contents = fs.readdirSync(projectPath);
      console.log(`[DEBUG] Project directory contents: ${contents.join(', ')}`);
    } else {
      console.log(`[DEBUG] Project directory does not exist: ${projectPath}`);
    }
    
    throw new Error(`pubspec.yaml not found at ${pubspecPath}. Project path: ${projectPath}`);
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

  // Run flutter pub get only if Flutter CLI is available
  const flutterAvailable = await isFlutterCliAvailable();
  if (flutterAvailable) {
    await execAsync('flutter pub get', { 
      cwd: projectPath,
      timeout: 120000 
    });
  } else {
    console.log('Flutter CLI not available, skipping flutter pub get. Dependencies are already included in pubspec.yaml.');
  }
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
    // Check if Flutter CLI is available first
    const flutterAvailable = await isFlutterCliAvailable();
    if (!flutterAvailable) {
      return 'Manual Project (Flutter CLI not available)';
    }
    
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



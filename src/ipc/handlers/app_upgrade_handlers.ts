import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { AppUpgrade } from "../ipc_types";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "../../paths/paths";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { gitAddAll, gitCommit } from "../utils/git_utils";
import { simpleSpawn } from "../utils/simpleSpawn";

export const logger = log.scope("app_upgrade_handlers");
const handle = createLoggedHandler(logger);

const availableUpgrades: Omit<AppUpgrade, "isNeeded">[] = [
  {
    id: "component-tagger",
    title: "Enable select component to edit",
    description:
      "Installs the Dyad component tagger Vite plugin and its dependencies.",
    manualUpgradeUrl: "https://dyad.sh/docs/upgrades/select-component",
  },
  {
    id: "capacitor",
    title: "Upgrade to hybrid mobile app with Capacitor",
    description:
      "Adds Capacitor to your app lets it run on iOS and Android in addition to the web.",
    manualUpgradeUrl: "https://dyad.sh/docs/guides/mobile-app#upgrade-your-app",
  },
  {
    id: "flutter-webview",
    title: "Create Flutter mobile app",
    description:
      "Generates a Flutter app that displays your web app. Optimized performance and small bundle size.",
    manualUpgradeUrl: "https://docs.flutter.dev/cookbook/plugins/webview",
  },
];

async function getApp(appId: number) {
  try {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });
    if (!app) {
      throw new Error(`App with id ${appId} not found`);
    }
    return app;
  } catch (err) {
    // Fallback for DBs missing new columns
    logger.warn("getApp fallback due to select error:", err);
    const row = db.$client
      .prepare(
        "SELECT id, name, path, created_at as createdAt, updated_at as updatedAt, " +
          "github_org as githubOrg, github_repo as githubRepo, github_branch as githubBranch, " +
          "supabase_project_id as supabaseProjectId, neon_project_id as neonProjectId, " +
          "neon_development_branch_id as neonDevelopmentBranchId, neon_preview_branch_id as neonPreviewBranchId, " +
          "vercel_project_id as vercelProjectId, vercel_project_name as vercelProjectName, vercel_team_id as vercelTeamId, " +
          "vercel_deployment_url as vercelDeploymentUrl, chat_context as chatContext FROM apps WHERE id = ?"
      )
      .get(appId);
    if (!row) {
      throw new Error(`App with id ${appId} not found`);
    }
    return {
      ...row,
      createdAt: row.createdAt ? new Date(row.createdAt * 1000) : undefined,
      updatedAt: row.updatedAt ? new Date(row.updatedAt * 1000) : undefined,
      displayName: undefined,
      packageId: undefined,
      slug: undefined,
    } as any;
  }
}

function isViteApp(appPath: string): boolean {
  const viteConfigPathJs = path.join(appPath, "vite.config.js");
  const viteConfigPathTs = path.join(appPath, "vite.config.ts");

  return fs.existsSync(viteConfigPathTs) || fs.existsSync(viteConfigPathJs);
}

function isWebApp(appPath: string): boolean {
  // Check for Vite apps (React with Vite)
  const viteConfigPathJs = path.join(appPath, "vite.config.js");
  const viteConfigPathTs = path.join(appPath, "vite.config.ts");
  const hasViteConfig = fs.existsSync(viteConfigPathTs) || fs.existsSync(viteConfigPathJs);

  // Check for Next.js apps
  const nextConfigPathJs = path.join(appPath, "next.config.js");
  const nextConfigPathTs = path.join(appPath, "next.config.ts");
  const nextConfigPathMjs = path.join(appPath, "next.config.mjs");
  const hasNextConfig = fs.existsSync(nextConfigPathJs) || fs.existsSync(nextConfigPathTs) || fs.existsSync(nextConfigPathMjs);

  // Check for package.json with web frameworks
  const packageJsonPath = path.join(appPath, "package.json");
  let hasWebFramework = false;
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      hasWebFramework = !!(deps.react || deps.next || deps.vite || deps.vue || deps.svelte);
    } catch (error) {
      // Ignore JSON parse errors
    }
  }

  return hasViteConfig || hasNextConfig || hasWebFramework;
}

function isComponentTaggerUpgradeNeeded(appPath: string): boolean {
  const viteConfigPathJs = path.join(appPath, "vite.config.js");
  const viteConfigPathTs = path.join(appPath, "vite.config.ts");

  let viteConfigPath;
  if (fs.existsSync(viteConfigPathTs)) {
    viteConfigPath = viteConfigPathTs;
  } else if (fs.existsSync(viteConfigPathJs)) {
    viteConfigPath = viteConfigPathJs;
  } else {
    return false;
  }

  try {
    const viteConfigContent = fs.readFileSync(viteConfigPath, "utf-8");
    return !viteConfigContent.includes("@dyad-sh/react-vite-component-tagger");
  } catch (e) {
    logger.error("Error reading vite config", e);
    return false;
  }
}

function isCapacitorUpgradeNeeded(appPath: string, appType?: string): boolean {
  // appPath here is the full path from getDyadAppPath(app.path)
  // Check if it's a web app first - use appType if available, otherwise fallback to file detection
  if (appType) {
    if (appType !== 'web') {
      return false;
    }
  } else if (!isWebApp(appPath)) {
    return false;
  }

  const fullAppPath = appPath;

  // Check if Capacitor is already installed by looking for config files
  const capacitorConfigJs = path.join(fullAppPath, "capacitor.config.js");
  const capacitorConfigTs = path.join(fullAppPath, "capacitor.config.ts");
  const capacitorConfigJson = path.join(fullAppPath, "capacitor.config.json");

  // Check if android and ios folders exist (actual generated folders)
  const androidFolder = path.join(fullAppPath, "android");
  const iosFolder = path.join(fullAppPath, "ios");

  // If any Capacitor config exists OR android/ios folders exist, the upgrade is not needed
  const hasCapacitorConfig = fs.existsSync(capacitorConfigJs) || 
                            fs.existsSync(capacitorConfigTs) || 
                            fs.existsSync(capacitorConfigJson);
  
  const hasGeneratedFolders = fs.existsSync(androidFolder) && fs.existsSync(iosFolder);

  logger.info(`Capacitor upgrade check: ${fullAppPath}`);
  logger.info(`  - Config files exist: ${hasCapacitorConfig}`);
  logger.info(`  - Android folder exists: ${fs.existsSync(androidFolder)}`);
  logger.info(`  - iOS folder exists: ${fs.existsSync(iosFolder)}`);
  logger.info(`  - Generated folders exist: ${hasGeneratedFolders}`);

  if (hasCapacitorConfig || hasGeneratedFolders) {
    logger.info(`  - Capacitor is already installed, upgrade NOT needed`);
    return false;
  }

  logger.info(`  - Capacitor is NOT installed, upgrade IS needed`);
  return true;
}

function isFlutterWebviewUpgradeNeeded(appPath: string, appType?: string): boolean {
  // appPath here is the full path from getDyadAppPath(app.path)
  // Check if it's a web app first - use appType if available, otherwise fallback to file detection
  if (appType) {
    if (appType !== 'web') {
      return false;
    }
  } else if (!isWebApp(appPath)) {
    return false;
  }

  // Check if a Flutter mobile app already exists and is properly configured
  const fullAppPath = appPath;
  const parentDir = path.dirname(fullAppPath);
  const appName = path.basename(fullAppPath);
  
  // Check multiple possible Flutter folder formats
  const flutterMobilePaths = [
    path.join(parentDir, `${appName}-flutter`),           // New format
    path.join(parentDir, `${appName}_flutter_mobile`),    // Old format from previous generation
    path.join(parentDir, `${appName}-flutter-mobile`)     // Alternative format
  ];
  
  // Check if any Flutter mobile app exists with proper structure
  for (const flutterMobilePath of flutterMobilePaths) {
    const dirExists = fs.existsSync(flutterMobilePath);
    const pubspecExists = fs.existsSync(path.join(flutterMobilePath, 'pubspec.yaml'));
    const mainDartExists = fs.existsSync(path.join(flutterMobilePath, 'lib', 'main.dart'));
    
    // Also check for Flutter-specific folders that indicate a proper Flutter project
    const androidFlutterExists = fs.existsSync(path.join(flutterMobilePath, 'android'));
    const iosFlutterExists = fs.existsSync(path.join(flutterMobilePath, 'ios'));
    const libFolderExists = fs.existsSync(path.join(flutterMobilePath, 'lib'));
    
    const isProperlyConfigured = dirExists && 
                                pubspecExists && 
                                mainDartExists && 
                                androidFlutterExists && 
                                iosFlutterExists && 
                                libFolderExists;
    
    logger.info(`Flutter upgrade check: ${flutterMobilePath}`);
    logger.info(`  - Directory exists: ${dirExists}`);
    logger.info(`  - pubspec.yaml exists: ${pubspecExists}`);
    logger.info(`  - main.dart exists: ${mainDartExists}`);
    logger.info(`  - android folder exists: ${androidFlutterExists}`);
    logger.info(`  - ios folder exists: ${iosFlutterExists}`);
    logger.info(`  - lib folder exists: ${libFolderExists}`);
    logger.info(`  - Properly configured: ${isProperlyConfigured}`);
    
    if (isProperlyConfigured) {
      // Found a properly configured Flutter app, no upgrade needed
      logger.info(`  - Flutter is already installed, upgrade NOT needed`);
      return false;
    }
  }
  
  // No properly configured Flutter app found, upgrade is needed
  logger.info(`Flutter upgrade check: No properly configured Flutter app found, upgrade IS needed`);
  return true;
}

async function applyComponentTagger(appPath: string) {
  const viteConfigPathJs = path.join(appPath, "vite.config.js");
  const viteConfigPathTs = path.join(appPath, "vite.config.ts");

  let viteConfigPath;
  if (fs.existsSync(viteConfigPathTs)) {
    viteConfigPath = viteConfigPathTs;
  } else if (fs.existsSync(viteConfigPathJs)) {
    viteConfigPath = viteConfigPathJs;
  } else {
    throw new Error("Could not find vite.config.js or vite.config.ts");
  }

  let content = await fs.promises.readFile(viteConfigPath, "utf-8");

  // Add import statement if not present
  if (
    !content.includes(
      "import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';",
    )
  ) {
    // Add it after the last import statement
    const lines = content.split("\n");
    let lastImportIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith("import ")) {
        lastImportIndex = i;
        break;
      }
    }
    lines.splice(
      lastImportIndex + 1,
      0,
      "import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';",
    );
    content = lines.join("\n");
  }

  // Add plugin to plugins array
  if (content.includes("plugins: [")) {
    if (!content.includes("dyadComponentTagger()")) {
      content = content.replace(
        "plugins: [",
        "plugins: [dyadComponentTagger(), ",
      );
    }
  } else {
    throw new Error(
      "Could not find `plugins: [` in vite.config.ts. Manual installation required.",
    );
  }

  await fs.promises.writeFile(viteConfigPath, content);

  // Install the dependency
  await new Promise<void>((resolve, reject) => {
    logger.info("Installing component-tagger dependency");
    const process = spawn(
      "pnpm add -D @dyad-sh/react-vite-component-tagger || npm install --save-dev --legacy-peer-deps @dyad-sh/react-vite-component-tagger",
      {
        cwd: appPath,
        shell: true,
        stdio: "pipe",
      },
    );

    process.stdout?.on("data", (data) => logger.info(data.toString()));
    process.stderr?.on("data", (data) => logger.error(data.toString()));

    process.on("close", (code) => {
      if (code === 0) {
        logger.info("component-tagger dependency installed successfully");
        resolve();
      } else {
        logger.error(`Failed to install dependency, exit code ${code}`);
        reject(new Error("Failed to install dependency"));
      }
    });

    process.on("error", (err) => {
      logger.error("Failed to spawn pnpm", err);
      reject(err);
    });
  });

  // Commit changes
  try {
    logger.info("Staging and committing changes");
    await gitAddAll({ path: appPath });
    await gitCommit({
      path: appPath,
      message: "[applaa] add Applaa component tagger",
    });
    logger.info("Successfully committed changes");
  } catch (err) {
    logger.warn(
      `Failed to commit changes. This may happen if the project is not in a git repository, or if there are no changes to commit.`,
      err,
    );
  }
}

async function applyCapacitor({
  appName,
  appPath,
}: {
  appName: string;
  appPath: string;
}) {
  // appPath here is the full path from getDyadAppPath(app.path)
  const fullAppPath = appPath;
  
  // Check if Capacitor is already installed
  if (!isCapacitorUpgradeNeeded(appPath)) {
    logger.info(`Capacitor is already installed in ${fullAppPath}, skipping installation`);
    throw new Error("Capacitor is already installed in this project");
  }
  
  // Install Capacitor dependencies using hermetic package manager
  const { runPackageManagerCommand } = await import("../../lib/hermetic-runtime");
  
  try {
    // Use the updated hermetic runtime which returns Promise<ChildProcess>
    const child = await runPackageManagerCommand("add", [
        "@capacitor/core", 
        "@capacitor/cli", 
        "@capacitor/ios", 
        "@capacitor/android"
      ], fullAppPath, {
        stdio: "pipe"
      });
      
    await new Promise<void>((resolve, reject) => {
      child.on("close", (code: number) => {
        if (code === 0) {
          logger.info("Capacitor dependencies installed successfully");
          resolve();
        } else {
          reject(new Error(`Failed to install Capacitor dependencies, exit code: ${code}`));
        }
      });
      
      child.on("error", reject);
    });
  } catch (error) {
    logger.error("Failed to install Capacitor dependencies:", error);
    throw error;
  }

  // Initialize Capacitor using the original working method
  await simpleSpawn({
    command: `npx cap init "${appName}" "com.example.${appName.toLowerCase().replace(/[^a-z0-9]/g, "")}" --web-dir=dist`,
    cwd: fullAppPath,
    successMessage: "Capacitor initialized successfully",
    errorPrefix: "Failed to initialize Capacitor",
  });

  // Add iOS and Android platforms using the original working method
  await simpleSpawn({
    command: "npx cap add ios && npx cap add android",
    cwd: fullAppPath,
    successMessage: "iOS and Android platforms added successfully",
    errorPrefix: "Failed to add iOS and Android platforms",
  });

  // Commit changes
  try {
    logger.info("Staging and committing Capacitor changes");
    await gitAddAll({ path: fullAppPath });
    await gitCommit({
      path: fullAppPath,
      message: "[applaa] add Capacitor for mobile app support",
    });
    logger.info("Successfully committed Capacitor changes");
  } catch (err) {
    logger.warn(
      `Failed to commit changes. This may happen if the project is not in a git repository, or if there are no changes to commit.`,
      err,
    );
    throw new Error(
      "Failed to commit Capacitor changes. Please commit them manually. Error: " +
        err,
    );
  }
}

// Old applyFlutterWebview function removed - now using existing mobile project creation system

export function registerAppUpgradeHandlers() {
  handle(
    "get-app-upgrades",
    async (_, { appId }: { appId: number }): Promise<AppUpgrade[]> => {
      logger.info(`get-app-upgrades called with appId: ${appId}`);
      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);
      logger.info(`App found: ${app.name}, path: ${app.path}, fullPath: ${appPath}`);

      const upgradesWithStatus = availableUpgrades.map((upgrade) => {
        let isNeeded = false;
        if (upgrade.id === "component-tagger") {
          isNeeded = isComponentTaggerUpgradeNeeded(appPath);
        } else if (upgrade.id === "capacitor") {
          isNeeded = isCapacitorUpgradeNeeded(appPath, app.appType);
        } else if (upgrade.id === "flutter-webview") {
          isNeeded = isFlutterWebviewUpgradeNeeded(appPath, app.appType);
        }
        return { ...upgrade, isNeeded };
      });

      // Filter out upgrades that are not needed - this ensures buttons are hidden immediately
      const neededUpgrades = upgradesWithStatus.filter(upgrade => upgrade.isNeeded);
      
      logger.info(`Returning ${neededUpgrades.length} needed upgrades out of ${upgradesWithStatus.length} total`);
      return neededUpgrades;
    },
  );

  handle(
    "execute-app-upgrade",
    async (_, { appId, upgradeId }: { appId: number; upgradeId: string }) => {
      console.log(`🔧 [IPC] execute-app-upgrade called with appId: ${appId}, upgradeId: ${upgradeId}`);
      
      if (!upgradeId) {
        throw new Error("upgradeId is required");
      }

      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);
      
      console.log(`🔧 [IPC] App found: ${app.name}, path: ${appPath}`);

      if (upgradeId === "component-tagger") {
        console.log(`🔧 [IPC] Applying component tagger upgrade`);
        await applyComponentTagger(appPath);
        console.log(`✅ [IPC] Component tagger upgrade completed`);
      } else if (upgradeId === "capacitor") {
        console.log(`🔧 [IPC] Applying Capacitor upgrade`);
        await applyCapacitor({ appName: app.name, appPath });
        console.log(`✅ [IPC] Capacitor upgrade completed`);
      } else if (upgradeId === "flutter-webview") {
        console.log(`🔧 [IPC] Creating comprehensive Flutter webview project (CLI-independent)`);
        
        const webUrl = app.vercelDeploymentUrl || `http://localhost:5173`;
        const parentDir = path.dirname(appPath);
        const flutterProjectPath = path.join(parentDir, `${app.name}-flutter`);
        const projectName = app.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const packageId = `com.applaa.${app.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        console.log(`🔧 [IPC] Creating comprehensive Flutter project at: ${flutterProjectPath}`);
        console.log(`🔧 [IPC] Web URL: ${webUrl}`);
        
        // Remove existing directory if it exists
        if (fs.existsSync(flutterProjectPath)) {
          console.log(`🔧 [IPC] Removing existing Flutter directory: ${flutterProjectPath}`);
          await fs.promises.rm(flutterProjectPath, { recursive: true, force: true });
        }
        
        // ✅ CREATE COMPREHENSIVE FLUTTER PROJECT STRUCTURE MANUALLY (CLI-INDEPENDENT)
        console.log(`🔧 [IPC] Creating comprehensive Flutter project structure manually...`);
        
        // Create ALL the directories that a comprehensive Flutter project should have
        const comprehensiveDirectories = [
          'lib', 'test', 'assets/images',
          'android/app/src/main/kotlin', 'android/app/src/debug', 'android/app/src/profile', 'android/app/src/release', 'android/gradle/wrapper',
          'ios/Runner', 'ios/Runner.xcodeproj', 'ios/Runner.xcworkspace', 'ios/RunnerTests',
          'linux', 'macos/Runner', 'windows/runner', 'web',
          '.dart_tool', '.idea', 'build', '.vscode'
        ];
        
        console.log(`🔧 [IPC] Creating ${comprehensiveDirectories.length} directories...`);
        for (const dir of comprehensiveDirectories) {
          fs.mkdirSync(path.join(flutterProjectPath, dir), { recursive: true });
        }
        
        // Create comprehensive pubspec.yaml with all dependencies
        const comprehensivePubspec = `name: ${projectName}
description: ${app.name} - Comprehensive Flutter Mobile Wrapper
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # WebView and connectivity
  webview_flutter: ^4.4.2
  connectivity_plus: ^5.0.1
  
  # UI and theming
  cupertino_icons: ^1.0.2
  
  # Storage and preferences
  shared_preferences: ^2.2.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
  
  # Platform-specific configurations
  generate: true
`;
        fs.writeFileSync(path.join(flutterProjectPath, 'pubspec.yaml'), comprehensivePubspec);
        console.log(`🔧 [IPC] Created comprehensive pubspec.yaml`);
        
        // Create comprehensive main.dart with advanced features
        const comprehensiveMainDart = `import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
  void initState() {
    super.initState();
    _loadThemePreference();
  }

  void _loadThemePreference() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _isDarkMode = prefs.getBool('darkMode') ?? false;
    });
  }

  void _saveThemePreference(bool isDark) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', isDark);
  }

  @override
  Widget build(BuildContext context) {
    if (Platform.isIOS) {
      return CupertinoApp(
        title: '${app.name}',
        theme: CupertinoThemeData(
          brightness: _isDarkMode ? Brightness.dark : Brightness.light,
        ),
        home: MainScreen(
          isDarkMode: _isDarkMode,
          onThemeChanged: (isDark) {
            setState(() => _isDarkMode = isDark);
            _saveThemePreference(isDark);
          }
        ),
        debugShowCheckedModeBanner: false,
      );
    } else {
      return MaterialApp(
        title: '${app.name}',
        theme: ThemeData(primarySwatch: Colors.blue, brightness: Brightness.light, useMaterial3: true),
        darkTheme: ThemeData(primarySwatch: Colors.blue, brightness: Brightness.dark, useMaterial3: true),
        themeMode: _isDarkMode ? ThemeMode.dark : ThemeMode.light,
        home: MainScreen(
          isDarkMode: _isDarkMode,
          onThemeChanged: (isDark) {
            setState(() => _isDarkMode = isDark);
            _saveThemePreference(isDark);
          }
        ),
        debugShowCheckedModeBanner: false,
      );
    }
  }
}

class MainScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) onThemeChanged;
  
  MainScreen({required this.isDarkMode, required this.onThemeChanged});

  @override
  _MainScreenState createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  late WebViewController _controller;
  String _currentUrl = '${webUrl}';
  bool _isLoading = true;
  bool _hasError = false;
  bool _isOffline = false;

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
          onPageStarted: (String url) => setState(() { _isLoading = true; _hasError = false; }),
          onPageFinished: (String url) => setState(() => _isLoading = false),
          onWebResourceError: (WebResourceError error) => setState(() { _hasError = true; _isLoading = false; }),
        ),
      )
      ..loadRequest(Uri.parse(_currentUrl));
  }

  void _checkConnectivity() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    setState(() => _isOffline = connectivityResult == ConnectivityResult.none);

    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      setState(() => _isOffline = result == ConnectivityResult.none);
      if (!_isOffline && _hasError) _refresh();
    });
  }

  void _refresh() => _controller.reload();
  void _toggleTheme() => widget.onThemeChanged(!widget.isDarkMode);

  @override
  Widget build(BuildContext context) {
    if (Platform.isIOS) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
          middle: Text('${app.name}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
              CupertinoButton(padding: EdgeInsets.zero, onPressed: _refresh, child: Icon(CupertinoIcons.refresh)),
              CupertinoButton(padding: EdgeInsets.zero, onPressed: _toggleTheme, child: Icon(widget.isDarkMode ? CupertinoIcons.sun_max : CupertinoIcons.moon)),
            ],
          ),
        ),
        child: SafeArea(child: _buildWebViewContent()),
      );
    } else {
      return Scaffold(
        appBar: AppBar(
          title: Text('${app.name}'),
          actions: [
            IconButton(onPressed: _refresh, icon: Icon(Icons.refresh)),
            IconButton(onPressed: _toggleTheme, icon: Icon(widget.isDarkMode ? Icons.light_mode : Icons.dark_mode)),
          ],
        ),
        body: _buildWebViewContent(),
      );
    }
  }

  Widget _buildWebViewContent() {
    if (_isOffline) {
      return _buildErrorState(
        icon: Platform.isIOS ? CupertinoIcons.wifi_slash : Icons.wifi_off,
        title: 'No Internet Connection',
        message: 'Please check your connection and try again.',
      );
    }

    if (_hasError) {
      return _buildErrorState(
        icon: Platform.isIOS ? CupertinoIcons.exclamationmark_triangle : Icons.error_outline,
        title: 'Failed to Load',
        message: 'Unable to load the web app. Please try again.',
        color: Colors.red,
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        _refresh();
        await Future.delayed(Duration(milliseconds: 500));
      },
      child: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                  Platform.isIOS ? CupertinoActivityIndicator(radius: 20) : CircularProgressIndicator(),
                    SizedBox(height: 16),
                  Text('Loading ${app.name}...'),
                  ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildErrorState({
    required IconData icon,
    required String title,
    required String message,
    Color? color,
  }) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
            Icon(icon, size: 64, color: color ?? Colors.grey),
          SizedBox(height: 16),
            Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
          SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])),
          SizedBox(height: 24),
            Platform.isIOS
                ? CupertinoButton.filled(onPressed: _refresh, child: Text('Retry'))
                : ElevatedButton.icon(onPressed: _refresh, icon: Icon(Icons.refresh), label: Text('Retry')),
          ],
        ),
      ),
    );
  }
}
`;
        
        fs.writeFileSync(path.join(flutterProjectPath, 'lib', 'main.dart'), comprehensiveMainDart);
        console.log(`🔧 [IPC] Created comprehensive main.dart with advanced features`);
        
        // Create Android files
        const androidManifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${packageId}">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <application android:label="${app.name}" android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTop" android:theme="@style/LaunchTheme">
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`;
        fs.writeFileSync(path.join(flutterProjectPath, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), androidManifest);
        fs.writeFileSync(path.join(flutterProjectPath, 'android', 'app', 'src', 'main', 'kotlin', 'MainActivity.kt'), 
          `package ${packageId}\nimport io.flutter.embedding.android.FlutterActivity\nclass MainActivity: FlutterActivity() {}`);
        
        // Create iOS files
        const iosInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>${app.name}</string>
    <key>CFBundleName</key>
    <string>${projectName}</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>`;
        fs.writeFileSync(path.join(flutterProjectPath, 'ios', 'Runner', 'Info.plist'), iosInfoPlist);
        
        // Create comprehensive README
        const readme = `# ${app.name}

Comprehensive Flutter webview wrapper with advanced features.

## 🚀 Features

- 📱 **Native Mobile Wrapper** - Full native experience
- 🔄 **Pull-to-Refresh** - Swipe down to refresh content
- 🌐 **Connectivity Monitoring** - Automatic offline detection
- 🌙 **Dark Mode Support** - Persistent theme switching
- 🎨 **Platform-Specific UI** - Material Design (Android) + Cupertino (iOS)
- 💾 **Persistent Settings** - Theme preferences saved locally
- ⚡ **Error Handling** - Graceful connection and loading error states

## 🌐 Configuration

**Current Web App URL:** ${webUrl}

To change the URL when you deploy your web app:
1. Open \`lib/main.dart\`
2. Find \`String _currentUrl = '${webUrl}';\`
3. Replace with your production URL

## 🛠️ Development

**Prerequisites:** Flutter SDK installed

**Setup:**
\`\`\`bash
flutter pub get
flutter run
\`\`\`

## 📱 Generated by Applaa

This Flutter project was automatically generated by Applaa's comprehensive mobile wrapper system.
No Flutter CLI required for initial generation - pure source code approach!
`;
        fs.writeFileSync(path.join(flutterProjectPath, 'README.md'), readme);
        
        console.log(`✅ [IPC] Comprehensive Flutter webview upgrade completed with ${comprehensiveDirectories.length} directories and advanced features`);
      } else {
        console.error(`❌ [IPC] Unknown upgrade id: ${upgradeId}`);
        throw new Error(`Unknown upgrade id: ${upgradeId}`);
      }
    },
  );
}

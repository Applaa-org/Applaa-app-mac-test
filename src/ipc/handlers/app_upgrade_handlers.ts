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
      message: "[dyad] add Dyad component tagger",
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
  
  // Install Capacitor dependencies
  await simpleSpawn({
    command:
      "pnpm add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android || npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android --legacy-peer-deps",
    cwd: fullAppPath,
    successMessage: "Capacitor dependencies installed successfully",
    errorPrefix: "Failed to install Capacitor dependencies",
  });

  // Initialize Capacitor
  await simpleSpawn({
    command: `npx cap init "${appName}" "com.example.${appName.toLowerCase().replace(/[^a-z0-9]/g, "")}" --web-dir=dist`,
    cwd: fullAppPath,
    successMessage: "Capacitor initialized successfully",
    errorPrefix: "Failed to initialize Capacitor",
  });

  // Add iOS and Android platforms
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
      message: "[dyad] add Capacitor for mobile app support",
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

async function applyFlutterWebview({
  appName,
  appPath,
  webUrl,
}: {
  appName: string;
  appPath: string;
  webUrl: string;
}) {
  // appPath here is the full path from getDyadAppPath(app.path)
  const fullAppPath = appPath;
  const parentDir = path.dirname(fullAppPath);
  const flutterAppPath = path.join(parentDir, `${appName}-flutter`);
  
  // Check if Flutter is already installed
  if (!isFlutterWebviewUpgradeNeeded(appPath)) {
    logger.info(`Flutter app is already installed at ${flutterAppPath}, skipping installation`);
    throw new Error("Flutter app is already installed for this project");
  }
  
  // Delete existing directory if it exists, then create fresh
  if (fs.existsSync(flutterAppPath)) {
    logger.info(`Removing existing Flutter mobile app directory: ${flutterAppPath}`);
    await fs.promises.rm(flutterAppPath, { recursive: true, force: true });
  }
  
  // Create Flutter mobile app
  await simpleSpawn({
    command: `flutter create ${appName}-flutter --org com.applaa --project-name ${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}_flutter`,
    cwd: parentDir,
    successMessage: "Flutter mobile app created successfully",
    errorPrefix: "Failed to create Flutter mobile app",
  });
  
  // Add webview dependency to pubspec.yaml
  const pubspecPath = path.join(flutterAppPath, 'pubspec.yaml');
  let pubspecContent = await fs.promises.readFile(pubspecPath, 'utf-8');
  
  // Add webview_flutter and connectivity dependencies
  pubspecContent = pubspecContent.replace(
    'dependencies:\n  flutter:\n    sdk: flutter',
    `dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.4.2
  connectivity_plus: ^5.0.1`
  );
  
  await fs.promises.writeFile(pubspecPath, pubspecContent);
  
  // Create the enhanced main.dart with MVP features
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
        title: '${appName}',
        theme: CupertinoThemeData(
          brightness: _isDarkMode ? Brightness.dark : Brightness.light,
        ),
        home: MainScreen(onThemeChanged: (isDark) => setState(() => _isDarkMode = isDark)),
        debugShowCheckedModeBanner: false,
      );
    } else {
      return MaterialApp(
        title: '${appName}',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          brightness: Brightness.light,
        ),
        darkTheme: ThemeData(
          primarySwatch: Colors.blue,
          brightness: Brightness.dark,
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
  String _currentUrl = '${webUrl}';
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
        title: Text('${appName}'),
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
        middle: Text('${appName}'),
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
                      'Loading ${appName}...',
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
                  '${appName}',
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
        window.find('\$query', false, false, true);
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
        title: Text('About ${appName}'),
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
  
  await fs.promises.writeFile(path.join(flutterAppPath, 'lib', 'main.dart'), mainDartContent);
  
  // Get Flutter dependencies
  await simpleSpawn({
    command: "flutter pub get",
    cwd: flutterAppPath,
    successMessage: "Flutter dependencies installed successfully",
    errorPrefix: "Failed to install Flutter dependencies",
  });
  
  logger.info(`Flutter mobile app created successfully at: ${flutterAppPath}`);
}

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
      if (!upgradeId) {
        throw new Error("upgradeId is required");
      }

      const app = await getApp(appId);
      const appPath = getDyadAppPath(app.path);

      if (upgradeId === "component-tagger") {
        await applyComponentTagger(appPath);
      } else if (upgradeId === "capacitor") {
        await applyCapacitor({ appName: app.name, appPath });
      } else if (upgradeId === "flutter-webview") {
        // For mobile apps, we need the deployed URL of the web app
        // For now, we'll use localhost:5173 (Vite default) but this should be configurable
        const webUrl = `http://localhost:5173`; // TODO: Make this configurable
        await applyFlutterWebview({ appName: app.name, appPath, webUrl });
      } else {
        throw new Error(`Unknown upgrade id: ${upgradeId}`);
      }
    },
  );
}

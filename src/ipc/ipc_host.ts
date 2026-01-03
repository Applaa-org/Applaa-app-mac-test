import { ipcMain, BrowserWindow } from "electron";
import { registerBrowserAgentHandlers } from "./handlers/browser_agent_handlers";
import { registerTabHandlers } from "./handlers/tab_handlers";
import { registerAppHandlers } from "./handlers/app_handlers";
import { registerChatHandlers } from "./handlers/chat_handlers";
import { registerChatStreamHandlers } from "./handlers/chat_stream_handlers";
import { registerSettingsHandlers } from "./handlers/settings_handlers";
import { registerShellHandlers } from "./handlers/shell_handler";
import { registerDependencyHandlers } from "./handlers/dependency_handlers";
import { registerGithubHandlers } from "./handlers/github_handlers";
import { registerVercelHandlers } from "./handlers/vercel_handlers";
import { registerNodeHandlers } from "./handlers/node_handlers";
import { registerProposalHandlers } from "./handlers/proposal_handlers";
import { registerDebugHandlers } from "./handlers/debug_handlers";
// Container handlers removed for MVP
// Supabase integration for database and auth
import { registerSupabaseHandlers } from "./handlers/supabase_handlers";
import { registerSupabaseAuthHandlers } from "./handlers/supabase_auth_handlers";
// WordPress authentication - ENABLED
import { registerWordPressAuthHandlers } from "./handlers/wordpress_auth_handlers";
// import { registerR2StorageHandlers } from "./handlers/r2_storage_handlers";
import { registerAnalyticsHandlers } from "./handlers/analytics_handlers";

import { registerNeonHandlers } from "./handlers/neon_handlers";
import { registerLocalModelHandlers } from "./handlers/local_model_handlers";
import { registerTokenCountHandlers } from "./handlers/token_count_handlers";
import { registerWindowHandlers } from "./handlers/window_handlers";
import { registerUploadHandlers } from "./handlers/upload_handlers";
import { registerVersionHandlers } from "./handlers/version_handlers";
import { registerLanguageModelHandlers } from "./handlers/language_model_handlers";
import { registerReleaseNoteHandlers } from "./handlers/release_note_handlers";
import { registerImportHandlers } from "./handlers/import_handlers";
import { registerSessionHandlers } from "./handlers/session_handlers";
import { registerProHandlers } from "./handlers/pro_handlers";
import { registerContextPathsHandlers } from "./handlers/context_paths_handlers";
import { registerCostAnalyticsHandlers } from "./handlers/cost_analytics_handlers";
import { registerBatchProcessingHandlers } from "./handlers/batch_processing_handlers";
import { registerNativeSpeechHandlers } from "./handlers/native_speech_handlers";
import { registerAppUpgradeHandlers } from "./handlers/app_upgrade_handlers";
import { registerCapacitorHandlers } from "./handlers/capacitor_handlers";
import { registerProblemsHandlers } from "./handlers/problems_handlers";
import { registerAppEnvVarsHandlers } from "./handlers/app_env_vars_handlers";
import { registerTemplateHandlers } from "./handlers/template_handlers";
import { registerPortalHandlers } from "./handlers/portal_handlers";
import { registerExpoHandlers } from "./handlers/expo_handlers"; // ✅ REQUIRED for SnackPoweredPreview
// import { registerDualExpoHandlers } from "./handlers/expo_dual_handlers"; // unused when unified preview is active
import { registerSimpleExpoHandlers } from "./handlers/simple_expo_handlers";
import { registerUnifiedExpoPreview } from "./handlers/unified_expo_preview";
import { registerIntelligentPreviewSystem } from "./handlers/intelligent_preview_system";
import { registerExpoPerformanceMonitor } from "./handlers/expo_performance_monitor";
import { registerTerminalHandlers } from "./handlers/terminal_handlers";
// import { registerSnackHandlers } from "./handlers/snack_handlers"; // DISABLED - snack-sdk dependency
import { registerSnackPreviewHandlers } from "./handlers/snack_preview_handlers"; // NEW: Snack-powered preview
import { registerCodeValidationHandlers } from "./handlers/code_validation_handlers";
import { registerChromeDevToolsHandlers } from "./handlers/chrome_devtools_handlers";
import { registerAppRepairHandlers } from "./handlers/app_repair_handlers"; // NEW: Code validation and auto-fix
import { registerRuntimeProblemHandlers } from "./handlers/problems_handlers"; // NEW: Runtime error integration
import { registerPromptOptimizationHandlers } from "./handlers/prompt_optimization_handlers";
import { registerPromptHandlers } from "./handlers/prompt_handlers";
import { registerFlutterMobileHandlers } from "./handlers/flutter_mobile_handlers";
import { registerMobileHandlers } from "./handlers/mobile";
// Semantic context and AI install handlers removed for MVP
import { registerPlaywrightMCPHandlers } from "./handlers/playwright_mcp_handlers";
// Gemini handlers removed for MVP
import { registerBackgroundTaskHandlers } from "./handlers/background_task_manager";
import { registerHermeticRuntimeHandlers } from "./handlers/hermetic_runtime_handlers";
import { registerParallelAppCreationHandlers } from "./handlers/parallel_app_creation";
// Design generation handlers removed for MVP
import { registerAssetStorageHandlers } from "./handlers/asset_storage_handlers";
import { registerBackgroundDependencyInstaller } from "./handlers/background_dependency_installer";
import { registerFeatureInstaller } from "./handlers/feature_installer";
import { registerParallelPrebuildSystem } from "./handlers/parallel_prebuild_system";
import { registerEASHandlers } from "./handlers/eas_handlers";
import { registerURLHandlers } from "./handlers/url_handlers";
import { registerLocalBuildHandlers } from "./handlers/local_build_handlers";
import { registerAndroidDependencyHandlers } from "./handlers/android_dependency_checker";
import { registerAutoInstallerHandlers } from "./handlers/auto_installer";
import { registerPrerequisiteInstallerHandlers } from "./handlers/prerequisite_installer";
import { registerGodotHandlers } from "./handlers/godot_handlers";
import { registerGamesHandlers } from "./handlers/games_handlers";
import { registerGameTemplatesHandlers } from "./handlers/game_templates_handlers";
import { registerMinecraftHandlers } from "./handlers/minecraft_handlers";
import { registerMinecraftSandboxHandlers } from "./handlers/minecraft_sandbox_handlers";
import { registerAssetGenerationHandlers } from "./handlers/asset_generation_handlers";
import { registerCreatorHandlers } from "./handlers/creator_handlers";
import { registerChromiumHandlers } from "./handlers/chromium_handlers";
import { registerAutomationHandlers } from "./handlers/automation_handlers";


export function registerIpcHandlers() {
  // Register all IPC handlers by category
  registerAppHandlers();
  registerChatHandlers();
  registerChatStreamHandlers();
  registerSettingsHandlers();
  registerShellHandlers();
  registerDependencyHandlers();
  registerGithubHandlers();
  registerVercelHandlers();
  registerNodeHandlers();
  registerProblemsHandlers();
  registerProposalHandlers();
  registerDebugHandlers();
  // Supabase integration for database and auth
  registerSupabaseHandlers();
  registerSupabaseAuthHandlers();
  // WordPress authentication - ENABLED
  registerWordPressAuthHandlers();
  console.log('✅ WordPress authentication handlers enabled');
  // registerR2StorageHandlers();
  registerAnalyticsHandlers();

  registerNeonHandlers();
  registerLocalModelHandlers();
  registerTokenCountHandlers();
  registerWindowHandlers();
  registerUploadHandlers();
  registerVersionHandlers();
  registerLanguageModelHandlers();
  registerReleaseNoteHandlers();
  registerImportHandlers();
  registerSessionHandlers();
  registerProHandlers();
  registerContextPathsHandlers();
  registerCostAnalyticsHandlers();
  registerBatchProcessingHandlers();
  registerNativeSpeechHandlers();
  registerAppUpgradeHandlers();
  registerCapacitorHandlers();
  registerAppEnvVarsHandlers();
  registerTemplateHandlers();
  registerPortalHandlers();
  // 🚀 EXPO PREVIEW: Register Expo handlers for SnackPoweredPreview
  registerExpoHandlers(); // ✅ ENABLED - Required for expo:start, expo:stop, expo:status
  // registerDualExpoHandlers(); // DISABLED - not needed
  registerSimpleExpoHandlers(); // ✅ ENABLED - Required for frontend compatibility
  registerUnifiedExpoPreview(); // ✅ ACTIVE - Unified preview system (legacy, may remove later)

  // Legacy EXPO PREVIEW option (commented; keep for quick toggle)
  // registerExpoHandlers(); // ✅ ACTIVE - Main expo handlers
  // registerUnifiedExpoPreview(); // ✅ ACTIVE - Unified preview system
  // registerIntelligentPreviewSystem(); // DISABLED - conflicts with unified system
  registerExpoPerformanceMonitor();
  // registerTerminalHandlers(); // DISABLED - causing EPIPE errors
  // registerSnackHandlers(); // DISABLED - old snack-sdk not included in EXE package
  registerSnackPreviewHandlers(); // ✅ NEW: Snack-powered preview with hot reload
  console.log('🚀 Snack preview handlers enabled');
  registerCodeValidationHandlers(); // ✅ NEW: Code validation and auto-fix
  registerChromeDevToolsHandlers();
  registerAppRepairHandlers(); // ✅ NEW: Chrome DevTools MCP integration
  registerRuntimeProblemHandlers(); // ✅ NEW: Runtime error integration with Problems Tab
  console.log('✅ Code validation handlers enabled');
  registerPromptOptimizationHandlers();
  registerPromptHandlers();
  registerFlutterMobileHandlers();
  registerMobileHandlers();
  // Semantic context and AI install handlers removed for MVP
  registerPlaywrightMCPHandlers();
  registerBackgroundDependencyInstaller();
  registerFeatureInstaller();
  // registerParallelPrebuildSystem(); // DISABLED - conflicts with unified preview system
  // Gemini handlers removed for MVP
  registerBackgroundTaskHandlers();
  registerTerminalHandlers();
  registerHermeticRuntimeHandlers();
  registerParallelAppCreationHandlers();
  // Design generation handlers removed for MVP
  registerAssetStorageHandlers();

  // 🚀 EAS Integration for Mobile App Deployment
  registerEASHandlers();
  registerURLHandlers();

  // 🔨 Local Build System for APK/IPA generation
  registerLocalBuildHandlers();

  // 🔍 Android Dependency Checker
  console.log('🔍 Registering Android dependency handlers...');
  registerAndroidDependencyHandlers();

  // 🔧 Auto-Installer
  console.log('🔧 Registering auto-installer handlers...');
  registerAutoInstallerHandlers();

  // 🚀 Prerequisite Installer
  console.log('🚀 Registering prerequisite installer handlers...');
  registerPrerequisiteInstallerHandlers();

  // 🎮 Godot Engine Integration
  console.log('🎮 Registering Godot handlers...');
  registerGodotHandlers();

  // 🎮 Custom Games Management
  console.log('🎮 Registering games handlers...');
  registerGamesHandlers();

  // 🎮 Game Templates Management
  console.log('🎮 Registering game templates handlers...');
  registerGameTemplatesHandlers();

  // ⛏️ Minecraft Mod Builder
  console.log('⛏️ Registering Minecraft handlers...');
  registerMinecraftHandlers();

  // ⛏️ Minecraft Sandbox (PrismarineJS)
  console.log('⛏️ Registering Minecraft sandbox handlers...');
  registerMinecraftSandboxHandlers();

  // 🎨 AI Asset Generation (Textures, Models, Sounds)
  console.log('🎨 Registering asset generation handlers...');
  registerAssetGenerationHandlers();

  // 🤖 AI Creator Handlers
  console.log('🤖 Registering creator handlers...');
  registerCreatorHandlers();

  // 🌐 Professional Chromium Browser
  console.log('🌐 Registering Chromium browser handlers...');
  registerChromiumHandlers();

  // 🌐 Browser Agent (OLD - Disabled in favor of Chromium handlers)
  // console.log('🌐 Registering browser agent handlers...');
  // registerBrowserAgentHandlers();

  // 📑 Browser Tabs
  console.log('📑 Registering tab handlers...');
  registerTabHandlers();

  // 🤖 Gemini AI Browser Automation
  console.log('🤖 Registering Gemini Automation handlers...');
  registerAutomationHandlers();

  // 🌍 Global Container System with Transformers.js integration
  // Container handlers removed for MVP
}

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
// import { registerR2StorageHandlers } from "./handlers/r2_storage_handlers";
// import { registerAnalyticsHandlers } from "./handlers/analytics_handlers";

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
import { registerExpoHandlers } from "./handlers/expo_handlers";
import { registerDualExpoHandlers } from "./handlers/expo_dual_handlers";
import { registerSimpleExpoHandlers } from "./handlers/simple_expo_handlers";
import { registerUnifiedExpoPreview } from "./handlers/unified_expo_preview";
import { registerIntelligentPreviewSystem } from "./handlers/intelligent_preview_system";
import { registerExpoPerformanceMonitor } from "./handlers/expo_performance_monitor";
import { registerTerminalHandlers } from "./handlers/terminal_handlers";
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
  // registerR2StorageHandlers();
  // registerAnalyticsHandlers();

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
  // 🚀 UNIFIED PREVIEW: Only register the unified preview system for Dyad-like performance
  // registerExpoHandlers(); // DISABLED - conflicts with unified system
  // registerDualExpoHandlers(); // DISABLED - conflicts with unified system  
  // registerSimpleExpoHandlers(); // DISABLED - conflicts with unified system
  registerUnifiedExpoPreview(); // ✅ ACTIVE - Single, optimized preview system
  // registerIntelligentPreviewSystem(); // DISABLED - conflicts with unified system
  registerExpoPerformanceMonitor();
  // registerTerminalHandlers(); // DISABLED - causing EPIPE errors
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
  
  // 🌍 Global Container System with Transformers.js integration
  // Container handlers removed for MVP
}

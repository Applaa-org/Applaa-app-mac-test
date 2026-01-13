import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { ProviderSettingsGrid } from "@/components/ProviderSettings";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { IpcClient } from "@/ipc/ipc_client";
import { showSuccess, showError } from "@/lib/toast";
import { AutoApproveSwitch } from "@/components/AutoApproveSwitch";
import { TelemetrySwitch } from "@/components/TelemetrySwitch";
import { MaxChatTurnsSelector } from "@/components/MaxChatTurnsSelector";
import { ThinkingBudgetSelector } from "@/components/ThinkingBudgetSelector";
import { useSettings } from "@/hooks/useSettings";
import { useAppVersion } from "@/hooks/useAppVersion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useRouter, Outlet, useLocation } from "@tanstack/react-router";
import { GitHubIntegration } from "@/components/GitHubIntegration";
import { VercelIntegration } from "@/components/VercelIntegration";
import { SupabaseIntegration } from "@/components/SupabaseIntegration";
import { useSubscriptionSync } from "@/hooks/useSubscriptionSync";
// Semantic context settings removed for MVP

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AutoFixProblemsSwitch } from "@/components/AutoFixProblemsSwitch";
import { AutoUpdateSwitch } from "@/components/AutoUpdateSwitch";
import { ReleaseChannelSelector } from "@/components/ReleaseChannelSelector";
import { CustomAppsDirectorySelector } from "@/components/CustomAppsDirectorySelector";
import { NeonIntegration } from "@/components/NeonIntegration";
import { CloudServicesSettings } from "@/components/settings/CloudServicesSettings";
import { CacheDebugPanel } from "@/components/settings/CacheDebugPanel";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useWordPressAuth } from "@/hooks/useWordPressAuth";

// User Tier Toggle (Free/Pro)
function UserTierToggle() {
  const { settings, updateSettings } = useSettings();
  
  const currentTier = settings?.userTier || "free";
  const isPro = currentTier === "pro";
  
  const toggleTier = () => {
    const newTier = isPro ? "free" : "pro";
    updateSettings({
      userTier: newTier,
    });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="space-y-1 flex-1">
        <Label htmlFor="user-tier-toggle" className="text-sm font-medium text-blue-800 dark:text-blue-200">
          User Tier: {isPro ? "Pro" : "Free"}
        </Label>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          {isPro 
            ? "Pro tier enabled - Unlimited apps, deployments, and premium AI models"
            : "Free tier - Max 3 apps, no deployments, no premium AI models"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${!isPro ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
          Free
        </span>
        <Switch
          id="user-tier-toggle"
          checked={isPro}
          onCheckedChange={toggleTier}
        />
        <span className={`text-xs font-medium ${isPro ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
          Pro
        </span>
      </div>
    </div>
  );
}

// Subscription Management Component
function SubscriptionManagement() {
  const { isAuthenticated: isSupabaseAuthenticated } = useSupabaseAuth();
  const { isAuthenticated: isWordPressAuthenticated } = useWordPressAuth();
  const isAuthenticated = isSupabaseAuthenticated || isWordPressAuthenticated;
  const { syncSubscription, isSyncing } = useSubscriptionSync();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      showError("Please sign in to upgrade to Pro");
      return;
    }

    setIsRedirecting(true);
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.redirectToSubscribe();
      showSuccess("Opening subscription page in your browser...");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Failed to open subscription page"
      );
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleSync = async () => {
    if (!isAuthenticated) {
      showError("Please sign in to sync subscription");
      return;
    }

    try {
      await syncSubscription();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-gray-900 dark:text-white">
            Subscription Management
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Upgrade to Pro or sync your subscription status from the database
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={!isAuthenticated || isRedirecting}
            className="flex-1"
            variant="default"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {isRedirecting ? "Opening..." : "Upgrade to Pro"}
          </Button>
          
          <Button
            onClick={handleSync}
            disabled={!isAuthenticated || isSyncing}
            className="flex-1"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Subscription"}
          </Button>
        </div>

        {!isAuthenticated && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Please sign in to manage your subscription
          </p>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appVersion = useAppVersion();
  const { settings, updateSettings } = useSettings();
  const router = useRouter();
  const location = useLocation();
  
  // Check if we're on a provider settings route
  const isProviderRoute = location.pathname.includes('/providers/');

  const handleResetEverything = async () => {
    setIsResetting(true);
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.resetAll();
      showSuccess("Successfully reset everything. Restart the application.");
    } catch (error) {
      console.error("Error resetting:", error);
      showError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  // If we're on a provider route, render only the outlet (provider settings page)
  if (isProviderRoute) {
    return <Outlet />;
  }

  // Otherwise, render the main settings page
  return (
    <div className="min-h-screen mx-auto px-8 py-4 flex justify-center">
      <div className="max-w-5xl w-full">
        <Button
          onClick={() => router.history.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <div className="flex justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>

        <div className="space-y-6">
          <GeneralSettings appVersion={appVersion} />
          {/* AI Settings removed for MVP */}
          
          <div
            id="provider-settings"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <ProviderSettingsGrid />
          </div>

          <WorkflowSettings />
          
          {/* Smart Suggestions removed for MVP */}

          {/* Usage Analytics removed for MVP */}

          {/* Privacy & Local Processing removed for MVP */}

          {/* Cloud Services Sections */}
          <div
            id="cloud-services-settings"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <CloudServicesSettings />
          </div>

          {/* Cache Debug Panel - only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <CacheDebugPanel />
          )}

          <div
            id="supabase-auth"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Supabase Authentication
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure Supabase for user authentication and profile management
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Supabase authentication settings are configured in the main Cloud Services section above.
              </div>
            </div>
          </div>

          <div
            id="r2-storage"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              R2 Storage
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure Cloudflare R2 for backup and sync functionality
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                R2 storage settings are configured in the main Cloud Services section above.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div
              id="telemetry"
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Telemetry
              </h2>
              <div className="space-y-2">
                <TelemetrySwitch />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  This records anonymous usage data to improve the product.
                </div>
              </div>

              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-2 font-medium">Telemetry ID:</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
                  {settings ? settings.telemetryUserId : "n/a"}
                </span>
              </div>
            </div>
          </div>

          {/* Integrations Section */}
          <div
            id="integrations"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Integrations
            </h2>
            <div className="space-y-4">
              <GitHubIntegration />
              <VercelIntegration />
              <SupabaseIntegration />
              <NeonIntegration />
            </div>
          </div>

          {/* Experiments Section */}
          <div
            id="experiments"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Experiments
            </h2>
            <div className="space-y-4">
              <div className="space-y-1 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-native-git"
                    checked={!!settings?.enableNativeGit}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        enableNativeGit: checked,
                      });
                    }}
                  />
                  <Label htmlFor="enable-native-git">Enable Native Git</Label>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Native Git offers faster performance but requires{" "}
                  <a
                    onClick={() => {
                      IpcClient.getInstance().openExternalUrl(
                        "https://git-scm.com/downloads",
                      );
                    }}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    installing Git
                  </a>
                  .
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            id="danger-zone"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-800"
          >
            <h2 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Reset Everything
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will delete all your apps, chats, and settings. This
                    action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setIsResetDialogOpen(true)}
                  disabled={isResetting}
                  className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? "Resetting..." : "Reset Everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        title="Reset Everything"
        message="Are you sure you want to reset everything? This will delete all your apps, chats, and settings. This action cannot be undone."
        confirmText="Reset Everything"
        cancelText="Cancel"
        onConfirm={handleResetEverything}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

export function GeneralSettings({ appVersion }: { appVersion: string | null }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      id="general-settings"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        General Settings
      </h2>

      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme
          </label>

          <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
            {(["system", "light", "dark"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                className={`
                px-4 py-1.5 text-sm font-medium rounded-md
                transition-all duration-200
                ${
                  theme === option
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              `}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <CustomAppsDirectorySelector />
        
        {/* User Tier Toggle (Free/Pro) */}
        <UserTierToggle />
        
        {/* Subscription Management */}
        <SubscriptionManagement />
      </div>

      <div className="space-y-1 mt-4">
        <AutoUpdateSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          This will automatically update the app when new versions are
          available.
        </div>
      </div>

      <div className="mt-4">
        <ReleaseChannelSelector />
      </div>

      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <span className="mr-2 font-medium">App Version:</span>
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
          {appVersion ? appVersion : "-"}
        </span>
      </div>
    </div>
  );
}

export function WorkflowSettings() {
  const { settings, updateSettings } = useSettings();
  
  return (
    <div
      id="workflow-settings"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Workflow Settings
      </h2>

      <div className="space-y-1">
        <AutoApproveSwitch showToast={false} />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          This will automatically approve code changes and run them.
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <AutoFixProblemsSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          This will automatically fix TypeScript errors.
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="enable-game-window-during-stream"
            checked={settings?.enableGameWindowDuringStream !== false}
            onCheckedChange={(checked) => {
              updateSettings({
                enableGameWindowDuringStream: checked,
              });
            }}
          />
          <Label 
            htmlFor="enable-game-window-during-stream"
            className="text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            Show Game Window During Chat Streaming
          </Label>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Display a game window while chat is streaming to keep you entertained.
        </div>
      </div>
    </div>
  );
}
export function AISettings() {
  return (
    <div
      id="ai-settings"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        AI Settings
      </h2>

      <div className="mt-4">
        <ThinkingBudgetSelector />
      </div>

      <div className="mt-4">
        <MaxChatTurnsSelector />
      </div>
    </div>
  );
}

function SemanticContextSettingsSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Semantic context features removed for MVP
        </div>
      </div>
    </div>
  );
}

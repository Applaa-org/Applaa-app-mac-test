import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppUpgrade } from "@/ipc/ipc_types";
import { useLoadApp } from "@/hooks/useLoadApp";
import { MobileUpgradeComparison } from "./MobileUpgradeComparison";

export function AppUpgrades({ appId, hideHeading = false }: { appId: number | null; hideHeading?: boolean }) {
  const queryClient = useQueryClient();
  const { app } = useLoadApp(appId ?? null);

  const {
    data: upgrades,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["app-upgrades", appId],
    queryFn: () => {
      if (!appId) {
        return Promise.resolve([]);
      }
      return IpcClient.getInstance().getAppUpgrades({ appId });
    },
    enabled: !!appId,
  });

  const {
    mutate: executeUpgrade,
    isPending: isUpgrading,
    error: mutationError,
    variables: upgradingVariables,
  } = useMutation({
    mutationFn: (upgradeId: string) => {
      console.log(`🚀 [DEBUG] Mutation function called with upgradeId: ${upgradeId}`);
      if (!appId) {
        throw new Error("appId is not set");
      }
      console.log(`🚀 [DEBUG] Calling IPC executeAppUpgrade with appId: ${appId}, upgradeId: ${upgradeId}`);
      return IpcClient.getInstance().executeAppUpgrade({
        appId,
        upgradeId,
      });
    },
    onSuccess: (result, upgradeId) => {
      console.log(`🎉 [DEBUG] Upgrade successful for ${upgradeId}:`, result);
      
      // Force refresh all upgrade-related queries
      queryClient.invalidateQueries({ queryKey: ["app-upgrades", appId] });
      
      if (upgradeId === "capacitor") {
        // Capacitor upgrade is done, invalidate Capacitor queries
        queryClient.invalidateQueries({ queryKey: ["is-capacitor", appId] });
        // Also refresh after a short delay to ensure backend detection is complete
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["is-capacitor", appId] });
          queryClient.invalidateQueries({ queryKey: ["app-upgrades", appId] });
        }, 1000);
      } else if (upgradeId === "flutter-webview") {
        // Flutter mobile upgrade is done, invalidate Flutter mobile queries
        queryClient.invalidateQueries({ queryKey: ["is-flutter-mobile", appId] });
        // Also refresh after a short delay to ensure backend detection is complete
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["is-flutter-mobile", appId] });
          queryClient.invalidateQueries({ queryKey: ["app-upgrades", appId] });
        }, 1000);
      }
      
      // Show success message
      const frameworkName = upgradeId === 'capacitor' ? 'Capacitor' : 'Flutter';
      alert(`✅ ${frameworkName} upgrade completed successfully!`);
    },
    onError: (error, upgradeId) => {
      console.error(`❌ [DEBUG] Upgrade failed for ${upgradeId}:`, error);
      const frameworkName = upgradeId === 'capacitor' ? 'Capacitor' : 'Flutter';
      
      let userFriendlyMessage = error.message;
      
      // Provide specific guidance for common errors
      if (error.message.includes("Flutter CLI is not installed")) {
        userFriendlyMessage = "Flutter CLI is not installed. Please install Flutter from https://flutter.dev/docs/get-started/install and restart the app.";
      } else if (error.message.includes("child.on is not a function")) {
        userFriendlyMessage = "There was an issue with the package manager. Please try again or restart the app.";
      } else if (error.message.includes("Capacitor is already installed")) {
        userFriendlyMessage = "Capacitor is already installed in this project. No upgrade needed.";
      } else if (error.message.includes("Flutter app is already installed")) {
        userFriendlyMessage = "Flutter app is already created for this project. No upgrade needed.";
      }
      
      alert(`❌ Failed to upgrade ${frameworkName}:\n\n${userFriendlyMessage}`);
    },
  });

  const handleUpgrade = (upgradeId: string) => {
    executeUpgrade(upgradeId);
  };

  if (!appId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={hideHeading ? "" : "mt-6"}>
        {!hideHeading && (
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            App Upgrades
          </h3>
        )}
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (queryError) {
    return (
      <div className={hideHeading ? "" : "mt-6"}>
        {!hideHeading && (
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            App Upgrades
          </h3>
        )}
        <Alert variant="destructive">
          <AlertTitle>Error loading upgrades</AlertTitle>
          <AlertDescription>{queryError.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // If this is a mobile app, hide the whole upgrade area (Capacitor/Flutter are web-only)
  if (appId && app?.appType === 'mobile') {
    return null;
  }

  // Backend now only returns upgrades that are needed, so no need to filter by isNeeded
  const currentUpgrades = upgrades ?? [];
  const mobileUpgrades = currentUpgrades.filter(u => 
    u.id === 'capacitor' || u.id === 'flutter-webview'
  );
  const otherUpgrades = currentUpgrades.filter(u => 
    u.id !== 'capacitor' && u.id !== 'flutter-webview'
  );

  const handleSelectFramework = (frameworkId: string, webUrl?: string) => {
    console.log(`🚀 [DEBUG] AppUpgrades handleSelectFramework called with:`, { frameworkId, webUrl });
    console.log(`🚀 [DEBUG] executeUpgrade function:`, executeUpgrade);
    console.log(`🚀 [DEBUG] appId:`, appId);
    
    if (webUrl) {
      (window as any).__webUrl = webUrl;
    }
    
    try {
      console.log(`🚀 [DEBUG] Calling executeUpgrade with frameworkId: ${frameworkId}`);
      executeUpgrade(frameworkId);
    } catch (error) {
      console.error(`🚀 [DEBUG] Error calling executeUpgrade:`, error);
    }
  };

  const handleRefresh = () => {
    // Force refresh all queries
    queryClient.invalidateQueries({ queryKey: ["app-upgrades", appId] });
    queryClient.invalidateQueries({ queryKey: ["is-capacitor", appId] });
    queryClient.invalidateQueries({ queryKey: ["is-flutter-mobile", appId] });
  };

  return (
    <div className={hideHeading ? "" : "mt-6"}>
      {!hideHeading && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            App Upgrades
          </h3>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}
      
      {/* Show mobile upgrade comparison if mobile upgrades are available */}
      {mobileUpgrades.length > 0 && (
        <div className="mb-6">
          <MobileUpgradeComparison
            availableUpgrades={mobileUpgrades}
            onSelectFramework={handleSelectFramework}
            isUpgrading={isUpgrading}
            upgradingFramework={upgradingVariables}
          />
        </div>
      )}

      {/* Show other upgrades in the traditional format */}
      {otherUpgrades.length === 0 && mobileUpgrades.length === 0 ? (
        <div
          data-testid="no-app-upgrades-needed"
          className="p-4 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800/50 rounded-lg text-sm text-green-800 dark:text-green-300"
        >
          App is up-to-date and has all Applaa capabilities enabled
        </div>
      ) : null}
      
      {/* Show other (non-mobile) upgrades in traditional format */}
      {otherUpgrades.length > 0 && (
        <div className="space-y-4">
          {otherUpgrades.map((upgrade: AppUpgrade) => (
            <div
              key={upgrade.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-start"
            >
              <div className="flex-grow">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {upgrade.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {upgrade.description}
                </p>
                {mutationError && upgradingVariables === upgrade.id && (
                  <Alert
                    variant="destructive"
                    className="mt-3 dark:bg-destructive/15"
                  >
                    <Terminal className="h-4 w-4" />
                    <AlertTitle className="dark:text-red-200">
                      Upgrade Failed
                    </AlertTitle>
                    <AlertDescription className="text-xs text-red-400 dark:text-red-300">
                      {(mutationError as Error).message}{" "}
                      <a
                        onClick={(e) => {
                          e.stopPropagation();
                          IpcClient.getInstance().openExternalUrl(
                            upgrade.manualUpgradeUrl ?? "https://dyad.sh/docs",
                          );
                        }}
                        className="underline font-medium hover:dark:text-red-200"
                      >
                        Manual Upgrade Instructions
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button
                onClick={() => handleUpgrade(upgrade.id)}
                disabled={isUpgrading && upgradingVariables === upgrade.id}
                className="ml-4 flex-shrink-0"
                size="sm"
                data-testid={`app-upgrade-${upgrade.id}`}
              >
                {isUpgrading && upgradingVariables === upgrade.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Upgrade
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

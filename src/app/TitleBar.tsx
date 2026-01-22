import { useAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useRouter, useLocation } from "@tanstack/react-router";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
// ✅ REMOVED: Gateway-related imports (DyadProSuccessDialog, useDeepLink, useUserBudgetInfo, UserBudgetInfo, etc.)
import { useTheme } from "@/contexts/ThemeContext";
import { IpcClient } from "@/ipc/ipc_client";
import { useRunApp } from "@/hooks/useRunApp";
import { PreviewHeader } from "@/components/preview_panel/PreviewHeader";
import applaasmallLogo from "../../assets/logo-small.png";
import { Globe } from "lucide-react";

export const TitleBar = () => {
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const { apps } = useLoadApps();
  const { navigate } = useRouter();
  const location = useLocation();
  const { settings } = useSettings();
  const [showWindowControls, setShowWindowControls] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const { app } = useRunApp();

  useEffect(() => {
    // Check if we're running on Windows
    const checkPlatform = async () => {
      try {
        const platform = await IpcClient.getInstance().getSystemPlatform();
        setShowWindowControls(platform !== "darwin");
      } catch (error) {
        console.error("Failed to get platform info:", error);
      }
    };

    checkPlatform();
  }, []);

  // ✅ REMOVED: Dyad Pro deep link handler (gateway feature removed)

  // Get selected app name - use displayName if available, fallback to name
  const selectedApp = apps.find((app) => app.id === selectedAppId);
  const appDisplayName = selectedApp?.displayName || selectedApp?.name;
  const displayText = selectedApp
    ? `App: ${appDisplayName}`
    : "(no app selected)";

  // Detect if this is an Expo app based on files (same logic as PreviewPanel)
  const isExpoApp = useMemo(() => {
    if (!app?.files) return false;
    
    // Check for Expo-specific files and directories
    const hasExpoConfig = app.files.some(file => 
      file === 'app.json' || file === 'expo.json'
    );
    
    const hasExpoRouterStructure = app.files.some(file => 
      file.startsWith('app/') && (file.endsWith('.tsx') || file.endsWith('.ts'))
    );
    
    const hasExpoPackages = app.files.some(file => 
      file.includes('package.json') || file.includes('expo')
    );
    
    // Require at least app.json + app/ directory structure for Expo apps
    return hasExpoConfig && (hasExpoRouterStructure || hasExpoPackages);
  }, [app?.files]);

  const handleAppClick = () => {
    if (selectedApp) {
      navigate({ to: "/app-details", search: { appId: selectedApp.id } });
    }
  };

  // ✅ REMOVED: hasApplaaProKey check - Pro status now shown via ProModeSelector in sidebar

  return (
    <>
      <div className="@container z-11 w-full h-11 bg-(--sidebar) absolute top-0 left-0 app-region-drag flex items-center">
        <div className={`${showWindowControls ? "pl-2" : "pl-18"}`}></div>

        <div className="flex items-center gap-2 mr-2">
          <img src={applaasmallLogo} alt="Applaa Logo" className="w-6 h-6" />
          <span className="text-sm font-semibold text-foreground">Applaa</span>
        </div>
        <Button
          data-testid="title-bar-app-name-button"
          variant="outline"
          size="sm"
          className={`hidden @2xl:block no-app-region-drag text-xs max-w-38 truncate font-medium ${
            selectedApp ? "cursor-pointer" : ""
          }`}
          onClick={handleAppClick}
        >
          {displayText}
        </Button>

        {/* Applaa Setup Button - positioned on the right */}
        <div className="ml-auto mr-2">
          <Button
            onClick={() => navigate({ to: "/docs" })}
            variant="outline"
            size="sm"
            className="hidden @2xl:flex items-center gap-2 no-app-region-drag h-7 text-xs px-3 bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 border-0"
          >
            <Globe className="w-4 h-4" />
            Applaa Setup
          </Button>
        </div>

        {/* Preview Header */}
        {location.pathname === "/chat" && (
          <div className="flex justify-end">
            <PreviewHeader 
              isExpoApp={isExpoApp} 
              isLeftPanelOpen={isLeftPanelOpen}
              onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            />
          </div>
        )}

        {showWindowControls && <WindowsControls />}
      </div>
    </>
  );
};

function WindowsControls() {
  const { isDarkMode } = useTheme();
  const ipcClient = IpcClient.getInstance();

  const minimizeWindow = () => {
    ipcClient.minimizeWindow();
  };

  const maximizeWindow = () => {
    ipcClient.maximizeWindow();
  };

  const closeWindow = () => {
    ipcClient.closeWindow();
  };

  return (
    <div className="ml-auto flex no-app-region-drag">
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={minimizeWindow}
        aria-label="Minimize"
      >
        <svg
          width="12"
          height="1"
          viewBox="0 0 12 1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="12"
            height="1"
            fill={isDarkMode ? "#ffffff" : "#000000"}
          />
        </svg>
      </button>
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={maximizeWindow}
        aria-label="Maximize"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="0.5"
            y="0.5"
            width="11"
            height="11"
            stroke={isDarkMode ? "#ffffff" : "#000000"}
          />
        </svg>
      </button>
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-red-500 transition-colors"
        onClick={closeWindow}
        aria-label="Close"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L11 11M1 11L11 1"
            stroke={isDarkMode ? "#ffffff" : "#000000"}
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </div>
  );
}

// ✅ REMOVED: ApplaaProButton and AICreditStatus
// These components were tied to the Applaa gateway infrastructure
// Pro status is now shown via ProModeSelector in the sidebar instead

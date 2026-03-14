import { SidebarProvider } from "@/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";
import { DeepLinkProvider } from "../contexts/DeepLinkContext";
import { Toaster } from "sonner";
import { TitleBar } from "./TitleBar";
import { useEffect, useState, useRef } from "react";
import { useRunApp } from "@/hooks/useRunApp";
import { useAtomValue, useAtom } from "jotai";
import { previewModeAtom } from "@/atoms/appAtoms";
// SemanticContextInitializer removed for MVP
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BackgroundTaskStatusBar } from "@/components/BackgroundTaskNotifications";
import { BackgroundTaskCompletionHandler } from "@/components/BackgroundTaskCompletionHandler";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useBackgroundDependencyInstaller } from "@/hooks/useBackgroundDependencyInstaller";
import { GamePopupWindow } from "@/components/GamePopupWindow";
import { isGamePopupOpenAtom } from "@/atoms/gamePopupAtom";
import { useRandomGame } from "@/hooks/useRandomGame";
import { isStreamingAtom } from "@/atoms/chatAtoms";
import type { GameOption } from "@/hooks/useRandomGame";
import { useSettings } from "@/hooks/useSettings";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isFullscreenMode = location.pathname.startsWith('/blockly') || location.pathname.startsWith('/arcade') || location.pathname.startsWith('/chat') || location.pathname.startsWith('/academy');

  // SAFETY NET: Ensure Browser Agent view is hidden when navigation away


  const { refreshAppIframe, app } = useRunApp();

  // 🚀 OPTIMIZATION: Background dependency installation for opened apps
  useBackgroundDependencyInstaller();
  const previewMode = useAtomValue(previewModeAtom);
  const { settings } = useSettings();

  // Game popup state - moved to main layout to be independent of preview refreshes
  const [isGamePopupOpen, setIsGamePopupOpen] = useAtom(isGamePopupOpenAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const { currentGame } = useRandomGame();
  const [selectedGame, setSelectedGame] = useState<GameOption>(() => currentGame);

  // YouTube setup popup removed per request

  // Track if popup was opened for current streaming session to prevent multiple opens
  const popupOpenedForCurrentStream = useRef(false);

  // Update selectedGame only when currentGame actually changes
  useEffect(() => {
    setSelectedGame(currentGame);
  }, [currentGame]);

  // Show game popup immediately when streaming starts (only once per session)
  useEffect(() => {
    // Hide game popup for Minecraft apps as requested by user
    const isMinecraftApp = app?.appType === 'minecraft' || (app?.appType as string) === 'minecraft-mod';

    // Check if game window is enabled in settings (defaults to true if not set)
    const isGameWindowEnabled = settings?.enableGameWindowDuringStream !== false;

    if (isStreaming && !isGamePopupOpen && !popupOpenedForCurrentStream.current && !isMinecraftApp && isGameWindowEnabled) {
      setIsGamePopupOpen(true);
      popupOpenedForCurrentStream.current = true;
    }

    // Close game window if setting is disabled while streaming
    if (isStreaming && isGamePopupOpen && !isGameWindowEnabled) {
      setIsGamePopupOpen(false);
    }

    // Reset the flag when streaming stops
    if (!isStreaming) {
      popupOpenedForCurrentStream.current = false;
    }
  }, [isStreaming, isGamePopupOpen, setIsGamePopupOpen, settings?.enableGameWindowDuringStream, app?.appType]);

  // 🚀 PERFORMANCE: Delay non-essential features to improve startup time
  // Semantic context removed for MVP

  // Semantic context initialization removed for MVP

  // Global keyboard listener for refresh events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+R (Windows/Linux) or Cmd+R (macOS)
      if (event.key === "r" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault(); // Prevent default browser refresh
        if (previewMode === "preview") {
          refreshAppIframe(); // Use our custom refresh function instead
        }
      }
    };

    // Add event listener to document
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [refreshAppIframe, previewMode]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DeepLinkProvider>
          <SidebarProvider>
            <TooltipProvider>
              {/* 🚀 PERFORMANCE: Semantic Context DISABLED for testing - will re-enable after core fixes */}
              {/* Semantic context UI removed for MVP */}
              {/* AIOnboardingManager temporarily disabled for core stability */}
              {/* 
              <ErrorBoundary>
                <AIOnboardingManager />
              </ErrorBoundary>
              */}
              <TitleBar />
              <ErrorBoundary>
                <AppSidebar />
              </ErrorBoundary>
              {/* Background task status bar */}
              <ErrorBoundary>
                <BackgroundTaskStatusBar />
              </ErrorBoundary>
              {/* Background task completion handler */}
              <ErrorBoundary>
                <BackgroundTaskCompletionHandler />
              </ErrorBoundary>
              <div className={isFullscreenMode
                ? "flex h-screenish w-full overflow-hidden bg-background mt-12"
                : "flex h-screenish w-full overflow-x-hidden mt-12 mb-4 mr-4 border-t border-l border-border rounded-lg bg-background"
              }>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
              <Toaster richColors />

              {/* Game Popup Window - Independent of preview refreshes */}
              <GamePopupWindow
                isOpen={isGamePopupOpen}
                onClose={() => setIsGamePopupOpen(false)}
                game={selectedGame}
                onGameChange={setSelectedGame}
              />

              {/* YouTube Setup Popup removed */}
            </TooltipProvider>
          </SidebarProvider>
        </DeepLinkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";
import { DeepLinkProvider } from "../contexts/DeepLinkContext";
import { Toaster } from "sonner";
import { TitleBar } from "./TitleBar";
import { useEffect } from "react";
import { useRunApp } from "@/hooks/useRunApp";
import { useAtomValue } from "jotai";
import { previewModeAtom } from "@/atoms/appAtoms";
import { SemanticContextInitializer } from "@/components/context/SemanticContextInitializer";
import { AIOnboardingManager } from "@/components/onboarding/AIOnboardingManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BackgroundTaskStatusBar } from "@/components/BackgroundTaskNotifications";
import { BackgroundTaskCompletionHandler } from "@/components/BackgroundTaskCompletionHandler";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshAppIframe } = useRunApp();
  const previewMode = useAtomValue(previewModeAtom);
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
            {/* Spark AI Context Engine - Re-enabled */}
            <ErrorBoundary>
              <SemanticContextInitializer />
            </ErrorBoundary>
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
            <div className="flex h-screenish w-full overflow-x-hidden mt-12 mb-4 mr-4 border-t border-l border-border rounded-lg bg-background">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
            <Toaster richColors />
          </SidebarProvider>
        </DeepLinkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

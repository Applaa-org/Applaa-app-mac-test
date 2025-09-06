import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";
import { DeepLinkProvider } from "../contexts/DeepLinkContext";
import { Toaster } from "sonner";
import { TitleBar } from "./TitleBar";
import { useEffect, useState } from "react";
import { useRunApp } from "@/hooks/useRunApp";
import { useAtomValue } from "jotai";
import { previewModeAtom } from "@/atoms/appAtoms";
// SemanticContextInitializer removed for MVP
import { AIOnboardingManager } from "@/components/onboarding/AIOnboardingManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BackgroundTaskStatusBar } from "@/components/BackgroundTaskNotifications";
import { BackgroundTaskCompletionHandler } from "@/components/BackgroundTaskCompletionHandler";
import { useBackgroundDependencyInstaller } from "@/hooks/useBackgroundDependencyInstaller";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { refreshAppIframe } = useRunApp();
  
  // 🚀 OPTIMIZATION: Background dependency installation for opened apps
  useBackgroundDependencyInstaller();
  const previewMode = useAtomValue(previewModeAtom);
  
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

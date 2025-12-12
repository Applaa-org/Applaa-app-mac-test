import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtom, useSetAtom } from "jotai";
import { homeChatInputValueAtom } from "../atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { generateCuteAppName } from "@/lib/utils";
// Call main process for naming (renderer-safe)
import { useLoadApps } from "@/hooks/useLoadApps";
import { useSettings } from "@/hooks/useSettings";
import { SetupBanner } from "@/components/SetupBanner";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { previewModeAtom } from "@/atoms/appAtoms";
import { useState, useEffect, useCallback } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { HomeChatInput } from "@/components/chat/HomeChatInput";
import { SimpleHomeInterface } from "@/components/SimpleHomeInterface";
import { usePostHog } from "posthog-js/react";
import { PrivacyBanner } from "@/components/TelemetryBanner";
import { INSPIRATION_PROMPTS_ENHANCED } from "@/prompts/inspiration_prompts";
import { useAppVersion } from "@/hooks/useAppVersion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useAppCreationStatus } from "@/hooks/useAppCreationStatus";

import { showError } from "@/lib/toast";
import { invalidateAppQuery } from "@/hooks/useLoadApp";
import { useQueryClient } from "@tanstack/react-query";
import { AppNamingDialog } from "@/components/AppNamingDialog";
import { CombinedAuthDialog } from "@/components/auth/CombinedAuthDialog";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

import type { FileAttachment } from "@/ipc/ipc_types";
import { NEON_TEMPLATE_IDS } from "@/shared/templates";
import { neonTemplateHook } from "@/client_logic/template_hook";

// Adding an export for attachments
export interface HomeSubmitOptions {
  attachments?: FileAttachment[];
}

export default function HomePage() {
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const { refreshApps } = useLoadApps();
  const { settings, updateSettings } = useSettings();
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const setPreviewMode = useSetAtom(previewModeAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showNamingDialog, setShowNamingDialog] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const { status: creationStatus, isMonitoring } = useAppCreationStatus(currentTaskId);
  const posthog = usePostHog();
  const appVersion = useAppVersion();
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseUrl, setReleaseUrl] = useState("");
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { isAuthenticated: isSupabaseAuthenticated } = useSupabaseAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [forceAuthDialog, setForceAuthDialog] = useState(false);
  useEffect(() => {
    const updateLastVersionLaunched = async () => {
      if (
        appVersion &&
        settings &&
        settings.lastShownReleaseNotesVersion !== appVersion
      ) {
        await updateSettings({
          lastShownReleaseNotesVersion: appVersion,
        });

        try {
          const result = await IpcClient.getInstance().doesReleaseNoteExist({
            version: appVersion,
          });

          if (result.exists && result.url) {
            setReleaseUrl(result.url + "?hideHeader=true&theme=" + theme);
            setReleaseNotesOpen(true);
          }
        } catch (err) {
          console.warn(
            "Unable to check if release note exists for: " + appVersion,
            err,
          );
        }
      }
    };
    updateLastVersionLaunched();
  }, [appVersion, settings, updateSettings, theme]);

  // Get the appId from search params
  const appId = search.appId ? Number(search.appId) : null;

  // State for random prompts
  const [randomPrompts, setRandomPrompts] = useState<
    typeof INSPIRATION_PROMPTS_ENHANCED
  >([]);

  // State to track the currently selected idea (for platform switching)
  const [selectedIdea, setSelectedIdea] = useState<typeof INSPIRATION_PROMPTS_ENHANCED[0] | null>(null);

  // Function to get random prompts
  const getRandomPrompts = useCallback(() => {
    const shuffled = [...INSPIRATION_PROMPTS_ENHANCED].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, []);

  // Initialize random prompts
  useEffect(() => {
    setRandomPrompts(getRandomPrompts());
  }, [getRandomPrompts]);

  // Watch for platform changes and update prompt if an idea is selected
  useEffect(() => {
    if (selectedIdea && settings?.selectedPlatform) {
      const isExpoSelected = settings.selectedPlatform === 'expo';
      const newPrompt = isExpoSelected ? (selectedIdea.mobilePrompt || '') : (selectedIdea.webPrompt || '');
      setInputValue(newPrompt);
    }
  }, [settings?.selectedPlatform, selectedIdea, setInputValue]);

  // Redirect to app details page if appId is present
  useEffect(() => {
    if (appId) {
      navigate({ to: "/app-details", search: { appId } });
    }
  }, [appId, navigate]);

  // Close auth dialog automatically after successful sign-in
  useEffect(() => {
    if (isSupabaseAuthenticated && showAuthDialog) {
      setForceAuthDialog(false);
      setShowAuthDialog(false);
    }
  }, [isSupabaseAuthenticated, showAuthDialog]);

  const handleAuthDialogOpenChange = (open: boolean) => {
    if (forceAuthDialog && !open) {
      // Prevent closing when authentication is required
      setShowAuthDialog(true);
      return;
    }
    setShowAuthDialog(open);
    if (!open) {
      setForceAuthDialog(false);
    }
  };

  const handleSubmit = async (options?: HomeSubmitOptions) => {
    const attachments = options?.attachments || [];

    if (!inputValue.trim() && attachments.length === 0) return;

    // Clear any previous blocking auth state
    setForceAuthDialog(false);
    setShowAuthDialog(false);

    // Show naming dialog first
    setPendingPrompt(inputValue);
    setPendingAttachments(attachments);
    setShowNamingDialog(true);
  };

  const handleNameSelected = async (selectedName: string) => {
    if (!pendingPrompt.trim()) return;

    try {
      setIsLoading(true);
      const startTime = performance.now();
      
      // Use the selected name from the dialog
      const finalName = selectedName.toLowerCase().replace(/\s+/g, '-');
      const displayName = selectedName;
      const packageId = `com.applaa.${finalName.replace(/-/g, "")}`;
      const slug = finalName;

      // Use the original prompt directly - no auto-enhancement for MVP
      // Users can manually enhance prompts using the enhance button if needed
      let finalPrompt = pendingPrompt;

      // 🚀 PARALLEL CREATION: Use instant app creation for immediate chat access
      // Template creation and git operations run in background while user chats
      const result = await IpcClient.getInstance().createAppInstant({
        name: finalName,
        displayName: displayName || finalName
          .split("-")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" "),
        packageId: packageId || `com.applaa.${finalName.replace(/-/g, "")}`,
        slug: slug || finalName,
        // Persist selected platform into DB app_type at creation time
        appType: settings?.selectedPlatform === 'expo' || settings?.selectedPlatform === 'flutter' ? 'mobile' : 'web',
        framework: settings?.selectedPlatform === 'expo' ? 'expo' : settings?.selectedPlatform === 'flutter' ? 'flutter' : 'web',
        // Store the prompt and attachments for processing after app creation
        prompt: finalPrompt,
        attachments: pendingAttachments
      });
      
      // Start monitoring background task
      setCurrentTaskId(result.taskId);
      if (
        settings?.selectedTemplateId &&
        NEON_TEMPLATE_IDS.has(settings.selectedTemplateId)
      ) {
        await neonTemplateHook({
          appId: result.app.id,
          appName: result.app.name,
        });
      }

      // 🚀 INSTANT FEEDBACK: Stream the message and navigate immediately
      // Chat is ready instantly while template creation runs in background
      const instantCreationTime = performance.now() - startTime;
      console.log(`[Home] App and chat created instantly in ${instantCreationTime.toFixed(2)}ms! App ID: ${result.app.id}, Chat ID: ${result.chatId}, Task ID: ${result.taskId}`);
      
      // Track performance metrics
      posthog.capture("home:instant-app-creation", { 
        promptLength: finalPrompt.length,
        appId: result.app.id,
        chatId: result.chatId,
        taskId: result.taskId,
        instantCreationTime: instantCreationTime.toFixed(2),
        framework: settings?.selectedPlatform || 'web',
        readyForChat: result.readyForChat
      });
      
      // 🚨 CRITICAL FIX: Set app ID BEFORE navigation
      setSelectedAppId(result.app.id);
      
      // Clear input and pending state
      setInputValue("");
      setSelectedIdea(null); // Clear selected idea after submission
      
      // 🚀 AUTO-OPEN PREVIEW: Show preview immediately for fast user experience
      setPreviewMode("preview");
      setIsPreviewOpen(true);
      
      // Refresh apps list and invalidate cache
      await refreshApps();
      await invalidateAppQuery(queryClient, { appId: result.app.id });
      
      posthog.capture("home:chat-submit", { 
        promptLength: finalPrompt.length,
        appId: result.app.id,
        chatId: result.chatId
      });
      
      // Reset loading state BEFORE navigation for instant UI response
      setIsLoading(false);
      
      // Clear pending state after using them
      setPendingPrompt('');
      setPendingAttachments([]);
      
      // 🚀 FIX: Navigate to chat with initialPrompt param (Dyad-style)
      // This ensures ChatPanel is mounted and callbacks are registered BEFORE streaming starts
      // The chat page will auto-submit the prompt after a 100ms delay
      console.log(`[Home] 🚀 Navigating to chat with initialPrompt for chatId: ${result.chatId}`);
      navigate({ 
        to: "/chat", 
        search: { 
          id: result.chatId,
          initialPrompt: finalPrompt,
          initialAttachments: pendingAttachments.length > 0 ? JSON.stringify(pendingAttachments) : undefined
        } 
      });
    } catch (error) {
      console.error("Failed to create chat:", error);
      
      // Extract error message from various possible formats
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = (error as any).message || (error as any).toString() || '';
      }
      
      const errorString = String(errorMessage);
      console.log('[Home] Error string:', errorString);
      
      // Check for auth limit error (may be nested in IPC error messages)
      if (errorString.includes("AUTH_REQUIRED_APP_LIMIT")) {
        console.log('[Home] Auth limit detected, showing sign-in dialog');
        // Require sign-in; open non-dismissable auth dialog and stop further error surfacing
        setIsLoading(false);
        setForceAuthDialog(true);
        setShowAuthDialog(true);
        // Don't show error toast for auth limit
        return;
      }
      
      if (errorString.startsWith('DUPLICATE_APP_NAME:')) {
        const [, originalName, suggestedName] = errorString.split(':');
        showError(
          `An app named "${originalName}" already exists. ` +
          `Try "${suggestedName}" instead, or choose a different name.`,
          {
            action: {
              label: `Use "${suggestedName}"`,
              onClick: () => {
                // Auto-fill the suggested name and retry
                handleNameSelected(suggestedName);
              }
            }
          }
        );
      } else {
        // Only show error if it's not an auth limit error
        if (!errorString.includes("AUTH_REQUIRED_APP_LIMIT")) {
          showError("Failed to create app. " + errorString);
        }
      }
      
      setIsLoading(false); // Ensure loading state is reset on error
    }
  };

  // Loading overlay for app creation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-3xl m-auto p-8">
        <CombinedAuthDialog
          open={showAuthDialog}
          onOpenChange={handleAuthDialogOpenChange}
          defaultTab="supabase"
          forceOpen={forceAuthDialog}
        />
        <div className="w-full flex flex-col items-center">
          {/* Loading Spinner */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            Building your app
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
            We're setting up your app with AI magic. <br />
            This might take a moment...
          </p>
          
          {/* Background Task Status */}
          {creationStatus && isMonitoring && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Background Setup
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-300">
                  {creationStatus.progress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${creationStatus.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {creationStatus.message}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Home Page Content
  return (
    <div className="flex flex-col items-center justify-center max-w-7xl m-auto p-8">
      <CombinedAuthDialog
        open={showAuthDialog}
        onOpenChange={handleAuthDialogOpenChange}
        defaultTab="supabase"
      />
      <SetupBanner />

      {/* SIMPLE INTERFACE - MVP VERSION */}
      <div className="w-full mb-8">
        <SimpleHomeInterface onChatSubmit={handleSubmit} />
      </div>
      
      <PrivacyBanner />

      {/* Release Notes Dialog */}
      <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
        <DialogContent className="max-w-4xl bg-(--docs-bg) pr-0 pt-4 pl-4 gap-1">
          <DialogHeader>
            <DialogTitle>What's new in v{appVersion}?</DialogTitle>
            <DialogDescription>
              View the latest features, improvements, and bug fixes in this release.
            </DialogDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-10 top-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() =>
                window.open(
                  releaseUrl.replace("?hideHeader=true&theme=" + theme, ""),
                  "_blank",
                )
              }
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DialogHeader>
          <div className="overflow-auto h-[70vh] flex flex-col ">
            {releaseUrl && (
              <div className="flex-1">
                <iframe
                  src={releaseUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={`Release notes for v${appVersion}`}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* App Naming Dialog */}
      <AppNamingDialog
        open={showNamingDialog}
        onOpenChange={setShowNamingDialog}
        userPrompt={pendingPrompt}
        onNameSelected={handleNameSelected}
      />
    </div>
  );
}

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
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

import { showError } from "@/lib/toast";
import { useApplaaPro } from "@/hooks/useApplaaPro";
import { ProFeatureGate } from "@/components/ProFeatureGate";
import { invalidateAppQuery } from "@/hooks/useLoadApp";
import { useQueryClient } from "@tanstack/react-query";

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
  const { isPro, canCreateMoreApps, remainingFreeApps, isAtFreeLimit } = useApplaaPro();
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const [isLoading, setIsLoading] = useState(false);
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const posthog = usePostHog();
  const appVersion = useAppVersion();
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseUrl, setReleaseUrl] = useState("");
  const { theme } = useTheme();
  const queryClient = useQueryClient();
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

  const handleSubmit = async (options?: HomeSubmitOptions) => {
    const attachments = options?.attachments || [];

    if (!inputValue.trim() && attachments.length === 0) return;

    // Check if user can create more apps
    if (!canCreateMoreApps) {
      showError(`You've reached the free limit of 5 apps. Upgrade to Applaa Pro for unlimited apps.`);
      return;
    }

    try {
      setIsLoading(true);
      
      // Create the chat and navigate (platform/template already set by PlatformSelector)
      // Try smart naming first using the user's prompt as concept
      let displayName = "";
      let packageId = "";
      let slug = "";
      try {
        const ideas = await IpcClient.getInstance().generateAppNames({
          concept: inputValue || "App",
        });
        if (ideas.length > 0) {
          displayName = ideas[0].display_name;
          packageId = ideas[0].package_id;
          slug = ideas[0].slug;
        }
      } catch {}

      const fallback = generateCuteAppName();
      const finalName = slug || fallback;

      // Use background app creation for non-blocking UI
      const result = await IpcClient.getInstance().createAppBackground({
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
        attachments: attachments
      });
      if (
        settings?.selectedTemplateId &&
        NEON_TEMPLATE_IDS.has(settings.selectedTemplateId)
      ) {
        await neonTemplateHook({
          appId: result.app.id,
          appName: result.app.name,
        });
      }

      // Automatically optimize the prompt for better UI/UX
      let finalPrompt = inputValue;
      try {
        const appType = settings?.selectedPlatform === 'expo' || settings?.selectedPlatform === 'flutter' ? 'mobile' : 'web';
        const optimizationResult = await IpcClient.getInstance().optimizePrompt({
          originalPrompt: inputValue,
          selectedModel: settings?.selectedModel || { name: "auto", provider: "auto" },
          appType: appType
        });
        finalPrompt = optimizationResult.optimizedPrompt;
        console.log(`[Home] Auto-enhanced prompt from "${inputValue}" to enhanced version`);
      } catch (error) {
        console.warn('[Home] Failed to auto-enhance prompt, using original:', error);
        // Continue with original prompt if optimization fails
      }

      // For background tasks, don't stream immediately since we don't have a real chat ID yet
      // The streaming will happen after the app and chat are actually created
      
      // Show success message and continue without blocking
      console.log(`[Home] App creation started in background (Task ID: ${result.taskId})`);
      console.log(`[Home] Prompt will be processed once app creation completes: "${finalPrompt}"`);
      
      setInputValue("");
      setSelectedIdea(null); // Clear selected idea after submission
      setIsLoading(false); // Allow user to continue using the app
      setIsPreviewOpen(false);
      
      // Show notification that app is being created in background
      // The background task notifications will handle showing progress
      
      posthog.capture("home:chat-submit", { 
        backgroundTask: true, 
        taskId: result.taskId,
        promptLength: finalPrompt.length
      });
      
      // Store the prompt and attachments in the background task metadata
      // so they can be processed once the app is ready
      // This will be handled by the background task completion handler
    } catch (error) {
      console.error("Failed to create chat:", error);
      showError("Failed to create app. " + (error as any).toString());
      setIsLoading(false); // Ensure loading state is reset on error
    }
    // No finally block needed for setIsLoading(false) here if navigation happens on success
  };

  // Loading overlay for app creation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-3xl m-auto p-8">
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
        </div>
      </div>
    );
  }

  // Main Home Page Content
  return (
    <div className="flex flex-col items-center justify-center max-w-7xl m-auto p-8">
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
    </div>
  );
}

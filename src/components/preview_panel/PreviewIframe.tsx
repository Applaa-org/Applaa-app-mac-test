import {
  selectedAppIdAtom,
  appUrlAtom,
  appOutputAtom,
  previewErrorMessageAtom,
  globalPublishStateAtom,
} from "@/atoms/appAtoms";
import { useExpoUrl } from "@/hooks/useExpoUrl";
import { useAtomValue, useSetAtom, useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Loader2,
  X,
  Sparkles,
  ChevronDown,
  Lightbulb,
  ChevronRight,
  MousePointerClick,
  Power,
  Upload,
  Github,
  Globe,
} from "lucide-react";
import { selectedChatIdAtom, isStreamingAtom } from "@/atoms/chatAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { useChats } from "@/hooks/useChats";

import { useParseRouter } from "@/hooks/useParseRouter";
import { AutoPush } from "@/components/AutoPush";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStreamChat } from "@/hooks/useStreamChat";
import { selectedComponentPreviewAtom } from "@/atoms/previewAtoms";
import { AutoErrorFixBanner } from "./AutoErrorFixBanner";
import { ComponentSelection } from "@/ipc/ipc_types";
import { StreamingGameSelector } from "@/components/StreamingGameSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRunApp } from "@/hooks/useRunApp";

interface ErrorBannerProps {
  error: string | undefined;
  onDismiss: () => void;
  onAIFix: () => void;
}

const ErrorBanner = ({ error, onDismiss, onAIFix }: ErrorBannerProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { isStreaming } = useStreamChat();
  if (!error) return null;

  const getTruncatedError = () => {
    const firstLine = error.split("\n")[0];
    const snippetLength = 200;
    const snippet = error.substring(0, snippetLength);
    return firstLine.length < snippet.length
      ? firstLine
      : snippet + (snippet.length === snippetLength ? "..." : "");
  };

  return (
    <div
      className="absolute top-2 left-2 right-2 z-10 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md shadow-sm p-2"
      data-testid="preview-error-banner"
    >
      {/* Close button in top left */}
      <button
        onClick={onDismiss}
        className="absolute top-1 left-1 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
      >
        <X size={14} className="text-red-500 dark:text-red-400" />
      </button>

      {/* Error message in the middle */}
      <div className="px-6 py-1 text-sm">
        <div
          className="text-red-700 dark:text-red-300 text-wrap font-mono whitespace-pre-wrap break-words text-xs cursor-pointer flex gap-1 items-start"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronRight
            size={14}
            className={`mt-0.5 transform transition-transform ${
              isCollapsed ? "" : "rotate-90"
            }`}
          />
          {isCollapsed ? getTruncatedError() : error}
        </div>
      </div>

      {/* Tip message */}
      <div className="mt-2 px-6">
        <div className="relative p-2 bg-red-100 dark:bg-red-900 rounded-sm flex gap-1 items-center">
          <div>
            <Lightbulb size={16} className=" text-red-800 dark:text-red-300" />
          </div>
          <span className="text-sm text-red-700 dark:text-red-200">
            <span className="font-medium">Tip: </span>Check if restarting the
            app fixes the error.
          </span>
        </div>
      </div>

      {/* AI Fix button at the bottom */}
      <div className="mt-2 flex justify-end">
        <button
          disabled={isStreaming}
          onClick={onAIFix}
          className="cursor-pointer flex items-center space-x-1 px-2 py-0.5 bg-red-500 dark:bg-red-600 text-white rounded text-sm hover:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={14} />
          <span>Fix error with AI</span>
        </button>
      </div>
    </div>
  );
};

// Preview iframe component
export const PreviewIframe = ({ loading, godotExportUrl }: { loading: boolean; godotExportUrl?: string }) => {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { appUrl, originalUrl } = useAtomValue(appUrlAtom);
  const { expoUrl } = useExpoUrl();
  const setAppOutput = useSetAtom(appOutputAtom);
  const appOutput = useAtomValue(appOutputAtom);
  // State to trigger iframe reload
  const [reloadKey, setReloadKey] = useState(0);
  const [errorMessage, setErrorMessage] = useAtom(previewErrorMessageAtom);
  const selectedChatId = useAtomValue(selectedChatIdAtom);
  // 🚨 DYAD PATTERN: Use simple global streaming atom
  const isStreaming = useAtomValue(isStreamingAtom);
  const { streamMessage } = useStreamChat({ hasChatId: false });
  
  // 🚫 DISABLED: Auto-error detection to match Dyad's approach
  // const { detectConsoleErrors } = useAutoErrorFix({ enabled: true });
  const { routes: availableRoutes } = useParseRouter(selectedAppId);
  const { restartApp } = useRunApp();
  
  // 🚨 CRITICAL FIX: Get chatId from the current app's chat (same pattern as Problems.tsx)
  const { chats } = useChats(selectedAppId);
  const currentChat = chats?.[0]; // Get the first (main) chat for this app
  const appChatId = currentChat?.id;

  // Navigation state
  const [isComponentSelectorInitialized, setIsComponentSelectorInitialized] =
    useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentHistoryPosition, setCurrentHistoryPosition] = useState(0);
  const [selectedComponentPreview, setSelectedComponentPreview] = useAtom(
    selectedComponentPreviewAtom,
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPicking, setIsPicking] = useState(false);
  
  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState("");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [savedUrls, setSavedUrls] = useState<{
    githubRepoUrl?: string;
    vercelDeploymentUrl?: string;
  }>({});
  const [currentApp, setCurrentApp] = useState<any>(null);
  
  // Global persistent publish state
  const [publishState, setPublishState] = useAtom(globalPublishStateAtom);

  // Deactivate component selector when selection is cleared
  useEffect(() => {
    if (!selectedComponentPreview) {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: "deactivate-dyad-component-selector" },
          "*",
        );
      }
      setIsPicking(false);
    }
  }, [selectedComponentPreview]);

  // Load saved URLs and app data when app changes
  useEffect(() => {
    if (selectedAppId) {
      const loadAppData = async () => {
        try {
          const app = await IpcClient.getInstance().getApp(selectedAppId);
          if (app) {
            setCurrentApp(app);
            const githubRepoUrl = app.githubOrg && app.githubRepo 
              ? `https://github.com/${app.githubOrg}/${app.githubRepo}`
              : undefined;
            const vercelDeploymentUrl = app.vercelDeploymentUrl || undefined;
            
            setSavedUrls({
              githubRepoUrl,
              vercelDeploymentUrl
            });
          }
        } catch (error) {
          console.error("Failed to load app data:", error);
        }
      };
      loadAppData();
    }
  }, [selectedAppId]);

  // 🚫 DISABLED: Console error monitoring to match Dyad's approach
  // Add message listener for iframe errors and navigation events
  // useEffect(() => {
  //   detectConsoleErrors(appOutput);
  // }, [appOutput, detectConsoleErrors]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (event.data?.type === "dyad-component-selector-initialized") {
        setIsComponentSelectorInitialized(true);
        return;
      }

      if (event.data?.type === "dyad-component-selected") {
        console.log("Component picked:", event.data);
        setSelectedComponentPreview(parseComponentSelection(event.data));
        setIsPicking(false);
        return;
      }

      const { type, payload } = event.data as {
        type:
          | "window-error"
          | "unhandled-rejection"
          | "iframe-sourcemapped-error"
          | "build-error-report"
          | "pushState"
          | "replaceState";
        payload?: {
          message?: string;
          stack?: string;
          reason?: string;
          newUrl?: string;
          file?: string;
          frame?: string;
        };
      };

      if (
        type === "window-error" ||
        type === "unhandled-rejection" ||
        type === "iframe-sourcemapped-error"
      ) {
        const stack =
          type === "iframe-sourcemapped-error"
            ? payload?.stack?.split("\n").slice(0, 1).join("\n")
            : payload?.stack;
        const errorMessage = `Error ${
          payload?.message || payload?.reason
        }\nStack trace: ${stack}`;
        console.error("Iframe error:", errorMessage);
        setErrorMessage(errorMessage);
        setAppOutput((prev) => [
          ...prev,
          {
            message: `Iframe error: ${errorMessage}`,
            type: "client-error",
            appId: selectedAppId!,
            timestamp: Date.now(),
          },
        ]);
      } else if (type === "build-error-report") {
        console.debug(`Build error report: ${payload}`);
        const errorMessage = `${payload?.message} from file ${payload?.file}.\n\nSource code:\n${payload?.frame}`;
        setErrorMessage(errorMessage);
        setAppOutput((prev) => [
          ...prev,
          {
            message: `Build error report: ${JSON.stringify(payload)}`,
            type: "client-error",
            appId: selectedAppId!,
            timestamp: Date.now(),
          },
        ]);
      } else if (type === "pushState" || type === "replaceState") {
        console.debug(`Navigation event: ${type}`, payload);

        // Update navigation history based on the type of state change
        if (type === "pushState" && payload?.newUrl) {
          // For pushState, we trim any forward history and add the new URL
          const newHistory = [
            ...navigationHistory.slice(0, currentHistoryPosition + 1),
            payload.newUrl,
          ];
          setNavigationHistory(newHistory);
          setCurrentHistoryPosition(newHistory.length - 1);
        } else if (type === "replaceState" && payload?.newUrl) {
          // For replaceState, we replace the current URL
          const newHistory = [...navigationHistory];
          newHistory[currentHistoryPosition] = payload.newUrl;
          setNavigationHistory(newHistory);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    navigationHistory,
    currentHistoryPosition,
    selectedAppId,
    errorMessage,
    setErrorMessage,
    setIsComponentSelectorInitialized,
    setSelectedComponentPreview,
  ]);

  useEffect(() => {
    // Update navigation buttons state
    setCanGoBack(currentHistoryPosition > 0);
    setCanGoForward(currentHistoryPosition < navigationHistory.length - 1);
  }, [navigationHistory, currentHistoryPosition]);

  // Initialize navigation history when iframe loads
  useEffect(() => {
    if (appUrl) {
      setNavigationHistory([appUrl]);
      setCurrentHistoryPosition(0);
      setCanGoBack(false);
      setCanGoForward(false);
    }
  }, [appUrl]);

  // Function to activate component selector in the iframe
  const handleActivateComponentSelector = async () => {
    // If component selector is not initialized, auto-apply the upgrade
    if (!isComponentSelectorInitialized && selectedAppId) {
      try {
        const ipcClient = IpcClient.getInstance();
        await ipcClient.executeAppUpgrade({ 
          appId: selectedAppId, 
          upgradeId: "component-tagger" 
        });
        // Restart the app to apply changes
        restartApp();
        return;
      } catch (error) {
        console.error("Failed to apply component tagger upgrade:", error);
        // Fallback: show notification to manually enable
        window.postMessage({ type: 'navigate-to-configure' }, '*');
        return;
      }
    }

    if (iframeRef.current?.contentWindow) {
      const newIsPicking = !isPicking;
      setIsPicking(newIsPicking);
      iframeRef.current.contentWindow.postMessage(
        {
          type: newIsPicking
            ? "activate-dyad-component-selector"
            : "deactivate-dyad-component-selector",
        },
        "*",
      );
    }
  };

  // Function to navigate back
  const handleNavigateBack = () => {
    if (canGoBack && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "navigate",
          payload: { direction: "backward" },
        },
        "*",
      );

      // Update our local state
      setCurrentHistoryPosition((prev) => prev - 1);
      setCanGoBack(currentHistoryPosition - 1 > 0);
      setCanGoForward(true);
    }
  };

  // Function to navigate forward
  const handleNavigateForward = () => {
    if (canGoForward && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "navigate",
          payload: { direction: "forward" },
        },
        "*",
      );

      // Update our local state
      setCurrentHistoryPosition((prev) => prev + 1);
      setCanGoBack(true);
      setCanGoForward(
        currentHistoryPosition + 1 < navigationHistory.length - 1,
      );
    }
  };

  // Function to handle reload
  const handleReload = () => {
    setReloadKey((prevKey) => prevKey + 1);
    setErrorMessage(undefined);
    // Optionally, add logic here if you need to explicitly stop/start the app again
    // For now, just changing the key should remount the iframe
    console.debug("Reloading iframe preview for app", selectedAppId);
  };

  // Function to navigate to a specific route
  const navigateToRoute = (path: string) => {
    if (iframeRef.current?.contentWindow && appUrl) {
      // Create the full URL by combining the base URL with the path
      const baseUrl = new URL(appUrl).origin;
      const newUrl = `${baseUrl}${path}`;

      // Navigate to the URL
      iframeRef.current.contentWindow.location.href = newUrl;

      // iframeRef.current.src = newUrl;

      // Update navigation history
      const newHistory = [
        ...navigationHistory.slice(0, currentHistoryPosition + 1),
        newUrl,
      ];
      setNavigationHistory(newHistory);
      setCurrentHistoryPosition(newHistory.length - 1);
      setCanGoBack(true);
      setCanGoForward(false);
    }
  };

  // Display loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full relative godot-preview-container">
        <div className="godot-loading">
          <div className="godot-spinner"></div>
          <p className="mt-4">Preparing app preview...</p>
        </div>
      </div>
    );
  }

  // Display message if no app is selected
  if (selectedAppId === null) {
    return (
      <div className="godot-preview-container h-full">
        <div className="godot-message">
          <div className="godot-message-icon">🎮</div>
          <div className="godot-message-title">No App Selected</div>
          <div className="godot-message-text">Select an app from the sidebar to see the preview.</div>
        </div>
      </div>
    );
  }

  const onRestart = () => {
    restartApp();
  };

  const handlePublish = async () => {
    if (!selectedAppId) return;
    
    setIsPublishing(true);
    setPublishProgress("Preparing to publish...");
    
    try {
      // Get app data
      const app = await IpcClient.getInstance().getApp(selectedAppId);
      if (!app) {
        throw new Error("App not found");
      }

      // Show the AutoPush dialog
      setShowPublishDialog(true);
      setPublishProgress("Opening publish dialog...");
      
    } catch (error) {
      console.error("Failed to start publish process:", error);
      setPublishProgress("Failed to start publish process");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishSuccess = () => {
    // Refresh saved URLs after successful publish
    if (selectedAppId) {
      const loadSavedUrls = async () => {
        try {
          const app = await IpcClient.getInstance().getApp(selectedAppId);
          if (app) {
            const githubRepoUrl = app.githubOrg && app.githubRepo 
              ? `https://github.com/${app.githubOrg}/${app.githubRepo}`
              : undefined;
            const vercelDeploymentUrl = app.vercelDeploymentUrl || undefined;
            
            setSavedUrls({
              githubRepoUrl,
              vercelDeploymentUrl
            });
          }
        } catch (error) {
          console.error("Failed to refresh saved URLs:", error);
        }
      };
      loadSavedUrls();
    }
  };

  const handleUrlClick = (url: string) => {
    IpcClient.getInstance().openExternalUrl(url);
  };

  return (
    <div className="flex flex-col h-full godot-preview-container">
      
      {/* Godot-style toolbar */}
      <div className="godot-toolbar">
        {/* Navigation Buttons */}
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleActivateComponentSelector}
                  className={`godot-button godot-button-icon ${isPicking ? "godot-button-primary" : ""}`}
                  disabled={loading || !selectedAppId}
                  data-testid="preview-pick-element-button"
                >
                  <MousePointerClick size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {!isComponentSelectorInitialized
                    ? "Click to enable component selector (will install component tagger)"
                    : isPicking
                    ? "Deactivate component selector"
                    : "Select component"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            className="godot-button godot-button-icon"
            disabled={!canGoBack || loading || !selectedAppId}
            onClick={handleNavigateBack}
            data-testid="preview-navigate-back-button"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="godot-button godot-button-icon"
            disabled={!canGoForward || loading || !selectedAppId}
            onClick={handleNavigateForward}
            data-testid="preview-navigate-forward-button"
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={handleReload}
            className="godot-button godot-button-icon"
            disabled={loading || !selectedAppId}
            data-testid="preview-refresh-button"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Address Bar with Routes Dropdown - using shadcn/ui dropdown-menu */}
        <div className="relative flex-grow min-w-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="godot-address-bar flex items-center justify-between cursor-pointer">
                <span className="truncate flex-1 mr-2 min-w-0">
                  {navigationHistory[currentHistoryPosition]
                    ? new URL(navigationHistory[currentHistoryPosition])
                        .pathname
                    : "/"}
                </span>
                <ChevronDown size={14} className="flex-shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full godot-dropdown-content">
              {availableRoutes.length > 0 ? (
                availableRoutes.map((route) => (
                  <DropdownMenuItem
                    key={route.path}
                    onClick={() => navigateToRoute(route.path)}
                    className="flex justify-between godot-dropdown-item"
                  >
                    <span>{route.label}</span>
                    <span className="text-xs" style={{ color: 'var(--godot-text-secondary)' }}>
                      {route.path}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled className="godot-dropdown-item">Loading routes...</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Local Deployment Group */}
          <div className="flex items-center gap-1">
            <button
              onClick={onRestart}
              className="godot-button"
              title="Restart App"
            >
              <Power size={16} />
              <span>Restart</span>
            </button>
            
            <button
              data-testid="preview-open-browser-button"
              onClick={() => {
                if (originalUrl) {
                  IpcClient.getInstance().openExternalUrl(originalUrl);
                }
              }}
              className="godot-button godot-button-icon"
              title="Open in Browser"
              disabled={!originalUrl}
            >
              <ExternalLink size={16} />
            </button>
          </div>

          {/* Web Deployment Group */}
          <div className="flex items-center space-x-1">
            {/* <button
              onClick={handlePublish}
              disabled={publishState.isPushing}
              className="flex items-center space-x-1 px-3 py-1 rounded-md text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              title={publishState.isPushing ? publishState.progressMessage : "Auto Push to GitHub - Automatically create a GitHub repository and push your code with one click. Optionally deploy to Vercel for instant hosting."}
            >
              {publishState.isPushing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              <span>
                {publishState.isPushing 
                  ? (publishState.isUploading && publishState.uploadProgress.total > 0
                      ? `${publishState.uploadProgress.current}/${publishState.uploadProgress.total}`
                      : "Publishing...")
                  : "Publish"
                }
              </span>
            </button> */}

            {/* GitHub & Vercel Icons (shown after successful publish) */}
            {savedUrls.githubRepoUrl && (
              <button
                onClick={() => handleUrlClick(savedUrls.githubRepoUrl!)}
                className="godot-button godot-button-icon"
                title="Open GitHub Repository"
              >
                <Github size={16} />
              </button>
            )}
            
            {savedUrls.vercelDeploymentUrl && (
              <button
                onClick={() => handleUrlClick(savedUrls.vercelDeploymentUrl!)}
                className="godot-button godot-button-icon"
                title="Open Vercel Deployment"
              >
                <Globe size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex-grow godot-panel">
        <AutoErrorFixBanner />
        <ErrorBanner
          error={errorMessage}
          onDismiss={() => setErrorMessage(undefined)}
          onAIFix={async () => {
            console.log("🔧 Fix error with AI button clicked");
            console.log("🔧 Error message:", errorMessage);
            console.log("🔧 Selected app ID:", selectedAppId);
            console.log("🔧 Selected chat ID:", selectedChatId);
            console.log("🔧 App chat ID:", appChatId);
            console.log("🔧 Available chats:", chats);
            
            // 🚀 IMPROVED: Use proper chat lookup - selectedChatId first, then app's main chat
            let chatIdToUse = selectedChatId || appChatId;
            
            if (!chatIdToUse) {
              console.error("❌ Cannot fix error: No chat ID available - selectedChatId:", selectedChatId, "appChatId:", appChatId, "selectedAppId:", selectedAppId);
              // Try to show an error message to the user
              alert("No chat available to send the error fix request. Please create a chat first.");
              return;
            }
            
            console.log("✅ Fixing error with chat ID:", chatIdToUse, "(source:", selectedChatId ? "selectedChat" : "appChat", ")");
            
            try {
              await streamMessage({
                prompt: `Fix this error: ${errorMessage}. Please analyze the error and provide the corrected code.`,
                chatId: chatIdToUse,
              });
              console.log("✅ Error fix request sent successfully");
            } catch (error) {
              console.error("❌ Failed to send error fix request:", error);
              alert(`Failed to send error fix request: ${error instanceof Error ? error.message : String(error)}`);
            }
          }}
        />

        {isStreaming ? (
          <div className="flex flex-col h-full">
            {/* Show regular app preview during streaming */}
            <div className="flex-1 relative">
              {!appUrl && !expoUrl && !godotExportUrl ? (
                <div className="godot-loading">
                  <div className="godot-spinner"></div>
                  <p className="mt-4">Loading your app...</p>
                </div>
              ) : (
                <div className="godot-iframe-wrapper h-full">
                  <iframe
                    data-testid="preview-iframe-element"
                    onLoad={(e) => {
                      const url = godotExportUrl || appUrl || expoUrl;
                      console.log(`✅ Preview iframe loaded successfully: ${url}`);
                      setErrorMessage(undefined);
                    }}
                    onError={(e) => {
                      const url = godotExportUrl || appUrl || expoUrl;
                      console.error(`❌ Preview iframe failed to load: ${url}`, e);
                      setErrorMessage(`Failed to load preview: ${url}. The app server might not be running or there could be a CORS issue.`);
                    }}
                    ref={iframeRef}
                    key={reloadKey}
                    title={`Preview for App ${selectedAppId}`}
                    className="w-full h-full border-none"
                    src={godotExportUrl || appUrl || expoUrl || undefined}
                    allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; display-capture; geolocation; autoplay; picture-in-picture"
                  />
                </div>
              )}
            </div>
          </div>
        ) : !appUrl && !expoUrl && !godotExportUrl ? (
          <div className="godot-loading">
            <div className="godot-spinner"></div>
            <p className="mt-4">Loading your app...</p>
          </div>
        ) : (
          <div className="godot-iframe-wrapper h-full">
            <iframe
              data-testid="preview-iframe-element"
              onLoad={(e) => {
                const url = godotExportUrl || appUrl || expoUrl;
                console.log(`✅ Preview iframe loaded successfully: ${url}`);
                setErrorMessage(undefined);
              }}
              onError={(e) => {
                const url = godotExportUrl || appUrl || expoUrl;
                console.error(`❌ Preview iframe failed to load: ${url}`, e);
                setErrorMessage(`Failed to load preview: ${url}. The app server might not be running or there could be a CORS issue.`);
              }}
              ref={iframeRef}
              key={reloadKey}
              title={`Preview for App ${selectedAppId}`}
              className="w-full h-full border-none"
              src={godotExportUrl || appUrl || expoUrl || undefined}
              allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; display-capture; geolocation; autoplay; picture-in-picture"
            />
          </div>
        )}
      </div>

      {/* AutoPush Dropdown */}
      {showPublishDialog && selectedAppId && (
        <div className="absolute top-12 right-0 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Publish App</h3>
              <button
                onClick={() => setShowPublishDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
            <AutoPush 
              appId={selectedAppId} 
              projectName={currentApp?.name || selectedAppId.toString()} 
              app={currentApp}
              onSuccess={handlePublishSuccess}
              publishState={publishState}
              setPublishState={setPublishState}
            />
          </div>
        </div>
      )}

    </div>
  );
};

function parseComponentSelection(data: any): ComponentSelection | null {
  if (
    !data ||
    data.type !== "dyad-component-selected" ||
    typeof data.id !== "string" ||
    typeof data.name !== "string"
  ) {
    return null;
  }

  const { id, name } = data;

  // The id is expected to be in the format "filepath:line:column"
  const parts = id.split(":");
  if (parts.length < 3) {
    console.error(`Invalid component selection id format: "${id}"`);
    return null;
  }

  const columnStr = parts.pop();
  const lineStr = parts.pop();
  const relativePath = parts.join(":");

  if (!columnStr || !lineStr || !relativePath) {
    console.error(`Could not parse component selection from id: "${id}"`);
    return null;
  }

  const lineNumber = parseInt(lineStr, 10);
  const columnNumber = parseInt(columnStr, 10);

  if (isNaN(lineNumber) || isNaN(columnNumber)) {
    console.error(`Could not parse line/column from id: "${id}"`);
    return null;
  }

  return {
    id,
    name,
    relativePath,
    lineNumber,
    columnNumber,
  };
}

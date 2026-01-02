import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  appOutputAtom,
  previewModeAtom,
  previewPanelKeyAtom,
  selectedAppIdAtom,
  showConfigurePanelAtom,
  appUrlAtom,
  gameCreationPromptAtom,
} from "@/atoms/appAtoms";
import { useCheckProblems } from "@/hooks/useCheckProblems";

import { CodeView } from "./CodeView";
import { PreviewIframe } from "./PreviewIframe";
import { Problems } from "./Problems";
import { ConfigurePanel } from "./ConfigurePanel";
import { ChevronDown, ChevronUp, Logs, PanelLeftOpen, PanelLeftClose, Wrench, AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Console } from "./Console";
import { useRunApp } from "@/hooks/useRunApp";
import { PublishPanel } from "./PublishPanel";
import { TestingPanel } from "./TestingPanel";
import { SnackPoweredPreview } from "../expo/SnackPoweredPreview";
import { useMemo } from "react";
import { IpcClient } from "@/ipc/ipc_client";
import { useWebPreviewTimeout } from "@/hooks/useWebPreviewTimeout";
import { WebPreviewTimeoutPopup } from "../WebPreviewTimeoutPopup";
import { useExpoUrl } from "@/hooks/useExpoUrl";
import { isStreamingAtom } from "@/atoms/chatAtoms";
import { useGodotExport } from "@/hooks/useGodotExport";
import { useGodotProjectStatus } from "@/hooks/useGodotProjectStatus";
import { useQuery } from "@tanstack/react-query";
// DesignTab removed for MVP
import { MakeCodeEditor, type MakeCodeType } from "../makecode/MakeCodeEditor";
import { BlocklyEditor } from "../blockly/BlocklyEditor";
import { MinecraftModPreview } from "../minecraft/MinecraftModPreview.simplified";

interface ConsoleHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  latestMessage?: string;
}

// Console header component
const ConsoleHeader = ({
  isOpen,
  onToggle,
  latestMessage,
}: ConsoleHeaderProps) => (
  <div
    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
    onClick={onToggle}
  >
    <div className="flex items-center gap-2">
      <Logs size={16} className="text-gray-600 dark:text-gray-400" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Console
      </span>
      {latestMessage && (
        <span className="text-xs text-gray-500 truncate max-w-48">
          {latestMessage}
        </span>
      )}
    </div>
    {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
  </div>
);

interface PreviewPanelProps {
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
}

// Main PreviewPanel component
export function PreviewPanel({ isLeftPanelOpen, onToggleLeftPanel }: PreviewPanelProps) {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [showConfigurePanel, setShowConfigurePanel] = useAtom(showConfigurePanelAtom);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [showProblemsPanel, setShowProblemsPanel] = useState(false);
  const { runApp, stopApp, loading, app, refreshAppIframe, restartApp } = useRunApp();
  const [, setAppUrlObj] = useAtom(appUrlAtom);
  const { problemReport } = useCheckProblems(selectedAppId);
  const { expoUrl } = useExpoUrl();
  const { hasExport: hasGodotExport, exportUrl: godotExportUrl, isLoading: isGodotExportLoading, error: godotExportError, errorDetails: godotExportErrorDetails, data: godotExportData, refetch: refetchGodotExport } = useGodotExport();
  const { hasProject: hasGodotProject, isLoading: isGodotProjectLoading, isBuilding: isGodotBuilding } = useGodotProjectStatus();
  const appUrl = useAtomValue(appUrlAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const [gameCreationPrompt, setGameCreationPrompt] = useAtom(gameCreationPromptAtom) as [string | null, any];

  // Detect if this is a Godot app (must be defined before useQuery that uses it)
  const isGodotApp = useMemo(() => {
    if (!app) return false;
    // Check app type first (most reliable)
    if (app.appType === 'godot') return true;
    // Check files for Godot project indicators
    if (app.files && app.files.length > 0) {
      return app.files.some(file =>
        file.includes('godot-project') ||
        file.includes('project.godot') ||
        file.includes('game_spec.json') ||
        file.includes('Loader.tscn') ||
        file.includes('Loader.gd')
      );
    }
    return false;
  }, [app?.appType, app?.files]);

  // Check if Godot engine is installed
  const { data: godotEngine } = useQuery({
    queryKey: ["godot-engine-check"],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return await ipcClient.checkGodotEngine();
    },
    enabled: isGodotApp,
  });

  // Web preview timeout hook (only for non-Expo apps)
  const {
    shouldShowTimeoutPopup,
    timeoutReason,
    resetTimeout
  } = useWebPreviewTimeout();

  // Detect if this is an Expo app based on files
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

  // Detect if this is a MakeCode app (TypeScript/Visual)
  const isMakeCodeApp = useMemo(() => {
    if (!app) return false;
    const hasPxtJson = app.files?.some(f => f.includes('pxt.json'));
    return ['arcade', 'microbit', 'minecraft'].includes(app.appType as string) && hasPxtJson;
  }, [app?.appType, app?.files]);

  // Detect if this is a Minecraft Java Mod
  const isMinecraftJavaMod = useMemo(() => {
    if (!app) return false;
    const hasJavaFile = app.files?.some(f => f.endsWith('.java'));
    const hasPxtJson = app.files?.some(f => f.includes('pxt.json'));
    // Show Minecraft preview for minecraft appType (even without files yet) or minecraft-mod type
    // But exclude MakeCode Minecraft (which has pxt.json)
    return (app.appType === 'minecraft' && !hasPxtJson) || (app.appType as string === 'minecraft-mod');
  }, [app?.appType, app?.files]);

  // Detect if this is a Blockly app
  const isBlocklyApp = useMemo(() => {
    if (!app) return false;
    return app.appType === 'blockly';
  }, [app?.appType]);

  const runningAppIdRef = useRef<number | null>(null);
  const key = useAtomValue(previewPanelKeyAtom);
  const appOutput = useAtomValue(appOutputAtom);

  const messageCount = appOutput.length;
  const latestMessage =
    messageCount > 0 ? appOutput[messageCount - 1]?.message : undefined;

  useEffect(() => {
    const previousAppId = runningAppIdRef.current;

    // Check if the selected app ID has changed
    if (selectedAppId !== previousAppId) {
      // Stop the previously running app, if any
      if (previousAppId !== null) {
        console.debug("Stopping previous app", previousAppId);
        stopApp(previousAppId);
        // Clear the app URL to prevent cross-app preview issues
        setAppUrlObj({ appUrl: null, appId: null, originalUrl: null });
        // We don't necessarily nullify the ref here immediately,
        // let the start of the next app update it or unmount handle it.
      }

      // Start the new app if an ID is selected
      if (selectedAppId !== null) {
        console.debug("Starting new app", selectedAppId);
        // Force refresh the preview iframe when switching apps
        refreshAppIframe();
        // For Godot apps, clear the preview iframe more aggressively to prevent showing old games
        if (isGodotApp) {
          // Clear the app URL immediately for Godot apps to prevent showing old game
          setAppUrlObj({ appUrl: null, appId: null, originalUrl: null });
        }
        // Skip running for Godot apps - they don't use dev servers
        // Skip running for Expo apps - they will be handled by BattleTestedExpoPreview component
        // Skip running for MakeCode apps - they use the official embedded editor
        // Skip running for Blockly apps - they use the Blockly editor
        // Skip running for Minecraft Mods - they are just files
        if (!isExpoApp && !isGodotApp && !isMakeCodeApp && !isBlocklyApp && !isMinecraftJavaMod) {
          // Clear Expo status when switching to non-Expo app to prevent showing old mobile preview
          const ipcClient = IpcClient.getInstance();
          // Use simpleExpoStop to clear the correct status that useExpoUrl checks
          ipcClient.simpleExpoStop().catch(console.error);
          // Use restartApp instead of runApp to ensure proper restart
          restartApp({ removeNodeModules: false });
        }
        runningAppIdRef.current = selectedAppId; // Update ref to the new running app ID
      } else {
        // If selectedAppId is null, ensure no app is marked as running
        runningAppIdRef.current = null;
      }
    }

    // Cleanup function: This runs when the component unmounts OR before the effect runs again.
    // We only want to stop the app on actual unmount. The logic above handles stopping
    // when the appId changes. So, we capture the running appId at the time the effect renders.
    const appToStopOnUnmount = runningAppIdRef.current;
    return () => {
      if (appToStopOnUnmount !== null) {
        const currentRunningApp = runningAppIdRef.current;
        if (currentRunningApp !== null) {
          console.debug(
            "Component unmounting or selectedAppId changing, stopping app",
            currentRunningApp,
          );
          stopApp(currentRunningApp);
          // Stop Godot server if it was running
          if (isGodotApp) {
            IpcClient.getInstance().stopGodotServer({ appId: currentRunningApp }).catch(console.error);
          }
          runningAppIdRef.current = null; // Clear ref on stop
        }
      }
    };
    // Dependencies: run effect when selectedAppId or app type changes.
    // runApp/stopApp are stable due to useCallback.
  }, [selectedAppId, runApp, stopApp, isExpoApp, isGodotApp, refreshAppIframe, restartApp, setAppUrlObj]);

  // Clear game creation prompt when game is ready
  useEffect(() => {
    if (isGodotApp && hasGodotProject && !isGodotProjectLoading && !isGodotBuilding && hasGodotExport && godotExportUrl) {
      // Game is ready, clear the prompt
      setGameCreationPrompt(null);
    }
  }, [isGodotApp, hasGodotProject, isGodotProjectLoading, isGodotBuilding, hasGodotExport, godotExportUrl, setGameCreationPrompt]);

  // Auto-start disabled - using BattleTestedExpoPreview's built-in auto-start instead
  return (
    <div className="flex flex-col h-full">
      {/* Hide Chat Button, Problems Button, and Configure Button */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <button
          data-testid="toggle-left-panel-button"
          onClick={onToggleLeftPanel}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--background)] transition-colors"
          title={isLeftPanelOpen ? "Hide Left Panel" : "Show Left Panel"}
        >
          {isLeftPanelOpen ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
          <span>{isLeftPanelOpen ? "Hide Chat" : "Show Chat"}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProblemsPanel(!showProblemsPanel)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium hover:bg-[var(--background)] transition-colors ${showProblemsPanel ? 'bg-[var(--background-lightest)]' : ''
              }`}
            title="Toggle Problems Panel"
          >
            <AlertTriangle size={16} />
            <span>Problems</span>
            {problemReport?.problems?.length ? (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {problemReport.problems.length}
              </span>
            ) : undefined}
          </button>

          <button
            onClick={() => setShowConfigurePanel(!showConfigurePanel)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium hover:bg-[var(--background)] transition-colors ${showConfigurePanel ? 'bg-[var(--background-lightest)]' : ''
              }`}
            title="Toggle Configure Panel"
          >
            <Wrench size={16} />
            <span>Configure</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {/* Problems Panel - Show at top when toggle is on */}
        {showProblemsPanel && (
          <div className="border-b border-border bg-background">
            <Problems />
          </div>
        )}

        {previewMode === "publish" ? (
          // When in publish mode, show 50:50 split between preview and publish
          <PanelGroup direction="horizontal" className="h-full">
            <Panel id="preview-panel" defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto">
                {isExpoApp ? (
                  <SnackPoweredPreview />
                ) : (
                  <PreviewIframe key={key} loading={loading} godotExportUrl={godotExportUrl} />
                )}
              </div>
            </Panel>
            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-col-resize" />
            <Panel id="publish-panel" defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                {/* Publish Header with Close Button */}
                <div className="flex items-center justify-between p-3 border-b border-border bg-background">
                  <h2 className="text-1xl font-bold text-gray-900 dark:text-gray-100">
                    Publish App
                  </h2>
                  <button
                    onClick={() => setPreviewMode("preview")}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    title="Close Publish Panel"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </button>
                </div>
                {/* Publish Panel Content */}
                <div className="flex-1 overflow-y-auto">
                  <PublishPanel />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          <PanelGroup direction="vertical">
            <Panel id="content" minSize={30}>
              <div className="h-full overflow-y-auto">
                {previewMode === "preview" ? (
                  // Show appropriate component based on app type
                  // Godot apps - show loading until project is built AND export is ready
                  isGodotApp ? (
                    // Show "Building Game..." if:
                    // - Project doesn't exist yet OR
                    // - Still loading project status OR
                    // - Project is still being built OR
                    // - Export doesn't exist yet OR
                    // - Export URL is not available yet
                    // Only show the game when everything is ready
                    !hasGodotProject || isGodotProjectLoading || isGodotBuilding || !hasGodotExport || !godotExportUrl ? (
                      <div className="godot-preview-container h-full">
                        <div className="godot-message">
                          <div className="godot-message-icon">🎮</div>
                          <div className="godot-message-title">Building Game...</div>
                          <div className="godot-message-text">
                            {isGodotProjectLoading
                              ? "Checking project status..."
                              : isGodotBuilding
                                ? "Game is being created. This may take a moment..."
                                : !hasGodotProject
                                  ? "Creating game project from specification. This may take a moment..."
                                  : isGodotExportLoading
                                    ? "Creating web export..."
                                    : !hasGodotExport
                                      ? "Project ready! Creating web export automatically..."
                                      : "Preparing game for preview..."}
                          </div>
                          {/* Show user's prompt if available */}
                          {gameCreationPrompt && (
                            <div className="mt-3 p-3 rounded" style={{
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}>
                              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--godot-text-primary)' }}>
                                Creating your game:
                              </div>
                              <div className="text-sm" style={{ color: 'var(--godot-text-secondary)' }}>
                                "{gameCreationPrompt}"
                              </div>
                            </div>
                          )}
                          <div className="mt-4 godot-loading">
                            <div className="godot-spinner"></div>
                            <p className="mt-4" style={{ color: 'var(--godot-text-secondary)' }}>Please wait while we build your game...</p>
                          </div>
                          {/* Show error if export failed */}
                          {(godotExportError || (godotExportData && !godotExportData.hasExport && 'error' in godotExportData && godotExportData.error)) && (
                            <div className="mt-4 p-4 rounded" style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}>
                              <div className="text-sm font-semibold text-red-400 mb-2">
                                ⚠️ Export Error
                              </div>
                              <div className="text-xs text-red-300 mb-2">
                                {godotExportError
                                  ? (godotExportError instanceof Error ? godotExportError.message : String(godotExportError))
                                  : (godotExportData && 'error' in godotExportData ? String(godotExportData.error) : "Unknown error occurred")}
                              </div>
                              {(godotExportErrorDetails || (godotExportData && 'errorDetails' in godotExportData && godotExportData.errorDetails)) && (
                                <details className="mt-2">
                                  <summary className="text-xs text-red-400 cursor-pointer hover:text-red-300">
                                    Show error details
                                  </summary>
                                  <pre className="mt-2 text-xs text-red-200 bg-black/20 p-2 rounded overflow-auto max-h-40">
                                    {JSON.stringify(godotExportErrorDetails || (godotExportData && 'errorDetails' in godotExportData ? godotExportData.errorDetails : null), null, 2)}
                                  </pre>
                                </details>
                              )}
                              <div className="mt-3 text-xs text-gray-400">
                                💡 <strong>Ask the AI assistant to help fix this error.</strong> Copy the error message above and describe what happened. The AI can help diagnose and fix issues with the game specification or export process.
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Common issues: Missing Godot engine, invalid game spec, export path issues, or missing project files.
                              </div>
                              <button
                                onClick={async () => {
                                  if (selectedAppId) {
                                    const ipcClient = IpcClient.getInstance();
                                    // Force create export
                                    try {
                                      await ipcClient.exportGodotWeb({ appId: selectedAppId });
                                      // Refetch export URL after a delay
                                      setTimeout(() => {
                                        refetchGodotExport();
                                      }, 2000);
                                    } catch (err) {
                                      console.error("Failed to export:", err);
                                    }
                                  }
                                }}
                                className="mt-4 px-4 py-2 rounded godot-button godot-button-primary"
                                style={{
                                  background: 'var(--godot-accent-orange)',
                                  color: 'var(--godot-text-primary)',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                {isGodotExportLoading ? "Creating Export..." : "Retry Export"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Project exists AND export is ready - show preview
                      <PreviewIframe key={key} loading={loading} godotExportUrl={godotExportUrl} />
                    )
                  ) : (loading || !app || (app && !isExpoApp && !isMakeCodeApp && !isBlocklyApp && !isMinecraftJavaMod && !appUrl?.originalUrl)) ? (
                    <div className="godot-preview-container h-full">
                      <div className="godot-loading">
                        <div className="godot-spinner"></div>
                        <p className="mt-4 godot-message-title">
                          {loading ? "Loading App..." : "Preview is loading..."}
                        </p>
                        <p className="mt-2 godot-message-text">
                          {loading ? "Please wait while the app is being loaded." : "Please wait while the preview loads."}
                        </p>
                      </div>
                    </div>
                  ) : isExpoApp ? (
                    <SnackPoweredPreview />
                  ) : isMakeCodeApp ? (
                    <MakeCodeEditor
                      type={app?.appType as MakeCodeType}
                      onCodeChange={(code) => {
                        console.log("MakeCode updated code:", code);
                      }}
                    />
                  ) : isBlocklyApp ? (
                    <BlocklyEditor
                      appId={selectedAppId!}
                      onWorkspaceChange={(data) => {
                        console.log("Blockly workspace updated:", data);
                        // TODO: Save workspace to file system
                      }}
                    />
                  ) : isMinecraftJavaMod ? (
                    <MinecraftModPreview app={app} />
                  ) : (
                    <PreviewIframe key={key} loading={loading} />
                  )
                ) : previewMode === "code" ? (
                  <CodeView loading={loading} app={app} />
                ) : previewMode === "testing" ? (
                  <TestingPanel />
                ) : (
                  <Problems />
                )}

                {/* Debug fallback - improved logic to handle loading states */}
                {!app && !loading && !selectedAppId && (
                  <div className="godot-preview-container h-full">
                    <div className="godot-message">
                      <div className="godot-message-icon">🎮</div>
                      <div className="godot-message-title">No App Selected</div>
                      <div className="godot-message-text">Please select an app from the sidebar to see the preview.</div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
            {(!isExpoApp && isConsoleOpen) && (
              <>
                <PanelResizeHandle className="h-1 bg-border hover:bg-gray-400 transition-colors cursor-row-resize" />
                <Panel id="console" minSize={10} defaultSize={30}>
                  <div className="flex flex-col h-full">
                    <ConsoleHeader
                      isOpen={true}
                      onToggle={() => setIsConsoleOpen(false)}
                      latestMessage={latestMessage}
                    />
                    <Console />
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>
        )}
      </div>

      {/* Configure Panel - Show at bottom when in preview mode and toggle is on */}
      {previewMode === "preview" && showConfigurePanel && (
        <div className="border-t border-border bg-background">
          <ConfigurePanel />
        </div>
      )}

      {!isExpoApp && !isConsoleOpen && (
        <ConsoleHeader
          isOpen={false}
          onToggle={() => setIsConsoleOpen(true)}
          latestMessage={latestMessage}
        />
      )}

      {/* Web Preview Timeout Popup - Only show for non-Expo apps */}
      {!isExpoApp && (
        <WebPreviewTimeoutPopup
          isOpen={shouldShowTimeoutPopup}
          message={timeoutReason}
          onClose={resetTimeout}
        />
      )}
    </div>
  );
}

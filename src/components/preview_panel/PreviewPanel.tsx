import { useAtom, useAtomValue } from "jotai";
import {
  appOutputAtom,
  previewModeAtom,
  previewPanelKeyAtom,
  selectedAppIdAtom,
  showConfigurePanelAtom,
} from "../../atoms/appAtoms";

import { CodeView } from "./CodeView";
import { PreviewIframe } from "./PreviewIframe";
import { Problems } from "./Problems";
import { ConfigurePanel } from "./ConfigurePanel";
import { ChevronDown, ChevronUp, Logs, PanelLeftOpen, PanelLeftClose, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Console } from "./Console";
import { useRunApp } from "@/hooks/useRunApp";
import { PublishPanel } from "./PublishPanel";
import { TestingPanel } from "./TestingPanel";
import { UnifiedExpoPreview } from "../expo/UnifiedExpoPreview";
import { useMemo } from "react";
import { IpcClient } from "@/ipc/ipc_client";
import { ExpoTerminalPanel } from "../expo/ExpoTerminalPanel";
// DesignTab removed for MVP

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
  const [previewMode] = useAtom(previewModeAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [showConfigurePanel, setShowConfigurePanel] = useAtom(showConfigurePanelAtom);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const { runApp, stopApp, loading, app } = useRunApp();
  
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
        // We don't necessarily nullify the ref here immediately,
        // let the start of the next app update it or unmount handle it.
      }

      // Start the new app if an ID is selected
      if (selectedAppId !== null) {
        console.debug("Starting new app", selectedAppId);
        // Only run regular web server for non-Expo apps
        // Expo apps will be handled by BattleTestedExpoPreview component
        if (!isExpoApp) {
          runApp(selectedAppId); // Consider adding error handling for the promise if needed
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
          runningAppIdRef.current = null; // Clear ref on stop
        }
      }
    };
    // Dependencies: run effect when selectedAppId or app type changes.
    // runApp/stopApp are stable due to useCallback.
  }, [selectedAppId, runApp, stopApp, isExpoApp]);

  // Auto-start disabled - using BattleTestedExpoPreview's built-in auto-start instead
  return (
    <div className="flex flex-col h-full">
      {/* Hide Chat Button and Configure Button */}
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
        
        <button
          onClick={() => setShowConfigurePanel(!showConfigurePanel)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--background)] transition-colors ${
            showConfigurePanel ? 'bg-[var(--background-lightest)]' : ''
          }`}
          title="Toggle Configure Panel"
        >
          <Wrench size={16} />
          <span>Configure</span>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          <Panel id="content" minSize={30}>
            <div className="h-full overflow-y-auto">
              {previewMode === "preview" ? (
                // Show BattleTestedExpoPreview for Expo apps, regular PreviewIframe for web apps
                isExpoApp ? (
                  <UnifiedExpoPreview />
                ) : (
                  <PreviewIframe key={key} loading={loading} />
                )
              ) : previewMode === "code" ? (
                <CodeView loading={loading} app={app} />
              ) : previewMode === "publish" ? (
                <PublishPanel />
              ) : previewMode === "testing" ? (
                <TestingPanel />
              ) : (
                <Problems />
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
    </div>
  );
}

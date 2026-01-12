import {
  selectedAppIdAtom,
  appUrlAtom,
  appOutputAtom,
  previewErrorMessageAtom,
  globalPublishStateAtom,
  gameCreationPromptAtom,
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
  Pen,
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
import { selectedComponentPreviewAtom, visualEditingEnabledAtom, selectedVisualElementAtom, type VisualEditingElement } from "@/atoms/previewAtoms";
import { VisualEditingToolbar } from "./VisualEditingToolbar";
import { useApplaaPro } from "@/hooks/useApplaaPro";
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
import { useGodotProjectStatus } from "@/hooks/useGodotProjectStatus";
import { useGodotExport } from "@/hooks/useGodotExport";
import { ScreenSizeToggle, type ScreenSize, getScreenSizeDimensions } from "./ScreenSizeToggle";
import { cn } from "@/lib/utils";

// Screen size wrapper component
function ScreenSizeWrapper({ 
  children, 
  screenSize, 
  isGodotApp,
  expoUrl 
}: { 
  children: React.ReactNode; 
  screenSize: ScreenSize; 
  isGodotApp: boolean;
  expoUrl?: string;
}) {
  // Don't apply screen size constraints for games or Expo apps
  if (isGodotApp || expoUrl) {
    return <>{children}</>;
  }

  const dimensions = getScreenSizeDimensions(screenSize);
  
  return (
    <div 
      className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 p-4 overflow-auto"
      style={{
        // Add some padding for visual spacing
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-200"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
         
        }}
      >
        {children}
      </div>
    </div>
  );
}

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
  const gameCreationPrompt = useAtomValue(gameCreationPromptAtom);
  const { streamMessage } = useStreamChat({ hasChatId: false });
  
  // ✅ FIX: Check if this is a Godot app first, then conditionally use hooks
  const isGodotApp = !!(godotExportUrl);
  
  // ✅ FIX: Only call Godot hooks if it's actually a Godot app
  // Use the hook's exportUrl to get current status (prop might be stale)
  const { hasExport: hasGodotExport, exportUrl: currentGodotExportUrl, isLoading: isGodotExportLoading } = useGodotExport();
  const { isBuilding: isGodotBuilding, isLoading: isGodotProjectLoading, hasProject: hasGodotProject } = useGodotProjectStatus();
  
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
  
  // Visual Editing state
  const { isPro } = useApplaaPro();
  const [visualEditingEnabled, setVisualEditingEnabled] = useAtom(visualEditingEnabledAtom);
  const [selectedVisualElement, setSelectedVisualElement] = useAtom(selectedVisualElementAtom);
  
  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState("");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [savedUrls, setSavedUrls] = useState<{
    githubRepoUrl?: string;
    vercelDeploymentUrl?: string;
  }>({});
  const [currentApp, setCurrentApp] = useState<any>(null);
  
  // Screen size state (only for web apps, not games)
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  
  // Global persistent publish state
  const [publishState, setPublishState] = useAtom(globalPublishStateAtom);

  // Deactivate component selector when visual editing is enabled or selection is cleared
  // Also convert existing component selection to visual editing when visual editing is enabled
  useEffect(() => {
    if (visualEditingEnabled || !selectedComponentPreview) {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: "deactivate-dyad-component-selector" },
          "*",
        );
      }
      if (!visualEditingEnabled) {
        setIsPicking(false);
      }
    }
    
    // When visual editing is enabled, clear component selection
    // The visual editing script will handle clicks directly via postMessage
    // We can't access iframe document for cross-origin iframes, so we rely on the script
    if (visualEditingEnabled && selectedComponentPreview) {
      // Clear component selection - visual editing will handle it via its own click handler
      setSelectedComponentPreview(null);
    }
  }, [selectedComponentPreview, visualEditingEnabled, selectedVisualElement, setSelectedVisualElement]);

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

  // Inject visual editing script into iframe (always inject, activate based on state)
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    
    const injectVisualEditingScript = () => {
      if (!iframe.contentWindow) return;
      
      // Check if we can access the iframe document (might be cross-origin)
      let canAccessDocument = false;
      try {
        canAccessDocument = !!iframe.contentDocument;
      } catch (e) {
        // Cross-origin iframe - cannot access document
        console.debug('Cannot access iframe document (cross-origin):', e);
        return;
      }

      try {
        // Check if script already exists
        const existingScript = (iframe.contentWindow as any).__visualEditing;
        if (existingScript) {
          // Script already injected, just activate/deactivate based on state
          if (visualEditingEnabled) {
            existingScript.activate();
          } else {
            existingScript.deactivate();
          }
          return;
        }

        const script = `
          (function() {
            if (window.__visualEditing) return;
            
            let overlay = null;
            let selectedElement = null;
            
            function createOverlay() {
              if (overlay) return;
              overlay = document.createElement('div');
              overlay.style.cssText = \`
                position: fixed;
                pointer-events: none;
                z-index: 999999;
                border: 2px solid #9333ea;
                background: rgba(147, 51, 234, 0.1);
                display: none;
              \`;
              document.body.appendChild(overlay);
            }
            
            function highlightElement(el) {
              if (!overlay || !el) return;
              const rect = el.getBoundingClientRect();
              overlay.style.display = 'block';
              // position: fixed is relative to viewport, no scroll offset needed
              overlay.style.top = rect.top + 'px';
              overlay.style.left = rect.left + 'px';
              overlay.style.width = rect.width + 'px';
              overlay.style.height = rect.height + 'px';
            }
            
            function handleScroll() {
              if (selectedElement && window.__visualEditing.active) {
                highlightElement(selectedElement);
              }
            }
            
            function getSelector(el) {
              // Prefer data-dyad-id for accurate element targeting
              const dyadId = el.getAttribute('data-dyad-id');
              if (dyadId) {
                return '[data-dyad-id="' + dyadId + '"]';
              }
              if (el.id) return '#' + el.id;
              if (el.className && typeof el.className === 'string') {
                const classes = el.className.split(' ').filter(c => c).slice(0, 1);
                if (classes.length > 0) return '.' + classes[0];
              }
              return el.tagName.toLowerCase();
            }
            
            function handleMouseMove(e) {
              if (!window.__visualEditing.active) return;
              highlightElement(e.target);
            }
            
            function handleClick(e) {
              if (!window.__visualEditing.active) return;
              
              // Stop the component selector from handling this click
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              
              selectedElement = e.target;
              highlightElement(selectedElement);
              
              // Try to extract file/line info from data-dyad-id attribute
              let filePath = null;
              let lineNumber = null;
              let columnNumber = null;
              
              // Walk up the DOM to find the closest element with data-dyad-id
              let elementWithId = selectedElement;
              while (elementWithId && !elementWithId.getAttribute('data-dyad-id')) {
                elementWithId = elementWithId.parentElement;
                if (!elementWithId || elementWithId === document.body) break;
              }
              
              const dyadId = elementWithId ? elementWithId.getAttribute('data-dyad-id') : null;
              if (dyadId) {
                // Parse format: "src/components/Button.tsx:45:12"
                const parts = dyadId.split(':');
                if (parts.length >= 3) {
                  const columnStr = parts.pop();
                  const lineStr = parts.pop();
                  filePath = parts.join(':');
                  lineNumber = parseInt(lineStr, 10);
                  columnNumber = parseInt(columnStr, 10);
                }
              }
              
              // Use the element with data-dyad-id if found, otherwise use clicked element
              const targetElement = elementWithId || selectedElement;
              
              const computedStyle = window.getComputedStyle(targetElement);
              const styles = {
                // Layout
                width: computedStyle.width,
                height: computedStyle.height,
                display: computedStyle.display,
                position: computedStyle.position,
                flexDirection: computedStyle.flexDirection,
                justifyContent: computedStyle.justifyContent,
                alignItems: computedStyle.alignItems,
                // Spacing
                marginTop: computedStyle.marginTop,
                marginRight: computedStyle.marginRight,
                marginBottom: computedStyle.marginBottom,
                marginLeft: computedStyle.marginLeft,
                paddingTop: computedStyle.paddingTop,
                paddingRight: computedStyle.paddingRight,
                paddingBottom: computedStyle.paddingBottom,
                paddingLeft: computedStyle.paddingLeft,
                // Border
                borderWidth: computedStyle.borderWidth,
                borderRadius: computedStyle.borderRadius,
                borderColor: computedStyle.borderColor,
                // Background & Effects
                backgroundColor: computedStyle.backgroundColor,
                opacity: computedStyle.opacity,
                boxShadow: computedStyle.boxShadow,
                zIndex: computedStyle.zIndex,
                // Text
                fontSize: computedStyle.fontSize,
                fontWeight: computedStyle.fontWeight,
                color: computedStyle.color,
                textAlign: computedStyle.textAlign,
              };
              
              // Get text content (only for text-containing elements)
              let textContent = '';
              if (targetElement.childNodes.length > 0) {
                // Get direct text content (not from nested elements)
                const textNodes = Array.from(targetElement.childNodes)
                  .filter(node => node.nodeType === Node.TEXT_NODE)
                  .map(node => node.textContent?.trim())
                  .filter(text => text && text.length > 0);
                textContent = textNodes.join(' ') || '';
              }
              
              // Send element info to parent with file information
              // This works even for cross-origin iframes since we're sending from iframe to parent
              window.parent.postMessage({
                type: 'visual-editing-element-selected',
                element: {
                  tagName: targetElement.tagName.toLowerCase(),
                  className: targetElement.className || '',
                  id: targetElement.id || '',
                  selector: getSelector(targetElement),
                  styles: styles,
                  file: filePath || undefined,
                  line: lineNumber || undefined,
                  column: columnNumber || undefined,
                  textContent: textContent || undefined,
                }
              }, '*');
            }
            
            function activate() {
              if (window.__visualEditing.active) return;
              window.__visualEditing.active = true;
              createOverlay();
              
              // Use capture phase to intercept clicks before component selector
              document.addEventListener('mousemove', handleMouseMove, true);
              document.addEventListener('click', handleClick, true);
              window.addEventListener('scroll', handleScroll, true);
              
              // Deactivate component selector when visual editing is active
              window.parent.postMessage({ type: "deactivate-dyad-component-selector" }, "*");
              
              document.body.style.cursor = 'crosshair';
              document.body.style.userSelect = 'none';
            }
            
            function deactivate() {
              if (!window.__visualEditing.active) return;
              window.__visualEditing.active = false;
              if (overlay) overlay.style.display = 'none';
              document.removeEventListener('mousemove', handleMouseMove, true);
              document.removeEventListener('click', handleClick, true);
              window.removeEventListener('scroll', handleScroll, true);
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
            }
            
            // Handle requests for element data by data-dyad-id
            window.addEventListener('message', function(e) {
              if (e.source !== window.parent) return;
              
              if (e.data?.type === 'visual-editing-request-element-data' && e.data.elementId) {
                // Find element by checking all elements with data-dyad-id attribute
                // This is more reliable than querySelector with special characters like backslashes
                let element = null;
                const allElements = document.querySelectorAll('[data-dyad-id]');
                for (let i = 0; i < allElements.length; i++) {
                  if (allElements[i].getAttribute('data-dyad-id') === e.data.elementId) {
                    element = allElements[i];
                    break;
                  }
                }
                if (element) {
                  console.log('Visual editing script: Found element for data-dyad-id:', e.data.elementId);
                  const computedStyle = window.getComputedStyle(element);
                  let filePath = null;
                  let lineNumber = null;
                  let columnNumber = null;
                  
                  const dyadId = element.getAttribute('data-dyad-id');
                  if (dyadId) {
                    const parts = dyadId.split(':');
                    if (parts.length >= 3) {
                      const columnStr = parts.pop();
                      const lineStr = parts.pop();
                      filePath = parts.join(':');
                      lineNumber = parseInt(lineStr, 10);
                      columnNumber = parseInt(columnStr, 10);
                    }
                  }
                  
                  const styles = {
                    width: computedStyle.width,
                    height: computedStyle.height,
                    display: computedStyle.display,
                    position: computedStyle.position,
                    flexDirection: computedStyle.flexDirection,
                    justifyContent: computedStyle.justifyContent,
                    alignItems: computedStyle.alignItems,
                    marginTop: computedStyle.marginTop,
                    marginRight: computedStyle.marginRight,
                    marginBottom: computedStyle.marginBottom,
                    marginLeft: computedStyle.marginLeft,
                    paddingTop: computedStyle.paddingTop,
                    paddingRight: computedStyle.paddingRight,
                    paddingBottom: computedStyle.paddingBottom,
                    paddingLeft: computedStyle.paddingLeft,
                    borderWidth: computedStyle.borderWidth,
                    borderRadius: computedStyle.borderRadius,
                    borderColor: computedStyle.borderColor,
                    backgroundColor: computedStyle.backgroundColor,
                    opacity: computedStyle.opacity,
                    boxShadow: computedStyle.boxShadow,
                    zIndex: computedStyle.zIndex,
                    fontSize: computedStyle.fontSize,
                    fontWeight: computedStyle.fontWeight,
                    color: computedStyle.color,
                    textAlign: computedStyle.textAlign,
                  };
                  
                  // Get text content
                  let textContent = '';
                  if (element.childNodes.length > 0) {
                    const textNodes = Array.from(element.childNodes)
                      .filter(node => node.nodeType === Node.TEXT_NODE)
                      .map(node => node.textContent?.trim())
                      .filter(text => text && text.length > 0);
                    textContent = textNodes.join(' ') || '';
                  }
                  
                  window.parent.postMessage({
                    type: 'visual-editing-element-data-response',
                    elementId: e.data.elementId,
                    element: {
                      tagName: element.tagName.toLowerCase(),
                      className: element.className || '',
                      id: element.id || '',
                      selector: '[data-dyad-id="' + e.data.elementId + '"]',
                      styles: styles,
                      file: filePath || undefined,
                      line: lineNumber || undefined,
                      column: columnNumber || undefined,
                      textContent: textContent || undefined,
                    }
                  }, '*');
                }
              }
            });
            
            window.__visualEditing = { activate, deactivate, active: false };
            window.parent.postMessage({ type: 'visual-editing-ready' }, '*');
          })();
        `;

        // Try to inject script using script tag first (more reliable)
        try {
          if (iframe.contentDocument) {
            const scriptElement = iframe.contentDocument.createElement('script');
            scriptElement.textContent = script;
            if (iframe.contentDocument.head) {
              iframe.contentDocument.head.appendChild(scriptElement);
            } else if (iframe.contentDocument.body) {
              iframe.contentDocument.body.appendChild(scriptElement);
            } else {
              // Fallback to eval if DOM not ready
              (iframe.contentWindow as any).eval(script);
            }
          } else {
            // Fallback to eval
            (iframe.contentWindow as any).eval(script);
          }
          
          // Activate if visual editing is enabled
          setTimeout(() => {
            try {
              const script = (iframe.contentWindow as any).__visualEditing;
              if (script && visualEditingEnabled) {
                script.activate();
              }
            } catch (e) {
              console.debug('Failed to activate visual editing:', e);
            }
          }, 100);
        } catch (evalError: any) {
          // Cross-origin iframe - cannot inject script
          if (evalError?.name === 'SecurityError' || evalError?.message?.includes('cross-origin')) {
            console.debug('Cannot inject visual editing script (cross-origin iframe):', evalError);
          } else {
            console.error('Failed to inject visual editing script:', evalError);
          }
        }
      } catch (error) {
        console.error('Failed to inject visual editing script:', error);
      }
    };

    const handleLoad = () => {
      // Wait for iframe to be fully ready
      const checkReady = () => {
        try {
          if (iframe.contentDocument) {
            const readyState = iframe.contentDocument.readyState;
            if (readyState === 'complete' || readyState === 'interactive') {
              // Additional small delay to ensure DOM is fully ready
              setTimeout(() => {
                injectVisualEditingScript();
              }, 100);
            } else {
              // Wait a bit more
              setTimeout(checkReady, 100);
            }
          } else {
            // Try again after a delay
            setTimeout(checkReady, 200);
          }
        } catch (e) {
          // Cross-origin - cannot check readyState
          setTimeout(() => {
            injectVisualEditingScript();
          }, 300);
        }
      };
      checkReady();
    };

    // Inject script when iframe loads
    iframe.addEventListener('load', handleLoad);
    
    // If iframe is already loaded, inject immediately
    try {
      if (iframe.contentDocument?.readyState === 'complete' || iframe.contentDocument?.readyState === 'interactive') {
        handleLoad();
      }
    } catch (e) {
      // Cross-origin - try anyway after delay
      setTimeout(handleLoad, 500);
    }

    // Handle when visualEditingEnabled changes after script is injected
    const checkAndUpdate = () => {
      try {
        const iframeWindow = iframe.contentWindow as any;
        if (iframeWindow?.__visualEditing) {
          if (visualEditingEnabled) {
            iframeWindow.__visualEditing.activate();
          } else {
            iframeWindow.__visualEditing.deactivate();
          }
        }
      } catch (error) {
        // Cross-origin - ignore
      }
    };

    // Check periodically and when visualEditingEnabled changes
    const interval = setInterval(checkAndUpdate, 500);

    return () => {
      clearInterval(interval);
      iframe.removeEventListener('load', handleLoad);
      // Deactivate visual editing when component unmounts or visual editing is disabled
      try {
        const iframeWindow = iframe.contentWindow as any;
        if (iframeWindow?.__visualEditing) {
          iframeWindow.__visualEditing.deactivate();
        }
      } catch (error) {
        // Cross-origin iframe - cannot access contentWindow
        console.debug('Cannot access iframe contentWindow (cross-origin):', error);
      }
    };
  }, [visualEditingEnabled]);

  // 🚫 DISABLED: Console error monitoring to match Dyad's approach
  // Add message listener for iframe errors and navigation events
  // useEffect(() => {
  //   detectConsoleErrors(appOutput);
  // }, [appOutput, detectConsoleErrors]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // For visual editing messages, accept from any origin (iframe sends to parent with '*')
      // This is necessary for cross-origin iframes
      const isVisualEditingMessage = event.data?.type === 'visual-editing-element-selected' || 
                                     event.data?.type === 'visual-editing-ready' ||
                                     event.data?.type === 'visual-editing-element-data-response';
      
      if (isVisualEditingMessage) {
        // Accept visual editing messages from any origin (they come from the iframe)
        // We validate the message structure instead
        if (!event.data || typeof event.data !== 'object') {
          return;
        }
      } else {
        // For other messages, only accept from our iframe (same origin)
        if (event.source !== iframeRef.current?.contentWindow) {
          return;
        }
      }

      if (event.data?.type === "dyad-component-selector-initialized") {
        setIsComponentSelectorInitialized(true);
        return;
      }

      if (event.data?.type === "dyad-component-selected") {
        console.log("Component picked:", event.data);
        
        // Always set component selection for chat, regardless of visual editing state
        const componentSelection = parseComponentSelection(event.data);
        if (componentSelection) {
          console.log('✅ Setting component selection for chat:', componentSelection);
          setSelectedComponentPreview(componentSelection);
        }
        
        // If visual editing is enabled, also convert to visual editing selection
        if (visualEditingEnabled) {
          const componentData = event.data;
          
          // Parse file and line from the id (format: "file.tsx:line:column" or "file\path.tsx:line:column")
          // Handle both forward slashes and backslashes in paths
          const parts = componentData.id.split(':');
          let filePath = null;
          let lineNumber = null;
          if (parts.length >= 3) {
            const columnStr = parts[parts.length - 1];
            const lineStr = parts[parts.length - 2];
            filePath = parts.slice(0, -2).join(':'); // Join all parts except last 2 (line:column)
            // Normalize path separators (convert backslashes to forward slashes)
            filePath = filePath.replace(/\\/g, '/');
            lineNumber = parseInt(lineStr, 10);
          }
          
          console.log('Converting component selection to visual editing:', {
            id: componentData.id,
            name: componentData.name,
            filePath,
            lineNumber
          });
          
          // Create a visual element immediately so toolbar appears
          const visualElement: VisualEditingElement = {
            id: Date.now().toString(),
            tagName: componentData.name || 'div',
            className: '',
            elementId: '',
            styles: {}, // Will be populated by visual editing script response or direct access
            selector: `[data-dyad-id="${componentData.id}"]`,
            file: filePath || undefined,
            line: lineNumber || undefined,
            textContent: undefined, // Will be populated by visual editing script response
          };
          
          // Set the element immediately so toolbar appears
          console.log('✅ Setting visual editing element - toolbar should appear:', visualElement);
          setSelectedVisualElement(visualElement);
          setIsPicking(false);
          
          // Request styles from visual editing script (works for cross-origin)
          if (iframeRef.current?.contentWindow) {
            try {
              iframeRef.current.contentWindow.postMessage({
                type: 'visual-editing-request-element-data',
                elementId: componentData.id
              }, '*');
              console.log('Requested element data from visual editing script');
            } catch (error) {
              console.debug('Could not send message to iframe:', error);
            }
            
            
            // Also try to get styles directly if iframe is same-origin (fallback)
            // This is a best-effort attempt, won't break if it fails
            try {
              const iframeDoc = iframeRef.current.contentWindow.document;
              // Find element by checking all elements with data-dyad-id attribute
              // This is more reliable than querySelector with special characters
              let element: Element | null = null;
              const allElements = iframeDoc.querySelectorAll('[data-dyad-id]');
              for (let i = 0; i < allElements.length; i++) {
                if (allElements[i].getAttribute('data-dyad-id') === componentData.id) {
                  element = allElements[i];
                  break;
                }
              }
              if (element) {
                console.log('✅ Found element in iframe, getting computed styles');
                const computedStyle = iframeRef.current.contentWindow.getComputedStyle(element);
                const styles = {
                  width: computedStyle.width,
                  height: computedStyle.height,
                  display: computedStyle.display,
                  position: computedStyle.position,
                  flexDirection: computedStyle.flexDirection,
                  justifyContent: computedStyle.justifyContent,
                  alignItems: computedStyle.alignItems,
                  marginTop: computedStyle.marginTop,
                  marginRight: computedStyle.marginRight,
                  marginBottom: computedStyle.marginBottom,
                  marginLeft: computedStyle.marginLeft,
                  paddingTop: computedStyle.paddingTop,
                  paddingRight: computedStyle.paddingRight,
                  paddingBottom: computedStyle.paddingBottom,
                  paddingLeft: computedStyle.paddingLeft,
                  borderWidth: computedStyle.borderWidth,
                  borderRadius: computedStyle.borderRadius,
                  borderColor: computedStyle.borderColor,
                  backgroundColor: computedStyle.backgroundColor,
                  opacity: computedStyle.opacity,
                  boxShadow: computedStyle.boxShadow,
                  zIndex: computedStyle.zIndex,
                  fontSize: computedStyle.fontSize,
                  fontWeight: computedStyle.fontWeight,
                  color: computedStyle.color,
                  textAlign: computedStyle.textAlign,
                };
                
                // Get text content
                let textContent = '';
                if (element.childNodes.length > 0) {
                  const textNodes = Array.from(element.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent?.trim())
                    .filter(text => text && text.length > 0);
                  textContent = textNodes.join(' ') || '';
                }
                
                // Update with computed styles (this will trigger a re-render with styles)
                console.log('✅ Updating visual element with computed styles');
                setSelectedVisualElement({
                  ...visualElement,
                  styles: styles,
                  className: element.className || '',
                  elementId: element.id || '',
                  textContent: textContent || undefined,
                });
              } else {
                console.warn('⚠️ Element not found in iframe with selector:', `[data-dyad-id="${componentData.id}"]`);
              }
            } catch (error) {
              // Cross-origin iframe - this is expected, script will send styles via postMessage
              console.debug('⚠️ Cross-origin iframe detected - styles will be sent via postMessage (this is normal):', error);
            }
          }
        } else {
          // Visual editing not enabled, just handle regular component selection
          setIsPicking(false);
        }
        
        return;
      }
      
      // Handle "Edit with AI" button click
      // Accept from iframe (same origin check already done above for non-visual-editing messages)
      if (event.data?.type === "dyad-edit-with-ai-clicked") {
        console.log("Edit with AI clicked:", event.data);
        
        // Parse and set the component selection
        const componentSelection = parseComponentSelection({
          type: "dyad-component-selected",
          id: event.data.id,
          name: event.data.name,
        });
        
        if (componentSelection) {
          console.log('✅ Setting component selection from Edit with AI button:', componentSelection);
          setSelectedComponentPreview(componentSelection);
          
          // Focus chat input by dispatching a custom event
          // The chat input should listen for this and focus itself
          window.dispatchEvent(new CustomEvent('focus-chat-input', { 
            detail: { componentSelection } 
          }));
        }
        
        return;
      }

      // Handle visual editing element selection
      if (event.data?.type === "visual-editing-element-selected") {
        console.log("Visual editing element selected:", event.data.element);
        const elementData = event.data.element;
        const visualElement: VisualEditingElement = {
          id: Date.now().toString(),
          tagName: elementData.tagName || 'div',
          className: elementData.className || '',
          elementId: elementData.id || '',
          styles: elementData.styles || {},
          selector: elementData.selector || (elementData.id ? `#${elementData.id}` : elementData.className ? `.${elementData.className.split(' ')[0]}` : elementData.tagName || 'div'),
          file: elementData.file,
          line: elementData.line,
          textContent: elementData.textContent,
        };
        setSelectedVisualElement(visualElement);
        
        // If we have file and line info, create a component selection for chat
        // This allows the selected element to be used in chat even when visual editing is active
        if (elementData.file && elementData.line) {
          try {
            // Extract component name from tag or selector
            const componentName = elementData.tagName || elementData.selector || 'element';
            
            const componentSelection: ComponentSelection = {
              id: `${elementData.file}:${elementData.line}:${elementData.column || 0}`,
              name: componentName,
              relativePath: elementData.file,
              lineNumber: elementData.line,
              columnNumber: elementData.column || 0,
            };
            
            console.log('✅ Creating component selection from visual editing element:', componentSelection);
            setSelectedComponentPreview(componentSelection);
          } catch (error) {
            console.warn('Could not create component selection from visual editing element:', error);
          }
        }
        
        setIsPicking(false);
        return;
      }

      if (event.data?.type === "visual-editing-ready") {
        console.log("Visual editing script ready");
        return;
      }

      // Handle response from visual editing script with element data
      if (event.data?.type === "visual-editing-element-data-response") {
        console.log("Received element data from visual editing script:", event.data.element);
        const elementData = event.data.element;
        const visualElement: VisualEditingElement = {
          id: Date.now().toString(),
          tagName: elementData.tagName || 'div',
          className: elementData.className || '',
          elementId: elementData.id || '',
          styles: elementData.styles || {},
          selector: elementData.selector || '[data-dyad-id]',
          file: elementData.file,
          line: elementData.line,
          textContent: elementData.textContent,
        };
        setSelectedVisualElement(visualElement);
        // Don't clear component selection - it should remain available for chat
        // Only update visual element, keep component selection intact
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
    visualEditingEnabled,
    setSelectedVisualElement,
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
                title="Open  Deployment"
              >
                <Globe size={16} />
              </button>
            )}
          </div>
          
          {/* Screen Size Toggle - Only for web apps (not games, not Expo) */}
          {!isGodotApp && !expoUrl && (
            <ScreenSizeToggle
              value={screenSize}
              onChange={setScreenSize}
            />
          )}

          {/* Visual Editing Toggle - Available for all users, web apps only */}
          {!isGodotApp && !expoUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setVisualEditingEnabled(!visualEditingEnabled);
                      if (visualEditingEnabled) {
                        setSelectedVisualElement(null);
                      }
                    }}
                    className={`godot-button godot-button-icon ${visualEditingEnabled ? "godot-button-primary" : ""}`}
                    disabled={loading || !selectedAppId}
                    title={visualEditingEnabled ? "Disable Visual Editing" : "Enable Visual Editing"}
                    data-testid="visual-editing-toggle"
                  >
                    <Pen size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{visualEditingEnabled ? "Disable" : "Enable"} Visual Editing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
            {/* Show "Building Game..." loader if Godot app - always show when streaming because game is being actively built/updated */}
            {/* Even if export exists, if chat is streaming, the game is still being modified */}
            {isGodotApp ? (
              <div className="godot-preview-container h-full">
                <div className="godot-message">
                  <div className="godot-message-icon">🎮</div>
                  <div className="godot-message-title">Building Game...</div>
                  <div className="godot-message-text">
                    {isStreaming
                      ? "AI is generating your game. This may take a moment..."
                      : isGodotProjectLoading 
                        ? "Checking project status..."
                        : isGodotBuilding
                          ? "Game is being created. This may take a moment..."
                          : !hasGodotProject
                            ? "Creating game project from specification. This may take a moment..."
                            : isGodotExportLoading
                              ? "Creating web export..."
                              : !hasGodotExport
                                ? "Project ready! Creating web export automatically..."
                                : !currentGodotExportUrl
                                  ? "Preparing game for preview..."
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
                </div>
              </div>
            ) : (
              // Show regular app preview during streaming (only if not building)
              <div className="flex-1 relative">
                {!appUrl && !expoUrl && !currentGodotExportUrl && !godotExportUrl ? (
                  <div className={cn("flex flex-col items-center justify-center h-full", isGodotApp && "godot-loading")}>
                    {isGodotApp ? (
                      <div className="godot-spinner"></div>
                    ) : (
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    )}
                    <p className="mt-4">Loading your app...</p>
                  </div>
                ) : (
                  <ScreenSizeWrapper screenSize={screenSize} isGodotApp={isGodotApp} expoUrl={expoUrl}>
                    <div className={cn("h-full", isGodotApp && "godot-iframe-wrapper")}>
                      <iframe
                        data-testid="preview-iframe-element"
                        onLoad={(e) => {
                          const url = currentGodotExportUrl || godotExportUrl || appUrl || expoUrl;
                          console.log(`✅ Preview iframe loaded successfully: ${url}`);
                          setErrorMessage(undefined);
                        }}
                        onError={(e) => {
                          const url = currentGodotExportUrl || godotExportUrl || appUrl || expoUrl;
                          console.error(`❌ Preview iframe failed to load: ${url}`, e);
                          setErrorMessage(`Failed to load preview: ${url}. The app server might not be running or there could be a CORS issue.`);
                        }}
                        ref={iframeRef}
                        key={reloadKey}
                        title={`Preview for App ${selectedAppId}`}
                        className="w-full h-full border-none"
                        src={currentGodotExportUrl || godotExportUrl || appUrl || expoUrl || undefined}
                        allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; display-capture; geolocation; autoplay; picture-in-picture"
                      />
                    </div>
                  </ScreenSizeWrapper>
                )}
              </div>
            )}
          </div>
        ) : !appUrl && !expoUrl && !godotExportUrl && !currentGodotExportUrl ? (
          <div className={cn("flex flex-col items-center justify-center h-full", isGodotApp && "godot-loading")}>
            {isGodotApp ? (
              <div className="godot-spinner"></div>
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            )}
            <p className="mt-4">Loading your app...</p>
          </div>
        ) : (
          <ScreenSizeWrapper screenSize={screenSize} isGodotApp={isGodotApp} expoUrl={expoUrl}>
            <div className={cn("h-full", isGodotApp && "godot-iframe-wrapper")}>
              <iframe
                data-testid="preview-iframe-element"
                onLoad={(e) => {
                  const url = currentGodotExportUrl || godotExportUrl || appUrl || expoUrl;
                  console.log(`✅ Preview iframe loaded successfully: ${url}`);
                  setErrorMessage(undefined);
                  
                  // Try to access iframe content for debugging (may fail due to CORS)
                  try {
                    const iframe = iframeRef.current;
                    if (iframe && iframe.contentWindow) {
                      console.log('Iframe contentWindow accessible');
                    }
                  } catch (err) {
                    console.log('Cannot access iframe content (CORS):', err);
                  }
                }}
                onError={(e) => {
                  const url = currentGodotExportUrl || godotExportUrl || appUrl || expoUrl;
                  console.error(`❌ Preview iframe failed to load: ${url}`, e);
                  setErrorMessage(`Failed to load preview: ${url}. The app server might not be running or there could be a CORS issue.`);
                }}
                ref={iframeRef}
                key={reloadKey}
                title={`Preview for App ${selectedAppId}`}
                className="w-full h-full border-none"
                src={currentGodotExportUrl || godotExportUrl || appUrl || expoUrl || undefined}
                allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; display-capture; geolocation; autoplay; picture-in-picture"
              />
            </div>
          </ScreenSizeWrapper>
        )}
      </div>

      {/* Visual Editing Toolbar */}
      {visualEditingEnabled && selectedVisualElement && (
        <VisualEditingToolbar
          onClose={() => {
            console.log('Closing visual editing toolbar');
            setSelectedVisualElement(null);
            // Deactivate visual editing in iframe
            try {
              const iframeWindow = iframeRef.current?.contentWindow as any;
              if (iframeWindow?.__visualEditing) {
                iframeWindow.__visualEditing.deactivate();
              }
            } catch (error) {
              // Cross-origin iframe - cannot access contentWindow
              // This is expected for some iframes and safe to ignore
              console.debug('Cannot access iframe contentWindow (cross-origin):', error);
            }
          }}
        />
      )}
      

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

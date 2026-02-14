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
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Loader2,
  X,
  Sparkles,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Power,
  Github,
  Globe,
  Pen,
  Edit,
  Upload,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useStreamChat } from "@/hooks/useStreamChat";
import { selectedComponentPreviewAtom, visualEditingEnabledAtom, selectedVisualElementAtom, type VisualEditingElement } from "@/atoms/previewAtoms";
import { VisualEditingToolbar } from "./VisualEditingToolbar";
import { AutoErrorFixBanner } from "./AutoErrorFixBanner";
import { ComponentSelection } from "@/ipc/ipc_types";
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
  const appUrlObj = useAtomValue(appUrlAtom);
  const { appUrl, originalUrl } = appUrlObj ?? { appUrl: null, originalUrl: null };
  // ✅ CRITICAL: Only use appUrl/originalUrl if they belong to the current app - prevents showing previous app preview for a few seconds
  const belongsToCurrentApp = appUrlObj && 'appId' in appUrlObj && appUrlObj.appId === selectedAppId;
  const effectiveAppUrl = belongsToCurrentApp && appUrl ? appUrl : null;
  const effectiveOriginalUrl = belongsToCurrentApp && originalUrl ? originalUrl : null;
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
  
  const activateSelector = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "activate-dyad-component-selector" },
        "*",
      );
    }
  }, []);
  
  const [visualEditingEnabled, setVisualEditingEnabled] = useAtom(visualEditingEnabledAtom);
  const [selectedVisualElement, setSelectedVisualElement] = useAtom(selectedVisualElementAtom);
  
  // Keep selector active - always activate when either mode is active
  useEffect(() => {
    if (isPicking || visualEditingEnabled) {
      activateSelector();
    }
  }, [isPicking, visualEditingEnabled, activateSelector]);
  
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

  // Visual editing script injection (disabled - using component selector instead)
  // This useEffect is kept for potential future use but currently not needed
  // since we use the same component selector for both Edit with AI and Edit Manually
  useEffect(() => {
    if (!iframeRef.current || isGodotApp || expoUrl) return;
    
    const iframe = iframeRef.current;
    
    const injectVisualEditingScript = () => {
      if (!iframe.contentWindow) return;
      
      try {
        if (!iframe.contentDocument) return;
      } catch (e) {
        return;
      }

      try {
        const existingScript = (iframe.contentWindow as any).__visualEditing;
        if (existingScript) return;

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
                transition: all 0.1s ease-out;
                border-radius: 2px;
              \`;
              document.body.appendChild(overlay);
            }
            
            let rafId = null;
            function highlightElement(el) {
              if (!overlay || !el) return;
              
              // Cancel previous animation frame for smooth updates
              if (rafId) {
                cancelAnimationFrame(rafId);
              }
              
              rafId = requestAnimationFrame(() => {
                const rect = el.getBoundingClientRect();
                overlay.style.display = 'block';
                // position: fixed is relative to viewport, no scroll offset needed
                overlay.style.top = rect.top + 'px';
                overlay.style.left = rect.left + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
                rafId = null;
              });
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
            
            let lastTarget = null;
            function handleMouseMove(e) {
              if (!window.__visualEditing.active) return;
              
              // Only update if target changed (optimize performance)
              if (e.target !== lastTarget) {
                lastTarget = e.target;
                highlightElement(e.target);
              }
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
              
              document.addEventListener('mousemove', handleMouseMove, true);
              document.addEventListener('click', handleClick, true);
              window.addEventListener('scroll', handleScroll, true);
              
              window.parent.postMessage({ type: "deactivate-dyad-component-selector" }, "*");
              
              document.body.style.cursor = 'crosshair';
              document.body.style.userSelect = 'none';
            }
            
            function deactivate() {
              if (!window.__visualEditing.active) return;
              
              window.__visualEditing.active = false;
              
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              
              if (overlay) overlay.style.display = 'none';
              document.removeEventListener('mousemove', handleMouseMove, true);
              document.removeEventListener('click', handleClick, true);
              window.removeEventListener('scroll', handleScroll, true);
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
              lastTarget = null;
              selectedElement = null;
            }
            
            window.addEventListener('message', function(e) {
              if (e.source !== window.parent) return;
              
              if (e.data?.type === 'activate-visual-editing') {
                activate();
                return;
              }
              
              if (e.data?.type === 'deactivate-visual-editing') {
                deactivate();
                return;
              }
              
              if (e.data?.type === 'visual-editing-request-element-data' && e.data.elementId) {
                console.log('🎯 [iframe] Received request for element data:', e.data.elementId);
                // Find element by checking all elements with data-dyad-id attribute
                // This is more reliable than querySelector with special characters like backslashes
                let element = null;
                const allElements = document.querySelectorAll('[data-dyad-id]');
                console.log('🔍 [iframe] Total elements with data-dyad-id:', allElements.length);
                
                // Try exact match first
                for (let i = 0; i < allElements.length; i++) {
                  const dyadId = allElements[i].getAttribute('data-dyad-id');
                  if (dyadId === e.data.elementId) {
                    element = allElements[i];
                    console.log('✅ [iframe] Found element with exact match');
                    break;
                  }
                }
                
                // If not found, try normalizing path separators (backslash to forward slash)
                if (!element) {
                  const normalizedRequestId = e.data.elementId.replace(/\\/g, '/');
                  for (let i = 0; i < allElements.length; i++) {
                    const dyadId = allElements[i].getAttribute('data-dyad-id');
                    const normalizedDyadId = dyadId ? dyadId.replace(/\\/g, '/') : '';
                    if (normalizedDyadId === normalizedRequestId) {
                      element = allElements[i];
                      console.log('✅ [iframe] Found element with normalized path match');
                      break;
                    }
                  }
                }
                
                if (element) {
                  console.log('📊 [iframe] Found element, computing styles...');
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
                  
                  console.log('📤 [iframe] Sending element data response:', {
                    elementId: e.data.elementId,
                    stylesCount: Object.keys(styles).length,
                    hasWidth: !!styles.width,
                    hasHeight: !!styles.height,
                    width: styles.width,
                    height: styles.height,
                  });
                  
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
                } else {
                  console.warn('❌ [iframe] Element not found for:', e.data.elementId);
                  // Send empty response so the handler knows the request was processed
                  window.parent.postMessage({
                    type: 'visual-editing-element-data-response',
                    elementId: e.data.elementId,
                    element: {
                      tagName: 'div',
                      className: '',
                      id: '',
                      selector: '[data-dyad-id="' + e.data.elementId + '"]',
                      styles: {},
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
            (iframe.contentWindow as any).eval(script);
          }
        } catch (evalError: any) {
          // Cross-origin iframe - cannot inject script (expected for some apps)
        }
      } catch (error) {
        // Silently fail for cross-origin iframes
      }
    };

    const handleLoad = () => {
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

    iframe.addEventListener('load', handleLoad);
    
    try {
      const readyState = iframe.contentDocument?.readyState;
      if (readyState === 'complete' || readyState === 'interactive') {
        handleLoad();
      }
    } catch (e) {
      // Cross-origin - will wait for load event
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [isGodotApp, expoUrl, selectedAppId, effectiveAppUrl]);


  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // For visual editing messages, accept from any origin (iframe sends to parent with '*')
      // This is necessary for cross-origin iframes
      const isVisualEditingMessage = event.data?.type === 'visual-editing-element-selected' || 
                                     event.data?.type === 'visual-editing-ready' ||
                                     event.data?.type === 'visual-editing-element-data-response' ||
                                     event.data?.type === 'element-styles-response';
      
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
        const componentSelection = parseComponentSelection(event.data);
        if (!componentSelection) return;
        
        setSelectedComponentPreview(componentSelection);
        
        // Edit with AI mode: focus chat
        if (isPicking && !visualEditingEnabled) {
          window.dispatchEvent(new CustomEvent('focus-chat-input', { 
            detail: { componentSelection } 
          }));
          return;
        }
        
        // Manual Edit mode: open popup
        if (visualEditingEnabled) {
          const componentData = event.data;
          console.log('🎨 Manual Edit: Component selected', componentData);
          const parts = componentData.id.split(':');
          let filePath = null;
          let lineNumber = null;
          if (parts.length >= 3) {
            const lineStr = parts[parts.length - 2];
            filePath = parts.slice(0, -2).join(':');
            filePath = filePath.replace(/\\/g, '/');
            lineNumber = parseInt(lineStr, 10);
          }
          
          setIsPicking(false);
          
          // Use postMessage to request element styles (works for cross-origin iframes)
          const elementId = `visual-edit-${componentData.id}`;
          const selector = `[data-dyad-id="${componentData.id}"]`;
          
          // Create placeholder element first
          const placeholderElement: VisualEditingElement = {
            id: elementId,
            tagName: componentData.name || 'div',
            className: '',
            elementId: '',
            styles: {},
            selector,
            file: filePath || undefined,
            line: lineNumber || undefined,
            textContent: undefined,
          };
          
          console.log('📝 Setting placeholder element, requesting styles via postMessage');
          setSelectedVisualElement(placeholderElement);
          
          // Request element data via postMessage (works for cross-origin)
          if (iframeRef.current?.contentWindow) {
            console.log('📤 Requesting element data via postMessage for:', componentData.id);
            // Try multiple message types - component selector might handle one of them
            iframeRef.current.contentWindow.postMessage({
              type: 'visual-editing-request-element-data',
              elementId: componentData.id
            }, '*');
            
            // Also try a direct request to the component selector
            iframeRef.current.contentWindow.postMessage({
              type: 'request-element-styles',
              elementId: componentData.id
            }, '*');
          }
        }
        
        return;
      }
      
      if (event.data?.type === "dyad-edit-with-ai-clicked") {
        const componentSelection = parseComponentSelection({
          type: "dyad-component-selected",
          id: event.data.id,
          name: event.data.name,
        });
        
        if (componentSelection) {
          setSelectedComponentPreview(componentSelection);
          window.dispatchEvent(new CustomEvent('focus-chat-input', { 
            detail: { componentSelection } 
          }));
        }
        
        return;
      }

      if (event.data?.type === "visual-editing-element-selected") {
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
        
        if (elementData.file && elementData.line) {
          try {
            const componentName = elementData.tagName || elementData.selector || 'element';
            const componentSelection: ComponentSelection = {
              id: `${elementData.file}:${elementData.line}:${elementData.column || 0}`,
              name: componentName,
              relativePath: elementData.file,
              lineNumber: elementData.line,
              columnNumber: elementData.column || 0,
            };
            setSelectedComponentPreview(componentSelection);
          } catch (error) {
            // Silently fail
          }
        }
        
        return;
      }

      if (event.data?.type === "visual-editing-ready") {
        if (visualEditingEnabled) {
          setTimeout(() => {
            try {
              const iframeWindow = iframeRef.current?.contentWindow as any;
              if (iframeWindow?.__visualEditing) {
                iframeWindow.__visualEditing.activate();
              }
            } catch (error) {
              // Silently fail for cross-origin
            }
          }, 100);
        }
        return;
      }

      if (event.data?.type === "visual-editing-element-data-response") {
        console.log('📥 Received element data response:', event.data);
        const elementData = event.data.element;
        const requestedElementId = event.data.elementId;
        
        console.log('📊 Element data:', {
          tagName: elementData.tagName,
          styles: elementData.styles,
          stylesType: typeof elementData.styles,
          stylesKeys: elementData.styles ? Object.keys(elementData.styles) : [],
          requestedElementId,
        });
        
        // Update the existing element with the fetched styles
        // Match by checking if the selector or requestedElementId matches the current element
        setSelectedVisualElement((prev) => {
          console.log('🔄 Updating element. Previous:', prev);
          
          if (!prev) {
            console.log('⚠️ No previous element, creating new one');
            // If no previous element, create a new one with styles
            const newElement = {
              id: `visual-edit-${requestedElementId || Date.now()}`,
              tagName: elementData.tagName || 'div',
              className: elementData.className || '',
              elementId: elementData.id || '',
              styles: elementData.styles && typeof elementData.styles === 'object' 
                ? { ...elementData.styles } 
                : {},
              selector: elementData.selector || '[data-dyad-id]',
              file: elementData.file,
              line: elementData.line,
              textContent: elementData.textContent,
            };
            console.log('✅ Created new element with styles:', {
              ...newElement,
              stylesCount: Object.keys(newElement.styles).length,
            });
            // Force a new object reference to ensure React/Jotai detects the change
            return JSON.parse(JSON.stringify(newElement)) as VisualEditingElement;
          }
          
          // Check if this response is for the current element
          // Normalize path separators for matching (handle both \ and /)
          const normalizePath = (str: string) => str ? str.replace(/\\/g, '/') : '';
          const normalizedPrevId = normalizePath(prev.id);
          const normalizedRequestedId = requestedElementId ? normalizePath(requestedElementId) : '';
          const normalizedExpectedId = requestedElementId ? normalizePath(`visual-edit-${requestedElementId}`) : '';
          
          // Match by selector or by checking if the elementId matches (with path normalization)
          const isMatchingElement = 
            prev.selector === elementData.selector ||
            (requestedElementId && (
              prev.id === `visual-edit-${requestedElementId}` ||
              normalizedPrevId === normalizedExpectedId ||
              normalizedPrevId.endsWith(normalizedRequestedId)
            ));
          
          console.log('🔍 Matching check:', {
            prevSelector: prev.selector,
            elementDataSelector: elementData.selector,
            prevId: prev.id,
            requestedElementId,
            expectedId: `visual-edit-${requestedElementId}`,
            normalizedPrevId,
            normalizedExpectedId,
            normalizedRequestedId,
            isMatching: isMatchingElement,
          });
          
          if (!isMatchingElement) {
            console.log('❌ Response is for different element, not updating');
            // This response is for a different element, don't update
            return prev;
          }
          
          // Update existing element with fetched styles and data
          // Create a new styles object to ensure React detects the change
          const newStyles = elementData.styles && typeof elementData.styles === 'object' 
            ? { ...elementData.styles } // Spread to create a new object reference
            : {};
          
          console.log('🎨 New styles object:', {
            newStyles,
            stylesCount: Object.keys(newStyles).length,
            sampleStyles: Object.keys(newStyles).slice(0, 5).reduce((acc, key) => {
              acc[key] = newStyles[key];
              return acc;
            }, {} as Record<string, string>),
          });
          
          // Return a completely new element object to ensure React detects the change
          // Force a new object reference by spreading all properties
          const updatedElement: VisualEditingElement = {
            id: prev.id, // Keep the same ID
            tagName: elementData.tagName || prev.tagName,
            className: elementData.className || prev.className,
            elementId: elementData.id || prev.elementId,
            styles: newStyles, // New styles object with computed values
            selector: elementData.selector || prev.selector,
            file: elementData.file !== undefined ? elementData.file : prev.file,
            line: elementData.line !== undefined ? elementData.line : prev.line,
            textContent: elementData.textContent !== undefined ? elementData.textContent : prev.textContent,
          };
          
          console.log('✅ Updated element with styles:', {
            id: updatedElement.id,
            stylesCount: Object.keys(updatedElement.styles).length,
            hasWidth: !!updatedElement.styles.width,
            hasHeight: !!updatedElement.styles.height,
            hasColor: !!updatedElement.styles.color,
            sampleStyles: {
              width: updatedElement.styles.width,
              height: updatedElement.styles.height,
              color: updatedElement.styles.color,
              backgroundColor: updatedElement.styles.backgroundColor,
            },
          });
          
          // Force a new object reference by using JSON parse/stringify to break any reference
          // This ensures React/Jotai detects the change
          return JSON.parse(JSON.stringify(updatedElement)) as VisualEditingElement;
        });
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
        // Error logged to console by iframe
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
        // Build error handled
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
        // Navigation event handled

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
    if (effectiveAppUrl) {
      setNavigationHistory([effectiveAppUrl]);
      setCurrentHistoryPosition(0);
      setCanGoBack(false);
      setCanGoForward(false);
    }
  }, [effectiveAppUrl]);

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
    // Reloading iframe
  };

  // Function to navigate to a specific route
  const navigateToRoute = (path: string) => {
    if (iframeRef.current?.contentWindow && effectiveAppUrl) {
      // Create the full URL by combining the base URL with the path
      const baseUrl = new URL(effectiveAppUrl).origin;
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
          {/* Edit Mode Dropdown */}
          {!isGodotApp && !expoUrl && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`godot-button godot-button-icon ${(isPicking || visualEditingEnabled) ? "godot-button-primary" : ""}`}
                  disabled={loading || !selectedAppId}
                  data-testid="edit-button"
                  title="Edit Mode"
                >
                  <Edit size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem
                  onSelect={async () => {
                    if (!isComponentSelectorInitialized && selectedAppId) {
                      try {
                        const ipcClient = IpcClient.getInstance();
                        await ipcClient.executeAppUpgrade({ 
                          appId: selectedAppId, 
                          upgradeId: "component-tagger" 
                        });
                        restartApp();
                        return;
                      } catch (error) {
                        console.error("Failed to apply component tagger upgrade:", error);
                        return;
                      }
                    }
                    
                    // Activate selector FIRST before any state changes
                    activateSelector();
                    
                    // Batch state updates together - React 18 batches these automatically
                    setVisualEditingEnabled(false);
                    setSelectedVisualElement(null);
                    setIsPicking(true);
                    
                    // Activate again after a tiny delay to ensure it stays on
                    setTimeout(() => activateSelector(), 10);
                  }}
                  className="flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>Edit with AI</span>
                  {isPicking && !visualEditingEnabled && (
                    <span className="ml-auto text-blue-500">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={async () => {
                    if (!isComponentSelectorInitialized && selectedAppId) {
                      try {
                        const ipcClient = IpcClient.getInstance();
                        await ipcClient.executeAppUpgrade({ 
                          appId: selectedAppId, 
                          upgradeId: "component-tagger" 
                        });
                        restartApp();
                        return;
                      } catch (error) {
                        console.error("Failed to apply component tagger upgrade:", error);
                        return;
                      }
                    }
                    
                    // Activate selector FIRST before any state changes
                    activateSelector();
                    
                    // Batch state updates together - React 18 batches these automatically
                    setIsPicking(false);
                    setSelectedComponentPreview(null);
                    setVisualEditingEnabled(true);
                    
                    // Activate again after a tiny delay to ensure it stays on
                    setTimeout(() => activateSelector(), 10);
                  }}
                  className="flex items-center gap-2"
                >
                  <Pen size={16} />
                  <span>Edit Manually</span>
                  {visualEditingEnabled && !isPicking && (
                    <span className="ml-auto text-blue-500">✓</span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                if (effectiveOriginalUrl) {
                  IpcClient.getInstance().openExternalUrl(effectiveOriginalUrl);
                }
              }}
              className="godot-button godot-button-icon"
              title="Open in Browser"
              disabled={!effectiveOriginalUrl}
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
        </div>
      </div>

      <div className="relative flex-grow godot-panel">
        <AutoErrorFixBanner />
        <ErrorBanner
          error={errorMessage}
          onDismiss={() => setErrorMessage(undefined)}
          onAIFix={async () => {
            const chatIdToUse = selectedChatId || appChatId;
            
            if (!chatIdToUse) {
              alert("No chat available to send the error fix request. Please create a chat first.");
              return;
            }
            
            try {
              await streamMessage({
                prompt: `Fix this error: ${errorMessage}. Please analyze the error and provide the corrected code.`,
                chatId: chatIdToUse,
              });
            } catch (error) {
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
                {!effectiveAppUrl && !expoUrl && !currentGodotExportUrl && !godotExportUrl ? (
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
                          const url = currentGodotExportUrl || godotExportUrl || effectiveAppUrl || expoUrl;
                          // Iframe loaded successfully
                          setErrorMessage(undefined);
                        }}
                        onError={(e) => {
                          const url = currentGodotExportUrl || godotExportUrl || effectiveAppUrl || expoUrl;
                          // Iframe load error (handled by error handler)
                          setErrorMessage(`Failed to load preview: ${url}. The app server might not be running or there could be a CORS issue.`);
                        }}
                        ref={iframeRef}
                        key={reloadKey}
                        title={`Preview for App ${selectedAppId}`}
                        className="w-full h-full border-none"
                        src={currentGodotExportUrl || godotExportUrl || effectiveAppUrl || expoUrl || undefined}
                        allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; display-capture; geolocation; autoplay; picture-in-picture"
                      />
                    </div>
                  </ScreenSizeWrapper>
                )}
              </div>
            )}
          </div>
        ) : !effectiveAppUrl && !expoUrl && !godotExportUrl && !currentGodotExportUrl ? (
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
                  const url = currentGodotExportUrl || godotExportUrl || effectiveAppUrl || expoUrl;
                  // Iframe loaded
                  setErrorMessage(undefined);
                  
                  // Try to access iframe content for debugging (may fail due to CORS)
                  try {
                    const iframe = iframeRef.current;
                    if (iframe && iframe.contentWindow) {
                      // Iframe accessible
                    }
                  } catch (err) {
                    // Cross-origin iframe (expected)
                  }
                }}
                onError={(e) => {
                  const url = currentGodotExportUrl || godotExportUrl || effectiveAppUrl || expoUrl;
                  // Iframe load error
                  setErrorMessage(`Failed to load preview: ${url}. The app server might not be running or there could be a CORS issue.`);
                }}
                ref={iframeRef}
                key={reloadKey}
                title={`Preview for App ${selectedAppId}`}
                className="w-full h-full border-none"
                src={currentGodotExportUrl || godotExportUrl || effectiveAppUrl || expoUrl || undefined}
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
            // Closing toolbar
            setSelectedVisualElement(null);
            // Keep visual editing active so user can select another element
            // Don't deactivate - just clear the selected element
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
    // Invalid format
    return null;
  }

  const columnStr = parts.pop();
  const lineStr = parts.pop();
  const relativePath = parts.join(":");

  if (!columnStr || !lineStr || !relativePath) {
    // Parse error
    return null;
  }

  const lineNumber = parseInt(lineStr, 10);
  const columnNumber = parseInt(columnStr, 10);

  if (isNaN(lineNumber) || isNaN(columnNumber)) {
    // Parse error
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

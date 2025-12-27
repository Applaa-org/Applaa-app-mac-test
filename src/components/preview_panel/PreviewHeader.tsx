import { useAtom, useAtomValue } from "jotai";
import { previewModeAtom, selectedAppIdAtom, showConfigurePanelAtom } from "../../atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { useExpoUrl } from "@/hooks/useExpoUrl";
import QRCode from 'qrcode';

import {
  Eye,
  Code,
  MoreVertical,
  Cog,
  Trash2,
  Globe,
  TestTube,
  Palette,
  PanelLeftOpen,
  PanelLeftClose,
  QrCode,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";

import { useRunApp } from "@/hooks/useRunApp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showError, showSuccess } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";

import { isPreviewOpenAtom } from "@/atoms/viewAtoms";

export type PreviewMode =
  | "preview"
  | "code"
  | "problems"
  | "publish"
  | "testing";

const BUTTON_CLASS_NAME =
  "no-app-region-drag cursor-pointer relative flex items-center gap-1 px-2 py-1 rounded-md text-[13px] font-medium z-10 hover:bg-[var(--background)]";

interface PreviewHeaderProps {
  isExpoApp?: boolean;
  isLeftPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
}

// Preview Header component with preview mode toggle
export const PreviewHeader = ({ 
  isExpoApp = false, 
  isLeftPanelOpen = true, 
  onToggleLeftPanel = () => {} 
}: PreviewHeaderProps) => {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { problemReport } = useCheckProblems(selectedAppId);
  const previewRef = useRef<HTMLButtonElement>(null);
  const codeRef = useRef<HTMLButtonElement>(null);
  const problemsRef = useRef<HTMLButtonElement>(null);
  const publishRef = useRef<HTMLButtonElement>(null);
  const testingRef = useRef<HTMLButtonElement>(null);
  const designRef = useRef<HTMLButtonElement>(null);

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showConfigurePanel, setShowConfigurePanel] = useAtom(showConfigurePanelAtom);

  const { restartApp, refreshAppIframe } = useRunApp();
  const { expoUrl } = useExpoUrl();
  
  // Expo QR Code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [expoStatus, setExpoStatus] = useState<{
    isRunning: boolean;
    tunnelUrl?: string;
    qrUrl?: string;
    lanUrl?: string;
  }>({ isRunning: false });
  const lastQrUrlRef = useRef<string>('');

  const isCompact = windowWidth < 860;
  
  // Get Expo status and generate QR code for Expo apps
  useEffect(() => {
    if (!isExpoApp || !selectedAppId) {
      setQrCodeDataUrl('');
      lastQrUrlRef.current = '';
      return;
    }

    const checkExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
        setExpoStatus(status);
        
        // Generate QR code if we have a tunnel or LAN URL
        const qrUrl = status.tunnelUrl || status.qrUrl || status.lanUrl;
        if (qrUrl && qrUrl !== lastQrUrlRef.current) {
          lastQrUrlRef.current = qrUrl;
          try {
            const qrDataUrl = await QRCode.toDataURL(qrUrl, {
              width: 300,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
            });
            setQrCodeDataUrl(qrDataUrl);
          } catch (error) {
            console.error('Failed to generate QR code:', error);
          }
        } else if (!qrUrl) {
          lastQrUrlRef.current = '';
          setQrCodeDataUrl('');
        }
      } catch (error) {
        console.error('Failed to get Expo status:', error);
      }
    };

    // Check immediately
    checkExpoStatus();
    
    // Poll every 2 seconds
    const interval = setInterval(checkExpoStatus, 2000);
    return () => clearInterval(interval);
  }, [isExpoApp, selectedAppId]);

  // Track window width
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const selectPanel = (panel: PreviewMode) => {
    setPreviewMode(panel);
    setIsPreviewOpen(true);
  };

  const onCleanRestart = useCallback(() => {
    restartApp({ removeNodeModules: true });
  }, [restartApp]);

  const useClearSessionData = () => {
    return useMutation({
      mutationFn: () => {
        const ipcClient = IpcClient.getInstance();
        return ipcClient.clearSessionData();
      },
      onSuccess: async () => {
        await refreshAppIframe();
        showSuccess("Preview data cleared");
      },
      onError: (error) => {
        showError(`Error clearing preview data: ${error}`);
      },
    });
  };

  const { mutate: clearSessionData } = useClearSessionData();

  const onClearSessionData = useCallback(() => {
    clearSessionData();
  }, [clearSessionData]);



  // Update indicator position when mode changes
  useEffect(() => {
    const updateIndicator = () => {
      let targetRef: React.RefObject<HTMLButtonElement | null>;

      switch (previewMode) {
        case "preview":
          targetRef = previewRef;
          break;
        case "code":
          targetRef = codeRef;
          break;
        case "publish":
          targetRef = publishRef;
          break;
        case "testing":
          targetRef = testingRef;
          break;
        // Design case removed for MVP
        default:
          return;
      }

      if (targetRef.current) {
        const button = targetRef.current;
        const container = button.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const left = buttonRect.left - containerRect.left;
          const width = buttonRect.width;

          setIndicatorStyle({ left, width });
          if (!isPreviewOpen) {
            setIndicatorStyle({ left: left, width: 0 });
          }
        }
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(updateIndicator, 10);
    return () => clearTimeout(timeoutId);
  }, [previewMode, isPreviewOpen, isCompact]);

  const renderButton = (
    mode: PreviewMode,
    ref: React.RefObject<HTMLButtonElement | null>,
    icon: React.ReactNode,
    text: string,
    testId: string,
    badge?: React.ReactNode,
  ) => {
    const isActive = previewMode === mode && isPreviewOpen;
    
    const buttonContent = (
      <button
        data-testid={testId}
        ref={ref}
        className={`${BUTTON_CLASS_NAME} ${
          isActive 
            ? "text-foreground font-semibold" 
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => selectPanel(mode)}
      >
        <span className={isActive ? "text-foreground" : ""}>
          {icon}
        </span>
        {!isCompact && <span>{text}</span>}
        {badge}
      </button>
    );

    if (isCompact) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent>
            <p>{text}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between px-1 py-2 mt-1 border-b border-border">
        <div className="relative flex rounded-md p-0.5 gap-0.5 bg-[var(--background)] dark:bg-gray-800/50">
          <motion.div
            className="absolute top-0.5 bottom-0.5 bg-white dark:bg-gray-700 border-2 border-blue-500 dark:border-blue-400 shadow-sm rounded-md"
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 35,
              mass: 0.6,
            }}
          />
          {renderButton(
            "preview",
            previewRef,
            <Eye size={14} />,
            "Preview",
            "preview-mode-button",
          )}
          {/* {renderButton(
            "code",
            codeRef,
            <Code size={14} />,
            "Code",
            "code-mode-button",
          )} */}

          {renderButton(
            "publish",
            publishRef,
            <Globe size={14} />,
            "Publish",
            "publish-mode-button",
          )}
          {/* {renderButton(
            "testing",
            testingRef,
            <TestTube size={14} />,
            "Testing",
            "testing-mode-button",
          )} */}
          {/* Design button removed for MVP */}
        </div>
        <div className="flex items-center gap-2">
          {/* QR Code button for Expo apps - aligned with Publish button */}
          {isExpoApp && qrCodeDataUrl && (
            <button
              onClick={() => setShowQRModal(true)}
              className="no-app-region-drag flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Show QR Code"
            >
              <QrCode size={14} />
              <span>QR Code</span>
            </button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="preview-more-options-button"
                className="no-app-region-drag flex items-center justify-center p-1.5 rounded-md text-sm hover:bg-[var(--background-darkest)] transition-colors"
                title="More options"
              >
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={onCleanRestart}>
                <Cog size={16} />
                <div className="flex flex-col">
                  <span>Rebuild</span>
                  <span className="text-xs text-muted-foreground">
                    Re-installs node_modules and restarts
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClearSessionData}>
                <Trash2 size={16} />
                <div className="flex flex-col">
                  <span>Clear Cache</span>
                  <span className="text-xs text-muted-foreground">
                    Clears cookies and local storage and other app cache
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* QR Code Modal */}
      {showQRModal && qrCodeDataUrl && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-center">Scan to Test on Device</h3>
            <div className="bg-white p-4 rounded-lg">
              <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-auto" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center break-all">
              {expoStatus.tunnelUrl || expoStatus.qrUrl || expoStatus.lanUrl}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              {(expoStatus.tunnelUrl || expoStatus.qrUrl) && (
                <button
                  onClick={() => {
                    window.open(expoStatus.tunnelUrl || expoStatus.qrUrl, '_blank');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Open
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

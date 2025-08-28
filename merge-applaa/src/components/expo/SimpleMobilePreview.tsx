import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Tablet, ExternalLink, RefreshCw, QrCode as QrCodeIcon } from "lucide-react";
import QRCode from "qrcode";
import { IpcClient } from "@/ipc/ipc_client";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
  nativeUrl?: string;
}

interface SimpleMobilePreviewProps {
  appId: string;
  onRefresh?: () => void;
}

export function SimpleMobilePreview({ appId, onRefresh }: SimpleMobilePreviewProps) {
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [deviceType, setDeviceType] = useState<"phone" | "tablet">("phone");
  const [zoomLevel, setZoomLevel] = useState("75");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQrPanel, setShowQrPanel] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  // Auto-start when component mounts or app changes
  useEffect(() => {
    if (appId && selectedAppId === appId) {
      checkStatusAndAutoStart();
    }
  }, [appId, selectedAppId]);

  const checkStatusAndAutoStart = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const status = await ipcClient.getExpoStatus(appId);
      setExpoStatus(status);

      // Auto-start if not running
      if (!status.isRunning && selectedAppId === appId) {
        await startExpoServer();
      } else if (status.qrUrl) {
        generateQRCode(status.qrUrl);
      }
    } catch (error) {
      console.error("Failed to check Expo status:", error);
    }
  };

  const startExpoServer = async () => {
    setIsStarting(true);
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.startExpo({
        appId,
        native: false, // Default to web for preview
        useTunnel: true, // Default tunnel on for easy sharing
      });

      if (result.success) {
        setExpoStatus({
          isRunning: true,
          webUrl: result.webUrl,
          tunnelUrl: result.tunnelUrl,
          qrUrl: result.qrUrl,
          nativeUrl: result.nativeUrl,
        });

        if (result.qrUrl) {
          generateQRCode(result.qrUrl);
        }
      }
    } catch (error) {
      console.error("Failed to start Expo server:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const stopExpoServer = async () => {
    setIsStopping(true);
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.stopExpo(appId);
      setExpoStatus({ isRunning: false });
      setQrDataUrl("");
    } catch (error) {
      console.error("Failed to stop Expo server:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(qrDataUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    onRefresh?.();
  }, [onRefresh]);

  const openInNewTab = () => {
    if (expoStatus.webUrl) {
      window.open(expoStatus.webUrl, "_blank");
    }
  };

  const getDeviceDimensions = () => {
    const zoomScale = parseInt(zoomLevel) / 100;
    
    if (deviceType === "phone") {
      return {
        width: 420 * zoomScale,
        height: 800 * zoomScale,
        maxHeight: "80vh",
        borderRadius: "30px",
        border: "8px solid #000",
      };
    } else {
      return {
        width: 700 * zoomScale,
        height: 700 * zoomScale,
        maxHeight: "80vh",
        borderRadius: "20px",
        border: "6px solid #000",
      };
    }
  };

  const deviceDimensions = getDeviceDimensions();

  if (!expoStatus.isRunning && !isStarting) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg">
        <div className="text-center mb-6">
          <Smartphone className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Mobile Preview Ready</h3>
          <p className="text-gray-500 mb-4">Start the Expo development server to preview your mobile app</p>
        </div>
        
        <Button 
          onClick={startExpoServer}
          disabled={isStarting}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2"
        >
          {isStarting ? "Starting..." : "Start Mobile Preview"}
        </Button>
      </div>
    );
  }

  if (isStarting) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-orange-500 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Starting Mobile Preview...</h3>
          <p className="text-gray-500">Setting up Expo development server</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center space-x-4">
            <Select value={deviceType} onValueChange={(value: "phone" | "tablet") => setDeviceType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">
                  <div className="flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Phone
                  </div>
                </SelectItem>
                <SelectItem value="tablet">
                  <div className="flex items-center">
                    <Tablet className="h-4 w-4 mr-2" />
                    Tablet
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={zoomLevel} onValueChange={setZoomLevel}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="60">60%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrPanel(!showQrPanel)}
              className="flex items-center"
            >
              <QrCodeIcon className="h-4 w-4 mr-1" />
              QR Code
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPreview}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={stopExpoServer}
              disabled={isStopping}
            >
              {isStopping ? "Stopping..." : "Stop"}
            </Button>
          </div>
        </div>

        {/* Device Preview */}
        <div className="flex-1 relative overflow-auto bg-gray-100 p-8">
          <div className="flex justify-center items-center min-h-full">
            <div
              style={{
                width: deviceDimensions.width,
                height: deviceDimensions.height,
                maxHeight: deviceDimensions.maxHeight,
                borderRadius: deviceDimensions.borderRadius,
                border: deviceDimensions.border,
                backgroundColor: "#000",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {expoStatus.webUrl ? (
                <iframe
                  ref={iframeRef}
                  src={expoStatus.webUrl}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "white",
                    transformOrigin: "center center",
                  }}
                  title="Mobile App Preview"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Smartphone className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Loading preview...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Side Panel */}
      {showQrPanel && (
        <div className="w-80 border-l bg-white p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Scan with Expo Go</h3>
            
            {qrDataUrl ? (
              <div className="mb-4">
                <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Scan this QR code with the Expo Go app to preview on your device
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                  <QrCodeIcon className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">QR code will appear here</p>
              </div>
            )}

            {expoStatus.tunnelUrl && (
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Tunnel URL:</strong></p>
                <code className="block bg-gray-100 p-2 rounded text-xs break-all">
                  {expoStatus.tunnelUrl}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}








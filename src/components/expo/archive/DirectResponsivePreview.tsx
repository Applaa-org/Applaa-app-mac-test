import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MousePointerClick, Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface DirectResponsivePreviewProps {
  selectedAppId: number | null;
}

interface ExpoStatus {
  isRunning: boolean;
  webUrl?: string;
  tunnelUrl?: string;
  qrUrl?: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const DEVICE_SIZES = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1200, height: 800, name: 'Desktop' }
};

export const DirectResponsivePreview: React.FC<DirectResponsivePreviewProps> = ({
  selectedAppId
}) => {
  const [expoStatus, setExpoStatus] = useState<ExpoStatus>({ isRunning: false });
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile');
  const [isElementSelectorActive, setIsElementSelectorActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get the web URL for direct loading
  const getWebUrl = () => {
    if (expoStatus.webUrl) return expoStatus.webUrl;
    if (expoStatus.isRunning) return 'http://localhost:8081';
    return null;
  };

  const webUrl = getWebUrl();

  // Poll Expo status
  useEffect(() => {
    if (!selectedAppId) return;

    const pollExpoStatus = async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const status = await ipcClient.getExpoStatus({ appId: selectedAppId });
        setExpoStatus(status);
      } catch (error) {
        console.error('Failed to get Expo status:', error);
      }
    };

    // Initial poll
    pollExpoStatus();

    // Poll every 2 seconds
    const interval = setInterval(pollExpoStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedAppId]);

  // Load Expo content directly via fetch
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const loadExpoContent = async () => {
    if (!webUrl) return;
    
    setIsLoading(true);
    try {
      console.log('🌐 Loading Expo content directly from:', webUrl);
      const response = await fetch(webUrl);
      const html = await response.text();
      
      // Inject our element selector script
      const enhancedHtml = html.replace(
        '</head>',
        `
        <script>
          // Applaa Element Selector - Direct DOM Access
          window.applaaElementSelector = {
            isActive: false,
            overlay: null,
            
            activate() {
              this.isActive = true;
              this.createOverlay();
              document.addEventListener('mouseover', this.handleMouseOver, true);
              document.addEventListener('click', this.handleClick, true);
              document.body.style.cursor = 'crosshair';
              console.log('🎯 Element selector activated');
            },
            
            deactivate() {
              this.isActive = false;
              this.removeOverlay();
              document.removeEventListener('mouseover', this.handleMouseOver, true);
              document.removeEventListener('click', this.handleClick, true);
              document.body.style.cursor = '';
              console.log('🎯 Element selector deactivated');
            },
            
            createOverlay() {
              this.overlay = document.createElement('div');
              this.overlay.style.cssText = \`
                position: fixed;
                pointer-events: none;
                z-index: 999999;
                background: rgba(147, 51, 234, 0.2);
                border: 2px solid #9333ea;
                border-radius: 4px;
                display: none;
              \`;
              document.body.appendChild(this.overlay);
            },
            
            removeOverlay() {
              if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
              }
            },
            
            handleMouseOver: (e) => {
              if (!window.applaaElementSelector.isActive) return;
              e.preventDefault();
              
              const rect = e.target.getBoundingClientRect();
              const overlay = window.applaaElementSelector.overlay;
              if (overlay) {
                overlay.style.display = 'block';
                overlay.style.top = rect.top + 'px';
                overlay.style.left = rect.left + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
              }
            },
            
            handleClick: (e) => {
              if (!window.applaaElementSelector.isActive) return;
              e.preventDefault();
              e.stopPropagation();
              
              const element = e.target;
              const rect = element.getBoundingClientRect();
              
              // Send element info to parent
              window.parent.postMessage({
                type: 'applaa-element-selected',
                element: {
                  tagName: element.tagName.toLowerCase(),
                  className: element.className,
                  id: element.id,
                  textContent: element.textContent?.substring(0, 100),
                  position: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
                }
              }, '*');
              
              window.applaaElementSelector.deactivate();
            }
          };
          
          // Auto-initialize when page loads
          document.addEventListener('DOMContentLoaded', () => {
            console.log('🎯 Applaa element selector ready');
            window.parent.postMessage({ type: 'applaa-element-selector-ready' }, '*');
          });
        </script>
        </head>`
      );
      
      setHtmlContent(enhancedHtml);
      console.log('✅ Expo content loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Expo content:', error);
      setHtmlContent(`
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
          <div style="text-align: center;">
            <h2>Preview Not Available</h2>
            <p>Make sure Expo is running on ${webUrl}</p>
          </div>
        </div>
      `);
    } finally {
      setIsLoading(false);
    }
  };

  // Load content when URL changes
  useEffect(() => {
    if (webUrl) {
      loadExpoContent();
    }
  }, [webUrl]);

  // Handle element selector activation
  const toggleElementSelector = () => {
    if (contentRef.current) {
      const iframe = contentRef.current.querySelector('iframe');
      if (iframe?.contentWindow) {
        if (isElementSelectorActive) {
          iframe.contentWindow.eval('window.applaaElementSelector?.deactivate()');
        } else {
          iframe.contentWindow.eval('window.applaaElementSelector?.activate()');
        }
        setIsElementSelectorActive(!isElementSelectorActive);
      }
    }
  };

  const currentDevice = DEVICE_SIZES[deviceType];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Device Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentDevice.name} ({currentDevice.width}×{currentDevice.height})
          </Badge>
          {expoStatus.isRunning && (
            <Badge variant="default" className="text-xs bg-green-500">
              Live Preview
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Device Type Selector */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={deviceType === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceType('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Mobile View</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={deviceType === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceType('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Tablet View</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={deviceType === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceType('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Desktop View</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Element Selector */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isElementSelectorActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleElementSelector}
                  disabled={!webUrl}
                  className={isElementSelectorActive ? 'bg-purple-500 hover:bg-purple-600' : ''}
                >
                  <MousePointerClick className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isElementSelectorActive ? 'Disable' : 'Enable'} Element Selection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Refresh */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadExpoContent}
                  disabled={!webUrl}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Refresh Preview</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Responsive Preview Container */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          ref={previewRef}
          className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
          style={{
            width: currentDevice.width,
            height: currentDevice.height,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading preview...</p>
              </div>
            </div>
          ) : htmlContent ? (
            <div
              ref={contentRef}
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Start Expo to see preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

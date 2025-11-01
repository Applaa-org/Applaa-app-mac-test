import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

const SIM_STUDIO_URL = "http://localhost:3000";

const SimStudioPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check if Sim Studio is running
  useEffect(() => {
    const checkSimStudio = async () => {
      try {
        // Try to fetch the page - if it fails, Sim Studio isn't running
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        console.log('🔍 Checking if Sim Studio is running at:', SIM_STUDIO_URL);
        const response = await fetch(SIM_STUDIO_URL, { 
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('✅ Sim Studio is reachable');
        setIsLoading(false);
        setHasError(false);
      } catch (error) {
        console.error('❌ Sim Studio check failed:', error);
        setIsLoading(false);
        setHasError(true);
      }
    };

    checkSimStudio();
    
    // Check every 5 seconds if there's an error
    const interval = setInterval(() => {
      if (hasError) {
        checkSimStudio();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasError]);

  // Debug iframe load state
  useEffect(() => {
    if (iframeRef.current) {
      console.log('📦 Iframe element created, src:', iframeRef.current.src);
      
      // Check if iframe content loads
      const checkIframeContent = () => {
        try {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            console.log('✅ Iframe contentWindow accessible');
          } else {
            console.warn('⚠️ Iframe contentWindow not accessible (may be blocked by CORS/X-Frame-Options)');
          }
        } catch (e) {
          console.warn('⚠️ Cannot access iframe content (cross-origin):', e);
        }
      };

      // Check after a delay to allow iframe to load
      const timeout = setTimeout(checkIframeContent, 2000);
      return () => clearTimeout(timeout);
    }
  }, [iframeKey]);

  const handleRefresh = () => {
    setHasError(false);
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(SIM_STUDIO_URL, '_blank');
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Sim Studio</h1>
            <p className="text-sm text-muted-foreground">
              AI Agent Workflow Builder
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={handleOpenExternal}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Browser
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-background">
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 max-w-2xl">
              <h2 className="text-2xl font-bold mb-2">Sim Studio is not running</h2>
              <p className="text-muted-foreground mb-4">
                Please start Sim Studio first:
              </p>
              <div className="bg-muted p-4 rounded-lg text-left font-mono text-sm mb-4">
                <div className="mb-2 font-semibold">Option 1: NPM Package (Recommended)</div>
                <div className="text-muted-foreground mb-4">npx simstudio</div>
                <div className="mb-2 font-semibold">Option 2: Docker</div>
                <div className="text-muted-foreground">
                  docker compose -f docker-compose.prod.yml up -d
                </div>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Sim Studio should be running on <code className="bg-muted px-2 py-1 rounded">{SIM_STUDIO_URL}</code>
              </div>
              <Button onClick={handleRefresh} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={SIM_STUDIO_URL}
            className="w-full h-full border-0 bg-white dark:bg-gray-950"
            title="AI Studio"
            onLoad={(e) => {
              console.log('✅ Sim Studio iframe onLoad event fired');
              console.log('📦 Iframe src:', e.currentTarget.src);
              setIsLoading(false);
              setHasError(false);
              
              // Try to detect if content actually loaded or if blocked
              try {
                const iframe = e.currentTarget;
                if (iframe.contentWindow) {
                  console.log('✅ Iframe contentWindow is accessible');
                }
              } catch (err) {
                console.warn('⚠️ Cannot access iframe content (may be blocked by X-Frame-Options or CORS):', err);
              }
            }}
            onError={(e) => {
              console.error('❌ Sim Studio iframe onError event fired:', e);
              setIsLoading(false);
              setHasError(true);
            }}
            allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; display-capture; geolocation; autoplay; picture-in-picture"
            style={{
              border: 'none',
              outline: 'none',
            }}
          />
        )}

        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading Sim Studio...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimStudioPage;


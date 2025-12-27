/**
 * Your Deployed Apps Component
 * 
 * Displays only the current user's deployed apps (for home page)
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe, Smartphone, Gamepad2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';

interface DeployedApp {
  id: string;
  app_name: string;
  app_type: 'web' | 'mobile' | 'applaa';
  vercel_deployment_url: string | null;
  eas_deployment_url?: string | null;
  deployment_status: string | null;
}

interface YourDeployedAppsProps {
  className?: string;
  maxApps?: number; // Limit number of apps to show
  filterByAppType?: 'web' | 'expo' | 'flutter' | 'godot' | null; // Filter apps by selected app type
}

export function YourDeployedApps({ className = '', maxApps = 3, filterByAppType = null }: YourDeployedAppsProps) {
  const [selectedAppUrl, setSelectedAppUrl] = useState<string | null>(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [apps, setApps] = useState<DeployedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setIsLoading(true);
        const result = await IpcClient.getInstance().listAppsInSupabase();
        
        if (result.success && result.userApps) {
          // Map selectedAppType to app_type
          let filterAppType: 'web' | 'mobile' | 'applaa' | null = null;
          if (filterByAppType) {
            switch (filterByAppType) {
              case 'web':
                filterAppType = 'web';
                break;
              case 'expo':
              case 'flutter':
                filterAppType = 'mobile';
                break;
              case 'godot':
                filterAppType = 'applaa';
                break;
            }
          }
          
          // Filter apps that are deployed (have deployment URL or status is deployed) AND have user consent
          let deployedApps = result.userApps.filter((app: any) => {
            const hasDeploymentUrl = app.vercel_deployment_url || app.eas_deployment_url;
            const isDeployed = app.deployment_status === 'deployed';
            const hasConsent = app.show_in_hub === true;
            return (hasDeploymentUrl || isDeployed) && hasConsent;
          });
          
          // Filter by app type if filterByAppType is provided
          if (filterAppType) {
            deployedApps = deployedApps.filter((app: any) => app.app_type === filterAppType);
          }
          
          // Limit to maxApps
          setApps(deployedApps.slice(0, maxApps));
        }
      } catch (err: any) {
        console.error('Error fetching apps:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApps();
  }, [maxApps, filterByAppType]);

  const handleLoadApp = (url: string) => {
    setSelectedAppUrl(url);
    setIsAppModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAppModalOpen(false);
    setSelectedAppUrl(null);
  };

  const handleOpenExternal = () => {
    if (selectedAppUrl) {
      window.open(selectedAppUrl, '_blank');
    }
  };

  const getAppTypeIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'applaa':
      case 'godot': // Support both for backward compatibility
        return <Gamepad2 className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const getAppTypeLabel = (type: string) => {
    switch (type) {
      case 'web':
        return 'Web App';
      case 'mobile':
        return 'Mobile App';
      case 'applaa':
        return 'Applaa Game';
      case 'godot': // Support both for backward compatibility
        return 'Applaa Game';
      default:
        return 'App';
    }
  };

  const getSectionTitle = (): string => {
    if (!filterByAppType) {
      return 'Your Deployed Apps';
    }
    
    switch (filterByAppType) {
      case 'web':
        return 'Your Deployed Web Apps';
      case 'expo':
      case 'flutter':
        return 'Your Deployed Mobile Apps';
      case 'godot':
        return 'Your Deployed Games';
      default:
        return 'Your Deployed Apps';
    }
  };

  const getAppUrl = (app: DeployedApp): string | null => {
    return app.vercel_deployment_url || app.eas_deployment_url || null;
  };

  // Don't render if loading or no apps
  if (isLoading || apps.length === 0) {
    return null;
  }

  return (
    <>
      <section className={`mb-8 ${className}`}>
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {getSectionTitle()}
              </h2>
              <p className="text-md text-gray-600 dark:text-gray-400">
                Your apps that are deployed and ready to use
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={isExpanded ? "Hide deployed apps" : "Show deployed apps"}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Show</span>
                </>
              )}
            </button>
          </div>
        </header>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app) => {
            const appUrl = getAppUrl(app);
            if (!appUrl) return null;

            return (
              <div
                key={app.id}
                onClick={() => handleLoadApp(appUrl)}
                className="group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              >
                {/* App Type Badge */}
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      {getAppTypeIcon(app.app_type)}
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {getAppTypeLabel(app.app_type)}
                    </span>
                  </div>
                </div>

                {/* App Info */}
                <div className="px-4 pb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {app.app_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {app.deployment_status === 'deployed' ? 'Deployed' : 'Ready'}
                  </p>
                </div>

                {/* External Link Icon */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-sm">
                    <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-500/20 transition-colors duration-300 pointer-events-none" />
              </div>
            );
          })}
          </div>
        )}
      </section>

      {/* App Modal */}
      <Dialog open={isAppModalOpen} onOpenChange={setIsAppModalOpen}>
        <DialogContent className="!max-w-none !w-[98vw] !h-[95vh] p-0" style={{ width: '98vw', height: '95vh', maxWidth: 'none', maxHeight: 'none' }}>
          <DialogHeader className="p-6 pb-0 mt-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                Loading App
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </DialogHeader>
          
          {selectedAppUrl && (
            <div className="flex-1 p-6 pt-0" style={{ height: 'calc(95vh - 120px)' }}>
              <iframe
                src={selectedAppUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Deployed App"
                allow="fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ height: 'calc(95vh - 120px)' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}



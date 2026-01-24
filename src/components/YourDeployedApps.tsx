/**
 * Your Deployed Apps Component
 * 
 * Displays only the current user's deployed apps (for home page)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe, Smartphone, Gamepad2, ChevronDown, ChevronUp, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { IpcClient } from '@/ipc/ipc_client';
import { useSettings } from '@/hooks/useSettings';

interface DeployedApp {
  id: string;
  app_name: string;
  app_type: 'web' | 'mobile' | 'applaa';
  vercel_deployment_url: string | null;
  eas_deployment_url?: string | null;
  deployment_status: string | null;
  local_app_id?: number; // Local app ID for navigation
  preview_image_url?: string | null; // Preview image URL
}

interface YourDeployedAppsProps {
  className?: string;
  maxApps?: number; // Limit number of apps to show
  filterByAppType?: 'web' | 'expo' | 'flutter' | 'godot' | null; // Filter apps by selected app type
}

export function YourDeployedApps({ className = '', maxApps = 3, filterByAppType = null }: YourDeployedAppsProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [selectedAppUrl, setSelectedAppUrl] = useState<string | null>(null);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [apps, setApps] = useState<DeployedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize from settings, default to true if not set
  const [isExpanded, setIsExpanded] = useState(
    settings?.deployedAppsSectionExpanded ?? true
  );

  // Load saved state when settings are available
  useEffect(() => {
    if (settings?.deployedAppsSectionExpanded !== undefined) {
      setIsExpanded(settings.deployedAppsSectionExpanded);
    }
  }, [settings?.deployedAppsSectionExpanded]);

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
          }).map((app: any) => ({
            id: app.id,
            app_name: app.app_name,
            app_type: app.app_type,
            vercel_deployment_url: app.vercel_deployment_url,
            eas_deployment_url: app.eas_deployment_url,
            deployment_status: app.deployment_status,
            local_app_id: app.local_app_id, // Include local app ID as-is
            preview_image_url: app.preview_image_url || null, // Include preview image URL
          }));
          
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

  // Handle toggle and save state
  const handleToggleExpanded = async () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    // Save to settings
    try {
      await updateSettings({ deployedAppsSectionExpanded: newExpanded });
    } catch (error) {
      console.error('Failed to save deployed apps section state:', error);
      // Revert on error
      setIsExpanded(isExpanded);
    }
  };

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

  const handleContinue = async (app: DeployedApp, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (app.local_app_id) {
      // Navigate to the app's chat
      try {
        // Navigate directly to the app's chat (skip verification for now to make it work)
        const chats = await IpcClient.getInstance().getChats(app.local_app_id);
        let chatId: number;
        
        if (chats.length > 0) {
          chatId = chats[0].id;
        } else {
          // Create a new chat for this app
          const newChat = await IpcClient.getInstance().createChat({
            appId: app.local_app_id,
            title: `Chat for ${app.app_name}`,
          });
          chatId = newChat.id;
        }
        
        navigate({ to: "/chat", search: { id: chatId } });
      } catch (error) {
        console.error('Failed to navigate to app:', error);
        // If chat creation fails, try to open in modal or navigate to app details
        const appUrl = app.vercel_deployment_url || app.eas_deployment_url;
        if (appUrl) {
          handleLoadApp(appUrl);
        } else if (app.local_app_id) {
          // Try to navigate to app details as fallback
          try {
            navigate({ to: "/app-details", search: { appId: app.local_app_id } });
          } catch (navError) {
            console.error('Failed to navigate to app details:', navError);
          }
        }
      }
    } else {
      // If no local app ID, open in modal
      const appUrl = app.vercel_deployment_url || app.eas_deployment_url;
      if (appUrl) {
        handleLoadApp(appUrl);
      }
    }
  };


  // Generate preview image URL if not provided
  const getPreviewImageUrl = (app: DeployedApp): string | null => {
    if (app.preview_image_url) {
      return app.preview_image_url;
    }
    
    // Fallback: Generate screenshot URL using a service or use placeholder
    const appUrl = getAppUrl(app);
    if (appUrl) {
      // You can integrate a screenshot service here (e.g., screenshotapi.net)
      // For now, return null to use placeholder
      return null;
    }
    
    return null;
  };

  const getAppTypeIcon = (type: string, size: string = "h-5 w-5") => {
    switch (type) {
      case 'web':
        return <Globe className={size} />;
      case 'mobile':
        return <Smartphone className={size} />;
      case 'applaa':
      case 'godot': // Support both for backward compatibility
        return <Gamepad2 className={size} />;
      default:
        return <Globe className={size} />;
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
      <section className={`mb-12 ${className}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {getSectionTitle()}
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Your apps that are deployed and ready to use
              </p>
            </div>
            <button
              onClick={handleToggleExpanded}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {apps.map((app) => {
            const appUrl = getAppUrl(app);
            if (!appUrl) return null;

            const previewImageUrl = getPreviewImageUrl(app);

            return (
              <div
                key={app.id}
                onClick={() => handleLoadApp(appUrl)}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
              >
                {/* Preview Image */}
                {previewImageUrl ? (
                  <div className="w-full h-56 overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
                    <img
                      src={previewImageUrl}
                      alt={`${app.app_name} preview`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]" />
                    <div className="text-center relative z-10">
                      <div className="mb-3 flex justify-center">
                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-lg">
                          <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No preview available</p>
                    </div>
                  </div>
                )}

                {/* App Type Badge - Overlay on Preview */}
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md border border-gray-200/50 dark:border-gray-700/50">
                    <div className="p-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {getAppTypeIcon(app.app_type, "h-3 w-3")}
                    </div>
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {getAppTypeLabel(app.app_type)}
                    </span>
                  </div>
                </div>

                {/* App Info */}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xl mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {app.app_name}
                  </h3>
                  
                  {/* Action Buttons */}
                  {/* Show Continue button if app has local_app_id */}
                  {app.local_app_id ? (
                    <Button
                      onClick={(e) => handleContinue(app, e)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                      size="default"
                    >
                      <span>Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadApp(appUrl);
                      }}
                      variant="outline"
                      className="w-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2 font-semibold transition-all duration-200"
                      size="default"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View App</span>
                    </Button>
                  )}
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-500/30 dark:group-hover:border-blue-400/30 transition-colors duration-300 pointer-events-none" />
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



import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { PlusCircle, Sparkles, Code2, Smartphone, Zap, Globe, Monitor } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useLoadApps } from "@/hooks/useLoadApps";
import type { App } from "@/lib/schemas";
import { detectAppCategory, getCategoryLabel, getCategoryIcon, type AppCategory } from "@/utils/appTypeDetection";
import { AppTypeFilter, type AppFilterType } from "@/components/AppTypeFilter";
// Advanced features temporarily disabled for core stability
// import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
// import { CloudSyncPanel } from "@/components/cloud/CloudSyncPanel";
// import { BackupStatusIndicator } from "@/components/backup/BackupStatusIndicator";

// Helper functions for enhanced category styling
const getCategoryGradient = (category: AppCategory): string => {
  const gradients = {
    web: "bg-gradient-to-r from-blue-500 to-cyan-500",
    mobile: "bg-gradient-to-r from-green-500 to-emerald-500", 
    flutter: "bg-gradient-to-r from-blue-600 to-indigo-600",
    capacitor: "bg-gradient-to-r from-orange-500 to-red-500"
  };
  return gradients[category] || gradients.web;
};

const getCategoryIconComponent = (category: AppCategory) => {
  const iconProps = { size: 14, className: "text-white" };
  const icons = {
    web: <Code2 {...iconProps} />,
    mobile: <Smartphone {...iconProps} />,
    flutter: <Smartphone {...iconProps} />,
    capacitor: <Zap {...iconProps} />
  };
  return icons[category] || icons.web;
};

// Helper function to get app-specific icon and gradient based on category
const getAppIconAndGradient = (app: App) => {
  const category = detectAppCategory(app);
  const iconProps = { size: 14, className: "text-white" };
  
  const appStyles = {
    web: {
      icon: <Globe {...iconProps} />,
      gradient: "from-blue-500 to-cyan-500"
    },
    mobile: {
      icon: <Smartphone {...iconProps} />,
      gradient: "from-green-500 to-emerald-500"
    },
    flutter: {
      icon: <Smartphone {...iconProps} />,
      gradient: "from-blue-600 to-indigo-600"
    },
    capacitor: {
      icon: <Zap {...iconProps} />,
      gradient: "from-orange-500 to-red-500"
    }
  };
  
  return appStyles[category] || appStyles.web;
};

export function AppList({ show }: { show?: boolean }) {
  const navigate = useNavigate();
  const [selectedAppId, setSelectedAppId] = useAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const { apps, loading, error } = useLoadApps();
  // Advanced features temporarily disabled for core stability
  // const { isAuthenticated } = useSupabaseAuth();
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [appFilter, setAppFilter] = useState<AppFilterType>("all");
  
  // Temporary fallback values
  const isAuthenticated = false;
  
  // Ensure apps is always an array to prevent hook inconsistencies
  const stableApps = React.useMemo(() => apps || [], [apps]);
  
  // Filter apps based on selected filter type
  const filteredApps = React.useMemo(() => {
    return stableApps.filter(app => {
      const category = detectAppCategory(app);
      return category === appFilter; // Only show apps matching the selected filter
    });
  }, [stableApps, appFilter]);

  // Group apps by category using simple file-based detection
  // IMPORTANT: Hooks must be called unconditionally before any early returns
  const groupedApps = React.useMemo(() => {
    if (!filteredApps.length) return {} as Record<AppCategory, App[]>;
    
    const groups: Record<AppCategory, App[]> = {
      web: [],
      mobile: [],
      flutter: [],
      capacitor: []
    };
    
    filteredApps.forEach(app => {
      const category = detectAppCategory(app);
      groups[category].push(app);
    });
    
    return Object.entries(groups).reduce((acc, [category, categoryApps]) => {
      if (categoryApps.length > 0) {
        acc[category as AppCategory] = categoryApps;
      }
      return acc;
    }, {} as Record<AppCategory, App[]>);
  }, [filteredApps]);

  // After all hooks, we can early-return based on visibility
  if (!show) {
    return null;
  }

  const handleAppClick = (id: number) => {
    setSelectedAppId(id);
    setSelectedChatId(null);
    
    // 🚀 OPTIMIZATION: Trigger background dependency check for existing apps
    // This ensures dependencies are ready when user clicks preview
    triggerBackgroundDependencyCheck(id);
    
    navigate({
      to: "/",
      search: { appId: id },
    });
  };

  // Background dependency check function
  const triggerBackgroundDependencyCheck = async (appId: number) => {
    try {
      const { IpcClient } = await import("@/ipc/ipc_client");
      const ipcClient = IpcClient.getInstance();
      
      // Check if dependencies are needed (non-blocking)
      const { needed } = await ipcClient.checkDependenciesNeeded({ appId });
      
      if (needed) {
        console.log(`📦 [BACKGROUND] Starting dependency installation for app ${appId}`);
        // Install in background (fire and forget)
        ipcClient.installDependenciesBackground({ appId }).catch(error => {
          console.warn(`⚠️ Background dependency installation failed for app ${appId}:`, error);
        });
      }
    } catch (error) {
      console.warn(`⚠️ Background dependency check failed for app ${appId}:`, error);
    }
  };

  const handleNewApp = () => {
    navigate({ to: "/" });
    // We'll eventually need a create app workflow
  };

  

  const renderAppItem = (app: App) => {
    const { icon, gradient } = getAppIconAndGradient(app);
    
    return (
      <SidebarMenuItem key={app.id} className="mb-2 mx-2">
      <Button
        variant="ghost"
        onClick={() => handleAppClick(app.id)}
          className={`justify-start w-full text-left p-3 rounded-xl border transition-all duration-200 hover:shadow-md ${
          selectedAppId === app.id
              ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-200 dark:border-blue-700 shadow-md"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
        }`}
        data-testid={`app-list-item-${app.name}`}
      >
          <div className="flex items-center gap-3 w-full">
            <div className={`w-8 h-8 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
              {icon}
            </div>
                      <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                {app.name}
              </span>
              {/* Backup status temporarily disabled for core stability */}
              {/* isAuthenticated && (
                <BackupStatusIndicator
                  appId={app.id}
                  isBackupEnabled={true}
                  syncStatus="synced" // This would come from actual sync status
                  lastBackup={new Date(app.updatedAt)}
                />
              ) */}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(app.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </Button>
    </SidebarMenuItem>
  );
  };

  return (
    <SidebarGroup className="flex-1 flex flex-col min-h-0">
      <SidebarGroupLabel className="flex items-center gap-2 px-3 py-2 text-base font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">
        <div className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Sparkles size={14} className="text-white" />
        </div>
        Your Apps
      </SidebarGroupLabel>
      <SidebarGroupContent className="flex-1 overflow-y-auto">
        <div className="flex flex-col space-y-2 pb-4">
          <Button
            onClick={handleNewApp}
            className="flex items-center justify-start gap-3 mx-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
          >
            <div className="p-1 bg-white/20 rounded-lg">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-medium">New App</span>
          </Button>
          
          {/* App Type Filter */}
          <AppTypeFilter 
            onChange={setAppFilter} 
            defaultValue={appFilter} 
          />

          {/* Cloud Sync Button - Only show when authenticated */}
          {isAuthenticated && (
            <Button
              onClick={() => setShowCloudSync(true)}
              variant="outline"
              className="flex items-center justify-start gap-3 mx-2 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 transition-all duration-200 rounded-xl"
            >
              <div className="p-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                <Code2 size={16} className="text-white" />
              </div>
              <span className="font-medium text-blue-700 dark:text-blue-300">Cloud Sync</span>
            </Button>
          )}

          {loading ? (
            <div className="py-2 px-4 text-sm text-gray-500">
              Loading apps...
            </div>
          ) : error ? (
            <div className="py-2 px-4 text-sm text-red-500">
              Error loading apps
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-2 px-4 text-sm text-gray-500">No apps found</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedApps).map(([category, categoryApps]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2 mx-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className={`p-1.5 rounded-md ${getCategoryGradient(category as AppCategory)}`}>
                      {getCategoryIconComponent(category as AppCategory)}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {getCategoryLabel(category as AppCategory)}
                    </span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium ml-auto">
                      {categoryApps.length}
                    </span>
                  </div>
                  <SidebarMenu className="space-y-1" data-testid={`app-list-${category}`}>
                    {categoryApps.map(renderAppItem)}
                  </SidebarMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </SidebarGroupContent>

      {/* Cloud Sync Dialog */}
      {showCloudSync && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cloud Sync</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCloudSync(false)}
                className="p-2"
              >
                ✕
              </Button>
            </div>
            {/* CloudSyncPanel temporarily disabled for core stability */}
            {/* <CloudSyncPanel /> */}
            <div className="p-4 text-center text-gray-500">
              Cloud sync temporarily disabled for core stability
            </div>
          </div>
        </div>
      )}
    </SidebarGroup>
  );
}

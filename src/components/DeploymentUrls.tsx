import React, { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";
import { DeploymentInfo } from "@/ipc/ipc_types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, RefreshCw, Globe, Smartphone, Github, Zap } from "lucide-react";
import { toast } from "sonner";

interface DeploymentUrlsProps {
  appId: number;
}

export const DeploymentUrls: React.FC<DeploymentUrlsProps> = ({ appId }) => {
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ipcClient = IpcClient.getInstance();

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const result = await ipcClient.getDeploymentUrls({ appId });
      
      if (result.success && result.deployments) {
        setDeployments(result.deployments);
      } else {
        console.error("Failed to load deployments:", result.error);
      }
    } catch (error) {
      console.error("Error loading deployments:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDeployments = async () => {
    try {
      setRefreshing(true);
      await loadDeployments();
      toast.success("Deployment URLs refreshed");
    } catch (error) {
      toast.error("Failed to refresh deployment URLs");
    } finally {
      setRefreshing(false);
    }
  };

  const deleteDeployment = async (urlType: DeploymentInfo['type']) => {
    try {
      const result = await ipcClient.deleteDeploymentUrl({ appId, urlType });
      
      if (result.success) {
        await loadDeployments();
        toast.success("Deployment URL deleted");
      } else {
        toast.error(`Failed to delete deployment: ${result.error}`);
      }
    } catch (error) {
      toast.error("Failed to delete deployment URL");
    }
  };

  const openUrl = (url: string) => {
    ipcClient.openExternalUrl(url);
  };

  const getIcon = (type: DeploymentInfo['type']) => {
    switch (type) {
      case 'vercel':
        return <Zap className="w-4 h-4" />;
      case 'github':
        return <Github className="w-4 h-4" />;
      case 'eas-build':
        return <Smartphone className="w-4 h-4" />;
      case 'eas-deployment':
        return <Globe className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: DeploymentInfo['type']) => {
    switch (type) {
      case 'vercel':
        return 'text-black dark:text-white';
      case 'github':
        return 'text-gray-700 dark:text-gray-300';
      case 'eas-build':
        return 'text-blue-600 dark:text-blue-400';
      case 'eas-deployment':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  useEffect(() => {
    loadDeployments();
  }, [appId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Deployment URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Deployment URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No deployment URLs found. Deploy your app to see URLs here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Deployment URLs
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshDeployments}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {deployments.map((deployment, index) => (
          <div
            key={`${deployment.type}-${index}`}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`flex-shrink-0 ${getTypeColor(deployment.type)}`}>
                {getIcon(deployment.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {deployment.name}
                  </span>
                  {deployment.buildId && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      {deployment.buildId.substring(0, 8)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {deployment.url}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => openUrl(deployment.url)}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
                {deployment.lastDeploymentAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Last deployed: {new Date(deployment.lastDeploymentAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              onClick={() => deleteDeployment(deployment.type)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

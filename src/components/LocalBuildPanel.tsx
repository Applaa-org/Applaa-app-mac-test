import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Smartphone, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FolderOpen,
  X,
  ExternalLink
} from "lucide-react";
import { useLocalBuildStatus, useLocalBuildAndroidAPK, useLocalBuildAndroidAAB, useLocalBuildIOSIPA, useCancelLocalBuild } from "@/hooks/useLocalBuild";
import { IpcClient } from "@/ipc/ipc_client";
import { DeploymentInfo } from "@/ipc/ipc_types";
import { toast } from "sonner";

interface LocalBuildPanelProps {
  appId: number;
  appName?: string;
}

export function LocalBuildPanel({ appId, appName }: LocalBuildPanelProps) {
  const [showLogs, setShowLogs] = useState(true); // Show logs by default
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [previousBuilds, setPreviousBuilds] = useState<DeploymentInfo[]>([]);
  
  // Hooks
  const { data: buildStatus } = useLocalBuildStatus();
  const apkMutation = useLocalBuildAndroidAPK();
  const aabMutation = useLocalBuildAndroidAAB();
  const ipaMutation = useLocalBuildIOSIPA();
  const cancelMutation = useCancelLocalBuild();
  
  const ipcClient = IpcClient.getInstance();

  const isBuilding = buildStatus?.isBuilding || apkMutation.isPending || aabMutation.isPending || ipaMutation.isPending;

  // Load previous local builds
  const loadPreviousBuilds = async () => {
    try {
      const result = await ipcClient.getDeploymentUrls({ appId });
      if (result.success && result.deployments) {
        // Filter only local builds
        const localBuilds = result.deployments.filter(dep => 
          dep.type.startsWith('local-')
        );
        setPreviousBuilds(localBuilds);
      }
    } catch (error) {
      console.error("Error loading previous builds:", error);
    }
  };

  // Load previous builds on component mount
  useEffect(() => {
    loadPreviousBuilds();
  }, [appId]);

  // Reload previous builds after successful builds
  useEffect(() => {
    if (apkMutation.data?.success || aabMutation.data?.success || ipaMutation.data?.success) {
      loadPreviousBuilds();
    }
  }, [apkMutation.data, aabMutation.data, ipaMutation.data]);

  const handleBuildAPK = async () => {
    try {
      setBuildLogs([]);
      setShowLogs(true);
      
      // Start showing logs immediately
      setBuildLogs(["🔨 Starting Android APK build...", "📱 This will create a debug APK file"]);
      
      const result = await apkMutation.mutateAsync({ appId });
      
      if (result.success) {
        toast.success("APK built successfully!");
        if (result.buildPath) {
          toast.success(`APK saved to: ${result.buildPath}`);
        }
        if (result.logs) {
          setBuildLogs(result.logs);
        }
      } else {
        toast.error(`APK build failed: ${result.error}`);
        if (result.logs) {
          setBuildLogs(result.logs);
        }
      }
    } catch (error: any) {
      toast.error(`APK build error: ${error.message}`);
    }
  };

  const handleBuildAAB = async () => {
    try {
      setBuildLogs([]);
      setShowLogs(true);
      
      // Start showing logs immediately
      setBuildLogs(["🔨 Starting Android AAB build...", "📱 This will create a release AAB file for Play Store"]);
      
      const result = await aabMutation.mutateAsync({ appId });
      
      if (result.success) {
        toast.success("AAB built successfully!");
        if (result.buildPath) {
          toast.success(`AAB saved to: ${result.buildPath}`);
        }
        if (result.logs) {
          setBuildLogs(result.logs);
        }
      } else {
        toast.error(`AAB build failed: ${result.error}`);
        if (result.logs) {
          setBuildLogs(result.logs);
        }
      }
    } catch (error: any) {
      toast.error(`AAB build error: ${error.message}`);
    }
  };

  const handleBuildIPA = async () => {
    try {
      setBuildLogs([]);
      setShowLogs(true);
      
      // Start showing logs immediately
      setBuildLogs(["🔨 Starting iOS IPA build...", "🍎 This will create an IPA file (requires Xcode)"]);
      
      const result = await ipaMutation.mutateAsync({ appId });
      
      if (result.success) {
        toast.success("IPA built successfully!");
        if (result.buildPath) {
          toast.success(`IPA saved to: ${result.buildPath}`);
        }
        if (result.logs) {
          setBuildLogs(result.logs);
        }
      } else {
        toast.error(`IPA build failed: ${result.error}`);
        if (result.logs) {
          setBuildLogs(result.logs);
        }
      }
    } catch (error: any) {
      toast.error(`IPA build error: ${error.message}`);
    }
  };

  const handleCancelBuild = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.success("Build cancelled");
    } catch (error: any) {
      toast.error(`Failed to cancel build: ${error.message}`);
    }
  };

  const openBuildFolder = (buildPath: string) => {
    // Extract the directory path from the file path
    const pathParts = buildPath.split('/');
    const fileName = pathParts.pop();
    const folderPath = pathParts.join('/');
    ipcClient.showItemInFolder(folderPath);
  };

  const openLocalBuild = (build: DeploymentInfo) => {
    if (build.type.startsWith('local-')) {
      // For local files, show the folder containing the file
      const pathParts = build.url.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');
      ipcClient.showItemInFolder(folderPath);
    } else {
      // For URLs, open in browser
      ipcClient.openExternalUrl(build.url);
    }
  };

  const getCurrentBuildResult = () => {
    if (apkMutation.data) return apkMutation.data;
    if (aabMutation.data) return aabMutation.data;
    if (ipaMutation.data) return ipaMutation.data;
    return null;
  };

  const currentBuildResult = getCurrentBuildResult();

  return (
    <div className="space-y-4">
      {/* Build Status */}
      {isBuilding && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Building app locally... This may take several minutes.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelBuild}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <X className="h-3 w-3 mr-1" />
                )}
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Build Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Android APK */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              Android APK
            </CardTitle>
            <CardDescription className="text-xs">
              Debug APK for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleBuildAPK}
              disabled={isBuilding}
              className="w-full"
              size="sm"
            >
              {apkMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Building...
                </>
              ) : (
                <>
                  <Smartphone className="h-3 w-3 mr-1" />
                  Build APK
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Android AAB */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              Android AAB
            </CardTitle>
            <CardDescription className="text-xs">
              Release AAB for Play Store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleBuildAAB}
              disabled={isBuilding}
              className="w-full"
              size="sm"
            >
              {aabMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Building...
                </>
              ) : (
                <>
                  <Smartphone className="h-3 w-3 mr-1" />
                  Build AAB
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* iOS IPA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              iOS IPA
            </CardTitle>
            <CardDescription className="text-xs">
              Release IPA for App Store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleBuildIPA}
              disabled={isBuilding}
              className="w-full"
              size="sm"
            >
              {ipaMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Building...
                </>
              ) : (
                <>
                  <Smartphone className="h-3 w-3 mr-1" />
                  Build IPA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Previous Builds */}
      {previousBuilds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Previous Builds
            </CardTitle>
            <CardDescription className="text-xs">
              Previously built files for this app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {previousBuilds.map((build, index) => (
              <div
                key={`${build.type}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <Smartphone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {build.name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          build.type === 'local-apk' ? 'text-orange-600 border-orange-200' :
                          build.type === 'local-aab' ? 'text-purple-600 border-purple-200' :
                          'text-pink-600 border-pink-200'
                        }`}
                      >
                        {build.type.replace('local-', '').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {build.url}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => openLocalBuild(build)}
                      >
                        <FolderOpen className="w-3 h-3" />
                      </Button>
                    </div>
                    {build.lastDeploymentAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Built: {new Date(build.lastDeploymentAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Build Results */}
      {currentBuildResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {currentBuildResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              Build Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentBuildResult.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    {currentBuildResult.buildType?.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-green-600">Build Successful!</span>
                </div>
                {currentBuildResult.buildPath && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">File:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {currentBuildResult.buildPath}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBuildFolder(currentBuildResult.buildPath!)}
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      Open Folder
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    Failed
                  </Badge>
                  <span className="text-sm text-red-600">Build Failed</span>
                </div>
                {currentBuildResult.error && (
                  <p className="text-sm text-red-600">{currentBuildResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Build Logs */}
      {showLogs && (buildLogs.length > 0 || isBuilding) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Build Logs</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? 'Hide' : 'Show'} Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-xs max-h-64 overflow-y-auto">
              {buildLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
              {isBuilding && buildLogs.length === 0 && (
                <div className="mb-1 text-yellow-400">
                  🔄 Building... Please wait...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="text-sm font-medium">Local Build Requirements:</p>
            <ul className="text-xs space-y-1 ml-4">
              <li>• Android: Android Studio and SDK installed</li>
              <li>• iOS: macOS with Xcode installed</li>
              <li>• Build files will be saved to your local system</li>
              <li>• This process may take 5-15 minutes</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

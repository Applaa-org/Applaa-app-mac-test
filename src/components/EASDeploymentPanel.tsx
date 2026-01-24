import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Loader2, 
  Smartphone, 
  Globe, 
  QrCode, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  LogIn,
  RefreshCw,
  Info
} from "lucide-react";
import { useEASStatus, useEASLogin, useEASBuild, useEASDeploy, useEASProjects } from "@/hooks/useEAS";
import { useLoadApp } from "@/hooks/useLoadApp";
import { IpcClient } from "@/ipc/ipc_client";
import { LocalBuildPanel } from "@/components/LocalBuildPanel";
import { useApplaaPro } from "@/hooks/useApplaaPro";
import { toast } from "sonner";

interface EASDeploymentPanelProps {
  appId: number;
  appName?: string;
}

export function EASDeploymentPanel({ appId, appName }: EASDeploymentPanelProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | "ios" | "android">("all");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [showTokenLogin, setShowTokenLogin] = useState(false);
  const [token, setToken] = useState("");
  
  // Check user tier for deployment restrictions
  const { canDeploy } = useApplaaPro();
  
  // Hooks
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useEASStatus();
  const loginMutation = useEASLogin();
  const buildMutation = useEASBuild();
  const deployMutation = useEASDeploy();
  const { data: projects } = useEASProjects();
  const { app } = useLoadApp(appId);
  
  const ipcClient = IpcClient.getInstance();

  // Auto-save EAS URLs to database when they exist
  React.useEffect(() => {
    const saveEASUrls = async () => {
      if (!app) return;
      
      // Save EAS build URL if it exists
      if (app.easBuildUrl) {
        try {
          await ipcClient.saveDeploymentUrl({
            appId,
            urlType: 'eas-build',
            url: app.easBuildUrl,
            buildId: app.easBuildId || undefined
          });
        } catch (error) {
          console.error('Failed to save EAS build URL:', error);
        }
      }
      
      // Save EAS deployment URL if it exists
      if (app.easDeploymentUrl) {
        try {
          await ipcClient.saveDeploymentUrl({
            appId,
            urlType: 'eas-deployment',
            url: app.easDeploymentUrl,
            projectId: app.easProjectId || undefined
          });
        } catch (error) {
          console.error('Failed to save EAS deployment URL:', error);
        }
      }
    };

    saveEASUrls();
  }, [appId, app?.easBuildUrl, app?.easDeploymentUrl, app?.easBuildId, app?.easProjectId]);

  const handleLogin = async () => {
    try {
      await loginMutation.mutateAsync();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleTokenLogin = async () => {
    try {
      const result = await ipcClient.loginToEASWithToken({ token });
      if (result.success) {
        toast.success(`Successfully logged in as ${result.username}!`);
        setShowTokenLogin(false);
        setToken("");
        refetchStatus();
      } else {
        toast.error(`Token login failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Token login error:", error);
      toast.error("Token login failed");
    }
  };


  const handleBuild = async () => {
    try {
      // First check if app is ready for EAS build
      const readinessCheck = await ipcClient.checkEASAppReadiness({ appId });
      
      if (!readinessCheck.success) {
        toast.error(`App not ready for EAS build: ${readinessCheck.error}`);
        return;
      }
      
      if (!readinessCheck.isExpoApp) {
        toast.error("This app is not an Expo app. EAS only works with Expo apps.");
        return;
      }
      
      if (!readinessCheck.isEASConfigured) {
        toast.error("EAS configuration is missing or invalid.");
        return;
      }
      
      // Proceed with build
      const result = await buildMutation.mutateAsync({ appId, platform: selectedPlatform });
      if (result.success && result.buildId) {
        setBuildId(result.buildId);
        toast.success("Build started! Check the status tab for progress.");
      }
    } catch (error) {
      console.error("Build error:", error);
    }
  };

  const handleDeploy = async () => {
    if (!canDeploy) {
      toast.error("Deployment is only available for Pro users. Please upgrade to Pro tier in Settings.");
      return;
    }
    
    try {
      await deployMutation.mutateAsync({ appId });
    } catch (error: any) {
      console.error("Deploy error:", error);
      // Check if error is about deployment not allowed
      if (error?.message?.includes("DEPLOYMENT_NOT_ALLOWED") || error?.message?.includes("FREE_TIER")) {
        toast.error("Deployment requires Pro tier. Upgrade in Settings to deploy your apps.");
      }
    }
  };

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "finished":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "errored":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "finished":
        return "bg-green-100 text-green-800";
      case "errored":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs for EAS vs Local Build */}
      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="local">Local Build</TabsTrigger>
          <TabsTrigger value="eas">EAS Deployment</TabsTrigger>
         
        </TabsList>
        
        <TabsContent value="eas" className="space-y-4">
          {/* EAS Deployment Content */}
          {/* EAS Status */}
          <div className="space-y-4">
            {statusLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking EAS status...</span>
              </div>
            ) : status?.isLoggedIn ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Logged in as: <strong className="truncate">{status.username}</strong></span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchStatus()}
                  disabled={statusLoading}
                  className="flex-shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Alert>
                <LogIn className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>You need to log in to EAS to deploy apps.</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleLogin}
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        Browser Login
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTokenLogin(!showTokenLogin)}
                      >
                        Token Login
                      </Button>
                    </div>
                    {showTokenLogin && (
                      <div className="space-y-2">
                        <div className="text-sm">
                          Get your EAS token from: <a href="https://expo.dev/settings/access-tokens" target="_blank" className="text-blue-500 underline">expo.dev/settings/access-tokens</a>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="Enter your EAS token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="flex-1 px-3 py-1 border rounded text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={handleTokenLogin}
                            disabled={!token.trim()}
                          >
                            Login
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        {/* </CardContent>
      </Card> */}

      {/* Main Actions */}
      <Tabs defaultValue="build" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="build">Build App</TabsTrigger>
          <TabsTrigger value="deploy">Deploy Web</TabsTrigger>
        </TabsList>

        {/* Build Tab */}
        <TabsContent value="build" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Build Mobile App</CardTitle>
              <CardDescription>
                Build your Expo app for iOS, Android, or both platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <div className="flex flex-col  gap-2">
                  <Button
                    variant={selectedPlatform === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPlatform("all")}
                    className="w-full sm:w-auto"
                  >
                    All Platforms
                  </Button>
                  <Button
                    variant={selectedPlatform === "ios" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPlatform("ios")}
                    className="w-full sm:w-auto"
                  >
                    iOS Only
                  </Button>
                  <Button
                    variant={selectedPlatform === "android" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPlatform("android")}
                    className="w-full sm:w-auto"
                  >
                    Android Only
                  </Button>
                </div>
              </div>


              {/* Build Button */}
              <Button
                onClick={handleBuild}
                disabled={!status?.isLoggedIn || buildMutation.isPending}
                className="w-full"
              >
                {buildMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Setting up keystores & building...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Build App
                  </>
                )}
              </Button>

              {/* Build Results */}
              {buildMutation.data && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      {buildMutation.data.success ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Build Started Successfully!</span>
                          </div>
                          {buildMutation.data.buildId && (
                            <div className="text-sm text-gray-600">
                              Build ID: <code className="bg-gray-100 px-1 rounded">{buildMutation.data.buildId}</code>
                            </div>
                          )}
                          {buildMutation.data.publicUrl && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Build URL:</span>
                              <Badge variant="outline" className="font-mono">
                                {buildMutation.data.publicUrl}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenUrl(buildMutation.data.publicUrl!)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {buildMutation.data.qrCode && (
                            <div className="text-sm text-gray-600">
                              QR Code available for testing
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Build Failed</span>
                        </div>
                      )}
                      {buildMutation.data.error && (
                        <div className="text-sm text-red-600">
                          Error: {buildMutation.data.error}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="deploy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deploy Web App</CardTitle>
              <CardDescription>
                Deploy your Expo web app to get a public URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canDeploy && (
                <Alert className="mb-4">
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        Deployment is only available for Pro users. Please upgrade to Pro tier to deploy your apps.
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            await IpcClient.getInstance().redirectToSubscribe();
                            toast.success("Opening subscription page in your browser...");
                          } catch (error: any) {
                            toast.error(error.message || "Failed to open subscription page");
                          }
                        }}
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        Upgrade to Pro
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleDeploy}
                disabled={!canDeploy || !status?.isLoggedIn || deployMutation.isPending}
                className="w-full"
              >
                {deployMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Deploy Web App
                  </>
                )}
              </Button>

              {/* Deploy Results */}
              {deployMutation.data && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      {deployMutation.data.success ? (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Deploy Completed!</span>
                          </div>
                          {deployMutation.data.publicUrl && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Public URL:</span>
                              <Badge variant="outline" className="font-mono">
                                {deployMutation.data.publicUrl}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenUrl(deployMutation.data.publicUrl!)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {deployMutation.data.qrCode && (
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4" />
                              <span className="text-sm">QR Code available</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Deploy Failed</span>
                        </div>
                      )}
                      {deployMutation.data.error && (
                        <div className="text-sm text-red-600">
                          Error: {deployMutation.data.error}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Projects Info */}
      {projects?.success && projects.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your EAS Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projects.projects.map((project) => (
                <div key={project.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 border rounded">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{project.name}</div>
                    <div className="text-sm text-gray-500 truncate">{project.slug}</div>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">{project.id}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
        
        <TabsContent value="local" className="space-y-4">
          <LocalBuildPanel appId={appId} appName={appName} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
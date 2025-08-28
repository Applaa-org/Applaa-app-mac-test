import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, LogOut, Settings, Globe } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { IpcClient } from "@/ipc/ipc_client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { showError, showSuccess } from "@/lib/toast";

import { ProviderSettingsHeader } from "./ProviderSettingsHeader";
import { ModelsSection } from "./ModelsSection";

interface GeminiAuthStatus {
  isAuthenticated: boolean;
  authMode?: "oauth" | "adc";
  projectId?: string;
  region?: string;
  email?: string;
  expiresAt?: number;
  error?: string;
}

export function GeminiSettings() {
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();

  const {
    data: allProviders,
    isLoading: providersLoading,
    error: providersError,
  } = useLanguageModelProviders();

  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<GeminiAuthStatus>({ isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [region, setRegion] = useState("us-central1");

  // Find the Gemini provider data
  const providerData = allProviders?.find((p) => p.id === "gemini");

  // Load auth status on mount
  useEffect(() => {
    loadAuthStatus();
  }, []);

  // Load Vertex AI config from settings
  useEffect(() => {
    if (settings?.gemini?.projectId) {
      setProjectId(settings.gemini.projectId);
    }
    if (settings?.gemini?.region) {
      setRegion(settings.gemini.region);
    }
  }, [settings]);

  const loadAuthStatus = async () => {
    try {
      setIsLoading(true);
      const status = await IpcClient.getInstance().geminiAuthStatus();
      setAuthStatus(status);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load authentication status");
      setAuthStatus({ isAuthenticated: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Start OAuth flow
      const { authUrl, codeVerifier } = await IpcClient.getInstance().geminiAuthLogin();
      
      // Open the auth URL in the system browser
      await IpcClient.getInstance().openExternalUrl(authUrl);
      
      // Show instructions to the user
      showSuccess("Please complete authentication in your browser. The authentication will be handled automatically.");
      
      // TODO: Implement proper OAuth callback server
      // For now, we'll show a message that this feature is in development
      setError("OAuth callback server is not yet implemented. This feature is currently in development.");
      
      // In a full implementation, we would:
      // 1. Start a local callback server on localhost:8080
      // 2. Listen for the OAuth callback
      // 3. Extract the authorization code
      // 4. Complete the OAuth flow automatically
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      showError(`Authentication failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await IpcClient.getInstance().geminiAuthLogout();
      setAuthStatus({ isAuthenticated: false });
      showSuccess("Successfully signed out");
    } catch (err: any) {
      setError(err.message || "Sign out failed");
      showError(`Sign out failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setIsLoading(true);
      await IpcClient.getInstance().geminiAuthRefresh();
      await loadAuthStatus();
      showSuccess("Token refreshed successfully");
    } catch (err: any) {
      setError(err.message || "Token refresh failed");
      showError(`Token refresh failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateVertexConfig = async () => {
    if (!projectId.trim()) {
      showError("Project ID is required for Vertex AI");
      return;
    }

    try {
      setIsLoading(true);
      await IpcClient.getInstance().geminiAuthUpdateVertexConfig({
        projectId: projectId.trim(),
        region: region.trim(),
      });
      showSuccess("Vertex AI configuration updated");
    } catch (err: any) {
      setError(err.message || "Failed to update Vertex AI configuration");
      showError(`Configuration update failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGemini = async (enabled: boolean) => {
    try {
      await updateSettings({ enableGemini: enabled });
      showSuccess(`Gemini integration ${enabled ? "enabled" : "disabled"}`);
    } catch (err: any) {
      showError(`Failed to toggle Gemini: ${err.message}`);
    }
  };

  const handleHealthCheck = async () => {
    try {
      setIsLoading(true);
      const health = await IpcClient.getInstance().geminiHealthCheck();
      
      if (health.status === "healthy") {
        showSuccess(`Gemini API is healthy (${health.authMode}, ${health.models} models available)`);
      } else {
        showError(`Gemini API is unhealthy: ${health.error}`);
      }
    } catch (err: any) {
      showError(`Health check failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (providersLoading || settingsLoading) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-10 w-1/2 mb-6" />
          <div className="space-y-4 mt-6">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (providersError || settingsError) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {providersError?.message || settingsError?.message || "Failed to load settings"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isConfigured = authStatus.isAuthenticated;

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-4xl mx-auto">
        <ProviderSettingsHeader
          providerDisplayName="Gemini (OAuth)"
          isConfigured={isConfigured}
          isLoading={isLoading}
          hasFreeTier={true}
          providerWebsiteUrl="https://console.cloud.google.com/"
          isApplaa={false}
          onBackClick={() => router.history.back()}
        />

        {/* Enable/Disable Gemini Integration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gemini Integration
            </CardTitle>
            <CardDescription>
              Enable Gemini integration to use Google's AI models with OAuth authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-gemini">Enable Gemini Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Access Gemini models through Google AI Studio or Vertex AI
                </p>
              </div>
              <Switch
                id="enable-gemini"
                checked={settings?.enableGemini || false}
                onCheckedChange={handleToggleGemini}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {settings?.enableGemini && (
          <>
            {/* Authentication Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Authentication Status
                </CardTitle>
                <CardDescription>
                  Sign in with your Google account to access Gemini models
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {authStatus.error?.includes("OAuth is not configured") && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Configuration Required</AlertTitle>
                    <AlertDescription>
                      Google OAuth credentials are not configured. This feature is currently in development.
                      <br />
                      <br />
                      To enable Gemini integration, you would need to:
                      <br />
                      1. Create a Google Cloud Project
                      <br />
                      2. Enable the Generative AI API
                      <br />
                      3. Set up OAuth 2.0 credentials
                      <br />
                      4. Configure environment variables
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {authStatus.isAuthenticated ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {authStatus.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                      </p>
                      {authStatus.email && (
                        <p className="text-sm text-muted-foreground">{authStatus.email}</p>
                      )}
                      {authStatus.authMode && (
                        <p className="text-sm text-muted-foreground">
                          Mode: {authStatus.authMode === "oauth" ? "OAuth 2.0" : "Application Default Credentials"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {authStatus.isAuthenticated ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshToken}
                          disabled={isLoading}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSignOut}
                          disabled={isLoading}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleSignIn} disabled={isLoading}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Sign In with Google
                      </Button>
                    )}
                  </div>
                </div>

                {authStatus.isAuthenticated && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleHealthCheck}
                      disabled={isLoading}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadAuthStatus}
                      disabled={isLoading}
                    >
                      Refresh Status
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vertex AI Configuration */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Vertex AI Configuration (Optional)</CardTitle>
                <CardDescription>
                  Configure Vertex AI settings to use Gemini models through Google Cloud Platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project-id">Project ID</Label>
                    <Input
                      id="project-id"
                      placeholder="my-gcp-project"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your Google Cloud Project ID
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      placeholder="us-central1"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Vertex AI region
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpdateVertexConfig}
                  disabled={isLoading || !projectId.trim()}
                  size="sm"
                >
                  Update Vertex AI Config
                </Button>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    If no Vertex AI configuration is provided, Gemini will use Google AI Studio by default.
                    Vertex AI requires a Google Cloud Project with billing enabled.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Models Section */}
            {providerData && authStatus.isAuthenticated && (
              <ModelsSection providerId="gemini" />
            )}
          </>
        )}

        <div className="h-24"></div>
      </div>
    </div>
  );
}

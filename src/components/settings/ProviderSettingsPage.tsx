import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {} from "@/components/ui/accordion";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { showError } from "@/lib/toast";
import { UserSettings } from "@/lib/schemas";

import { ProviderSettingsHeader } from "./ProviderSettingsHeader";
import { ApiKeyConfiguration } from "./ApiKeyConfiguration";
import { AzureConfiguration } from "./AzureConfiguration";
import { ModelsSection } from "./ModelsSection";

interface ProviderSettingsPageProps {
  provider: string;
}

export function ProviderSettingsPage({ provider }: ProviderSettingsPageProps) {
  const {
    settings,
    envVars,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();

  // Fetch all providers
  const {
    data: allProviders,
    isLoading: providersLoading,
    error: providersError,
  } = useLanguageModelProviders();

  // Find the specific provider data from the fetched list
  const providerData = allProviders?.find((p) => p.id === provider);
  const supportsCustomModels =
    providerData?.type === "custom" || providerData?.type === "cloud";

  const isApplaa = provider === "auto";

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Use fetched data (or defaults for Dyad)
  const providerDisplayName = isApplaa
    ? "Applaa"
    : (providerData?.name ?? "Unknown Provider");
  const providerWebsiteUrl = isApplaa
    ? "https://academy.dyad.sh/settings"
    : providerData?.websiteUrl;
  const hasFreeTier = isApplaa ? false : providerData?.hasFreeTier;
  const envVarName = isApplaa ? undefined : providerData?.envVarName;

  // Use provider ID (which is the 'provider' prop)
  const userApiKey = settings?.providerSettings?.[provider]?.apiKey?.value;
  const userApiBaseUrl = settings?.providerSettings?.[provider]?.apiBaseUrl?.value;
  
  // Check if this provider needs API Base URL (Azure OpenAI, Google Vertex AI, Amazon Bedrock)
  const needsApiBaseUrl = provider === "azure-openai" || provider === "google-vertex" || provider === "amazon-bedrock";

  // --- Configuration Logic --- Updated Priority ---
  const isValidUserKey =
    !!userApiKey &&
    !userApiKey.startsWith("Invalid Key") &&
    userApiKey !== "Not Set";
  const hasEnvKey = !!(envVarName && envVars[envVarName]);
  const hasValidApiBaseUrl = needsApiBaseUrl ? !!userApiBaseUrl : true; // Only required for Azure OpenAI

  // Special handling for Azure OpenAI configuration per Dyad commit #2ffbbbc
  const isAzureConfigured = 
    provider === "azure-openai" 
      ? !!(envVars["AZURE_API_KEY"] && envVars["AZURE_RESOURCE_NAME"])
      : false;

  const isConfigured = 
    provider === "azure-openai" 
      ? isAzureConfigured 
      : (isValidUserKey || hasEnvKey) && hasValidApiBaseUrl;

  // --- Save Handler ---
  const handleSaveKey = async () => {
    if (!apiKeyInput) {
      setSaveError("API Key cannot be empty.");
      return;
    }
    if (needsApiBaseUrl && !apiBaseUrlInput) {
      setSaveError("API Base URL is required for Azure OpenAI.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const providerSettings = {
        ...settings?.providerSettings?.[provider],
        apiKey: {
          value: apiKeyInput,
        },
      };
      
      // Add API Base URL if needed
      if (needsApiBaseUrl && apiBaseUrlInput) {
        providerSettings.apiBaseUrl = {
          value: apiBaseUrlInput,
        };
      }
      
      const settingsUpdate: Partial<UserSettings> = {
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: providerSettings,
        },
      };
      if (isApplaa) {
        settingsUpdate.enableApplaaPro = true;
      }
      await updateSettings(settingsUpdate);
      setApiKeyInput(""); // Clear input on success
      setApiBaseUrlInput(""); // Clear API Base URL input on success
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setSaveError(error.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteKey = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: {
            ...settings?.providerSettings?.[provider],
            apiKey: undefined,
          },
        },
      });
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      setSaveError(error.message || "Failed to delete API key.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Toggle Applaa Pro Handler ---
  const handleToggleApplaaPro = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      await updateSettings({
        enableApplaaPro: enabled,
      });
    } catch (error: any) {
      showError(`Error toggling Applaa Pro: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Azure-specific handlers ---
  const handleSaveAzureConfig = async (apiKey: string, resourceName: string) => {
    if (!apiKey || !resourceName) {
      setSaveError("API Key and Resource Name are both required.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const providerSettings = {
        ...settings?.providerSettings?.[provider],
        apiKey: {
          value: apiKey,
        },
        resourceName: {
          value: resourceName,
        },
      };
      
      const settingsUpdate: Partial<UserSettings> = {
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: providerSettings,
        },
      };
      
      await updateSettings(settingsUpdate);
      // Clear inputs on success - handled by parent component state
    } catch (error: any) {
      console.error("Error saving Azure settings:", error);
      setSaveError(error.message || "Failed to save Azure settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAzureConfig = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const settingsUpdate: Partial<UserSettings> = {
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: undefined, // Remove the Azure provider settings
        },
      };
      await updateSettings(settingsUpdate);
    } catch (error: any) {
      console.error("Error deleting Azure settings:", error);
      setSaveError(error.message || "Failed to delete Azure settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Effect to clear input error when input changes
  useEffect(() => {
    if (saveError) {
      setSaveError(null);
    }
  }, [apiKeyInput]);

  // --- Loading State for Providers ---
  if (providersLoading) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-10 w-1/2 mb-6" />
          <Skeleton className="h-10 w-48 mb-4" />
          <div className="space-y-4 mt-6">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error State for Providers ---
  if (providersError) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3 mb-6">
            Configure Provider
          </h1>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Provider Details</AlertTitle>
            <AlertDescription>
              Could not load provider data: {providersError.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Handle case where provider is not found (e.g., invalid ID in URL)
  if (!providerData && !isApplaa) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3 mb-6">
            Provider Not Found
          </h1>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              The provider with ID "{provider}" could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-4xl mx-auto">
        <ProviderSettingsHeader
          providerDisplayName={providerDisplayName}
          isConfigured={isConfigured}
          isLoading={settingsLoading}
          hasFreeTier={hasFreeTier}
          providerWebsiteUrl={providerWebsiteUrl}
          isApplaa={isApplaa}
          onBackClick={() => router.history.back()}
        />

        {settingsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : settingsError ? (
          <Alert variant="destructive">
            <AlertTitle>Error Loading Settings</AlertTitle>
            <AlertDescription>
              Could not load configuration data: {settingsError.message}
            </AlertDescription>
          </Alert>
        ) : provider === "azure-openai" ? (
          <AzureConfiguration 
            envVars={envVars}
            settings={settings}
            isSaving={isSaving}
            saveError={saveError}
            onSaveAzureConfig={handleSaveAzureConfig}
            onDeleteAzureConfig={handleDeleteAzureConfig}
          />
        ) : (
          <ApiKeyConfiguration
            provider={provider}
            providerDisplayName={providerDisplayName}
            settings={settings}
            envVars={envVars}
            envVarName={envVarName}
            isSaving={isSaving}
            saveError={saveError}
            apiKeyInput={apiKeyInput}
            onApiKeyInputChange={setApiKeyInput}
            onSaveKey={handleSaveKey}
            onDeleteKey={handleDeleteKey}
            isDyad={isApplaa}
            needsApiBaseUrl={needsApiBaseUrl}
            apiBaseUrlInput={apiBaseUrlInput}
            onApiBaseUrlInputChange={setApiBaseUrlInput}
          />
        )}

        {isApplaa && !settingsLoading && (
          <div className="mt-6 flex items-center justify-between p-4 bg-(--background-lightest) rounded-lg border">
            <div>
              <h3 className="font-medium">Enable Applaa Pro</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Unlock premium features and advanced AI capabilities
              </p>
            </div>
            <Switch
              checked={settings?.enableApplaaPro}
              onCheckedChange={handleToggleApplaaPro}
              disabled={isSaving}
            />
          </div>
        )}

        {/* Conditionally render CustomModelsSection */}
        {supportsCustomModels && providerData && (
          <ModelsSection providerId={providerData.id} />
        )}
        <div className="h-24"></div>
      </div>
    </div>
  );
}

/**
 * Enhanced Azure OpenAI Configuration Component
 * Based on Dyad commit #2ffbbbc - provides comprehensive Azure setup
 */

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, AlertCircle, CheckCircle2, ExternalLink, Save, Trash2 } from "lucide-react";

interface AzureConfigurationProps {
  envVars: Record<string, string>;
  settings?: any;
  isSaving?: boolean;
  saveError?: string | null;
  onSaveAzureConfig?: (apiKey: string, resourceName: string) => void;
  onDeleteAzureConfig?: () => void;
}

export function AzureConfiguration({ 
  envVars, 
  settings, 
  isSaving, 
  saveError, 
  onSaveAzureConfig, 
  onDeleteAzureConfig 
}: AzureConfigurationProps) {
  // Check if user has saved API key in settings
  const userApiKey = settings?.providerSettings?.["azure-openai"]?.apiKey?.value;
  const userResourceName = settings?.providerSettings?.["azure-openai"]?.resourceName?.value;
  
  // 🚨 FIX: Pre-populate form fields with saved values
  const [apiKeyInput, setApiKeyInput] = useState(userApiKey || "");
  const [resourceNameInput, setResourceNameInput] = useState(userResourceName || "");

  const azureApiKey = envVars["AZURE_API_KEY"];
  const azureResourceName = envVars["AZURE_RESOURCE_NAME"];
  
  // Update form fields when settings change (e.g., after save or load)
  useEffect(() => {
    console.log('[AzureConfiguration] Settings updated:', { userApiKey: !!userApiKey, userResourceName });
    setApiKeyInput(userApiKey || "");
    setResourceNameInput(userResourceName || "");
  }, [userApiKey, userResourceName]);
  
  const isAzureConfigured = !!(azureApiKey && azureResourceName) || !!(userApiKey && userResourceName);
  
  const handleSave = async () => {
    if (onSaveAzureConfig && apiKeyInput && resourceNameInput) {
      try {
        await onSaveAzureConfig(apiKeyInput, resourceNameInput);
        // Clear inputs after successful save - they'll be repopulated by useEffect
        setApiKeyInput("");
        setResourceNameInput("");
      } catch (error) {
        // Error handling is done by parent component
        console.error("Error saving Azure configuration:", error);
      }
    }
  };

  const handleDelete = () => {
    if (onDeleteAzureConfig) {
      onDeleteAzureConfig();
    }
  };
  
  const getStatusBadge = (value: string | undefined, label: string) => {
    if (value) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {label} Set
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400">
        <AlertCircle className="h-3 w-3 mr-1" />
        {label} Not Set
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Azure OpenAI Configuration</h3>
        {isAzureConfigured && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Configured
          </Badge>
        )}
      </div>

      {/* API Key Input Section */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
        <h4 className="font-medium text-gray-900 dark:text-white">Configure Azure OpenAI</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="azure-api-key">Azure API Key</Label>
            <Input
              id="azure-api-key"
              type="password"
              placeholder="Enter your Azure OpenAI API key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              disabled={isSaving}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="azure-resource-name">Azure Resource Name</Label>
            <Input
              id="azure-resource-name"
              type="text"
              placeholder="Enter your Azure OpenAI resource name"
              value={resourceNameInput}
              onChange={(e) => setResourceNameInput(e.target.value)}
              disabled={isSaving}
            />
          </div>
          

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!apiKeyInput || !resourceNameInput || isSaving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
            
            {(userApiKey || userResourceName) && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={isSaving}
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Current Configuration Status */}
      {(userApiKey || userResourceName) && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Current Configuration</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">API Key:</span>
              {getStatusBadge(userApiKey, "API Key")}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">Resource Name:</span>
              {getStatusBadge(userResourceName, "Resource")}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
              {userResourceName && (
                <div>Resource: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">{userResourceName}</code></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Azure OpenAI Setup
        </h4>
        <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
          <p>1. Go to <strong>Azure Portal</strong> → Your OpenAI Resource</p>
          <p>2. Copy your <strong>API Key</strong> from the Keys section</p>
          <p>3. Copy your <strong>Resource Name</strong> from the resource overview</p>
          <p>4. The model name (like gpt-5-chat) will be used automatically based on your selection</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="azure-config">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Environment Variables (Alternative)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">AZURE_API_KEY</code>
                    <p className="text-xs text-muted-foreground mt-1">Your Azure OpenAI API key</p>
                  </div>
                  {getStatusBadge(azureApiKey, "API Key")}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">AZURE_RESOURCE_NAME</code>
                    <p className="text-xs text-muted-foreground mt-1">Your Azure OpenAI resource name</p>
                  </div>
                  {getStatusBadge(azureResourceName, "Resource Name")}
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-700">
                <h5 className="font-medium mb-2 text-blue-900 dark:text-blue-200">
                  How to configure:
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
                  <li>Get your API key from the Azure portal</li>
                  <li>Find your resource name (the name you gave your Azure OpenAI resource)</li>
                  <li>Set these environment variables before starting Applaa</li>
                  <li>Restart Applaa after setting the environment variables</li>
                </ol>
                
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">Quick setup commands:</p>
                  <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded text-xs font-mono">
                    <div>export AZURE_API_KEY="your-api-key-here"</div>
                    <div>export AZURE_RESOURCE_NAME="your-resource-name"</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href="https://portal.azure.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Open Azure Portal
                </a>
              </div>

              {isAzureConfigured && (
                <Alert>
                  <KeyRound className="h-4 w-4" />
                  <AlertTitle>Azure OpenAI Configured</AlertTitle>
                  <AlertDescription>
                    Both required environment variables are set. You can now use Azure OpenAI models 
                    including GPT-4, GPT-3.5-turbo, and other deployed models.
                  </AlertDescription>
                </Alert>
              )}

              {!isAzureConfigured && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Configuration Required</AlertTitle>
                  <AlertDescription>
                    Please set both AZURE_API_KEY and AZURE_RESOURCE_NAME environment variables 
                    to use Azure OpenAI models.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

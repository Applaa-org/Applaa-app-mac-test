import { LanguageModelV1 } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI as createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOllama } from "ollama-ai-provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzure } from "@ai-sdk/azure";
import type { LargeLanguageModel, UserSettings } from "../../lib/schemas";
import { getEnvVar } from "./read_env";
import log from "electron-log";
import { getLanguageModelProviders } from "../shared/language_model_helpers";
import { LanguageModelProvider } from "../ipc_types";
import { createDyadEngine } from "./llm_engine_provider";

import { LM_STUDIO_BASE_URL } from "./lm_studio_utils";

const dyadEngineUrl = process.env.DYAD_ENGINE_URL;
const dyadGatewayUrl = process.env.DYAD_GATEWAY_URL;

const AUTO_MODELS = [
  // Prefer Azure router model if Azure credentials are present
  {
    provider: "azure-openai",
    name: "model-router",
  },
  {
    provider: "google",
    name: "gemini-2.5-flash",
  },
  {
    provider: "anthropic",
    name: "claude-sonnet-4-20250514",
  },
  {
    provider: "openai",
    name: "gpt-4.1",
  },
];

export interface ModelClient {
  model: LanguageModelV1;
  builtinProviderId?: string;
}

interface File {
  path: string;
  content: string;
}

const logger = log.scope("getModelClient");
export async function getModelClient(
  model: LargeLanguageModel,
  settings: UserSettings,
  files?: File[],
): Promise<{
  modelClient: ModelClient;
  isEngineEnabled?: boolean;
}> {
  logger.info(`🚨🚨🚨 getModelClient CALLED - Provider: ${model.provider}, Model: ${model.name}`);
  
  const allProviders = await getLanguageModelProviders();

  const dyadApiKey = settings.providerSettings?.auto?.apiKey?.value;
  
  // 🔧 DEBUG: Log API key availability for debugging
  logger.info(`🔍 API Key Debug - Provider: ${model.provider}`);
  logger.info(`🔍 Applaa Pro enabled: ${settings.enableApplaaPro}`);
  logger.info(`🔍 Auto API key present: ${!!dyadApiKey}`);
  if (settings.providerSettings?.[model.provider]?.apiKey?.value) {
    logger.info(`🔍 Direct provider API key present: YES`);
  } else {
    logger.info(`🔍 Direct provider API key present: NO`);
  }

  // --- Handle specific provider ---
  const providerConfig = allProviders.find((p) => p.id === model.provider);

  if (!providerConfig) {
    throw new Error(`Configuration not found for provider: ${model.provider}`);
  }

  // 🔧 APPLAA PRO: Handle Applaa Pro override with proper fallback
  if (settings.enableApplaaPro) {
    if (!dyadApiKey) {
      logger.warn(
        `🚨 Applaa Pro is enabled but no 'auto' provider API key found. Falling back to direct provider: ${model.provider}`
      );
      logger.info(`🔧 FALLBACK: Using direct provider API key for ${model.provider}`);
      // Fall through to regular provider logic - this should work
    } else if (providerConfig.gatewayPrefix != null || dyadEngineUrl) {
      // Check if the selected provider supports Applaa Pro (has a gateway prefix) OR
      // we're using local engine.
      // IMPORTANT: some providers like OpenAI have an empty string gateway prefix,
      // so we do a nullish and not a truthy check here.
      // Spark features require Applaa Pro to be enabled
      const hasApplaaPro = settings.enableApplaaPro === true;
      const isEngineEnabled = hasApplaaPro && (
        settings.enableProSmartFilesContextMode ||
        settings.enableProLazyEditsMode
      );
      const provider = isEngineEnabled
        ? createDyadEngine({
            apiKey: dyadApiKey,
            baseURL: dyadEngineUrl ?? "https://engine.applaa.dev/v1",
            originalProviderId: model.provider,
            dyadOptions: {
              enableLazyEdits:
                settings.selectedChatMode === "ask"
                  ? false
                  : (hasApplaaPro && settings.enableProLazyEditsMode),
              enableSmartFilesContext: hasApplaaPro && settings.enableProSmartFilesContextMode,
            },
            settings,
          })
        : createOpenAICompatible({
            name: "dyad-gateway",
            apiKey: dyadApiKey,
            baseURL: dyadGatewayUrl ?? "https://llm-gateway.applaa.dev/v1",
          });

      logger.info(
        `\x1b[1;97;44m Using Applaa Pro API key for model: ${model.name}. engine_enabled=${isEngineEnabled} \x1b[0m`,
      );
      if (isEngineEnabled) {
        logger.info(
          `\x1b[1;30;42m Using Applaa Pro engine: ${dyadEngineUrl ?? "<prod>"} \x1b[0m`,
        );
      } else {
        logger.info(
          `\x1b[1;30;43m Using Applaa Pro gateway: ${dyadGatewayUrl ?? "<prod>"} \x1b[0m`,
        );
      }
      // Do not use free variant (for openrouter).
      const modelName = model.name.split(":free")[0];
      const autoModelClient = {
        model: provider(
          `${providerConfig.gatewayPrefix || ""}${modelName}`,
          isEngineEnabled
            ? {
                files,
              }
            : undefined,
        ),
        builtinProviderId: model.provider,
      };

      return {
        modelClient: autoModelClient,
        isEngineEnabled,
      };
    } else {
      logger.warn(
        `Applaa Pro enabled, but provider ${model.provider} does not have a gateway prefix defined. Falling back to direct provider connection.`,
      );
      // Fall through to regular provider logic if gateway prefix is missing
    }
  }
  // Handle 'auto' provider by trying each model in AUTO_MODELS until one works
  if (model.provider === "auto") {
    for (const autoModel of AUTO_MODELS) {
      const providerInfo = allProviders.find(
        (p) => p.id === autoModel.provider,
      );
      const envVarName = providerInfo?.envVarName;

      const apiKey =
        settings.providerSettings?.[autoModel.provider]?.apiKey?.value ||
        // Only load environment variables in development, never in packaged apps
        (envVarName && process.env.NODE_ENV === 'development' && !process.resourcesPath && !process.defaultApp ? getEnvVar(envVarName) : undefined);

      if (apiKey) {
        logger.log(
          `Using provider: ${autoModel.provider} model: ${autoModel.name}`,
        );
        // Recursively call with the specific model found
        return await getModelClient(
          {
            provider: autoModel.provider,
            name: autoModel.name,
          },
          settings,
          files,
        );
      }
    }
    // If no models have API keys, throw an error
    throw new Error(
      "No API keys available for any model supported by the 'auto' provider.",
    );
  }
  return getRegularModelClient(model, settings, providerConfig);
}

function getRegularModelClient(
  model: LargeLanguageModel,
  settings: UserSettings,
  providerConfig: LanguageModelProvider,
) {
  // Get API key for the specific provider
  const apiKey =
    settings.providerSettings?.[model.provider]?.apiKey?.value ||
    // Only load environment variables in development, never in packaged apps
    (providerConfig.envVarName && process.env.NODE_ENV === 'development' && !process.resourcesPath && !process.defaultApp
      ? getEnvVar(providerConfig.envVarName)
      : undefined);

  // 🔧 DEBUG: Log what API key we're actually using
  logger.info(`🔑 Regular provider ${model.provider} - API key present: ${!!apiKey}`);
  if (apiKey) {
    logger.info(`🔑 API key length: ${apiKey.length} chars, starts with: ${apiKey.substring(0, 8)}...`);
  } else {
    logger.error(`❌ NO API KEY found for provider: ${model.provider}`);
  }

  const providerId = providerConfig.id;
  // Create client based on provider ID or type
  switch (providerId) {
    case "openai": {
      const provider = createOpenAI({ apiKey });
      return {
        modelClient: {
          model: provider.responses(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "anthropic": {
      const provider = createAnthropic({ 
        apiKey,
        headers: {
          'anthropic-beta': 'prompt-caching-2024-07-31'
        }
      });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "google": {
      const provider = createGoogle({ apiKey });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "openrouter": {
      // Check if it's an Anthropic model via OpenRouter for caching support
      const isAnthropicModel = model.name.startsWith('anthropic/');
      const headers: Record<string, string> = {};
      if (isAnthropicModel) {
        headers['anthropic-beta'] = 'prompt-caching-2024-07-31';
      }
      
      const provider = createOpenRouter({ 
        apiKey,
        headers
      });
      return {
        modelClient: {
          model: provider(model.name),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    case "ollama": {
      // Ollama typically runs locally and doesn't require an API key in the same way
      const provider = createOllama({
        baseURL: process.env.OLLAMA_HOST,
      });
      return {
        modelClient: {
          model: provider(model.name),
        },
        backupModelClients: [],
      };
    }
    case "lmstudio": {
      // LM Studio uses OpenAI compatible API
      const baseURL = providerConfig.apiBaseUrl || LM_STUDIO_BASE_URL + "/v1";
      const provider = createOpenAICompatible({
        name: "lmstudio",
        baseURL,
      });
      return {
        modelClient: {
          model: provider(model.name),
        },
        backupModelClients: [],
      };
    }
    case "azure-openai": {
      // Enhanced Azure OpenAI support with comprehensive environment variable support
      // Support both environment variables and user settings
      const azureApiKey = apiKey || getEnvVar("AZURE_API_KEY");
      const azureResourceName = settings.providerSettings?.[providerId]?.resourceName?.value || getEnvVar("AZURE_RESOURCE_NAME");
      const azureDeploymentName = settings.providerSettings?.[providerId]?.deploymentName?.value || getEnvVar("AZURE_DEPLOYMENT_NAME");
      const azureApiVersion = settings.providerSettings?.[providerId]?.apiVersion?.value || getEnvVar("AZURE_API_VERSION") || "2024-02-01";
      const azureEndpoint = settings.providerSettings?.[providerId]?.endpoint?.value || getEnvVar("AZURE_ENDPOINT");
      
      // 🚨 DEBUG: Log all configuration values for troubleshooting
      logger.info(`🔵 Azure OpenAI Configuration Debug:`);
      logger.info(`  - Model name from selection: ${model.name}`);
      logger.info(`  - API Key present: ${!!azureApiKey} (length: ${azureApiKey?.length || 0})`);
      logger.info(`  - Resource Name: ${azureResourceName || 'NOT SET'}`);
      logger.info(`  - Deployment Name (from settings): ${azureDeploymentName || 'NOT SET'}`);
      logger.info(`  - Endpoint: ${azureEndpoint || 'NOT SET'}`);
      logger.info(`  - API Version: ${azureApiVersion}`);
      
      if (!azureApiKey) {
        throw new Error(
          `Azure OpenAI provider is missing the API key. Please set AZURE_API_KEY environment variable or configure it in provider settings.`,
        );
      }
      
      // 🚨 FIX: Use either endpoint OR resourceName, not both (they conflict in Azure SDK)
      // If endpoint is provided, use it as baseURL and don't set resourceName
      // If endpoint is not provided, use resourceName to construct standard URL
      const azureConfig: any = {
        apiKey: azureApiKey,
        apiVersion: azureApiVersion,
      };
      
      if (azureEndpoint) {
        // Normalize endpoint: remove trailing slash and /openai path if present
        // Should be: https://resource-name.openai.azure.com (no trailing slash, no /openai)
        let normalizedEndpoint = azureEndpoint.trim();
        if (normalizedEndpoint.endsWith('/')) {
          normalizedEndpoint = normalizedEndpoint.slice(0, -1);
        }
        // Remove /openai path if present (SDK will add it)
        normalizedEndpoint = normalizedEndpoint.replace(/\/openai\/?$/, '');
        
        azureConfig.baseURL = normalizedEndpoint;
        logger.info(`🔵 Azure OpenAI using custom endpoint: ${normalizedEndpoint}`);
      } else if (azureResourceName) {
        // Use resourceName to construct standard Azure OpenAI endpoint
        azureConfig.resourceName = azureResourceName;
        logger.info(`🔵 Azure OpenAI using resource name: ${azureResourceName}`);
      } else {
        throw new Error(
          `Azure OpenAI provider requires either AZURE_RESOURCE_NAME or AZURE_ENDPOINT. Please configure one of these in provider settings.`,
        );
      }
      
      const provider = createAzure(azureConfig);
      
      // 🚨 CRITICAL: Use deployment name if provided, otherwise use model name
      // The deployment name MUST match exactly what's configured in Azure Portal
      const finalDeploymentName = azureDeploymentName || model.name;
      
      logger.info(`🔵 Azure OpenAI Final Configuration:`);
      logger.info(`  - Final Deployment Name: "${finalDeploymentName}"`);
      logger.info(`  - API Version: ${azureApiVersion}`);
      if (azureEndpoint) {
        const fullUrl = `${azureConfig.baseURL}/openai/deployments/${finalDeploymentName}/chat/completions?api-version=${azureApiVersion}`;
        logger.info(`  - Full Endpoint URL: ${fullUrl}`);
      } else {
        const fullUrl = `https://${azureResourceName}.openai.azure.com/openai/deployments/${finalDeploymentName}/chat/completions?api-version=${azureApiVersion}`;
        logger.info(`  - Full Endpoint URL: ${fullUrl}`);
      }
      logger.info(`  - ⚠️  IMPORTANT: The deployment name "${finalDeploymentName}" must exist in Azure Portal and match exactly (case-sensitive)`);
      
      return {
        modelClient: {
          model: provider(finalDeploymentName),
          builtinProviderId: providerId,
        },
        backupModelClients: [],
      };
    }
    default: {
      // Handle custom providers
      if (providerConfig.type === "custom") {
        if (!providerConfig.apiBaseUrl) {
          throw new Error(
            `Custom provider ${model.provider} is missing the API Base URL.`,
          );
        }
        // Assume custom providers are OpenAI compatible for now
        const provider = createOpenAICompatible({
          name: providerConfig.id,
          baseURL: providerConfig.apiBaseUrl,
          apiKey,
        });
        return {
          modelClient: {
            model: provider(model.name),
          },
          backupModelClients: [],
        };
      }
      // If it's not a known ID and not type 'custom', it's unsupported
      throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }
}

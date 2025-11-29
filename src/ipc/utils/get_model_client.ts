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
      // Azure OpenAI with per-model base URLs - only API key required
      const azureApiKey = apiKey || getEnvVar("AZURE_API_KEY");
      
      if (!azureApiKey) {
        throw new Error(
          `Azure OpenAI provider is missing the API key. Please set AZURE_API_KEY environment variable or configure it in provider settings.`,
        );
      }
      
      // Per-model base URL and API version configuration
      // Each model uses its specific base URL as provided by the user
      // Only models with provided base URLs are configured
      const modelConfigs: Record<string, { baseURL: string; apiVersion: string; useAnthropicFormat?: boolean }> = {
        // Standard Azure OpenAI models - all use the same base URL
        "gpt-4": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "gpt-4.1-mini": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "gpt-4o": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "gpt-4o-mini": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "gpt-5-chat": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "gpt-5-nano": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "model-router": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "o1": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "o4-mini": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-01-01-preview",
        },
        "grok-4-fast-reasoning": {
          baseURL: "https://applaa-qa.services.ai.azure.com",
          apiVersion: "2024-05-01-preview",
          useModelsEndpoint: true, // Uses /models/chat/completions instead of /openai/deployments/{deployment}/chat/completions
        },
        "gpt-5.1-chat": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2025-04-01-preview",
          useResponsesEndpoint: true, // Uses /openai/responses instead of /openai/deployments/{deployment}/chat/completions
        },
      };
      
      const modelConfig = modelConfigs[model.name];
      
      if (!modelConfig) {
        throw new Error(
          `Azure OpenAI model "${model.name}" is not configured. Available models: ${Object.keys(modelConfigs).join(", ")}`,
        );
      }
      
      logger.info(`🔵 Azure OpenAI Configuration:`);
      logger.info(`  - Model: ${model.name}`);
      logger.info(`  - Base URL: ${modelConfig.baseURL}`);
      logger.info(`  - API Version: ${modelConfig.apiVersion}`);
      logger.info(`  - Deployment Name: ${model.name}`);
      
      // For Anthropic format (Claude), use OpenAI compatible with custom endpoint
      if (modelConfig.useAnthropicFormat) {
        const fullUrl = `${modelConfig.baseURL}/messages`;
        logger.info(`  - Full Endpoint URL: ${fullUrl}`);
        logger.info(`  - Using Anthropic-compatible format`);
        logger.info(`  - API Key present: ${!!azureApiKey} (length: ${azureApiKey?.length || 0})`);
        logger.info(`  - Model name: ${model.name}`);
        
        // Azure Anthropic endpoint - the model name in the request might need to be different
        // For Azure Anthropic endpoints, we might need to use just the model identifier without the full name
        // Try using "claude-sonnet-4-20250514" or potentially just the base model name
        // The deployment name in Azure might be different from the model name
        const anthropicModelName = model.name; // Use the model name as-is first
        
        const anthropicProvider = createOpenAICompatible({
          baseURL: modelConfig.baseURL,
          apiKey: azureApiKey,
          headers: {
            "api-key": azureApiKey, // Azure requires api-key header
            "x-api-key": azureApiKey, // Also try x-api-key for Anthropic endpoints
          },
          fetch: async (url, options) => {
            logger.info(`  - 🔵 Claude Original SDK URL: ${url}`);
            
            // Ensure we're using the correct endpoint
            const anthropicUrl = url.includes('/messages') ? url : `${modelConfig.baseURL}/messages`;
            logger.info(`  - ✅ Claude URL: ${anthropicUrl}`);
            
            // Modify request body to use correct model name if needed
            let modifiedOptions = { ...options };
            if (options?.body) {
              try {
                let bodyText: string;
                if (typeof options.body === 'string') {
                  bodyText = options.body;
                } else if (options.body instanceof ReadableStream) {
                  bodyText = await new Response(options.body).text();
                } else if (options.body instanceof Blob) {
                  bodyText = await options.body.text();
                } else {
                  bodyText = String(options.body);
                }
                
                const bodyJson = JSON.parse(bodyText);
                logger.info(`  - 📋 Claude Request body model: ${bodyJson.model || 'not set'}`);
                
                // For Azure Anthropic endpoints, the model name in the body should match the deployment
                // If the deployment name is different, we might need to adjust it here
                // For now, keep the model name as-is and let Azure handle it
                
                modifiedOptions.body = JSON.stringify(bodyJson);
                if (modifiedOptions.headers) {
                  const headers = modifiedOptions.headers as Record<string, string>;
                  if (headers['content-length']) {
                    headers['content-length'] = String(modifiedOptions.body.length);
                  }
                }
              } catch (e) {
                logger.warn(`  - ⚠️  Could not modify Claude request body: ${e}`);
              }
            }
            
            // Ensure headers are set correctly
            if (modifiedOptions.headers) {
              const headers = modifiedOptions.headers as Record<string, string>;
              headers['api-key'] = azureApiKey;
              headers['x-api-key'] = azureApiKey;
              // Remove Authorization header if present (Azure uses api-key instead)
              delete headers['authorization'];
              logger.info(`  - 📤 Claude Headers: api-key=${headers['api-key'] ? 'SET' : 'NOT SET'}, x-api-key=${headers['x-api-key'] ? 'SET' : 'NOT SET'}`);
            }
            
            const response = await fetch(anthropicUrl, modifiedOptions);
            logger.info(`  - 📥 Claude Response status: ${response.status} ${response.statusText}`);
            if (!response.ok) {
              const responseText = await response.clone().text();
              logger.error(`  - ❌ Claude Error response body: ${responseText.substring(0, 1000)}`);
            }
            return response;
          },
        });
        
        // For Anthropic, we use the model name directly
        // Note: The actual deployment name in Azure might be different
        // If this fails, check Azure Portal for the correct deployment name
        return {
          modelClient: {
            model: anthropicProvider(anthropicModelName),
            builtinProviderId: providerId,
          },
          backupModelClients: [],
        };
      }
      
      // For standard Azure OpenAI models, use OpenAI compatible with custom baseURL and Azure auth headers
      // Azure OpenAI requires 'api-key' header and uses /openai/deployments/{deployment}/chat/completions path
      const expectedUrl = `${modelConfig.baseURL}/openai/deployments/${model.name}/chat/completions?api-version=${modelConfig.apiVersion}`;
      logger.info(`  - Expected Endpoint URL: ${expectedUrl}`);
      logger.info(`  - Using OpenAI-compatible format with Azure authentication`);
      
      // Store deployment name and API version for use in fetch function
      const deploymentName = model.name;
      const apiVersion = modelConfig.apiVersion;
      const baseUrl = modelConfig.baseURL;
      
      // Models that require max_completion_tokens instead of max_tokens
      const modelsRequiringMaxCompletionTokens = ['gpt-5-nano', 'o1', 'o4-mini'];
      const needsMaxCompletionTokens = modelsRequiringMaxCompletionTokens.includes(model.name);
      
      // Models that don't support temperature parameter (O1)
      const modelsNotSupportingTemperature = ['o1'];
      const shouldRemoveTemperature = modelsNotSupportingTemperature.includes(model.name);
      
      // Models that only support temperature = 1 (O4 Mini)
      const modelsRequiringTemperatureOne = ['o4-mini'];
      const needsTemperatureOne = modelsRequiringTemperatureOne.includes(model.name);
      
      // Use OpenAI compatible provider with Azure-specific headers and URL rewriting
      // The SDK will construct a URL, but we need to completely rewrite it to Azure format
      const azureProvider = createOpenAICompatible({
        baseURL: baseUrl, // Use just the base URL, we'll rewrite the entire path
        apiKey: azureApiKey,
        headers: {
          "api-key": azureApiKey, // Azure OpenAI requires api-key header instead of Authorization
        },
        fetch: async (url, options) => {
          // Log the original URL before rewriting
          logger.info(`  - 🔵 Original SDK URL: ${url}`);
          
          // Construct the correct Azure OpenAI URL
          const azureUrl = `${baseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
          logger.info(`  - ✅ Rewriting to Azure URL: ${azureUrl}`);
          
          // Modify request body for model-specific requirements
          let modifiedOptions = { ...options };
          if ((needsMaxCompletionTokens || shouldRemoveTemperature || needsTemperatureOne) && options?.body) {
            try {
              let bodyText: string;
              if (typeof options.body === 'string') {
                bodyText = options.body;
              } else if (options.body instanceof ReadableStream) {
                // For streams, we need to read and reconstruct
                bodyText = await new Response(options.body).text();
              } else if (options.body instanceof Blob) {
                bodyText = await options.body.text();
              } else {
                // Try to convert to string
                bodyText = String(options.body);
              }
              
              const bodyJson = JSON.parse(bodyText);
              let bodyModified = false;
              
              // Replace max_tokens with max_completion_tokens if needed
              if (needsMaxCompletionTokens && bodyJson.max_tokens !== undefined) {
                logger.info(`  - 🔄 Converting max_tokens (${bodyJson.max_tokens}) to max_completion_tokens for ${model.name}`);
                bodyJson.max_completion_tokens = bodyJson.max_tokens;
                delete bodyJson.max_tokens;
                bodyModified = true;
              }
              
              // Remove temperature parameter for O1 (not supported)
              if (shouldRemoveTemperature && bodyJson.temperature !== undefined) {
                logger.info(`  - 🔄 Removing temperature parameter for ${model.name} (not supported)`);
                delete bodyJson.temperature;
                bodyModified = true;
              }
              
              // Set temperature to 1 for O4 Mini (only default value supported)
              if (needsTemperatureOne) {
                if (bodyJson.temperature !== undefined && bodyJson.temperature !== 1) {
                  logger.info(`  - 🔄 Setting temperature to 1 for ${model.name} (only default value supported, was ${bodyJson.temperature})`);
                  bodyJson.temperature = 1;
                  bodyModified = true;
                } else if (bodyJson.temperature === undefined) {
                  logger.info(`  - 🔄 Setting temperature to 1 for ${model.name} (default required)`);
                  bodyJson.temperature = 1;
                  bodyModified = true;
                }
              }
              
              // Update the body if modified
              if (bodyModified) {
                modifiedOptions.body = JSON.stringify(bodyJson);
                // Update content-length if present
                if (modifiedOptions.headers) {
                  const headers = modifiedOptions.headers as Record<string, string>;
                  if (headers['content-length']) {
                    headers['content-length'] = String(modifiedOptions.body.length);
                  }
                }
                logger.info(`  - ✅ Request body modified for ${model.name}`);
              }
            } catch (e) {
              logger.warn(`  - ⚠️  Could not modify request body: ${e}`);
              // If modification fails, use original options
              modifiedOptions = options;
            }
          }
          
          // Log headers being sent
          if (modifiedOptions?.headers) {
            const headers = modifiedOptions.headers as Record<string, string>;
            const headerKeys = Object.keys(headers);
            logger.info(`  - 📤 Request headers: ${headerKeys.join(', ')}`);
            logger.info(`  - 📤 api-key header: ${headers['api-key'] ? 'SET (' + headers['api-key'].length + ' chars)' : 'NOT SET'}`);
          }
          
          // Make the request with the correct Azure URL
          // Add timeout and better error handling
          try {
            const response = await fetch(azureUrl, modifiedOptions);
            
            // Log response status
            logger.info(`  - 📥 Response status: ${response.status} ${response.statusText}`);
            if (!response.ok) {
              const responseText = await response.clone().text();
              logger.error(`  - ❌ Error response body: ${responseText.substring(0, 500)}`);
            }
            
            return response;
          } catch (error: any) {
            // Handle specific error types
            if (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('terminated')) {
              logger.warn(`  - ⚠️  Request was aborted/terminated: ${error.message}`);
              // Re-throw as a more descriptive error
              throw new Error(`Request was cancelled or terminated: ${error.message || 'Connection aborted'}`);
            } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
              logger.error(`  - ❌ Network timeout or connection reset: ${error.message}`);
              throw new Error(`Network error: Request timed out or connection was reset. Please try again.`);
            } else if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
              logger.error(`  - ❌ Network error: ${error.message}`);
              throw new Error(`Network error: Unable to connect to Azure OpenAI. Please check your internet connection and try again.`);
            } else {
              logger.error(`  - ❌ Unexpected fetch error: ${error.message || error}`);
              throw error;
            }
          }
        },
      });
      
      logger.info(`✅ Azure OpenAI model client created successfully`);
      logger.info(`  - Deployment name: ${deploymentName}`);
      logger.info(`  - API version: ${apiVersion}`);
      logger.info(`  - Base URL: ${baseUrl}`);
      
      return {
        modelClient: {
          model: azureProvider(model.name), // Model name is used for logging, actual deployment is in fetch URL
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

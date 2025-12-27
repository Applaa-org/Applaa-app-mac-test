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
    name: "gemini-1.5-flash-latest",
  },
  {
    provider: "google",
    name: "gemini-1.5-flash",
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
      logger.info(`🔍 Initializing Google provider for model: ${model.name}`);
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
      const modelConfigs: Record<string, { baseURL: string; apiVersion: string; useAnthropicFormat?: boolean; useOpenAIv1Endpoint?: boolean; skipApiVersion?: boolean }> = {
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
          apiVersion: "", // Empty - /openai/v1/ endpoint doesn't use api-version parameter
          // Use /openai/v1/chat/completions endpoint (matching user's example)
          // User's example: baseURL: "https://applaa-qa.services.ai.azure.com/openai/v1/"
          // SDK appends /chat/completions, so full URL: /openai/v1/chat/completions
          useOpenAIv1Endpoint: true, // Flag to use /openai/v1/chat/completions instead of /openai/deployments/...
          skipApiVersion: true, // Don't append ?api-version= query parameter
        },
        "gpt-5.1-chat": {
          baseURL: "https://applaa-qa.cognitiveservices.azure.com",
          apiVersion: "2024-04-01-preview", // Updated to match user's example code
          // Use standard chat completions endpoint (not Responses API)
          // Based on user's example: client.chat.completions.create uses standard endpoint
        },
        "claude-sonnet-4-5": {
          baseURL: "https://applaa-qa.openai.azure.com/anthropic", // Azure Anthropic endpoint
          apiVersion: "2024-05-01-preview", // Not used in URL for Anthropic format
          useAnthropicFormat: true, // Uses Anthropic /messages endpoint
          // Model name is sent in request body
        },
        "claude-opus-4-5": {
          baseURL: "https://applaa-qa.openai.azure.com/anthropic", // Azure Anthropic endpoint
          apiVersion: "2024-05-01-preview", // Not used in URL for Anthropic format
          useAnthropicFormat: true, // Uses Anthropic /messages endpoint
          // Model name is sent in request body
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
      if (model.name === 'gpt-5.1-chat') {
        logger.info(`  - 🎯 GPT-5.1 Chat: Using standard endpoint with max_completion_tokens`);
      }
      if (model.name === 'grok-4-fast-reasoning') {
        logger.info(`  - 🎯 Grok-4-Fast-Reasoning: Using OpenAI v1 endpoint (/openai/v1/chat/completions)`);
      }

      // For Anthropic format (Claude), use OpenAI compatible with custom endpoint
      if (modelConfig.useAnthropicFormat) {
        // Anthropic SDK uses /v1/messages endpoint
        // Base URL should be the endpoint without /v1, SDK will add it
        // But for Azure, we need to construct the full path: /anthropic/v1/messages
        const fullUrl = `${modelConfig.baseURL}/v1/messages`;
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
          baseURL: modelConfig.baseURL, // Base URL: https://applaa-qa.openai.azure.com/anthropic
          apiKey: azureApiKey,
          headers: {
            "api-key": azureApiKey, // Azure requires api-key header
            "x-api-key": azureApiKey, // Also try x-api-key for Anthropic endpoints
            "anthropic-version": "2023-06-01", // Anthropic API version header
          },
          fetch: async (url, options) => {
            logger.info(`  - 🔵 Claude Original SDK URL: ${url}`);

            // Ensure we're using the correct endpoint with /v1/messages
            // The SDK might construct different paths, so we override it
            let anthropicUrl: string;
            if (url.includes('/v1/messages')) {
              anthropicUrl = url;
            } else if (url.includes('/messages')) {
              // If SDK constructed /messages, replace with /v1/messages
              anthropicUrl = url.replace('/messages', '/v1/messages');
            } else {
              // Construct the full path: baseURL/v1/messages
              anthropicUrl = `${modelConfig.baseURL}/v1/messages`;
            }
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
                logger.info(`  - 📋 Claude Request body preview (before modification): ${JSON.stringify({
                  model: bodyJson.model,
                  max_tokens: bodyJson.max_tokens,
                  temperature: bodyJson.temperature,
                  messages_count: bodyJson.messages?.length || 0,
                  has_system: !!bodyJson.system
                })}`);

                // For Azure Anthropic endpoints, the model name in the body should match the deployment
                // Ensure the model name is set correctly
                if (bodyJson.model !== anthropicModelName) {
                  logger.info(`  - 🔄 Setting model name in request body to "${anthropicModelName}" for Azure Anthropic endpoint (was: ${bodyJson.model || 'not set'})`);
                  bodyJson.model = anthropicModelName;
                }

                // CRITICAL: Anthropic Messages API doesn't accept "system" as a message role
                // It requires a top-level `system` parameter instead
                // Extract system messages from the messages array and convert to top-level system parameter
                if (bodyJson.messages && Array.isArray(bodyJson.messages)) {
                  const systemMessages: string[] = [];
                  const nonSystemMessages: any[] = [];

                  for (const msg of bodyJson.messages) {
                    if (msg.role === 'system') {
                      systemMessages.push(msg.content || '');
                    } else {
                      nonSystemMessages.push(msg);
                    }
                  }

                  if (systemMessages.length > 0) {
                    // Combine all system messages into a single system string
                    const systemContent = systemMessages.join('\n\n');
                    logger.info(`  - 🔄 Converting ${systemMessages.length} system message(s) to top-level system parameter`);
                    bodyJson.system = systemContent;
                    // Remove system messages from the messages array
                    bodyJson.messages = nonSystemMessages;
                    logger.info(`  - ✅ System messages converted. Remaining messages: ${nonSystemMessages.length}`);
                  }

                  // Keep existing system parameter if no system messages were found in messages array
                  if (bodyJson.system && systemMessages.length === 0) {
                    logger.info(`  - ℹ️  Using existing system parameter: ${bodyJson.system.substring(0, 100)}...`);
                  }
                }

                // Ensure max_tokens is present (Anthropic requires it)
                // Note: Anthropic uses max_tokens (not max_completion_tokens or max_output_tokens)
                if (!bodyJson.max_tokens) {
                  logger.warn(`  - ⚠️  max_tokens not set in request body - Anthropic requires this parameter`);
                }

                // Log final request body structure
                logger.info(`  - 📋 Claude Request body preview (after modification): ${JSON.stringify({
                  model: bodyJson.model,
                  max_tokens: bodyJson.max_tokens,
                  temperature: bodyJson.temperature,
                  messages_count: bodyJson.messages?.length || 0,
                  has_system: !!bodyJson.system,
                  system_preview: bodyJson.system ? bodyJson.system.substring(0, 100) + '...' : 'none'
                })}`);

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
              // Anthropic API version header (required for Anthropic API)
              headers['anthropic-version'] = '2023-06-01';
              // Remove Authorization header if present (Azure uses api-key instead)
              delete headers['authorization'];
              logger.info(`  - 📤 Claude Headers: api-key=${headers['api-key'] ? 'SET (' + headers['api-key'].length + ' chars)' : 'NOT SET'}, x-api-key=${headers['x-api-key'] ? 'SET' : 'NOT SET'}, anthropic-version=${headers['anthropic-version'] || 'NOT SET'}`);
            }

            logger.info(`  - 🚀 Making Anthropic request to: ${anthropicUrl}`);
            logger.info(`  - ⏱️  Request started at: ${new Date().toISOString()}`);

            const response = await fetch(anthropicUrl, modifiedOptions);

            logger.info(`  - 📥 Claude Response status: ${response.status} ${response.statusText}`);
            logger.info(`  - ⏱️  Response received at: ${new Date().toISOString()}`);

            if (!response.ok) {
              const responseText = await response.clone().text();
              logger.error(`  - ❌ Claude Error response body: ${responseText.substring(0, 2000)}`);
              logger.error(`  - ❌ Request URL: ${anthropicUrl}`);
              logger.error(`  - ❌ Request method: ${modifiedOptions.method || 'POST'}`);
              if (modifiedOptions.body) {
                try {
                  const bodyPreview = typeof modifiedOptions.body === 'string'
                    ? modifiedOptions.body.substring(0, 500)
                    : 'Body is not a string';
                  logger.error(`  - ❌ Request body preview: ${bodyPreview}`);
                } catch (e) {
                  logger.error(`  - ❌ Could not log request body: ${e}`);
                }
              }
            } else {
              logger.info(`  - ✅ Claude response received successfully`);
              logger.info(`  - 📋 Content-Type: ${response.headers.get('content-type')}`);

              const contentType = response.headers.get('content-type') || '';

              // CRITICAL: Transform Anthropic responses (both streaming and non-streaming) to OpenAI-compatible format
              // Anthropic uses different format - we need to convert to OpenAI format with 'choices' array
              if (response.body && contentType.includes('text/event-stream')) {
                // Handle streaming responses
                logger.info(`  - 🔄 Transforming Anthropic stream to OpenAI-compatible format`);

                const transformedResponse = new Response(
                  new ReadableStream({
                    async start(controller) {
                      const reader = response.body?.getReader();
                      const decoder = new TextDecoder();
                      const encoder = new TextEncoder();

                      if (!reader) {
                        controller.close();
                        return;
                      }

                      let buffer = '';
                      let messageId = '';
                      let currentContent = '';

                      try {
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;

                          buffer += decoder.decode(value, { stream: true });
                          const lines = buffer.split('\n');
                          buffer = lines.pop() || ''; // Keep incomplete line in buffer

                          for (const line of lines) {
                            if (line.trim() === '') continue;

                            if (line.startsWith('data: ')) {
                              const data = line.slice(6);
                              if (data === '[DONE]') {
                                // Send final chunk with empty delta to indicate completion
                                const finalChoice = {
                                  index: 0,
                                  delta: {},
                                  finish_reason: 'stop'
                                };

                                const openAIFormat = {
                                  id: messageId || 'msg_' + Date.now(),
                                  object: 'chat.completion.chunk',
                                  created: Math.floor(Date.now() / 1000),
                                  model: anthropicModelName,
                                  choices: [finalChoice]
                                };

                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                continue;
                              }

                              try {
                                const event = JSON.parse(data);

                                // Handle different Anthropic event types
                                if (event.type === 'message_start') {
                                  messageId = event.message?.id || 'msg_' + Date.now();
                                  currentContent = '';
                                  logger.info(`  - 📋 Anthropic message_start: ${messageId}`);

                                  // Send initial chunk with empty content
                                  const initialChoice = {
                                    index: 0,
                                    delta: {
                                      role: 'assistant',
                                      content: ''
                                    },
                                    finish_reason: null
                                  };

                                  const openAIFormat = {
                                    id: messageId,
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model: event.message?.model || anthropicModelName,
                                    choices: [initialChoice]
                                  };

                                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                } else if (event.type === 'content_block_delta') {
                                  // Content delta - extract text
                                  const textDelta = event.delta?.text || '';
                                  if (textDelta) {
                                    currentContent += textDelta;

                                    const choice = {
                                      index: 0,
                                      delta: {
                                        content: textDelta
                                      },
                                      finish_reason: null
                                    };

                                    const openAIFormat = {
                                      id: messageId || 'msg_' + Date.now(),
                                      object: 'chat.completion.chunk',
                                      created: Math.floor(Date.now() / 1000),
                                      model: anthropicModelName,
                                      choices: [choice]
                                    };

                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                  }
                                } else if (event.type === 'content_block_start') {
                                  // Content block started - initialize if needed
                                  if (!messageId) {
                                    messageId = 'msg_' + Date.now();
                                  }
                                } else if (event.type === 'message_delta') {
                                  // Message delta - usually contains stop_reason
                                  if (event.delta?.stop_reason) {
                                    const finalChoice = {
                                      index: 0,
                                      delta: {},
                                      finish_reason: event.delta.stop_reason === 'end_turn' ? 'stop' : event.delta.stop_reason
                                    };

                                    const openAIFormat = {
                                      id: messageId || 'msg_' + Date.now(),
                                      object: 'chat.completion.chunk',
                                      created: Math.floor(Date.now() / 1000),
                                      model: anthropicModelName,
                                      choices: [finalChoice]
                                    };

                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                  }
                                } else if (event.type === 'message_stop') {
                                  // Message complete - send [DONE]
                                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                } else {
                                  // Log unhandled event types for debugging
                                  logger.info(`  - 📋 Unhandled Anthropic event type: ${event.type}`);
                                }
                              } catch (parseError) {
                                // If it's not JSON, pass through as-is (might be other SSE data)
                                logger.warn(`  - ⚠️  Could not parse SSE event: ${data.substring(0, 100)}`);
                              }
                            } else {
                              // Pass through non-data lines
                              controller.enqueue(encoder.encode(line + '\n'));
                            }
                          }
                        }
                      } catch (error) {
                        logger.error(`  - ❌ Error transforming Anthropic stream: ${error}`);
                        controller.error(error);
                      } finally {
                        controller.close();
                      }
                    },
                  }),
                  {
                    status: response.status,
                    statusText: response.statusText,
                    headers: new Headers({
                      ...Object.fromEntries(response.headers.entries()),
                      'content-type': 'text/event-stream', // Ensure SDK treats it as SSE stream
                    })
                  }
                );

                logger.info(`  - ✅ Transformed Anthropic stream to OpenAI-compatible format`);
                return transformedResponse;
              } else if (response.body && contentType.includes('application/json')) {
                // Handle non-streaming JSON responses
                logger.info(`  - 🔄 Transforming Anthropic JSON response to OpenAI-compatible format`);

                try {
                  // Clone the response to read it without consuming the original
                  const responseClone = response.clone();
                  const anthropicData = await responseClone.json();

                  logger.info(`  - 📋 Anthropic response structure: ${JSON.stringify({
                    id: anthropicData.id,
                    type: anthropicData.type,
                    role: anthropicData.role,
                    model: anthropicData.model,
                    stop_reason: anthropicData.stop_reason,
                    content_type: Array.isArray(anthropicData.content) ? 'array' : typeof anthropicData.content
                  })}`);

                  // Extract content from Anthropic format
                  // Anthropic content can be an array of content blocks or a string
                  let content = '';
                  if (Array.isArray(anthropicData.content)) {
                    // Content is an array of content blocks
                    for (const block of anthropicData.content) {
                      if (block.type === 'text' && block.text) {
                        content += block.text;
                      }
                    }
                  } else if (typeof anthropicData.content === 'string') {
                    content = anthropicData.content;
                  }

                  // Map Anthropic stop_reason to OpenAI finish_reason
                  let finishReason: string | null = null;
                  if (anthropicData.stop_reason) {
                    if (anthropicData.stop_reason === 'end_turn') {
                      finishReason = 'stop';
                    } else if (anthropicData.stop_reason === 'max_tokens') {
                      finishReason = 'length';
                    } else {
                      finishReason = anthropicData.stop_reason;
                    }
                  }

                  // Transform to OpenAI format
                  const openAIFormat = {
                    id: anthropicData.id || 'msg_' + Date.now(),
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: anthropicData.model || anthropicModelName,
                    choices: [
                      {
                        index: 0,
                        message: {
                          role: 'assistant',
                          content: content
                        },
                        finish_reason: finishReason
                      }
                    ],
                    usage: anthropicData.usage ? {
                      prompt_tokens: anthropicData.usage.input_tokens || 0,
                      completion_tokens: anthropicData.usage.output_tokens || 0,
                      total_tokens: (anthropicData.usage.input_tokens || 0) + (anthropicData.usage.output_tokens || 0)
                    } : undefined
                  };

                  logger.info(`  - ✅ Transformed Anthropic JSON to OpenAI format`);
                  logger.info(`  - 📋 OpenAI format preview: ${JSON.stringify({
                    id: openAIFormat.id,
                    object: openAIFormat.object,
                    model: openAIFormat.model,
                    choices_count: openAIFormat.choices.length,
                    content_length: openAIFormat.choices[0]?.message?.content?.length || 0,
                    finish_reason: openAIFormat.choices[0]?.finish_reason
                  })}`);

                  // Return transformed response
                  return new Response(JSON.stringify(openAIFormat), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: new Headers({
                      ...Object.fromEntries(response.headers.entries()),
                      'content-type': 'application/json',
                    })
                  });
                } catch (transformError) {
                  logger.error(`  - ❌ Error transforming Anthropic JSON response: ${transformError}`);
                  logger.error(`  - ❌ Error details: ${transformError instanceof Error ? transformError.message : String(transformError)}`);
                  // Return original response if transformation fails
                  return response;
                }
              }
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
      // Note: gpt-5.1-chat uses standard endpoint with max_completion_tokens (not Responses API)
      const modelsRequiringMaxCompletionTokens = ['gpt-5-nano', 'o1', 'o4-mini', 'gpt-5.1-chat'];
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

          // Construct the correct Azure OpenAI URL based on endpoint type
          let azureUrl: string;
          if (modelConfig.useResponsesEndpoint) {
            // Use /openai/responses endpoint
            azureUrl = `${baseUrl}/openai/responses?api-version=${apiVersion}`;
            logger.info(`  - ✅ Using Responses API endpoint: ${azureUrl}`);
          } else if (modelConfig.useModelsEndpoint) {
            // Use /models/chat/completions endpoint
            azureUrl = `${baseUrl}/models/chat/completions?api-version=${apiVersion}`;
            logger.info(`  - ✅ Using Models Router endpoint: ${azureUrl}`);
            logger.info(`  - 📋 Note: Model name "${deploymentName}" will be sent in request body, not URL path`);
          } else if (modelConfig.useOpenAIv1Endpoint) {
            // Use /openai/v1/chat/completions endpoint (for grok-4-fast-reasoning)
            // Match user's example: baseURL includes /openai/v1/, SDK appends /chat/completions
            // Skip API version parameter if skipApiVersion flag is set
            if (modelConfig.skipApiVersion) {
              azureUrl = `${baseUrl}/openai/v1/chat/completions`;
              logger.info(`  - ✅ Using OpenAI v1 endpoint (no API version): ${azureUrl}`);
            } else {
              azureUrl = `${baseUrl}/openai/v1/chat/completions?api-version=${apiVersion}`;
              logger.info(`  - ✅ Using OpenAI v1 endpoint: ${azureUrl}`);
            }
            logger.info(`  - 📋 Note: Model name "${deploymentName}" will be sent in request body`);
          } else {
            // Standard deployment endpoint
            azureUrl = `${baseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
            logger.info(`  - ✅ Using standard deployment endpoint: ${azureUrl}`);
          }

          // Modify request body for model-specific requirements
          let modifiedOptions = { ...options };
          // Always modify body for Responses API and Models Router endpoints, or for models with special requirements
          // Special case: Always modify body for GPT-5.1 Chat to ensure max_completion_tokens conversion
          const shouldModifyBody = (needsMaxCompletionTokens || shouldRemoveTemperature || needsTemperatureOne || modelConfig.useModelsEndpoint || modelConfig.useResponsesEndpoint || modelConfig.useOpenAIv1Endpoint || model.name === 'gpt-5.1-chat');
          if (shouldModifyBody && options?.body) {
            if (model.name === 'gpt-5.1-chat') {
              logger.info(`  - 🎯 GPT-5.1 Chat - Body modification condition: shouldModifyBody=${shouldModifyBody}, needsMaxCompletionTokens=${needsMaxCompletionTokens}`);
            }
            if (model.name === 'grok-4-fast-reasoning') {
              logger.info(`  - 🎯 Grok-4-Fast-Reasoning - Body modification condition: shouldModifyBody=${shouldModifyBody}, useOpenAIv1Endpoint=${modelConfig.useOpenAIv1Endpoint}`);
            }
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

              // Log original body for debugging
              if (model.name === 'gpt-5.1-chat') {
                logger.info(`  - 🎯 GPT-5.1 Chat - Original request body: ${JSON.stringify(bodyJson, null, 2)}`);
              }
              if (model.name === 'grok-4-fast-reasoning') {
                logger.info(`  - 🎯 Grok-4-Fast-Reasoning - Original request body: ${JSON.stringify(bodyJson, null, 2)}`);
              }

              let bodyModified = false;

              // Handle max_tokens conversion based on endpoint type
              if (bodyJson.max_tokens !== undefined) {
                if (modelConfig.useResponsesEndpoint) {
                  // Responses API uses max_output_tokens
                  logger.info(`  - 🔄 Converting max_tokens (${bodyJson.max_tokens}) to max_output_tokens for Responses API`);
                  bodyJson.max_output_tokens = bodyJson.max_tokens;
                  delete bodyJson.max_tokens;
                  bodyModified = true;
                } else if (needsMaxCompletionTokens) {
                  // Standard endpoint models that require max_completion_tokens (including gpt-5.1-chat)
                  logger.info(`  - 🔄 Converting max_tokens (${bodyJson.max_tokens}) to max_completion_tokens for ${model.name}`);
                  bodyJson.max_completion_tokens = bodyJson.max_tokens;
                  delete bodyJson.max_tokens;
                  bodyModified = true;
                }
              }

              // If max_completion_tokens exists but we're using Responses API, convert to max_output_tokens
              if (modelConfig.useResponsesEndpoint && bodyJson.max_completion_tokens !== undefined) {
                logger.info(`  - 🔄 Converting max_completion_tokens (${bodyJson.max_completion_tokens}) to max_output_tokens for Responses API`);
                bodyJson.max_output_tokens = bodyJson.max_completion_tokens;
                delete bodyJson.max_completion_tokens;
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

              // For models endpoint, ensure model name is in request body
              if (modelConfig.useModelsEndpoint) {
                if (bodyJson.model !== deploymentName) {
                  logger.info(`  - 🔄 Setting model name in request body to "${deploymentName}" for Models Router endpoint`);
                  bodyJson.model = deploymentName;
                  bodyModified = true;
                }
              }

              // For OpenAI v1 endpoint (grok-4-fast-reasoning), ensure model name is in request body
              if (modelConfig.useOpenAIv1Endpoint) {
                if (bodyJson.model !== deploymentName) {
                  logger.info(`  - 🔄 Setting model name in request body to "${deploymentName}" for OpenAI v1 endpoint (grok-4-fast-reasoning)`);
                  bodyJson.model = deploymentName;
                  bodyModified = true;
                }
              }

              // For GPT-5.1 Chat, ensure model name is in request body (matching user's example code)
              if (model.name === 'gpt-5.1-chat' && !modelConfig.useModelsEndpoint && !modelConfig.useResponsesEndpoint) {
                if (bodyJson.model !== deploymentName) {
                  logger.info(`  - 🔄 Setting model name in request body to "${deploymentName}" for GPT-5.1 Chat (standard endpoint)`);
                  bodyJson.model = deploymentName;
                  bodyModified = true;
                }
              }

              // For Responses API endpoint, convert 'messages' to 'input' and ensure model name is set
              if (modelConfig.useResponsesEndpoint) {
                if (bodyJson.messages !== undefined) {
                  logger.info(`  - 🔄 Converting 'messages' to 'input' for Responses API endpoint`);
                  bodyJson.input = bodyJson.messages;
                  delete bodyJson.messages;
                  bodyModified = true;
                }
                // Ensure model name is in request body for Responses API
                if (bodyJson.model !== deploymentName) {
                  logger.info(`  - 🔄 Setting model name in request body to "${deploymentName}" for Responses API`);
                  bodyJson.model = deploymentName;
                  bodyModified = true;
                }
                // Ensure streaming is enabled for Responses API
                if (bodyJson.stream !== true) {
                  logger.info(`  - 🔄 Enabling streaming for Responses API (was: ${bodyJson.stream})`);
                  bodyJson.stream = true;
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

                // Log modified body for debugging
                if (model.name === 'gpt-5.1-chat') {
                  logger.info(`  - 🎯 GPT-5.1 Chat - Modified request body: ${JSON.stringify(bodyJson, null, 2)}`);
                }
                if (model.name === 'grok-4-fast-reasoning') {
                  logger.info(`  - 🎯 Grok-4-Fast-Reasoning - Modified request body: ${JSON.stringify(bodyJson, null, 2)}`);
                }
              } else {
                if (model.name === 'gpt-5.1-chat') {
                  logger.warn(`  - ⚠️  GPT-5.1 Chat - Request body was NOT modified (bodyModified=false)`);
                  logger.warn(`  - ⚠️  This might indicate the condition check failed`);
                }
                if (model.name === 'grok-4-fast-reasoning') {
                  logger.warn(`  - ⚠️  Grok-4-Fast-Reasoning - Request body was NOT modified (bodyModified=false)`);
                  logger.warn(`  - ⚠️  This might indicate the condition check failed`);
                }
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

            // For Responses API, we need to transform the response format
            // Responses API uses event-based streaming with different structure
            // The SDK expects OpenAI format with 'choices' array, but Responses API uses 'type', 'sequence_number', 'response'
            if (modelConfig.useResponsesEndpoint && response.ok) {
              logger.info(`  - 🔄 Transforming Responses API stream to OpenAI-compatible format`);
              logger.info(`  - 📋 Responses API uses different event structure - converting to OpenAI SSE format`);
              logger.info(`  - 📋 Content-Type: ${response.headers.get('content-type')}`);

              // Ensure we're handling a streaming response
              if (!response.body) {
                logger.error(`  - ❌ Response body is null - cannot transform stream`);
                return response;
              }

              // Create a transformed response that converts Responses API format to OpenAI format
              const transformedResponse = new Response(
                new ReadableStream({
                  async start(controller) {
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    const encoder = new TextEncoder();

                    if (!reader) {
                      controller.close();
                      return;
                    }

                    let buffer = '';

                    try {
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                          if (line.trim() === '') continue;
                          if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                              continue;
                            }

                            try {
                              const event = JSON.parse(data);

                              // Log the event type for debugging
                              logger.info(`  - 📋 Responses API event: ${event.type || 'unknown'}`);

                              // Transform Responses API events to OpenAI format
                              // Responses API uses different event types: response.created, response.output_item.added, response.output_item.delta

                              if (event.type === 'response.output_item.added') {
                                // New output item was added - extract text content
                                const outputItem = event.output_item;
                                if (outputItem?.type === 'text' && outputItem.text) {
                                  // Create OpenAI-compatible choice format with full text
                                  const choice = {
                                    index: 0,
                                    delta: {
                                      role: 'assistant',
                                      content: outputItem.text
                                    },
                                    finish_reason: null
                                  };

                                  const openAIFormat = {
                                    id: event.response_id || 'resp_' + Date.now(),
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model: deploymentName,
                                    choices: [choice]
                                  };

                                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                }
                              } else if (event.type === 'response.output_item.delta') {
                                // Delta update for existing output item
                                const delta = event.delta;
                                if (delta?.type === 'text_delta' && delta.text) {
                                  // Create OpenAI-compatible choice format with delta text
                                  const choice = {
                                    index: 0,
                                    delta: {
                                      content: delta.text
                                    },
                                    finish_reason: null
                                  };

                                  const openAIFormat = {
                                    id: event.response_id || 'resp_' + Date.now(),
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model: deploymentName,
                                    choices: [choice]
                                  };

                                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                }
                              } else if (event.type === 'response.done') {
                                // Response is complete
                                const finalChoice = {
                                  index: 0,
                                  delta: {},
                                  finish_reason: 'stop'
                                };

                                const openAIFormat = {
                                  id: event.response_id || 'resp_' + Date.now(),
                                  object: 'chat.completion.chunk',
                                  created: Math.floor(Date.now() / 1000),
                                  model: deploymentName,
                                  choices: [finalChoice]
                                };

                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                              } else if (event.type === 'response.created') {
                                // Initial response created - send empty delta to initialize the stream
                                // The actual content will come in output_item.added/delta events
                                logger.info(`  - 📋 Response created: ${event.response?.id || 'unknown'}, status: ${event.response?.status || 'unknown'}`);

                                // Always send an initial chunk with empty content to satisfy SDK expectations
                                // This ensures the SDK sees a valid format immediately
                                const initialChoice = {
                                  index: 0,
                                  delta: {
                                    role: 'assistant',
                                    content: ''
                                  },
                                  finish_reason: null
                                };

                                const openAIFormat = {
                                  id: event.response?.id || 'resp_' + Date.now(),
                                  object: 'chat.completion.chunk',
                                  created: event.response?.created_at || Math.floor(Date.now() / 1000),
                                  model: event.response?.model || deploymentName,
                                  choices: [initialChoice]
                                };

                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));

                                // Also check if there's initial output in the response
                                if (event.response?.output && event.response.output.length > 0) {
                                  for (const outputItem of event.response.output) {
                                    if (outputItem.type === 'text' && outputItem.text) {
                                      const choice = {
                                        index: 0,
                                        delta: {
                                          content: outputItem.text
                                        },
                                        finish_reason: null
                                      };

                                      const openAIFormat = {
                                        id: event.response.id || 'resp_' + Date.now(),
                                        object: 'chat.completion.chunk',
                                        created: event.response.created_at || Math.floor(Date.now() / 1000),
                                        model: event.response.model || deploymentName,
                                        choices: [choice]
                                      };

                                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                                    }
                                  }
                                }
                              } else {
                                // Log unhandled event types for debugging
                                logger.info(`  - 📋 Unhandled Responses API event type: ${event.type}`);
                              }
                            } catch (parseError) {
                              // If it's not JSON, pass through as-is (might be other SSE data)
                              logger.warn(`  - ⚠️  Could not parse SSE event: ${data.substring(0, 100)}`);
                            }
                          } else {
                            // Pass through non-data lines
                            controller.enqueue(encoder.encode(line + '\n'));
                          }
                        }
                      }
                    } catch (error) {
                      logger.error(`  - ❌ Error transforming Responses API stream: ${error}`);
                      controller.error(error);
                    } finally {
                      controller.close();
                    }
                  }
                }),
                {
                  status: response.status,
                  statusText: response.statusText,
                  headers: new Headers({
                    ...Object.fromEntries(response.headers.entries()),
                    'content-type': 'text/event-stream', // Ensure SDK treats it as SSE stream
                  })
                }
              );

              logger.info(`  - ✅ Transformed response created for Responses API`);
              return transformedResponse;
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

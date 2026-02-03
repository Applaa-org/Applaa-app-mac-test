import { db } from "@/db";
import {
  language_model_providers as languageModelProvidersSchema,
  language_models as languageModelsSchema,
} from "@/db/schema";
import type { LanguageModelProvider, LanguageModel } from "@/ipc/ipc_types";
import { eq } from "drizzle-orm";

export const PROVIDERS_THAT_SUPPORT_THINKING: (keyof typeof MODEL_OPTIONS)[] = [
  "google",
  "azure-openai",
  "auto",
];

export interface ModelOption {
  name: string;
  displayName: string;
  description: string;
  temperature?: number;
  tag?: string;
  maxOutputTokens?: number;
  contextWindow?: number;
}

export const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  openai: [
    // https://platform.openai.com/docs/models/gpt-5
    {
      name: "gpt-5",
      displayName: "GPT 5",
      description: "OpenAI's flagship model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
    },
    // https://platform.openai.com/docs/models/gpt-5-mini
    {
      name: "gpt-5-mini",
      displayName: "GPT 5 Mini",
      description: "OpenAI's lightweight, but intelligent model",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
    },
    // https://platform.openai.com/docs/models/gpt-5-nano
    {
      name: "gpt-5-nano",
      displayName: "GPT 5 Nano",
      description: "Fastest, most cost-efficient version of GPT-5",
      // Technically it's 128k but OpenAI errors if you set max_tokens instead of max_completion_tokens
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      // Requires temperature to be default value (1)
      temperature: 1,
    },
    // https://platform.openai.com/docs/models/gpt-4.1
    {
      name: "gpt-4.1",
      displayName: "GPT 4.1",
      description: "OpenAI's flagship model",
      maxOutputTokens: 32_768,
      contextWindow: 1_047_576,
      temperature: 0,
    },
    // https://platform.openai.com/docs/models/gpt-4.1-mini
    {
      name: "gpt-4.1-mini",
      displayName: "GPT 4.1 Mini",
      description: "OpenAI's lightweight, but intelligent model",
      maxOutputTokens: 32_768,
      contextWindow: 1_047_576,
      temperature: 0,
    },
    {
      name: "gpt-4o",
      displayName: "GPT-4o",
      description: "OpenAI's most capable model",
      contextWindow: 128_000,
    },
    {
      name: "gpt-4o-mini",
      displayName: "GPT-4o Mini",
      description: "Fast, affordable large model",
      contextWindow: 128_000,
    },
    // https://platform.openai.com/docs/models/o3-mini
    {
      name: "o3-mini",
      displayName: "o3 mini",
      description: "Reasoning model",
      // See o4-mini comment below for why we set this to 32k
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    // https://platform.openai.com/docs/models/o4-mini
    {
      name: "o4-mini",
      displayName: "o4 mini",
      description: "Reasoning model",
      // Technically the max output tokens is 100k, *however* if the user has a lot of input tokens,
      // then setting a high max output token will cause the request to fail because
      // the max output tokens is *included* in the context window limit.
      maxOutputTokens: 32_000,
      contextWindow: 200_000,
      temperature: 0,
    },
  ],
  // https://docs.anthropic.com/en/docs/about-claude/models/all-models#model-comparison-table
  anthropic: [
    {
      name: "claude-sonnet-4-20250514",
      displayName: "Claude 4 Sonnet",
      description: "Excellent coder",
      // See comment below for Claude 3.7 Sonnet for why we set this to 16k
      maxOutputTokens: 16_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "claude-3-7-sonnet-latest",
      displayName: "Claude 3.7 Sonnet",
      description: "Excellent coder",
      // Technically the max output tokens is 64k, *however* if the user has a lot of input tokens,
      // then setting a high max output token will cause the request to fail because
      // the max output tokens is *included* in the context window limit, see:
      // https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#max-tokens-and-context-window-size-with-extended-thinking
      maxOutputTokens: 16_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet",
      description: "Good coder, excellent at following instructions",
      maxOutputTokens: 8_000,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "claude-3-5-haiku-20241022",
      displayName: "Claude 3.5 Haiku",
      description: "Lightweight coder",
      maxOutputTokens: 8_000,
      contextWindow: 200_000,
      temperature: 0,
    },
  ],
  google: [
    // Google Gemini models - limited to the three options shown in the UI
    // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro-preview-03-25
    {
      name: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      description: "Google's Gemini 2.5 Pro model",
      // See Flash 2.5 comment below (go 1 below just to be safe, even though it seems OK now).
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
    },
    // https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview
    {
      name: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      description: "Google's Gemini 2.5 Flash model (free tier available)",
      // Weirdly for Vertex AI, the output token limit is *exclusive* of the stated limit.
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
    },
    // https://ai.google.dev/gemini-api/docs/models/gemini
    {
      name: "gemini-3-flash-preview",
      displayName: "Gemini 3 Flash",
      description:
        "Google's Gemini 3 Flash model (Preview) - faster, lower-cost iterations",
      maxOutputTokens: 65_536 - 1,
      // Gemini context window = input token + output token
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Preview",
    },
  ],
  "google-vertex": [
    // Google Vertex AI models - separate from regular Google API
    {
      name: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro (Vertex)",
      description: "Google Vertex AI Gemini 2.5 Pro model",
      maxOutputTokens: 65_536 - 1,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Turbo",
    },
    {
      name: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash (Vertex)",
      description: "Google Vertex AI Gemini 2.5 Flash model",
      maxOutputTokens: 65_536 - 1,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Turbo",
    },
    {
      name: "gemini-3-flash-preview",
      displayName: "Gemini 3 Flash (Vertex)",
      description: "Google Vertex AI Gemini 3 Flash model (Preview)",
      maxOutputTokens: 65_536 - 1,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Preview",
    },
    {
      name: "gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro (Vertex)",
      description: "Google Vertex AI Gemini 1.5 Pro model",
      maxOutputTokens: 8192,
      contextWindow: 2_000_000,
      temperature: 0.7,
    },
    {
      name: "gemini-1.5-flash",
      displayName: "Gemini 1.5 Flash (Vertex)",
      description: "Google Vertex AI Gemini 1.5 Flash model",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
    },
  ],
  "amazon-bedrock": [
    // Amazon Bedrock models
    {
      name: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet (Bedrock)",
      description: "Anthropic Claude 3.5 Sonnet via Amazon Bedrock",
      maxOutputTokens: 8_000,
      contextWindow: 200_000,
      temperature: 0,
      tag: "Turbo",
    },
    {
      name: "claude-3-opus-20240229",
      displayName: "Claude 3 Opus (Bedrock)",
      description: "Anthropic Claude 3 Opus via Amazon Bedrock",
      maxOutputTokens: 4_096,
      contextWindow: 200_000,
      temperature: 0,
      tag: "Turbo",
    },
    {
      name: "claude-3-haiku-20240307",
      displayName: "Claude 3 Haiku (Bedrock)",
      description: "Anthropic Claude 3 Haiku via Amazon Bedrock",
      maxOutputTokens: 4_096,
      contextWindow: 200_000,
      temperature: 0,
      tag: "Turbo",
    },
    {
      name: "meta.llama3-70b-instruct-v1:0",
      displayName: "Llama 3 70B (Bedrock)",
      description: "Meta Llama 3 70B via Amazon Bedrock",
      maxOutputTokens: 4_096,
      contextWindow: 8_000,
      temperature: 0,
    },
  ],
  openrouter: [
    // Qwen3 models - both free and paid versions
    {
      name: "qwen/qwen3-coder:free",
      displayName: "Qwen3 Coder (free)",
      description: "Qwen's best coding model - free tier",
      maxOutputTokens: 32_000,
      contextWindow: 262_000,
      temperature: 0,
    },
    {
      name: "qwen/qwen3-coder",
      displayName: "Qwen3 Coder",
      description: "Qwen's best coding model - paid version",
      maxOutputTokens: 32_000,
      contextWindow: 262_000,
      temperature: 0,
    },
    // https://openrouter.ai/deepseek/deepseek-chat-v3-0324:free
    {
      name: "deepseek/deepseek-chat-v3-0324:free",
      displayName: "DeepSeek v3 (free)",
      description: "Use for free (data may be used for training)",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
    },
    // https://openrouter.ai/moonshotai/kimi-k2-0905/api
    {
      name: "moonshotai/kimi-k2-0905",
      displayName: "Kimi K2 0905",
      description: "1T parameter MoE model with enhanced frontend coding and 256k context",
      maxOutputTokens: 32_000,
      contextWindow: 256_000,
      temperature: 0,
      tag: "New",
    },
    {
      name: "deepseek/deepseek-r1-0528",
      displayName: "DeepSeek R1",
      description: "Good reasoning model with excellent price for performance",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
    },
    // https://openrouter.ai/x-ai/grok-code-fast-1
    {
      name: "x-ai/grok-code-fast-1",
      displayName: "Grok Code Fast 1",
      description: "xAI's fast coding model optimized for rapid code generation",
      maxOutputTokens: 32_000,
      contextWindow: 256_000,
      temperature: 0,
    },
  ],
  groq: [
    {
      name: "llama-3.1-70b-versatile",
      displayName: "Llama 3.1 70B (Free)",
      description: "Groq free tier: powerful coding model, great for complex tasks",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
      tag: "Free",
    },
    {
      name: "llama-3.1-8b-instant",
      displayName: "Llama 3.1 8B (Free)",
      description: "Groq free tier: fast coding model ideal for development",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
      tag: "Free",
    },
    {
      name: "mixtral-8x7b-32768",
      displayName: "Mixtral 8x7B (Free)",
      description: "Groq free tier: excellent general-purpose coding model",
      maxOutputTokens: 32_000,
      contextWindow: 32_768,
      temperature: 0,
      tag: "Free",
    },
    {
      name: "gemma2-9b-it",
      displayName: "Gemma 2 9B (Free)",
      description: "Groq free tier: Google's balanced coding model - great for development",
      maxOutputTokens: 8_192,
      contextWindow: 8_192,
      temperature: 0,
      tag: "Free",
    },
  ],
  cerebras: [
    {
      name: "cerebras-llama-3.1-8b-instruct",
      displayName: "Cerebras L3.1 8B (Turbo)",
      description: "Cerebras ultra-fast L3.1 8B model - 4x faster inference",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
      tag: "Turbo",
    },
    {
      name: "cerebras-llama-3.1-70b-instruct",
      displayName: "Cerebras L3.1 70B (Turbo)",
      description: "Cerebras ultra-fast L3.1 70B model - 4x faster inference",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
      tag: "Turbo",
    },
  ],
  xai: [
    {
      name: "grok-code-fast-1",
      displayName: "Grok Code Fast 1",
      description: "xAI's fast coding model",
      maxOutputTokens: 32_000,
      contextWindow: 256_000,
      temperature: 0,
    },
  ],
  auto: [
    {
      name: "auto",
      displayName: "Auto",
      description: "Automatically selects the best model",
      tag: "Default",
      // These are below Gemini 2.5 Pro & Flash limits
      // which are the ones defaulted to for both regular auto
      // and smart auto.
      maxOutputTokens: 32_000,
      contextWindow: 1_000_000,
      temperature: 0,
    },
  ],
  "azure-openai": [
    // Azure OpenAI models with custom base URLs - only models with provided URLs
    {
      name: "model-router",
      displayName: "Model Router (Azure)",
      description: "Azure OpenAI router deployment for automatic best-model routing",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    
    {
      name: "gpt-5.2",
      displayName: "GPT-5.2 (Azure)",
      description: "Azure OpenAI GPT-5.2 deployment",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    {
      name: "gpt-5.2-codex",
      displayName: "GPT-5.2 Codex (Azure)",
      description: "Azure OpenAI GPT-5.2 Codex deployment",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    // {
    //   name: "gpt-4",
    //   displayName: "GPT-4 (Azure)",
    //   description: "Azure OpenAI GPT-4 deployment",
    //   maxOutputTokens: 8192,
    //   contextWindow: 128_000,
    //   temperature: 0,
    // },
    // {
    //   name: "gpt-4.1-mini",
    //   displayName: "GPT-4.1 Mini (Azure)",
    //   description: "Azure OpenAI GPT-4.1 Mini deployment",
    //   maxOutputTokens: 16_384,
    //   contextWindow: 128_000,
    //   temperature: 0,
    // },
    // {
    //   name: "gpt-4o",
    //   displayName: "GPT-4o (Azure)",
    //   description: "Azure OpenAI GPT-4o deployment",
    //   maxOutputTokens: 16_384,
    //   contextWindow: 128_000,
    //   temperature: 0,
    // },
    // {
    //   name: "gpt-4o-mini",
    //   displayName: "GPT-4o Mini (Azure)",
    //   description: "Azure OpenAI GPT-4o Mini deployment",
    //   maxOutputTokens: 16_384,
    //   contextWindow: 128_000,
    //   temperature: 0,
    // },
    {
      name: "gpt-5.1-chat",
      displayName: "GPT-5.1 Chat (Azure)",
      description: "Azure OpenAI GPT-5.1 Chat deployment",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    {
      name: "gpt-5-chat",
      displayName: "GPT-5 (Azure)",
      description: "Azure OpenAI GPT-5 deployment - flagship model",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    {
      name: "gpt-5-nano",
      displayName: "GPT-5 Nano (Azure)",
      description: "Azure OpenAI GPT-5 Nano deployment - fastest, most cost-efficient",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    
    {
      name: "o1",
      displayName: "O1 (Azure)",
      description: "Azure OpenAI O1 deployment",
      maxOutputTokens: undefined,
      contextWindow: 200_000,
      temperature: 0,
    },
    {
      name: "o4-mini",
      displayName: "O4 Mini (Azure)",
      description: "Azure OpenAI O4 Mini deployment",
      maxOutputTokens: undefined,
      contextWindow: 200_000,
      temperature: 1, // O4 Mini only supports temperature = 1 (default)
    },
    {
      name: "grok-4-fast-reasoning",
      displayName: "Grok 4 Fast Reasoning (Azure)",
      description: "Azure OpenAI Grok 4 Fast Reasoning model",
      maxOutputTokens: undefined,
      contextWindow: 400_000,
      temperature: 1,
    },
    {
      name: "claude-sonnet-4-5",
      displayName: "Claude Sonnet 4.5 (Azure)",
      description: "Azure OpenAI Claude Sonnet 4.5 deployment via Anthropic endpoint",
      maxOutputTokens: 8192,
      contextWindow: 200_000,
      temperature: 1,
    },
    {
      name: "claude-opus-4-5",
      displayName: "Claude Opus 4.5 (Azure)",
      description: "Azure OpenAI Claude Opus 4.5 deployment via Anthropic endpoint",
      maxOutputTokens: 8192,
      contextWindow: 200_000,
      temperature: 1,
    },
  ],
};

export const PROVIDER_TO_ENV_VAR: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  "azure-openai": "AZURE_API_KEY",
  "google-vertex": "GOOGLE_APPLICATION_CREDENTIALS",
  "amazon-bedrock": "AWS_ACCESS_KEY_ID",
  "groq": "GROQ_API_KEY",
  "cerebras": "CEREBRAS_API_KEY",
  "xai": "XAI_API_KEY",
};

export const CLOUD_PROVIDERS: Record<
  string,
  {
    displayName: string;
    hasFreeTier?: boolean;
    websiteUrl?: string;
    gatewayPrefix: string;
  }
> = {
  google: {
    displayName: "Google",
    hasFreeTier: true,
    websiteUrl: "https://aistudio.google.com/app/apikey",
    gatewayPrefix: "gemini/",
  },
  openrouter: {
    displayName: "OpenRouter",
    hasFreeTier: true,
    websiteUrl: "https://openrouter.ai/settings/keys",
    gatewayPrefix: "openrouter/",
  },
  openai: {
    displayName: "OpenAI",
    hasFreeTier: false,
    websiteUrl: "https://platform.openai.com/api-keys",
    gatewayPrefix: "",
  },
  anthropic: {
    displayName: "Anthropic",
    hasFreeTier: false,
    websiteUrl: "https://console.anthropic.com/settings/keys",
    gatewayPrefix: "anthropic/",
  },
  auto: {
    displayName: "Applaa",
    websiteUrl: "https://academy.dyad.sh/settings",
    gatewayPrefix: "dyad/",
  },
  "azure-openai": {
    displayName: "Azure OpenAI",
    hasFreeTier: false,
    websiteUrl: "https://portal.azure.com/",
    gatewayPrefix: "",
  },
  "google-vertex": {
    displayName: "Google Vertex AI",
    hasFreeTier: true,
    websiteUrl: "https://console.cloud.google.com/vertex-ai",
    gatewayPrefix: "vertex/",
  },
  "amazon-bedrock": {
    displayName: "Amazon Bedrock",
    hasFreeTier: false,
    websiteUrl: "https://console.aws.amazon.com/bedrock/",
    gatewayPrefix: "bedrock/",
  },
  "groq": {
    displayName: "Groq",
    hasFreeTier: true,
    websiteUrl: "https://console.groq.com/keys",
    gatewayPrefix: "groq/",
  },
  "cerebras": {
    displayName: "Cerebras",
    hasFreeTier: false,
    websiteUrl: "https://www.cerebras.net/",
    gatewayPrefix: "cerebras/",
  },
  "xai": {
    displayName: "xAI",
    hasFreeTier: false,
    websiteUrl: "https://console.x.ai/",
    gatewayPrefix: "xai/",
  },
};

const LOCAL_PROVIDERS: Record<
  string,
  {
    displayName: string;
    hasFreeTier: boolean;
  }
> = {
  ollama: {
    displayName: "Ollama",
    hasFreeTier: true,
  },
  lmstudio: {
    displayName: "LM Studio",
    hasFreeTier: true,
  },
};

export async function getLanguageModelProviders(): Promise<
  LanguageModelProvider[]
> {
  const customProvidersDb = await db
    .select()
    .from(languageModelProvidersSchema);

  const customProvidersMap = new Map<string, LanguageModelProvider>();
  for (const cp of customProvidersDb) {
    customProvidersMap.set(cp.id, {
      id: cp.id,
      name: cp.name,
      apiBaseUrl: cp.api_base_url,
      envVarName: cp.env_var_name ?? undefined,
      type: "custom",
    });
  }

  const hardcodedProviders: LanguageModelProvider[] = [];
  for (const providerKey in CLOUD_PROVIDERS) {
    if (Object.prototype.hasOwnProperty.call(CLOUD_PROVIDERS, providerKey)) {
      const key = providerKey as keyof typeof CLOUD_PROVIDERS;
      const providerDetails = CLOUD_PROVIDERS[key];
      if (providerDetails) {
        hardcodedProviders.push({
          id: key,
          name: providerDetails.displayName,
          hasFreeTier: providerDetails.hasFreeTier,
          websiteUrl: providerDetails.websiteUrl,
          gatewayPrefix: providerDetails.gatewayPrefix,
          envVarName: PROVIDER_TO_ENV_VAR[key] ?? undefined,
          type: "cloud",
        });
      }
    }
  }

  for (const providerKey in LOCAL_PROVIDERS) {
    if (Object.prototype.hasOwnProperty.call(LOCAL_PROVIDERS, providerKey)) {
      const key = providerKey as keyof typeof LOCAL_PROVIDERS;
      const providerDetails = LOCAL_PROVIDERS[key];
      hardcodedProviders.push({
        id: key,
        name: providerDetails.displayName,
        hasFreeTier: providerDetails.hasFreeTier,
        type: "local",
      });
    }
  }

  return [...hardcodedProviders, ...customProvidersMap.values()];
}

export async function getLanguageModels({
  providerId,
}: {
  providerId: string;
}): Promise<LanguageModel[]> {
  const allProviders = await getLanguageModelProviders();
  const provider = allProviders.find((p) => p.id === providerId);

  if (!provider) {
    console.warn(`Provider with ID "${providerId}" not found.`);
    return [];
  }

  let customModels: LanguageModel[] = [];

  try {
    const customModelsDb = await db
      .select({
        id: languageModelsSchema.id,
        displayName: languageModelsSchema.displayName,
        apiName: languageModelsSchema.apiName,
        description: languageModelsSchema.description,
        maxOutputTokens: languageModelsSchema.max_output_tokens,
        contextWindow: languageModelsSchema.context_window,
      })
      .from(languageModelsSchema)
      .where(
        isCustomProvider({ providerId })
          ? eq(languageModelsSchema.customProviderId, providerId)
          : eq(languageModelsSchema.builtinProviderId, providerId),
      );

    customModels = customModelsDb.map((model) => ({
      ...model,
      description: model.description ?? "",
      tag: undefined,
      maxOutputTokens: model.maxOutputTokens ?? undefined,
      contextWindow: model.contextWindow ?? undefined,
      type: "custom",
    }));
  } catch (error) {
    console.error(
      `Error fetching custom models for provider "${providerId}" from DB:`,
      error,
    );
  }

  let hardcodedModels: LanguageModel[] = [];
  if (provider.type === "cloud") {
    if (providerId in MODEL_OPTIONS) {
      const models = MODEL_OPTIONS[providerId] || [];
      hardcodedModels = models.map((model) => ({
        ...model,
        apiName: model.name,
        type: "cloud",
      }));
    }
  }

  return [...hardcodedModels, ...customModels];
}

export async function getLanguageModelsByProviders(): Promise<
  Record<string, LanguageModel[]>
> {
  const providers = await getLanguageModelProviders();

  const modelPromises = providers
    .filter((p) => p.type !== "local")
    .map(async (provider) => {
      const models = await getLanguageModels({ providerId: provider.id });
      return { providerId: provider.id, models };
    });

  const results = await Promise.all(modelPromises);

  const record: Record<string, LanguageModel[]> = {};
  for (const result of results) {
    record[result.providerId] = result.models;
  }

  return record;
}

export function isCustomProvider({ providerId }: { providerId: string }) {
  return providerId.startsWith(CUSTOM_PROVIDER_PREFIX);
}

export const CUSTOM_PROVIDER_PREFIX = "custom::";

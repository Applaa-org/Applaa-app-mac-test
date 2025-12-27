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
    }
  ],
  anthropic: [
    {
      name: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet",
      description: "Excellent coder",
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
    {
      name: "gemini-3-pro",
      displayName: "Gemini 3 Pro",
      description: "Google's next-generation high-performance model (Future)",
      maxOutputTokens: 8192,
      contextWindow: 2_000_000,
      temperature: 0,
      tag: "Experimental",
    },
    {
      name: "gemini-3-flash",
      displayName: "Gemini 3 Flash",
      description: "Google's next-generation fast model (Future)",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Flash",
    },
    {
      name: "gemini-2.0-flash-exp",
      displayName: "Gemini 2.0 Flash (Exp)",
      description: "Google's next-generation fast model (Experimental)",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Experimental",
    },
    {
      name: "gemini-1.5-pro-latest",
      displayName: "Gemini 1.5 Pro (Latest)",
      description: "Google's stable high-performance model",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
    },
    {
      name: "gemini-1.5-flash-latest",
      displayName: "Gemini 1.5 Flash (Latest)",
      description: "Google's stable fast model",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Recommended",
    },
    {
      name: "gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro",
      description: "Google's stable high-performance model",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
    },
    {
      name: "gemini-1.5-flash",
      displayName: "Gemini 1.5 Flash",
      description: "Google's stable fast model",
      maxOutputTokens: 8192,
      contextWindow: 1_048_576,
      temperature: 0,
      tag: "Stable",
    },
  ],
  "google-vertex": [
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
    {
      name: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet (Bedrock)",
      description: "Anthropic Claude 3.5 Sonnet via Amazon Bedrock",
      maxOutputTokens: 8_000,
      contextWindow: 200_000,
      temperature: 0,
      tag: "Turbo",
    },
  ],
  openrouter: [
    {
      name: "qwen/qwen3-coder",
      displayName: "Qwen3 Coder",
      description: "Qwen's best coding model",
      maxOutputTokens: 32_000,
      contextWindow: 262_000,
      temperature: 0,
    },
  ],
  groq: [
    {
      name: "llama-3.1-70b-versatile",
      displayName: "Llama 3.1 70B (Free)",
      description: "Groq powerful coding model",
      maxOutputTokens: 32_000,
      contextWindow: 128_000,
      temperature: 0,
      tag: "Free",
    },
  ],
  cerebras: [
    {
      name: "cerebras-llama-3.1-70b-instruct",
      displayName: "Cerebras L3.1 70B (Turbo)",
      description: "Cerebras ultra-fast L3.1 70B model",
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
      maxOutputTokens: 32_000,
      contextWindow: 1_048_576,
      temperature: 0,
    },
  ],
  "azure-openai": [
    {
      name: "gpt-4o",
      displayName: "GPT-4o (Azure)",
      description: "Azure OpenAI GPT-4o deployment",
      maxOutputTokens: 16_384,
      contextWindow: 128_000,
      temperature: 0,
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

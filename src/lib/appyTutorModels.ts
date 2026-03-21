import type { LanguageModel } from "@/ipc/ipc_types";
import type { LargeLanguageModel } from "@/lib/schemas";

const APPY_TUTOR_PROVIDERS = new Set([
  "anthropic",
  "azure-openai",
  "openrouter",
]);

/** OpenRouter — only these deployments appear in Appy Buddy. */
const OPENROUTER_APPY = new Set([
  "z-ai/glm-4.7",
  "z-ai/glm-4.6",
  "moonshotai/kimi-k2.5",
  "moonshotai/kimi-k2-0905",
]);

/** Azure OpenAI — GPT-5 family, gpt-4o, Claude Sonnet 4.5 (Anthropic endpoint deployment name). */
const AZURE_APPY = new Set([
  "gpt-5.2",
  "gpt-5.1-chat",
  "gpt-5-nano",
  "gpt-4o",
  "claude-sonnet-4-5",
]);

/**
 * Anthropic — Claude Sonnet 4 and Sonnet 4.5 only (no Opus, Haiku, or 3.x).
 * Matches dated API ids, e.g. claude-sonnet-4-20250514, claude-sonnet-4-5-20250929.
 */
export function isAnthropicAppyModelAllowed(apiName: string): boolean {
  if (apiName.includes("claude-3")) return false;
  return (
    /^claude-sonnet-4-\d{8}$/.test(apiName) ||
    /^claude-sonnet-4-5-\d{8}$/.test(apiName)
  );
}

export function isAppyTutorModelAllowed(
  providerId: string,
  apiName: string,
): boolean {
  switch (providerId) {
    case "openrouter":
      return OPENROUTER_APPY.has(apiName);
    case "azure-openai":
      return AZURE_APPY.has(apiName);
    case "anthropic":
      return isAnthropicAppyModelAllowed(apiName);
    default:
      return false;
  }
}

/** Filter provider model list for the Appy Buddy picker (order preserved). */
export function filterAppyTutorModelsForPicker(
  models: LanguageModel[],
  providerId: string,
): LanguageModel[] {
  return models.filter((m) => {
    const api = m.apiName;
    return isAppyTutorModelAllowed(providerId, api);
  });
}

/** Last-resort tutor model when no explicit or main-chat model applies (matches academy IPC default). */
export const DEFAULT_APPY_TUTOR_FALLBACK: LargeLanguageModel = {
  provider: "azure-openai",
  name: "gpt-5-nano",
};

/**
 * Resolves which model Appy Buddy uses: explicit IPC override, saved `appyTutorModel`,
 * then **main chat `selectedModel`** if it is tutor-allowed (e.g. Claude Sonnet 4.5 in Settings).
 */
export function getAppyTutorPrimaryModel(
  settings: {
    appyTutorModel?: LargeLanguageModel;
    selectedModel?: LargeLanguageModel;
  },
  paramsModel?: LargeLanguageModel,
): LargeLanguageModel {
  const tryOne = (
    m: LargeLanguageModel | undefined,
  ): LargeLanguageModel | undefined => {
    if (!m) return undefined;
    const c = { provider: m.provider, name: m.name };
    if (!APPY_TUTOR_PROVIDERS.has(c.provider)) return undefined;
    if (!isAppyTutorModelAllowed(c.provider, c.name)) return undefined;
    return c;
  };
  return (
    tryOne(paramsModel) ??
    tryOne(settings.appyTutorModel) ??
    tryOne(settings.selectedModel) ??
    DEFAULT_APPY_TUTOR_FALLBACK
  );
}

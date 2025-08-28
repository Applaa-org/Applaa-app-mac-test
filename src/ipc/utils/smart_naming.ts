import { generateText } from "ai";
import { getModelClient } from "./get_model_client";
import { readSettings } from "../../main/settings";
import { findLanguageModel } from "./findLanguageModel";
import log from "electron-log";

const logger = log.scope("smart_naming");

export interface AppNameSuggestion {
  display_name: string;
  package_id: string;
  slug: string;
}

export interface GenerateAppNamesParams {
  concept: string;
  domain?: string;
  audience?: string;
  tone?: string;
  features?: string[];
}

const SMART_NAMING_PROMPT = `You are an expert app naming consultant. Generate meaningful, brandable app names based on the provided concept.

Requirements:
- Generate 3 unique name suggestions
- Each name must be 2-3 words, relevant to the concept
- Avoid animals, colors, random adjectives, or generic terms
- No prefixes like "com-", no trademarks, no platform names
- Names should be easy to read, pronounce, and remember
- Focus on the app's purpose, value, or key benefit

For each name, provide:
- display_name: Title Case with spaces
- package_id: reverse-DNS format (com.applaa.[lowercasename])
- slug: lowercase with hyphens

Return ONLY a valid JSON array with this exact structure:
[
  {
    "display_name": "Example Name",
    "package_id": "com.applaa.examplename",
    "slug": "example-name"
  }
]`;

export async function generateSmartAppNames(
  params: GenerateAppNamesParams,
): Promise<AppNameSuggestion[]> {
  try {
    const settings = readSettings();
    const modelOption = await findLanguageModel(settings.selectedModel);
    if (!modelOption) {
      logger.warn("No language model configured; using fallback names");
      return generateFallbackNames(params.concept);
    }

    const { modelClient } = await getModelClient(
      settings.selectedModel,
      settings,
    );

    let userPrompt = `App Concept: ${params.concept}`;
    if (params.domain) userPrompt += `\nDomain/Industry: ${params.domain}`;
    if (params.audience) userPrompt += `\nTarget Audience: ${params.audience}`;
    if (params.tone) userPrompt += `\nTone: ${params.tone}`;
    if (params.features?.length)
      userPrompt += `\nKey Features: ${params.features.join(", ")}`;

    const result = await generateText({
      model: modelClient.model,
      system: SMART_NAMING_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    try {
      const suggestions = JSON.parse(result.text.trim()) as AppNameSuggestion[];
      const valid = suggestions.filter(
        (s) =>
          !!s.display_name &&
          !!s.package_id &&
          !!s.slug &&
          s.package_id.startsWith("com.applaa.")
      );
      return valid.length ? valid : generateFallbackNames(params.concept);
    } catch (err) {
      logger.error("Failed to parse naming response", err);
      return generateFallbackNames(params.concept);
    }
  } catch (error) {
    logger.error("Smart naming failed", error);
    return generateFallbackNames(params.concept);
  }
}

function generateFallbackNames(concept?: string): AppNameSuggestion[] {
  const base = (concept || "App").toLowerCase().split(/\s+/)[0] || "app";
  const cap = base.charAt(0).toUpperCase() + base.slice(1);
  const names = [
    `Smart ${cap}`,
    `${cap} Hub`,
    `Quick ${cap}`,
  ];
  return names.slice(0, 3).map((n) => ({
    display_name: n,
    package_id: `com.applaa.${n.toLowerCase().replace(/\s+/g, "")}`,
    slug: n.toLowerCase().replace(/\s+/g, "-"),
  }));
}

export async function generateSmartAppName(concept: string): Promise<string> {
  const suggestions = await generateSmartAppNames({ concept });
  return suggestions[0]?.display_name || "Smart App";
}







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

const SMART_NAMING_PROMPT = `You are a creative app branding expert. Generate 4 unique, brandable, and memorable app names based on the provided concept.

🎯 NAMING STRATEGY:
- Create names that feel like real products users would want to download
- Mix creativity with clarity - users should understand the purpose
- Use motivational, empowering, or clever wordplay when appropriate
- Think like successful app brands: Notion, Todoist, Headspace, Canva

✅ EXCELLENT EXAMPLES:
For TODO apps: "Task Master", "Daily Wins", "Focus Flow", "Goal Getter"
For BLOG apps: "Story Studio", "Content Craft", "Writer's Den", "Blog Boost"
For RECIPE apps: "Kitchen Genius", "Recipe Vault", "Flavor Lab", "Cook Smart"
For SHOP apps: "Store Builder", "Commerce Hub", "Shop Craft", "Retail Pro"
For WEATHER apps: "Sky Tracker", "Weather Wise", "Storm Scout", "Climate Pro"
For FITNESS apps: "Fit Force", "Muscle Mind", "Workout Warrior", "Health Hero"
For FINANCE apps: "Money Master", "Budget Boss", "Wealth Wise", "Coin Craft"

🚀 REQUIREMENTS:
- Generate exactly 4 unique suggestions
- Each name should be 1-3 words maximum
- Make them brandable, memorable, and professional
- Avoid generic terms like "App", "Platform", "System"
- Use power words: Pro, Master, Hub, Studio, Lab, Craft, Smart, etc.
- Names should inspire confidence and excitement
- Easy to pronounce and remember

📱 OUTPUT FORMAT:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "display_name": "Task Master",
    "package_id": "com.applaa.taskmaster",
    "slug": "task-master"
  },
  {
    "display_name": "Daily Wins",
    "package_id": "com.applaa.dailywins", 
    "slug": "daily-wins"
  }
]`;

export async function generateSmartAppNames(
  params: GenerateAppNamesParams,
): Promise<AppNameSuggestion[]> {
  try {
    const settings = readSettings();
    logger.info(`Smart naming called with concept: "${params.concept}"`);
    logger.info(`Selected model: ${settings.selectedModel.provider}/${settings.selectedModel.name}`);
    
    const modelOption = await findLanguageModel(settings.selectedModel);
    if (!modelOption) {
      logger.warn(`No language model found for ${settings.selectedModel.provider}/${settings.selectedModel.name}; using fallback names`);
      return generateFallbackNames(params.concept);
    }
    
    logger.info(`Using model: ${modelOption.displayName} (${modelOption.apiName})`);

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

    logger.info(`Sending prompt to AI: "${userPrompt}"`);
    
    const result = await generateText({
      model: modelClient.model,
      system: SMART_NAMING_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    logger.info(`AI response received: "${result.text}"`);

    try {
      const suggestions = JSON.parse(result.text.trim()) as AppNameSuggestion[];
      logger.info(`Parsed ${suggestions.length} suggestions from AI`);
      
      const valid = suggestions.filter(
        (s) =>
          !!s.display_name &&
          !!s.package_id &&
          !!s.slug &&
          s.package_id.startsWith("com.applaa.")
      );
      
      logger.info(`${valid.length} valid suggestions after filtering`);
      
      if (valid.length > 0) {
        logger.info(`Returning AI suggestions: ${valid.map(s => s.display_name).join(', ')}`);
        return valid;
      } else {
        logger.warn("No valid AI suggestions, using fallback names");
        return generateFallbackNames(params.concept);
      }
    } catch (err) {
      logger.error("Failed to parse naming response", err);
      logger.error("Raw response was:", result.text);
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
  
  // Create more brandable fallback names
  const powerWords = ["Pro", "Master", "Hub", "Studio", "Lab", "Craft"];
  const motivationalWords = ["Smart", "Quick", "Daily", "Focus"];
  
  const names = [
    `${cap} ${powerWords[0]}`, // e.g., "Todo Pro"
    `${motivationalWords[0]} ${cap}`, // e.g., "Smart Todo"
    `${cap} ${powerWords[1]}`, // e.g., "Todo Master"
    `${cap} ${powerWords[2]}`, // e.g., "Todo Hub"
  ];
  
  return names.slice(0, 4).map((n) => ({
    display_name: n,
    package_id: `com.applaa.${n.toLowerCase().replace(/\s+/g, "")}`,
    slug: n.toLowerCase().replace(/\s+/g, "-"),
  }));
}

export async function generateSmartAppName(concept: string): Promise<string> {
  const suggestions = await generateSmartAppNames({ concept });
  return suggestions[0]?.display_name || "Smart App";
}







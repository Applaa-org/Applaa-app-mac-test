import type { LargeLanguageModel } from "../ipc/shared/language_model_helpers";
import type { UserSettings } from "../lib/schemas";

/**
 * Simple function to determine if prompt optimization should be available
 * Now it's a basic feature - if user has a model selected, show the Turbo Prompt!
 */
export function shouldShowPromptOptimization(
  model: LargeLanguageModel | undefined, 
  settings: UserSettings | undefined
): boolean {
  // Simply check if user has any model selected
  // The enhancement will use whatever model they've chosen
  return !!(model && settings);
}

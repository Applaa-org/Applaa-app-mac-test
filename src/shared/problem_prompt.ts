import type { ProblemReport } from "../ipc/ipc_types";

/**
 * Creates a framework-aware problem fix prompt that adapts to app type
 */
export function createProblemFixPrompt(problemReport: ProblemReport, appCategory?: 'web' | 'mobile' | 'flutter' | 'capacitor'): string {
  const { problems } = problemReport;

  if (problems.length === 0) {
    return "No TypeScript problems detected.";
  }

  const totalProblems = problems.length;
  // Only check for specific Godot error codes (9997, 9998, 9999)
  const hasGodotErrors = problems.some(p => p.code === 9997 || p.code === 9998 || p.code === 9999);
  const errorType = hasGodotErrors ? "error" : "TypeScript compile-time error";
  let prompt = `Fix these ${totalProblems} ${errorType}${totalProblems === 1 ? "" : "s"}:\n\n`;

  problems.forEach((problem, index) => {
    const codePrefix = (problem.code === 9997 || problem.code === 9998 || problem.code === 9999) ? "GODOT" : "TS";
    prompt += `${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message} (${codePrefix}${problem.code})\n`;
    if (problem.snippet) {
      prompt += `\`\`\`\n${problem.snippet}\n\`\`\`\n`;
    }
    prompt += "\n";
  });

  // Framework-specific guidance
  prompt += `\nPlease fix all errors in a concise way.\n\n`;
  
  // Add Godot-specific guidance if there are Godot errors
  if (hasGodotErrors) {
    prompt += `🎮 **GODOT-SPECIFIC FIXES:**\n`;
    prompt += `\n**AUTO-FIX INSTRUCTIONS:**\n`;
    prompt += `For export errors (GODOT9999, GODOT9998):\n`;
    prompt += `1. Call the IPC handler: ipcClient.exportGodotWeb({ appId: <appId> })\n`;
    prompt += `2. This will automatically try to export using Godot engine, or fall back to creating a test export\n`;
    prompt += `3. After export completes, the preview should automatically refresh\n\n`;
    prompt += `For project errors (GODOT9997):\n`;
    prompt += `1. Rebuild the game project by calling: ipcClient.buildGodotFromSpec({ appId: <appId>, spec: <gameSpec> })\n`;
    prompt += `2. Check the game_spec.json file for any validation errors\n`;
    prompt += `3. Ensure all required project files (project.godot, Loader.tscn, Loader.gd) are generated\n\n`;
    prompt += `**MANUAL CHECKS:**\n`;
    prompt += `- Check if Godot engine is installed and accessible via command line\n`;
    prompt += `- Verify export templates are available if using Godot engine export\n`;
    prompt += `- Check the game_spec.json file for any validation errors\n\n`;
  }
  
  if (appCategory === 'mobile') {
    prompt += `🔧 **EXPO-SPECIFIC FIXES:**\n`;
    prompt += `- Use React Native components (View, Text, Pressable) — never HTML elements\n`;
    prompt += `- Style with StyleSheet or inline styles — never className\n`;
    prompt += `- For expo-notifications types (NotificationTriggerInput, TimeIntervalTriggerInput, DateTriggerInput):\n`;
    prompt += `  - Time-interval: { type: 'timeInterval', seconds: number, repeats?: boolean }\n`;
    prompt += `  - Date: { type: 'date', date: Date } (ensure Date is in the future)\n`;
    prompt += `  - Do NOT pass raw Date or { seconds } without 'type' discriminant\n`;
    prompt += `- For LinearGradient colors: use 'as const' or tuple types\n\n`;
  } else {
    prompt += `🌐 **WEB-SPECIFIC FIXES:**\n`;
    prompt += `- Use HTML elements (div, span, button) — never React Native components\n`;
    prompt += `- Style with className/Tailwind — never StyleSheet\n`;
    prompt += `- Ensure React and ReactDOM imports are correct\n`;
    prompt += `- For module resolution: check tsconfig paths and vite config\n\n`;
  }

  return prompt;
}

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
  let prompt = `Fix these ${totalProblems} TypeScript compile-time error${totalProblems === 1 ? "" : "s"}:\n\n`;

  problems.forEach((problem, index) => {
    prompt += `${index + 1}. ${problem.file}:${problem.line}:${problem.column} - ${problem.message} (TS${problem.code})\n`;
    if (problem.snippet) {
      prompt += `\`\`\`\n${problem.snippet}\n\`\`\`\n`;
    }
    prompt += "\n";
  });

  // Framework-specific guidance
  prompt += `\nPlease fix all errors in a concise way.\n\n`;
  
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

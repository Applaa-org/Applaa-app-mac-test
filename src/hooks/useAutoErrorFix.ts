import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { selectedAppIdAtom } from '@/atoms/appAtoms';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useChats } from '@/hooks/useChats';
import { useCheckProblems } from '@/hooks/useCheckProblems';
import { useSettings } from '@/hooks/useSettings';
import { IpcClient } from '@/ipc/ipc_client';
import { detectAppCategory, type AppCategory } from '@/utils/appTypeDetection';
import { AppOutput } from '@/types';

interface ErrorPattern {
  pattern: RegExp;
  severity: 'error' | 'warning';
  category: 'syntax' | 'runtime' | 'build' | 'expo' | 'typescript';
  autoFixable: boolean;
}

interface DetectedError {
  id: string;
  message: string;
  source: 'console' | 'problems' | 'expo';
  severity: 'error' | 'warning';
  category: string;
  timestamp: number;
  autoFixed: boolean;
}

// Error patterns for different types of issues
const ERROR_PATTERNS: ErrorPattern[] = [
  // React Native/Expo specific errors
  {
    pattern: /View is not defined|Text is not defined|Pressable is not defined/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /Cannot find module.*react-native/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /StyleSheet is not defined/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  
  // Expo-specific console errors (comprehensive)
  {
    pattern: /expo.*not found|expo.*missing|expo.*undefined/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /tunnel.*failed|ngrok.*error|ngrok.*not.*found|tunnel.*connection.*failed/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /@expo\/ngrok.*interactive.*prompts|@expo\/ngrok.*requires.*input/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /expo.*module.*not.*installed|missing.*expo.*dependency/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /expo.*dev.*tools.*not.*found|expo.*cli.*not.*found/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /port.*\d+.*already.*in.*use|address.*already.*in.*use|EADDRINUSE.*8081/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /metro.*bundler.*failed|metro.*server.*error|bundler.*cache.*empty.*rebuilding/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /expo.*process.*stuck|metro.*process.*not.*responding|bundler.*hanging/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /waiting.*on.*http.*localhost.*8081|logs.*for.*your.*project.*will.*appear/i,
    severity: 'warn',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /react.*native.*module.*not.*found|rn.*module.*missing/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  {
    pattern: /node.*modules.*not.*found.*expo|expo.*package.*not.*installed/i,
    severity: 'error',
    category: 'expo',
    autoFixable: true,
  },
  
  // TypeScript errors
  {
    pattern: /Property .* does not exist on type/i,
    severity: 'error',
    category: 'typescript',
    autoFixable: true,
  },
  {
    pattern: /Type .* is not assignable to type/i,
    severity: 'error',
    category: 'typescript',
    autoFixable: true,
  },
  // React Native LinearGradient / ColorValue tuple mismatch
  // Example: Type 'string[]' is not assignable to type 'readonly [ColorValue, ColorValue, ..., ColorValue[]]'
  // Fix: add `as const` to colors arrays or annotate as tuple: [ColorValue, ColorValue, ...ColorValue[]]
  {
    pattern: /Type\s+'?string\[\]'?\s+is\s+not\s+assignable\s+to\s+type\s+'?readonly\s*\[\s*ColorValue[\s\S]*\]\'?/i,
    severity: 'error',
    category: 'typescript',
    autoFixable: true,
  },
  // Expo Notifications typing friction (common TS2322 cases)
  // Examples observed in Problems tab screenshots:
  // - Type 'Date' is not assignable to type 'NotificationTriggerInput'
  // - Type '{ seconds: number; }' is not assignable to type 'NotificationTriggerInput'
  // - Missing discriminant 'type' for TimeIntervalTriggerInput
  // We flag these specifically so the auto-fix prompt can suggest correct shapes
  {
    pattern: /NotificationTriggerInput|TimeIntervalTriggerInput|DateTriggerInput|type 'Date' is not assignable/i,
    severity: 'error',
    category: 'typescript',
    autoFixable: true,
  },
  {
    pattern: /Cannot find name/i,
    severity: 'error',
    category: 'typescript',
    autoFixable: true,
  },
  
  // Syntax errors
  {
    pattern: /Unexpected token|SyntaxError/i,
    severity: 'error',
    category: 'syntax',
    autoFixable: true,
  },
  {
    pattern: /Missing closing|Unclosed/i,
    severity: 'error',
    category: 'syntax',
    autoFixable: true,
  },
  
  // Runtime errors
  {
    pattern: /ReferenceError|TypeError|is not a function/i,
    severity: 'error',
    category: 'runtime',
    autoFixable: true,
  },
  
  // Build errors
  {
    pattern: /Module not found|Cannot resolve module/i,
    severity: 'error',
    category: 'build',
    autoFixable: true,
  },
];

export interface UseAutoErrorFixOptions {
  enabled?: boolean;
  autoFixThreshold?: number; // Max errors to auto-fix per session
  debounceMs?: number; // Debounce time for error detection
}

// 🚫 DISABLED: Auto-fix to match Dyad's cleaner approach without flickery messages
const AUTO_FIX_DISABLED = true;

export function useAutoErrorFix(options: UseAutoErrorFixOptions = {}) {
  // 🚫 Early return: Auto-fix disabled to match Dyad's approach
  if (AUTO_FIX_DISABLED) {
    return {
      detectedErrors: [],
      isAutoFixing: false,
      autoFixCount: 0,
      triggerManualFix: () => {},
      clearErrors: () => {},
      detectConsoleErrors: () => {}, // No-op function to prevent errors
    };
  }

  const {
    enabled = false, // 🚨 DISABLED: Auto-fix is now manual via Problems button
    autoFixThreshold = 5,
    debounceMs = 2000,
  } = options;

  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { streamMessage, isStreaming } = useStreamChat();
  const { chats } = useChats(selectedAppId);
  const { problemReport } = useCheckProblems(selectedAppId);
  const { settings } = useSettings();
  
  const [detectedErrors, setDetectedErrors] = useState<DetectedError[]>([]);
  const [autoFixCount, setAutoFixCount] = useState(0);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [appCategory, setAppCategory] = useState<AppCategory>('web');
  
  const errorDebounceRef = useRef<NodeJS.Timeout>();
  const processedErrorsRef = useRef<Set<string>>(new Set());

  // Get current chat ID
  const currentChat = chats?.[0];
  const chatId = currentChat?.id;

  // Load current app category (web, mobile, flutter, capacitor)
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        if (!selectedAppId) return;
        const ipc = IpcClient.getInstance();
        const app = await ipc.getApp(selectedAppId);
        // Try to enrich with file list for detection
        try {
          const files = await ipc.getAppFiles(selectedAppId);
          (app as any).files = files;
        } catch {}
        const category = detectAppCategory(app as any);
        if (!isCancelled) setAppCategory(category);
      } catch {
        if (!isCancelled) setAppCategory('web');
      }
    })();
    return () => { isCancelled = true; };
  }, [selectedAppId]);

  // Create error prompt for auto-fixing (framework-aware)
  const createAutoFixPrompt = useCallback((errors: DetectedError[]) => {
    const errorsByCategory = errors.reduce((acc, error) => {
      if (!acc[error.category]) acc[error.category] = [];
      acc[error.category].push(error);
      return acc;
    }, {} as Record<string, DetectedError[]>);

    let prompt = `🔧 AUTO-FIX: Detected ${errors.length} error${errors.length > 1 ? 's' : ''} that need immediate attention:\n\n`;

    Object.entries(errorsByCategory).forEach(([category, categoryErrors]) => {
      prompt += `## ${category.toUpperCase()} ERRORS (${categoryErrors.length}):\n`;
      categoryErrors.forEach((error, index) => {
        prompt += `${index + 1}. **${error.source.toUpperCase()}**: ${error.message}\n`;
      });
      prompt += '\n';
    });

    prompt += `🎯 **CRITICAL INSTRUCTIONS:**
- Fix ALL errors listed above
- Ensure proper imports and dependencies
- Test that the fixes resolve the actual errors
- Use the enhanced auto-fix system from dyad_tag_parser.ts
`;

    if (appCategory === 'mobile') {
      prompt += `
🔧 **EXPO-SPECIFIC FIXES:**
- Apply React Native components (View, Text, Pressable) — never HTML
- Style with StyleSheet or inline styles — never className
- For ngrok/tunnel errors: Add @expo/ngrok with --non-interactive
- For missing Expo modules: expo install <package>
- For port 8081 conflicts: kill processes and restart Metro
- For Metro stuck: clear cache and restart; kill 8081 processes
- Keep versions aligned (expo@53.x, expo-router@~5.x)

🚨 **METRO BUNDLER RECOVERY:**
- If Metro is stuck on 8081, clean up aggressively and restart
- Use non-interactive env to avoid prompts

🟩 **TYPESCRIPT TUPLE FIX (LinearGradient colors):**
- Ensure colors are tuples or const arrays (use 'as const')
`;
    } else {
      // Web specific guidance
      prompt += `
🌐 **WEB-SPECIFIC FIXES:**
- Use HTML elements (div, span, button); do NOT import from 'react-native'
- Style with className/Tailwind; do NOT use StyleSheet
- Ensure React and ReactDOM imports are correct (createRoot from 'react-dom/client')
- Resolve Vite/TS errors by installing missing @types packages when needed
- For module resolution issues, check tsconfig paths and vite config
`;
    }

    prompt += `
🚀 **FRAMEWORK DETECTION:**
- Apply the appropriate components and styling for ${appCategory === 'mobile' ? 'Expo (React Native)' : 'Web (React)'}.

Please fix these errors immediately and ensure the app runs without issues.`;

    return prompt;
  }, [appCategory]);

  // Detect errors from console messages
  const detectConsoleErrors = useCallback((appOutput: AppOutput[]) => {
    if (!enabled || !selectedAppId) return;

    const newErrors: DetectedError[] = [];
    
    appOutput.forEach((output) => {
      if (output.appId !== selectedAppId) return;
      
      // Skip if already processed
      const errorId = `console-${output.timestamp}-${output.message.slice(0, 50)}`;
      if (processedErrorsRef.current.has(errorId)) return;
      
      // Check against error patterns for error/warn messages
      if (output.type === 'error' || output.type === 'warn') {
        ERROR_PATTERNS.forEach((pattern) => {
          if (pattern.pattern.test(output.message)) {
            newErrors.push({
              id: errorId,
              message: output.message,
              source: 'console',
              severity: pattern.severity,
              category: pattern.category,
              timestamp: output.timestamp,
              autoFixed: false,
            });
            processedErrorsRef.current.add(errorId);
          }
        });
      }
      
      // Special handling for Expo console messages (even info/log level)
      if (output.type === 'info' || output.type === 'log') {
        const message = output.message;
        
        // Check for Expo-specific issues in info/log messages
        const expoPatterns = [
          /tunnel.*failed|ngrok.*error|ngrok.*not.*found/i,
          /@expo\/ngrok.*interactive.*prompts/i,
          /expo.*module.*not.*installed/i,
          /port.*\d+.*already.*in.*use|EADDRINUSE.*8081/i,
          /metro.*bundler.*failed|bundler.*cache.*empty.*rebuilding/i,
          /waiting.*on.*http.*localhost.*8081/i,
          /logs.*for.*your.*project.*will.*appear.*below/i,
          /the.*following.*packages.*should.*be.*updated/i,
        ];
        
        expoPatterns.forEach((pattern) => {
          if (pattern.test(message)) {
            console.log('🔧 Detected Expo issue in console:', message);
            
            newErrors.push({
              id: errorId,
              message: `EXPO ISSUE: ${message}`,
              source: 'console',
              severity: 'error',
              category: 'expo',
              timestamp: output.timestamp,
              autoFixed: false,
            });
            processedErrorsRef.current.add(errorId);
          }
        });
      }
    });

    if (newErrors.length > 0) {
      const expoErrors = newErrors.filter(e => e.category === 'expo').length;
      console.log(`🔍 Auto-fix detected ${newErrors.length} new console errors (${expoErrors} Expo-specific)`);
      setDetectedErrors(prev => [...prev, ...newErrors]);
    }
  }, [enabled, selectedAppId]);

  // Detect errors from Problems tab
  const detectProblemsErrors = useCallback(() => {
    if (!enabled || !selectedAppId || !problemReport?.problems) return;

    const newErrors: DetectedError[] = [];
    
    problemReport.problems.forEach((problem) => {
      const errorId = `problems-${problem.file}-${problem.line}-${problem.message}`;
      if (processedErrorsRef.current.has(errorId)) return;
      
      // All problems tab errors are TypeScript errors
      newErrors.push({
        id: errorId,
        message: `${problem.file}:${problem.line}:${problem.column} - ${problem.message}`,
        source: 'problems',
        severity: 'error',
        category: 'typescript',
        timestamp: Date.now(),
        autoFixed: false,
      });
      processedErrorsRef.current.add(errorId);
    });

    if (newErrors.length > 0) {
      console.log(`🔍 Auto-fix detected ${newErrors.length} new problems from Problems tab`);
      setDetectedErrors(prev => [...prev, ...newErrors]);
    }
  }, [enabled, selectedAppId, problemReport]);

  // Auto-fix detected errors
  const autoFixErrors = useCallback(async () => {
    if (!enabled || !chatId || isStreaming || isAutoFixing || autoFixCount >= autoFixThreshold) {
      return;
    }

    const unfixedErrors = detectedErrors.filter(error => !error.autoFixed && error.severity === 'error');
    if (unfixedErrors.length === 0) return;

    console.log(`🔧 Auto-fixing ${unfixedErrors.length} detected errors...`);
    setIsAutoFixing(true);

    try {
      const prompt = createAutoFixPrompt(unfixedErrors);
      
      await streamMessage({
        prompt,
        chatId,
      });

      // Mark errors as auto-fixed
      setDetectedErrors(prev => 
        prev.map(error => 
          unfixedErrors.some(unfixed => unfixed.id === error.id)
            ? { ...error, autoFixed: true }
            : error
        )
      );

      setAutoFixCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
    } finally {
      setIsAutoFixing(false);
    }
  }, [enabled, chatId, isStreaming, isAutoFixing, autoFixCount, autoFixThreshold, detectedErrors, createAutoFixPrompt, streamMessage]);

  // Debounced auto-fix trigger
  useEffect(() => {
    if (!enabled) return;

    if (errorDebounceRef.current) {
      clearTimeout(errorDebounceRef.current);
    }

    errorDebounceRef.current = setTimeout(() => {
      autoFixErrors();
    }, debounceMs);

    return () => {
      if (errorDebounceRef.current) {
        clearTimeout(errorDebounceRef.current);
      }
    };
  }, [detectedErrors, enabled, debounceMs, autoFixErrors]);

  // Monitor Problems tab changes
  useEffect(() => {
    detectProblemsErrors();
  }, [problemReport, detectProblemsErrors]);

  // Reset when app changes
  useEffect(() => {
    setDetectedErrors([]);
    setAutoFixCount(0);
    processedErrorsRef.current.clear();
  }, [selectedAppId]);

  // Clear errors when app successfully starts (no errors for 10 seconds)
  useEffect(() => {
    if (detectedErrors.length === 0) return;

    const clearTimer = setTimeout(() => {
      // If no new errors in the last 10 seconds, clear old ones
      const now = Date.now();
      const recentErrors = detectedErrors.filter(error => now - error.timestamp < 10000);
      
      if (recentErrors.length === 0) {
        setDetectedErrors([]);
        console.log('🧹 Cleared old errors - app appears to be running successfully');
      }
    }, 10000);

    return () => clearTimeout(clearTimer);
  }, [detectedErrors]);

  // Manual trigger for fixing all errors
  const fixAllErrors = useCallback(async () => {
    if (!chatId) return;

    const allErrors = detectedErrors.filter(error => !error.autoFixed);
    if (allErrors.length === 0) return;

    const prompt = createAutoFixPrompt(allErrors);
    
    // Use the cheaper auto-fix streaming for cost efficiency
    const IpcClient = (await import("@/ipc/ipc_client")).IpcClient;
    const ipcClient = IpcClient.getInstance();
    
    // Use auto-fix streaming with cheaper model
    ipcClient.streamAutoFix(prompt, {
      selectedComponent: null,
      chatId: chatId,
      redo: false,
      onUpdate: () => {
        console.log("🔧 Auto-fix stream update received");
      },
      onEnd: () => {
        console.log("✅ Auto-fix stream completed successfully");
      },
      onError: (error) => {
        console.error("❌ Auto-fix stream error:", error);
      },
    });
    
    setDetectedErrors(prev => 
      prev.map(error => ({ ...error, autoFixed: true }))
    );
  }, [chatId, detectedErrors, createAutoFixPrompt]);

  // Enhanced Problems tab integration - trigger auto-fix when problems are detected
  const triggerProblemsAutoFix = useCallback(async () => {
    if (!enabled || !chatId || !problemReport?.problems?.length) return;

    // More aggressive auto-fix: trigger even if we haven't detected errors yet
    // This handles cases where Problems tab updates faster than our detection
    const hasUnfixedProblems = problemReport.problems.length > 0;
    
    if (hasUnfixedProblems && autoFixCount < autoFixThreshold && !isAutoFixing) {
      console.log(`🚀 Auto-triggering fix for ${problemReport.problems.length} Problems tab errors (aggressive mode)`);
      
      // Create errors from current problems if not already detected
      const currentProblemErrors: DetectedError[] = problemReport.problems.map(problem => ({
        id: `problems-${problem.file}-${problem.line}-${problem.message}`,
        message: `${problem.file}:${problem.line}:${problem.column} - ${problem.message}`,
        source: 'problems' as const,
        severity: 'error' as const,
        category: 'typescript' as const,
        timestamp: Date.now(),
        autoFixed: false,
      }));
      
      // Update detected errors and trigger fix
      setDetectedErrors(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newErrors = currentProblemErrors.filter(e => !existingIds.has(e.id));
        return [...prev, ...newErrors];
      });
      
      await autoFixErrors();
    }
  }, [enabled, chatId, problemReport, autoFixCount, autoFixThreshold, isAutoFixing, autoFixErrors, setDetectedErrors]);

  // Trigger auto-fix when new problems are detected
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerProblemsAutoFix();
    }, 500); // Reduced delay for faster response

    return () => clearTimeout(timer);
  }, [problemReport, triggerProblemsAutoFix]);

  return {
    detectedErrors,
    autoFixCount,
    isAutoFixing,
    detectConsoleErrors,
    fixAllErrors,
    triggerProblemsAutoFix,
    canAutoFix: autoFixCount < autoFixThreshold && !isAutoFixing,
  };
}

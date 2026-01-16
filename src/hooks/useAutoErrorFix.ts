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
  category: 'syntax' | 'runtime' | 'build' | 'expo' | 'typescript' | 'dependency';
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

// 🚀 ENABLED: Auto-fix re-enabled for Dyad-like behavior
const AUTO_FIX_DISABLED = false;

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
    enabled = false, // 🚨 DYAD PATTERN: Auto-fix disabled for web apps (manual only via Problems button)
    autoFixThreshold = 5,
    debounceMs = 2000,
  } = options;
  
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  
  // 🚨 SIMPLE: Only enable auto-fix for Expo console errors
  // User requested: "People may not technical to Copy paste from Console"
  // This is MUCH simpler than our previous approach - just dependency errors, posted ONCE
  const [isExpoApp, setIsExpoApp] = useState(false);
  
  // Detect if current app is Expo
  useEffect(() => {
    if (!selectedAppId) {
      setIsExpoApp(false);
      return;
    }
    
    IpcClient.getInstance()
      .getApp(selectedAppId)
      .then(app => {
        // Check both app.type and app.appType (different APIs might use different fields)
        const appType = app?.type || app?.appType || '';
        const isExpo = appType === 'expo' || appType === 'mobile';
        console.log('🔍 App type detection:', { selectedAppId, appType, isExpo, app });
        setIsExpoApp(isExpo);
      })
      .catch((error) => {
        console.error('Failed to detect app type:', error);
        setIsExpoApp(false);
      });
  }, [selectedAppId]);
  
  // 🚨 SIMPLE LOGIC: Only enable for Expo apps
  const simpleEnabled = enabled && isExpoApp;

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
- Keep versions aligned (expo@54.x, expo-router@~5.x)

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

  // 🚨 SIMPLE: Detect only Expo dependency errors from console (string input)
  const detectConsoleErrors = useCallback((logs: string) => {
    if (!simpleEnabled || !selectedAppId) return;

    // 🚨 SIMPLE: Only 3 common dependency patterns (what non-technical users hit)
    const patterns: ErrorPattern[] = [
      { pattern: /Unable to resolve ["']([^"']+)["']/i, severity: 'error', category: 'dependency', autoFixable: true },
      { pattern: /Module not found.*["']([^"']+)["']/i, severity: 'error', category: 'dependency', autoFixable: true },
      { pattern: /Cannot find module ["']([^"']+)["']/i, severity: 'error', category: 'dependency', autoFixable: true },
    ];

    const newErrors: DetectedError[] = [];

    for (const errorPattern of patterns) {
      const match = logs.match(errorPattern.pattern);
      if (match) {
        const packageName = match[1] || match[0].slice(0, 30);
        const errorId = `expo-dep-${packageName}`;
        
        // Don't re-process the same error
        if (processedErrorsRef.current.has(errorId)) continue;
        
        processedErrorsRef.current.add(errorId);
        newErrors.push({
          id: errorId,
          message: match[0],
          source: 'console',
          severity: errorPattern.severity,
          category: errorPattern.category,
          timestamp: Date.now(),
          autoFixed: false,
        });
      }
    }

    if (newErrors.length > 0) {
      console.log(`🔧 [Expo Helper] Detected ${newErrors.length} dependency errors for non-technical users`);
      setDetectedErrors(prev => [...prev, ...newErrors]);
    }
  }, [simpleEnabled, selectedAppId]);

  // 🚨 DISABLED: Problems tab auto-fix (Dyad pattern - manual only)
  const detectProblemsErrors = useCallback(() => {
    // Disabled to match Dyad's approach - only manual "Fix Problems" button
    return;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (!simpleEnabled || !selectedAppId || !problemReport?.problems) return;

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

  // Track if we're currently in an auto-fix to prevent re-entry
  const isAutoFixingRef = useRef(false);
  
  // 🚨 SIMPLE: Auto-fix detected Expo dependency errors ONCE
  const autoFixErrors = useCallback(async () => {
    // Prevent multiple simultaneous auto-fixes
    if (isAutoFixingRef.current) {
      console.log(`⏸️ Auto-fix already in progress (ref check), skipping...`);
      return;
    }
    
    // ✅ FIX: For Problems tab errors, don't require simpleEnabled - always allow for Expo apps
    const hasProblemsTabErrors = detectedErrors.some(e => e.source === 'problems' && !e.autoFixed);
    const hasDependencyErrors = detectedErrors.some(e => e.category === 'dependency' && !e.autoFixed);
    
    // Problems tab errors: only need isExpoApp and chatId
    // Dependency errors: need simpleEnabled (enabled && isExpoApp)
    if (hasProblemsTabErrors) {
      if (!isExpoApp || !chatId || isStreaming || isAutoFixing) {
        console.log('⏸️ Problems tab auto-fix blocked:', { isExpoApp, chatId, isStreaming, isAutoFixing });
        return;
      }
    } else if (hasDependencyErrors) {
      if (!simpleEnabled || !chatId || isStreaming || isAutoFixing) {
        console.log('⏸️ Dependency auto-fix blocked:', { simpleEnabled, chatId, isStreaming, isAutoFixing });
        return;
      }
    } else {
      console.log('⏸️ No errors to fix');
      return;
    }

    // ✅ FIX: Handle both dependency errors AND Problems tab errors
    const unfixedErrors = detectedErrors.filter(
      error => !error.autoFixed && 
               (error.category === 'dependency' || error.source === 'problems') &&
               error.severity === 'error'
    );
    
    if (unfixedErrors.length === 0) {
      console.log('⏸️ No unfixed errors found');
      return;
    }

    console.log(`🔧 AUTO-FIX EXECUTING: Fixing ${unfixedErrors.length} errors (dependency + problems tab)...`);
    isAutoFixingRef.current = true;
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
      
      // ✅ FIX: Re-check problems after auto-fix completes
      setTimeout(async () => {
        try {
          const IpcClient = (await import("@/ipc/ipc_client")).IpcClient;
          await IpcClient.getInstance().checkProblems({ appId: selectedAppId });
        } catch (error) {
          console.error('Failed to re-check problems after auto-fix:', error);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
    } finally {
      isAutoFixingRef.current = false;
      setIsAutoFixing(false);
    }
  }, [simpleEnabled, isExpoApp, chatId, isStreaming, isAutoFixing, detectedErrors, createAutoFixPrompt, streamMessage, selectedAppId]);

  // 🚨 CRITICAL FIX: Prevent auto-fix spam (5-6 times per error)
  const lastAutoFixTimeRef = useRef<number>(0);
  const lastErrorCountRef = useRef<number>(0);
  
  // 🚨 SIMPLE: Only auto-fix Expo console errors (dependency issues)
  useEffect(() => {
    // Only run for Expo apps
    if (!simpleEnabled) return;
    
    // Only if we have unfixed dependency errors
    const unfixedDependencyErrors = detectedErrors.filter(
      error => !error.autoFixed && 
               error.category === 'dependency' && 
               error.severity === 'error'
    );
    
    if (unfixedDependencyErrors.length === 0) return;

    // ✅ FIX: Allow re-triggering for Problems tab (remove "once per app" restriction)
    // Only prevent spam for console errors, not Problems tab errors
    // Problems tab auto-fix should be able to run multiple times if problems persist

    // Debounce (wait for errors to settle)
    if (errorDebounceRef.current) {
      clearTimeout(errorDebounceRef.current);
    }

    errorDebounceRef.current = setTimeout(() => {
      lastAutoFixTimeRef.current = Date.now();
      autoFixErrors();
    }, debounceMs);

    return () => {
      if (errorDebounceRef.current) {
        clearTimeout(errorDebounceRef.current);
      }
    };
  }, [detectedErrors, simpleEnabled, debounceMs, autoFixErrors]);

  // Monitor Problems tab changes
  useEffect(() => {
    detectProblemsErrors();
  }, [problemReport, detectProblemsErrors]);

  // Reset when app changes
  useEffect(() => {
    setDetectedErrors([]);
    setAutoFixCount(0);
    processedErrorsRef.current.clear();
    lastAutoFixTimeRef.current = 0; // Reset auto-fix timer
    lastErrorCountRef.current = 0; // Reset error count
    isAutoFixingRef.current = false; // Reset auto-fixing flag
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
    
    // 🚀 Return a Promise that resolves when the stream completes
    return new Promise<void>((resolve, reject) => {
      let isResolved = false;
      
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
          if (!isResolved) {
            isResolved = true;
            setDetectedErrors(prev => 
              prev.map(error => ({ ...error, autoFixed: true }))
            );
            resolve();
          }
        },
        onError: (error) => {
          console.error("❌ Auto-fix stream error:", error);
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        },
      });
    });
  }, [chatId, detectedErrors, createAutoFixPrompt]);

  // Enhanced Problems tab integration - trigger auto-fix when problems are detected
  const triggerProblemsAutoFix = useCallback(async () => {
    console.log('🔍 triggerProblemsAutoFix called', {
      isExpoApp,
      chatId,
      isStreaming,
      problemCount: problemReport?.problems?.length || 0,
      selectedAppId,
      isAutoFixing
    });

    // ✅ FIX: Enable Problems tab auto-fix for Expo apps (regardless of enabled option)
    if (!isExpoApp) {
      console.log('⏸️ Auto-fix only available for Expo apps', { isExpoApp, selectedAppId });
      return;
    }
    if (!chatId) {
      console.log('⏸️ No chatId available', { chats: chats?.length, selectedAppId });
      return;
    }
    if (isStreaming) {
      console.log('⏸️ Chat is streaming, skipping auto-fix', { isStreaming });
      return;
    }
    if (!problemReport?.problems?.length) {
      console.log('⏸️ No problems detected', { problemReport });
      return;
    }
    if (isAutoFixing) {
      console.log('⏸️ Auto-fix already in progress, skipping...');
      return;
    }

    // ✅ FIX: Check for auto-fixable problems only
    const autoFixableProblems = problemReport.problems.filter(p => p.autoFixable);
    console.log(`🔍 Found ${problemReport.problems.length} total problems, ${autoFixableProblems.length} auto-fixable`, {
      problems: problemReport.problems.map(p => ({ file: p.file, line: p.line, autoFixable: p.autoFixable }))
    });
    if (autoFixableProblems.length === 0) {
      console.log('⏸️ No auto-fixable problems found - all problems:', problemReport.problems);
      return;
    }

    console.log(`🚀 AUTO-FIX STARTING: Fixing ${autoFixableProblems.length} Problems tab errors`);
    
    // Create errors from current auto-fixable problems
    const currentProblemErrors: DetectedError[] = autoFixableProblems.map(problem => ({
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
      console.log(`📝 Adding ${newErrors.length} new errors to detectedErrors`);
      return [...prev, ...newErrors];
    });
    
    // ✅ CRITICAL: Call autoFixErrors directly (it will handle the actual fix)
    await autoFixErrors();
  }, [isExpoApp, chatId, isStreaming, problemReport, isAutoFixing, autoFixErrors, setDetectedErrors, chats, selectedAppId]);

  // ✅ FIX: Re-check problems after stream completes (handled by main effect above)
  // Removed duplicate effect - main effect handles this now

  // ✅ CRITICAL FIX: Auto-trigger fix when streaming stops and problems exist
  useEffect(() => {
    // console.log('🔍 Auto-fix effect running...', {
    //   isExpoApp,
    //   isStreaming,
    //   problemCount: problemReport?.problems?.length || 0,
    //   chatId,
    //   chatsCount: chats?.length || 0,
    //   isAutoFixing,
    //   selectedAppId
    // });

    // Must have: Expo app, not streaming, problems exist
    if (!isExpoApp) {
      // console.log('⏸️ Not an Expo app, skipping auto-fix');
      return;
    }
    
    if (isStreaming) {
      console.log('⏸️ Chat is streaming, waiting for stream to complete...');
      return;
    }

    if (!problemReport?.problems?.length) {
      console.log('⏸️ No problems detected');
      return;
    }

    // ✅ FIX: Wait for chatId to be available (chats might still be loading)
    if (!chatId) {
      console.log('⏸️ No chatId available yet, waiting for chats to load...', { 
        chats: chats?.length,
        chatsData: chats 
      });
      
      // Wait for chats to load, then retry
      const timer = setTimeout(() => {
        const updatedChatId = chats?.[0]?.id;
        if (updatedChatId && !isStreaming && problemReport?.problems?.length > 0) {
          console.log('✅ ChatId loaded, retrying auto-fix...', { updatedChatId });
          // Re-trigger by calling triggerProblemsAutoFix with updated chatId
          // The effect will re-run when chatId changes
        } else if (!updatedChatId) {
          console.log('⏸️ Still no chatId after wait, cannot auto-fix');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (isAutoFixing) {
      console.log('⏸️ Auto-fix already in progress');
      return;
    }

    // ✅ FIX: Remove "once per app" restriction - allow re-triggering if problems persist
    // Check if we have auto-fixable problems
    const autoFixableProblems = problemReport.problems.filter(p => p.autoFixable);
    if (autoFixableProblems.length === 0) {
      console.log('⏸️ No auto-fixable problems found', {
        totalProblems: problemReport.problems.length,
        problems: problemReport.problems.map(p => ({ file: p.file, line: p.line, autoFixable: p.autoFixable }))
      });
      return;
    }

    console.log('🚀 AUTO-FIX TRIGGERED: Streaming stopped, problems detected', {
      problemCount: problemReport.problems.length,
      autoFixableCount: autoFixableProblems.length,
      isStreaming,
      isExpoApp,
      chatId,
      selectedAppId
    });

    // Trigger immediately (no delay) since streaming already stopped
    triggerProblemsAutoFix();
  }, [isStreaming, problemReport, isExpoApp, chatId, isAutoFixing, selectedAppId, triggerProblemsAutoFix, chats]);

  // 🚨 NEW: Detect Expo dependency errors from terminal output
  const detectExpoDependencyErrors = useCallback((terminalOutput: string) => {
    if (!enabled || !terminalOutput) return;
    
    const dependencyPatterns = [
      /Unable to resolve\s+"([^"]+)"/gi,
      /Module not found:\s+Can't resolve\s+'([^']+)'/gi,
      /Cannot find module\s+'([^']+)'/gi,
      /Error:\s+Cannot find module\s+'([^']+)'/gi,
    ];
    
    const newErrors: DetectedError[] = [];
    
    dependencyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(terminalOutput)) !== null) {
        const packageName = match[1] || match[0];
        const errorId = `expo-dep-${packageName}`;
        
        // Don't re-process same error
        if (processedErrorsRef.current.has(errorId)) continue;
        
        processedErrorsRef.current.add(errorId);
        newErrors.push({
          id: errorId,
          message: `Missing Expo dependency: ${packageName}`,
          severity: 'error',
          category: 'dependency',
          autoFixed: false,
          timestamp: Date.now(),
        });
        
        console.log(`🔍 Detected Expo dependency error: ${packageName}`);
      }
    });
    
    if (newErrors.length > 0) {
      setDetectedErrors(prev => [...prev, ...newErrors]);
    }
  }, [enabled]);

  // 🚨 NEW: Detect Expo runtime errors from error logs (like Haptic.impactAsync errors)
  const detectExpoRuntimeErrors = useCallback((errorLog: string) => {
    if (!enabled || !errorLog) return;
    
    const runtimePatterns = [
      // Haptic/Vibration errors
      /Haptic\.\w+\s+is not available on web/gi,
      /Vibration\.\w+\s+is not available/gi,
      // Native module errors
      /The method or property\s+(\w+\.\w+)\s+is not available/gi,
      // Expo module errors
      /Expo\.\w+\s+is not available/gi,
      // Platform-specific errors
      /not available on (web|ios|android)/gi,
      // General runtime errors
      /Uncaught Error:\s+(.+)/gi,
      /TypeError:\s+(.+)/gi,
    ];
    
    const newErrors: DetectedError[] = [];
    
    runtimePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(errorLog)) !== null) {
        const errorMessage = match[0];
        const errorId = `expo-runtime-${errorMessage.substring(0, 50)}`;
        
        // Don't re-process same error
        if (processedErrorsRef.current.has(errorId)) continue;
        
        processedErrorsRef.current.add(errorId);
        newErrors.push({
          id: errorId,
          message: `Expo runtime error: ${errorMessage}`,
          severity: 'error',
          category: 'expo',
          autoFixed: false,
          timestamp: Date.now(),
        });
        
        console.log(`🔍 Detected Expo runtime error: ${errorMessage}`);
      }
    });
    
    if (newErrors.length > 0) {
      setDetectedErrors(prev => [...prev, ...newErrors]);
    }
  }, [enabled]);

  return {
    detectedErrors,
    autoFixCount,
    isAutoFixing,
    detectConsoleErrors,
    detectExpoDependencyErrors, // Export for Expo components
    detectExpoRuntimeErrors, // Export for Expo runtime error detection
    fixAllErrors,
    triggerProblemsAutoFix,
    canAutoFix: autoFixCount < autoFixThreshold && !isAutoFixing,
  };
}

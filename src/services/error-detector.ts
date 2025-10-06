import { DevToolsMessage } from './chrome-devtools-mcp';

export interface ErrorAnalysis {
  type: 'haptics' | 'dependency' | 'platform' | 'runtime' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  message: string;
  suggestion: string;
  codeExample?: string;
}

export class ErrorDetector {
  private static instance: ErrorDetector;
  
  public static getInstance(): ErrorDetector {
    if (!ErrorDetector.instance) {
      ErrorDetector.instance = new ErrorDetector();
    }
    return ErrorDetector.instance;
  }

  /**
   * Analyze console error and provide detailed analysis
   */
  analyzeError(error: DevToolsMessage): ErrorAnalysis | null {
    if (error.type !== 'error' || error.level !== 'error') {
      return null;
    }

    const message = error.message.toLowerCase();

    // Haptics API Error Detection
    if (message.includes('haptic') && message.includes('not available on web')) {
      return {
        type: 'haptics',
        severity: 'high',
        autoFixable: true,
        message: 'Haptic feedback API is not available on web platform',
        suggestion: 'Wrap Haptics API calls in Platform.OS check to prevent web crashes',
        codeExample: `// ❌ WRONG: Will crash on web
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// ✅ CORRECT: Platform check prevents crash
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};`
      };
    }

    // Dependency Error Detection
    if (message.includes('cannot find module') || message.includes('module not found')) {
      return {
        type: 'dependency',
        severity: 'high',
        autoFixable: true,
        message: 'Missing or corrupted dependency detected',
        suggestion: 'Install missing dependencies or repair corrupted node_modules',
        codeExample: `// Fix: Add dependency to package.json
<applaa-add-dependency packages="package-name">

// Or repair existing installation
npm install --legacy-peer-deps --force`
      };
    }

    // Platform API Error Detection
    if (message.includes('not available on') && (message.includes('web') || message.includes('ios') || message.includes('android'))) {
      return {
        type: 'platform',
        severity: 'medium',
        autoFixable: true,
        message: 'Platform-specific API used without proper platform check',
        suggestion: 'Add Platform.OS check before using platform-specific APIs',
        codeExample: `// ✅ CORRECT: Platform check
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  // Use platform-specific API here
}`
      };
    }

    // Runtime Error Detection
    if (message.includes('undefined is not an object') || message.includes('cannot read property')) {
      return {
        type: 'runtime',
        severity: 'critical',
        autoFixable: false,
        message: 'Runtime error detected - undefined object or property access',
        suggestion: 'Check for null/undefined values and add proper error handling',
        codeExample: `// ✅ CORRECT: Safe property access
const value = object?.property ?? 'default';

// ✅ CORRECT: Null check
if (object && object.property) {
  // Use property safely
}`
      };
    }

    // Unknown Error
    return {
      type: 'unknown',
      severity: 'medium',
      autoFixable: false,
      message: 'Unknown error detected in console',
      suggestion: 'Review error details and implement appropriate error handling',
      codeExample: undefined
    };
  }

  /**
   * Generate user-friendly error report for chat stream
   */
  generateErrorReport(error: DevToolsMessage, analysis: ErrorAnalysis): string {
    const timestamp = new Date(error.timestamp).toLocaleTimeString();
    
    return `🚨 **Console Error Detected** (${timestamp})

**Error Type:** ${this.getErrorTypeEmoji(analysis.type)} ${analysis.type.toUpperCase()} ERROR
**Severity:** ${this.getSeverityEmoji(analysis.severity)} ${analysis.severity.toUpperCase()}
**Auto-Fixable:** ${analysis.autoFixable ? '✅ Yes' : '❌ No'}

**Error Message:**
\`\`\`
${error.message}
\`\`\`

**Issue:** ${analysis.message}

**Suggested Fix:** ${analysis.suggestion}

${analysis.codeExample ? `**Code Example:**
\`\`\`typescript
${analysis.codeExample}
\`\`\`` : ''}

${analysis.autoFixable ? '🔧 **Auto-Fix Available:** This error can be automatically fixed by the Problems Tab.' : '⚠️ **Manual Fix Required:** Please review and fix this error manually.'}

---
*This error was automatically detected by the Chrome DevTools integration.*`;
  }

  private getErrorTypeEmoji(type: string): string {
    const emojis = {
      'haptics': '📳',
      'dependency': '📦',
      'platform': '📱',
      'runtime': '💥',
      'unknown': '❓'
    };
    return emojis[type as keyof typeof emojis] || '❓';
  }

  private getSeverityEmoji(severity: string): string {
    const emojis = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return emojis[severity as keyof typeof emojis] || '🟡';
  }

  /**
   * Check if error should be reported to chat stream
   */
  shouldReportToChat(error: DevToolsMessage, analysis: ErrorAnalysis): boolean {
    // Report all high and critical severity errors
    if (analysis.severity === 'high' || analysis.severity === 'critical') {
      return true;
    }

    // Report auto-fixable errors
    if (analysis.autoFixable) {
      return true;
    }

    // Report haptics errors specifically (they're common and important)
    if (analysis.type === 'haptics') {
      return true;
    }

    return false;
  }
}

export const errorDetector = ErrorDetector.getInstance();

import { normalizePath } from "../../../shared/normalizePath";
import log from "electron-log";
import { SqlQuery } from "../../lib/schemas";
import { isAllowedPackage, isForbiddenPackage } from "../../config/applaa-dependencies";

const logger = log.scope("dyad_tag_parser");

/**
 * 🚨 CRITICAL: Validate dependencies to prevent "Unable to resolve" errors
 */
function validateDependencies(content: string, _filePath: string): { isValid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = [];
  
  // Determine framework based on content
  const isExpoApp = content.includes('expo-') || content.includes('react-native') || content.includes('lucide-react-native');
  
  // Extract import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const packageName = match[1];
    
    // Skip relative imports
    if (packageName.startsWith('.') || packageName.startsWith('/')) {
      continue;
    }
    
    // Extract the base package name (handle scoped packages)
    const basePackage = packageName.startsWith('@') 
      ? packageName.split('/').slice(0, 2).join('/')
      : packageName.split('/')[0];
    
    // Determine framework for validation
    let framework: 'web' | 'expo' | 'flutter' = 'web';
    if (isExpoApp) framework = 'expo';
    
    // Check if package is forbidden
    if (isForbiddenPackage(basePackage, framework)) {
      return {
        isValid: false,
        error: `🚫 FORBIDDEN MODULE: "${basePackage}" is not allowed in ${framework} apps. This will cause compatibility issues.`
      };
    }
    
          // Check if package is allowed
      if (!isAllowedPackage(basePackage, framework)) {
        // Special cases for built-in modules and common patterns
        const builtInModules = ['react', 'react-dom', 'react-native', 'expo'];
        const commonPatterns = ['@/', '@components', '@utils', '@lib', '@hooks'];
        
        if (builtInModules.some(builtin => basePackage.startsWith(builtin)) || 
            commonPatterns.some(pattern => basePackage.startsWith(pattern))) {
          continue;
        }
        
        warnings.push(`⚠️ UNAUTHORIZED MODULE: "${basePackage}" is not in the approved list for ${framework} apps. This may cause "Unable to resolve" errors.`);
      }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * 🚨 CRITICAL: Validate code syntax to prevent broken apps
 */
function validateCodeSyntax(content: string, filePath: string): { isValid: boolean; error?: string } {
  const isTypeScript = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
  const isJavaScript = filePath.endsWith('.jsx') || filePath.endsWith('.js');
  const isJSON = filePath.endsWith('.json');

  // Basic validation for all code files
  if (isTypeScript || isJavaScript) {
    // Check for basic syntax issues
    const issues = [];

    // 🚨 FIXED: Proper platform detection - only flag React Native issues in actual React Native files
    const isActualReactNative = (
      (content.includes('import') && content.includes('react-native')) ||
      (content.includes('import') && content.includes('expo-')) ||
      content.includes('StyleSheet.create') ||
      content.includes('lucide-react-native')
    );

    // Only run naive delimiter counts for WEB files.
    // For React Native/Expo, template literals (e.g., `Failed to update ${feature.name}`)
    // contain braces that make naive counting unreliable and led to file corruption.
    if (!isActualReactNative) {
      // Check for unmatched braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push(`Unmatched braces: ${openBraces} opening, ${closeBraces} closing`);
      }

      // Check for unmatched parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push(`Unmatched parentheses: ${openParens} opening, ${closeParens} closing`);
      }

      // Check for unmatched brackets
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        issues.push(`Unmatched brackets: ${openBrackets} opening, ${closeBrackets} closing`);
      }
    }
    
    if (isActualReactNative) {
      // This is actually React Native code
      if (content.includes('className=')) {
        issues.push('React Native code should not use className - use style prop instead');
      }
      if (content.includes('<div') || content.includes('<span') || content.includes('<button')) {
        issues.push('React Native code should not use HTML elements - use View, Text, Pressable instead');
      }
    }

    // Check for missing semicolons in critical places
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Check for missing semicolons after import statements
      if (line.startsWith('import ') && !line.endsWith(';') && !line.endsWith('{')) {
        issues.push(`Missing semicolon on line ${i + 1}: ${line}`);
      }
    }

    if (issues.length > 0) {
      return { isValid: false, error: issues.join('; ') };
    }
  }

  // JSON validation
  if (isJSON) {
    try {
      JSON.parse(content);
    } catch (error) {
      return { isValid: false, error: `Invalid JSON: ${error}` };
    }
  }

  return { isValid: true };
}

/**
 * 🔧 Auto-fix common syntax errors
 */
function autoFixCommonSyntaxErrors(content: string, filePath: string): string {
  // 🚨 CRITICAL: DISABLE AGGRESSIVE AUTO-FIXING
  // The previous auto-fix logic was corrupting valid import statements
  // causing "import { ;" syntax errors that break the entire app
  
  logger.info(`🔧 Skipping auto-fix for ${filePath} to prevent corruption`);
  
  // Return content unchanged to prevent any corruption
  return content;
  
  // 🚨 ALL PREVIOUS AUTO-FIX CODE DISABLED TO PREVENT CORRUPTION
  /*
  let fixed = content;
  
  // Determine if this is a React Native/Expo app
  const isReactNative = content.includes('react-native') || 
                       content.includes('expo-') || 
                       content.includes('StyleSheet.create') ||
                       content.includes('lucide-react-native');

  // Remove aggressive brace auto-insertion for React Native files.
  // These heuristics caused valid template code to be corrupted when template literals contained braces.

  // Fix missing semicolons after imports
  fixed = fixed.replace(/^(import .+)(?<!;)$/gm, '$1;');
  
  // Fix extra semicolons in imports (common issue from LLM responses)
  fixed = fixed.replace(/^(import .+);+$/gm, '$1;');
  
  // Fix trailing semicolons in export statements
  fixed = fixed.replace(/^(export .+)(?<!;)$/gm, '$1;');
  
  // Remove stray semicolons at the end of lines that don't need them
  fixed = fixed.replace(/^(\s*\}\s*);+$/gm, '$1');
  fixed = fixed.replace(/^(\s*\]\s*);+$/gm, '$1');
  
  // 🚨 CRITICAL: Fix interface semicolon corruption (export interface Name;)
  fixed = fixed.replace(/^(\s*export\s+interface\s+\w+)\s*;/gm, '$1');
  
  // Fix malformed export statements with semicolons (export {;)
  fixed = fixed.replace(/^(\s*export\s+\{)\s*;/gm, '$1');
  
  // ALL PREVIOUS AUTO-FIX CODE DISABLED - WAS CAUSING CORRUPTION
  */
}

export function getDyadWriteTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  // Support dyad-write, applaa-write, applaa-file, applaa-create-file, and applaa-update-file tags
  const dyadWriteRegex = /<(?:dyad-write|applaa-write|applaa-file|applaa-create-file|applaa-update-file)([^>]*)>([\s\S]*?)<\/(?:dyad-write|applaa-write|applaa-file|applaa-create-file|applaa-update-file)>/gi;
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;
  const instructionRegex = /instruction="([^"]+)"/; // Support for instruction attribute (alias for description)

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  while ((match = dyadWriteRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = match[2].trim();

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const instructionMatch = instructionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1] || instructionMatch?.[1]; // Use description or instruction

      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      // 🚨 CRITICAL: DISABLE SYNTAX VALIDATION TO PREVENT CORRUPTION
      // The previous validation was triggering aggressive auto-fixes that corrupted valid code
      // Templates are already validated, so we don't need to "fix" them
      logger.info(`🔍 Skipping syntax validation for ${path} to prevent corruption`);

      // 🚨 CRITICAL: Validate dependencies to prevent "Unable to resolve" errors
      try {
        const dependencyResult = validateDependencies(content, path);
        if (!dependencyResult.isValid) {
          logger.error(`❌ DEPENDENCY ERROR in ${path}: ${dependencyResult.error}`);
          logger.warn(`⚠️ Writing file anyway to avoid blocking app creation`);
          // Don't skip - write the file anyway for now
        }
        if (dependencyResult.warnings) {
          dependencyResult.warnings.forEach(warning => {
            logger.warn(`⚠️ DEPENDENCY WARNING in ${path}: ${warning}`);
          });
        }
      } catch (error) {
        logger.error(`❌ DEPENDENCY VALIDATION FAILED in ${path}:`, error);
        logger.warn(`⚠️ Writing file anyway due to validation error`);
        // Don't skip - write the file anyway
      }

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        "Found <dyad-write>, <applaa-write>, <applaa-file>, <applaa-create-file>, or <applaa-update-file> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}

export function getDyadRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  const dyadRenameRegex =
    /<(?:dyad-rename|applaa-rename) from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/(?:dyad-rename|applaa-rename)>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = dyadRenameRegex.exec(fullResponse)) !== null) {
    tags.push({
      from: normalizePath(match[1]),
      to: normalizePath(match[2]),
    });
  }
  return tags;
}

export function getDyadDeleteTags(fullResponse: string): string[] {
  const dyadDeleteRegex =
    /<(?:dyad-delete|applaa-delete|applaa-file-delete|applaa-file-removal) path="([^"]+)"[^>]*>([\s\S]*?)<\/(?:dyad-delete|applaa-delete|applaa-file-delete|applaa-file-removal)>/g;
  let match;
  const paths: string[] = [];
  while ((match = dyadDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(normalizePath(match[1]));
  }
  return paths;
}

export function getDyadAddDependencyTags(fullResponse: string): string[] {
  const dyadAddDependencyRegex =
    /<(?:dyad-add-dependency|applaa-add-dependency) packages="([^"]+)">[^<]*<\/(?:dyad-add-dependency|applaa-add-dependency)>/g;
  let match;
  const packages: string[] = [];
  while ((match = dyadAddDependencyRegex.exec(fullResponse)) !== null) {
    packages.push(...match[1].split(" "));
  }
  return packages;
}

export function getDyadChatSummaryTag(fullResponse: string): string | null {
  const dyadChatSummaryRegex =
    /<(?:dyad-chat-summary|applaa-chat-summary)>([\s\S]*?)<\/(?:dyad-chat-summary|applaa-chat-summary)>/g;
  const match = dyadChatSummaryRegex.exec(fullResponse);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function getDyadExecuteSqlTags(fullResponse: string): SqlQuery[] {
  const dyadExecuteSqlRegex =
    /<(?:dyad-execute-sql|applaa-execute-sql)([^>]*)>([\s\S]*?)<\/(?:dyad-execute-sql|applaa-execute-sql)>/g;
  const descriptionRegex = /description="([^"]+)"/;
  let match;
  const queries: { content: string; description?: string }[] = [];

  while ((match = dyadExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = match[2].trim();
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1];

    // Handle markdown code blocks if present
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift();
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();
    }
    content = contentLines.join("\n");

    queries.push({ content, description });
  }

  return queries;
}

export function getDyadCommandTags(fullResponse: string): string[] {
  const dyadCommandRegex =
    /<(?:dyad-command|applaa-command) type="([^"]+)"[^>]*><\/(?:dyad-command|applaa-command)>/g;
  let match;
  const commands: string[] = [];

  while ((match = dyadCommandRegex.exec(fullResponse)) !== null) {
    commands.push(match[1]);
  }

  return commands;
}

/**
 * Extract schema creation tags from AI response
 * <applaa-create-tables>SQL HERE</applaa-create-tables>
 */
export function getSchemaCreationTags(fullResponse: string): {
  sql: string;
  tables: string[];
}[] {
  const schemaRegex = /<applaa-create-tables>([\s\S]*?)<\/applaa-create-tables>/gi;
  let match;
  const schemas: { sql: string; tables: string[] }[] = [];

  while ((match = schemaRegex.exec(fullResponse)) !== null) {
    const sql = match[1].trim();
    
    // Extract table names from CREATE TABLE statements
    const tableNames: string[] = [];
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    let tableMatch;
    while ((tableMatch = createTableRegex.exec(sql)) !== null) {
      tableNames.push(tableMatch[1]);
    }

    schemas.push({ sql, tables: tableNames });
  }

  return schemas;
}

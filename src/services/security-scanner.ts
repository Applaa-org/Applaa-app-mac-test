/**
 * Security Scanner Service
 * Uses AI to scan apps for security vulnerabilities
 * Similar to Dyad's security review feature
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { streamText } from 'ai';
import type { UserSettings } from '@/lib/schemas';
import type { LargeLanguageModel } from '@/lib/schemas';
import { getModelClient } from '@/ipc/utils/get_model_client';
import log from 'electron-log';

const logger = log.scope('security_scanner');

export interface SecurityIssue {
  id: string;
  level: 'high' | 'medium' | 'low';
  issue: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  fixable: boolean;
  relevantFiles?: string[];
}

export interface SecurityReviewResult {
  issues: SecurityIssue[];
  lastReviewed: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export class SecurityScanner {
  private appPath: string;
  private settings: UserSettings;
  private model: LargeLanguageModel;

  constructor(appPath: string, settings: UserSettings, model: LargeLanguageModel) {
    this.appPath = appPath;
    this.settings = settings;
    this.model = model;
  }

  /**
   * Scan app for security issues using AI
   * This matches Dyad's approach of using AI to analyze code
   */
  async scanForSecurityIssues(): Promise<SecurityIssue[]> {
    try {
      logger.info(`Starting AI-based security scan for app at ${this.appPath}`);
      
      // Get all source files
      const files = await glob('**/*.{tsx,ts,jsx,js}', { 
        cwd: this.appPath, 
        ignore: ['node_modules/**', 'dist/**', 'build/**', '*.d.ts'] 
      });

      if (files.length === 0) {
        logger.warn('No source files found for security scan');
        return [];
      }

      // Read all files (limit to 30 files for performance and token limits)
      const fileContents: Array<{ path: string; content: string }> = [];
      for (const file of files.slice(0, 30)) {
        try {
          const filePath = path.join(this.appPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          // Limit content size per file (first 1000 chars)
          fileContents.push({ 
            path: file, 
            content: content.substring(0, 1000) 
          });
        } catch (error) {
          logger.warn(`Failed to read file ${file}:`, error);
        }
      }

      if (fileContents.length === 0) {
        logger.warn('No files could be read for security scan');
        return [];
      }

      // Use AI to analyze code for security issues
      const issues = await this.analyzeWithAI(fileContents);
      
      logger.info(`Security scan completed: found ${issues.length} issues`);
      return issues;
    } catch (error) {
      logger.error('Security scan failed:', error);
      // Fallback to pattern matching if AI fails
      return this.fallbackPatternScanning();
    }
  }

  /**
   * Use AI to analyze code for security vulnerabilities
   */
  private async analyzeWithAI(
    files: Array<{ path: string; content: string }>
  ): Promise<SecurityIssue[]> {
    try {
      // Get model client
      const { modelClient } = await getModelClient(this.model, this.settings);
      
      // Create code context
      const codeContext = files
        .map(f => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n');

      const securityPrompt = `Analyze the following code for security vulnerabilities. Look for:

1. **XSS vulnerabilities**: User input stored in localStorage and rendered without sanitization (dangerouslySetInnerHTML, innerHTML)
2. **Sensitive data in localStorage**: Passwords, tokens, API keys, or personal information stored in localStorage
3. **Insecure API calls**: HTTP instead of HTTPS (excluding localhost/127.0.0.1)
4. **Exposed secrets**: API keys, tokens, or passwords hardcoded in source code
5. **Missing input validation**: Form inputs without proper validation
6. **SQL injection risks**: Unsanitized database queries
7. **CSRF vulnerabilities**: Missing CSRF protection
8. **Authentication issues**: Weak or missing authentication

For each issue found, provide a JSON object with:
- id: unique identifier (e.g., "xss-app-index-42")
- level: "high", "medium", or "low"
- issue: Short title (e.g., "Client-Side XSS via Stored User Input")
- description: Detailed explanation of the vulnerability
- file: File path where issue was found
- line: Line number (if applicable, otherwise omit)
- fixable: true (AI can fix it)
- relevantFiles: Array of file paths related to this issue

Return ONLY a valid JSON array of security issues. Example format:
[
  {
    "id": "xss-app-index-42",
    "level": "high",
    "issue": "Client-Side XSS via Stored User Input",
    "description": "The application stores user-provided data in localStorage and then renders it directly into the DOM using dangerouslySetInnerHTML, which can lead to XSS attacks.",
    "file": "app/index.tsx",
    "line": 42,
    "fixable": true,
    "relevantFiles": ["app/index.tsx"]
  }
]

Code to analyze:
${codeContext}

Return a JSON array of security issues:`;

      // Use AI to analyze
      const result = await streamText({
        model: modelClient.model,
        messages: [
          {
            role: 'user',
            content: securityPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent security analysis
        maxTokens: 2000,
      });

      // Extract full response
      let fullResponse = '';
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
      }

      // Parse JSON from response
      const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const issues = JSON.parse(jsonMatch[0]) as SecurityIssue[];
          // Validate and add unique IDs if missing
          return issues.map((issue, index) => ({
            ...issue,
            id: issue.id || `security-issue-${index}-${Date.now()}`,
            fixable: issue.fixable !== undefined ? issue.fixable : true,
            level: issue.level || 'medium',
          }));
        } catch (parseError) {
          logger.error('Failed to parse AI response as JSON:', parseError);
          logger.debug('AI response:', fullResponse);
        }
      }

      logger.warn('No valid JSON array found in AI response');
      logger.debug('AI response:', fullResponse.substring(0, 500));
      
      // Fallback to pattern matching
      return this.fallbackPatternScanning();
    } catch (error) {
      logger.error('AI security analysis failed:', error);
      // Fallback to pattern matching if AI fails
      return this.fallbackPatternScanning();
    }
  }

  /**
   * Fallback pattern-based scanning if AI fails
   */
  private async fallbackPatternScanning(): Promise<SecurityIssue[]> {
    logger.info('Using fallback pattern-based scanning');
    const issues: SecurityIssue[] = [];

    // Check for XSS vulnerabilities
    issues.push(...await this.checkXSSVulnerabilities());
    
    // Check for sensitive data in localStorage
    issues.push(...await this.checkLocalStorageUsage());
    
    // Check for insecure API calls
    issues.push(...await this.checkInsecureAPIs());
    
    // Check for exposed secrets
    issues.push(...await this.checkExposedSecrets());
    
    // Check for missing input validation
    issues.push(...await this.checkInputValidation());

    return issues;
  }

  /**
   * Check for XSS vulnerabilities (stored user input rendered without sanitization)
   */
  private async checkXSSVulnerabilities(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js}', { cwd: this.appPath, ignore: ['node_modules/**', 'dist/**', 'build/**'] });

    for (const file of files) {
      try {
        const filePath = path.join(this.appPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Check for localStorage.getItem followed by dangerouslySetInnerHTML or innerHTML
        const localStorageGetPattern = /localStorage\.getItem\([^)]+\)/g;
        const dangerousRenderPattern = /(dangerouslySetInnerHTML|innerHTML)\s*=/g;
        
        if (localStorageGetPattern.test(content) && dangerousRenderPattern.test(content)) {
          const lines = content.split('\n');
          const localStorageLine = lines.findIndex(line => localStorageGetPattern.test(line));
          
          issues.push({
            id: `xss-${file}-${localStorageLine}`,
            level: 'high',
            issue: 'Client-Side XSS via Stored User Input',
            description: `The application stores user-provided data in localStorage and then renders it directly into the DOM within the component. localStorage is not encrypted and can be accessed by any script on the page, making it unsuitable for sensitive data like passwords, tokens, or personal information.`,
            file,
            line: localStorageLine + 1,
            fixable: true,
            relevantFiles: [file]
          });
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return issues;
  }

  /**
   * Check for sensitive data stored in localStorage
   */
  private async checkLocalStorageUsage(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js}', { cwd: this.appPath, ignore: ['node_modules/**', 'dist/**', 'build/**'] });

    for (const file of files) {
      try {
        const filePath = path.join(this.appPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Check for localStorage.setItem
        const localStorageSetPattern = /localStorage\.setItem\([^,]+,\s*[^)]+\)/g;
        const matches = content.match(localStorageSetPattern);
        
        if (matches && matches.length > 0) {
          const lines = content.split('\n');
          const setItemLine = lines.findIndex(line => localStorageSetPattern.test(line));
          
          // Check if storing user data (not just simple flags)
          const hasUserData = /(user|data|item|todo|note|content|text|value)/i.test(content);
          
          if (hasUserData) {
            issues.push({
              id: `localstorage-${file}-${setItemLine}`,
              level: 'medium',
              issue: 'Sensitive Data in Local Storage',
              description: `The application stores all data, including their text and completion status, directly in the browser's localStorage. localStorage is not encrypted and can be accessed by any script on the page, making it unsuitable for sensitive data like passwords, tokens, or personal information.`,
              file,
              line: setItemLine + 1,
              fixable: true,
              relevantFiles: [file]
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return issues;
  }

  /**
   * Check for insecure API calls (HTTP instead of HTTPS, missing auth, etc.)
   */
  private async checkInsecureAPIs(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js}', { cwd: this.appPath, ignore: ['node_modules/**', 'dist/**', 'build/**'] });

    for (const file of files) {
      try {
        const filePath = path.join(this.appPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Check for HTTP URLs (not localhost or private networks)
        const httpPattern = /http:\/\/(?!localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)[^\s"']+/g;
        const matches = content.match(httpPattern);
        
        if (matches) {
          const lines = content.split('\n');
          matches.forEach(match => {
            const lineIndex = lines.findIndex(line => line.includes(match));
            if (lineIndex >= 0) {
              issues.push({
                id: `insecure-api-${file}-${lineIndex}`,
                level: 'medium',
                issue: 'Insecure HTTP API Call',
                description: `The application makes API calls over HTTP instead of HTTPS. This exposes data to man-in-the-middle attacks and should be changed to HTTPS.`,
                file,
                line: lineIndex + 1,
                fixable: true,
                relevantFiles: [file]
              });
            }
          });
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return issues;
  }

  /**
   * Check for exposed secrets (API keys, tokens in code)
   */
  private async checkExposedSecrets(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js,env,json}', { cwd: this.appPath, ignore: ['node_modules/**', 'dist/**', 'build/**', '.env.local', '.env.production'] });

    for (const file of files) {
      try {
        const filePath = path.join(this.appPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Check for common secret patterns (but exclude common false positives)
        const secretPatterns = [
          {
            pattern: /(api[_-]?key|apikey)\s*[=:]\s*['"]([^'"]{20,})['"]/i,
            name: 'API Key'
          },
          {
            pattern: /(secret|secret[_-]?key)\s*[=:]\s*['"]([^'"]{20,})['"]/i,
            name: 'Secret Key'
          },
          {
            pattern: /(token|access[_-]?token)\s*[=:]\s*['"]([^'"]{20,})['"]/i,
            name: 'Access Token'
          },
          {
            pattern: /(password|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/i,
            name: 'Password'
          },
        ];

        secretPatterns.forEach(({ pattern, name }) => {
          const matches = content.match(pattern);
          if (matches && matches[2] && !matches[2].includes('example') && !matches[2].includes('placeholder')) {
            const lines = content.split('\n');
            const lineIndex = lines.findIndex(line => pattern.test(line));
            
            if (lineIndex >= 0) {
              issues.push({
                id: `exposed-secret-${file}-${lineIndex}`,
                level: 'high',
                issue: `Exposed ${name} in Code`,
                description: `A potential ${name.toLowerCase()} is hardcoded in the source code. This should be moved to environment variables or a secure configuration system to prevent exposure.`,
                file,
                line: lineIndex + 1,
                fixable: true,
                relevantFiles: [file]
              });
            }
          }
        });
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return issues;
  }

  /**
   * Check for missing input validation
   */
  private async checkInputValidation(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = await glob('**/*.{tsx,ts,jsx,js}', { cwd: this.appPath, ignore: ['node_modules/**', 'dist/**', 'build/**'] });

    for (const file of files) {
      try {
        const filePath = path.join(this.appPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Check for form inputs without validation
        const hasInput = /<input|<textarea/i.test(content);
        const hasValidation = /(validate|validation|required|pattern|min|max)/i.test(content);
        const hasOnChange = /onChange/i.test(content);
        
        // If there are inputs but no clear validation, flag it
        if (hasInput && !hasValidation && !hasOnChange) {
          const lines = content.split('\n');
          const inputLine = lines.findIndex(line => /<input|<textarea/i.test(line));
          
          if (inputLine >= 0) {
            issues.push({
              id: `input-validation-${file}-${inputLine}`,
              level: 'low',
              issue: 'Missing Input Validation',
              description: `The form inputs in this component may not have proper validation. Consider adding client-side validation and server-side validation for security.`,
              file,
              line: inputLine + 1,
              fixable: true,
              relevantFiles: [file]
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return issues;
  }
}


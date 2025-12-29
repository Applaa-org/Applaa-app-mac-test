import { ipcMain } from 'electron';
import { getDyadAppPath } from '@/paths/paths';
import { db } from '../../db';
import { apps } from '../../db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs-extra';
import * as path from 'path';
import log from 'electron-log';

const logger = log.scope('visual_editing_handlers');

export interface VisualEditingChange {
  property: string;
  value: string;
  file: string;
  selector: string;
  line?: number;
}

export function registerVisualEditingHandlers() {
  /**
   * Apply visual editing changes to source files
   * This uses AI to update the code based on style changes
   */
  ipcMain.handle('visual-editing:apply-changes', async (event, { 
    appId, 
    changes 
  }: { 
    appId: number; 
    changes: VisualEditingChange[];
  }) => {
    try {
      logger.info(`Applying ${changes.length} visual editing changes for app ${appId}`);
      
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      
      if (!app || !app.path) {
        throw new Error(`App ${appId} not found`);
      }
      
      const appPath = getDyadAppPath(app.path);
      
      // Group changes by file
      const changesByFile = new Map<string, VisualEditingChange[]>();
      for (const change of changes) {
        if (!changesByFile.has(change.file)) {
          changesByFile.set(change.file, []);
        }
        changesByFile.get(change.file)!.push(change);
      }
      
      // Apply changes to each file
      const results = [];
      for (const [file, fileChanges] of changesByFile.entries()) {
        const filePath = path.join(appPath, file);
        if (await fs.pathExists(filePath)) {
          try {
            let content = await fs.readFile(filePath, 'utf-8');
            
            // Apply each change to the file
            for (const change of fileChanges) {
              content = updateStyleInCode(content, change.selector, change.property, change.value);
            }
            
            await fs.writeFile(filePath, content, 'utf-8');
            results.push({ file, success: true });
            logger.info(`Applied changes to ${file}`);
          } catch (error) {
            logger.error(`Failed to apply changes to ${file}:`, error);
            results.push({ file, success: false, error: String(error) });
          }
        } else {
          logger.warn(`File not found: ${filePath}`);
          results.push({ file, success: false, error: 'File not found' });
        }
      }
      
      return { 
        success: results.every(r => r.success),
        results 
      };
    } catch (error) {
      logger.error('Visual editing apply changes failed:', error);
      throw error;
    }
  });
}

/**
 * Update style in code using simple pattern matching
 * For more complex cases, this could use AI to update the code
 */
function updateStyleInCode(
  content: string, 
  selector: string, 
  property: string, 
  value: string
): string {
  // Convert CSS property to camelCase for inline styles
  const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  
  // Try to find the element by selector in the code
  // This is a simplified approach - for production, you'd want more sophisticated parsing
  
  // Pattern 1: Inline styles (style={{ ... }})
  const inlineStylePattern = new RegExp(
    `(style=\\{\\{[^}]*\\}\\})`,
    'g'
  );
  
  // Pattern 2: className with CSS (would need to update CSS file)
  // For now, we'll focus on inline styles
  
  // Try to find and update inline styles
  const lines = content.split('\n');
  let updated = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains the selector (id, className, or tag)
    const hasSelector = 
      (selector.startsWith('#') && line.includes(`id="${selector.slice(1)}"`)) ||
      (selector.startsWith('.') && line.includes(`className="${selector.slice(1)}"`)) ||
      (!selector.startsWith('#') && !selector.startsWith('.') && line.includes(`<${selector}`));
    
    if (hasSelector && line.includes('style={{')) {
      // Update inline style
      const styleMatch = line.match(/style=\{\{([^}]+)\}\}/);
      if (styleMatch) {
        const styleContent = styleMatch[1];
        // Add or update the property
        const propertyPattern = new RegExp(`${camelProperty}:\\s*[^,}]+`, 'g');
        if (propertyPattern.test(styleContent)) {
          // Update existing property
          lines[i] = line.replace(
            propertyPattern,
            `${camelProperty}: '${value}'`
          );
        } else {
          // Add new property
          lines[i] = line.replace(
            /style=\{\{([^}]+)\}\}/,
            `style={{$1, ${camelProperty}: '${value}'}}`
          );
        }
        updated = true;
        break;
      }
    }
  }
  
  // If we couldn't find inline styles, try to add them
  if (!updated) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasSelector = 
        (selector.startsWith('#') && line.includes(`id="${selector.slice(1)}"`)) ||
        (selector.startsWith('.') && line.includes(`className="${selector.slice(1)}"`)) ||
        (!selector.startsWith('#') && !selector.startsWith('.') && line.includes(`<${selector}`));
      
      if (hasSelector && !line.includes('style=')) {
        // Add style attribute
        const tagMatch = line.match(/<(\w+)([^>]*)>/);
        if (tagMatch) {
          lines[i] = line.replace(
            /<(\w+)([^>]*)>/,
            `<$1$2 style={{${camelProperty}: '${value}'}}>`
          );
          updated = true;
          break;
        }
      }
    }
  }
  
  return lines.join('\n');
}


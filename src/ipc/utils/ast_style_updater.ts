import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import type { ParserOptions } from '@babel/parser';

/**
 * Update style in React/JSX code using AST parsing
 * This is more robust than regex-based approaches
 */
export function updateStyleInAST(
  code: string,
  filePath: string,
  lineNumber: number,
  columnNumber: number,
  property: string,
  value: string
): string {
  try {
    // Convert CSS property to camelCase for inline styles
    const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    
    // Determine parser options based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const parserOptions: ParserOptions = {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      tokens: false,
      ranges: false,
    };
    
    // Parse the code to AST
    const ast = parse(code, parserOptions);
    
    let updated = false;
    let targetPath: any = null;
    let bestMatchDistance = Infinity;
    
    // Find the JSX element at the specified location
    traverse(ast, {
      JSXOpeningElement(path) {
        const loc = path.node.loc;
        if (!loc) return;
        
        // Check if this element matches the target location (with some tolerance for column)
        // We use line number as primary match, and check if column is close
        if (loc.start.line === lineNumber) {
          // Calculate distance from target column
          const columnDistance = Math.abs(loc.start.column - columnNumber);
          if (columnDistance < bestMatchDistance) {
            targetPath = path;
            bestMatchDistance = columnDistance;
          }
        }
      },
    });
    
    if (!targetPath) {
      console.warn(`Could not find JSX element at line ${lineNumber}, column ${columnNumber} in ${filePath}`);
      return code;
    }
    
    const targetNode = targetPath.node;
    
    // Update the style attribute on the target node
    let styleAttr = targetNode.attributes.find(
      (attr): attr is t.JSXAttribute =>
        t.isJSXAttribute(attr) &&
        t.isJSXIdentifier(attr.name) &&
        attr.name.name === 'style'
    );
    
    if (!styleAttr) {
      // Create new style attribute with the property
      styleAttr = t.jsxAttribute(
        t.jsxIdentifier('style'),
        t.jsxExpressionContainer(
          t.objectExpression([
            t.objectProperty(
              t.identifier(camelProperty),
              t.stringLiteral(value)
            )
          ])
        )
      );
      targetNode.attributes.push(styleAttr);
      updated = true;
    } else if (t.isJSXExpressionContainer(styleAttr.value)) {
      // Update existing style object
      const expr = styleAttr.value.expression;
      
      if (t.isObjectExpression(expr)) {
        // Find existing property with this name
        const existingProp = expr.properties.find(
          (p): p is t.ObjectProperty =>
            t.isObjectProperty(p) &&
            ((t.isIdentifier(p.key) && p.key.name === camelProperty) ||
             (t.isStringLiteral(p.key) && p.key.value === camelProperty))
        );
        
        if (existingProp) {
          // Update existing property value
          existingProp.value = t.stringLiteral(value);
          updated = true;
        } else {
          // Add new property to existing style object
          expr.properties.push(
            t.objectProperty(
              t.identifier(camelProperty),
              t.stringLiteral(value)
            )
          );
          updated = true;
        }
      } else if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
        // Style is a variable or member expression, we can't safely update it
        // Instead, wrap it in an object expression
        const newStyleObj = t.objectExpression([
          t.spreadElement(expr),
          t.objectProperty(
            t.identifier(camelProperty),
            t.stringLiteral(value)
          )
        ]);
        styleAttr.value.expression = newStyleObj;
        updated = true;
      }
    }
    
    if (updated) {
      // Generate code from AST
      const output = generate(ast, {
        retainLines: false,
        compact: false,
        comments: true,
        jsescOption: {
          quotes: 'single',
          wrap: true,
        },
      }, code);
      return output.code;
    }
    
    return code;
  } catch (error) {
    console.error(`Failed to update style in AST for ${filePath}:`, error);
    // Fall back to original code if AST parsing fails
    return code;
  }
}

/**
 * Update multiple style properties at once
 */
export function updateStylesInAST(
  code: string,
  filePath: string,
  lineNumber: number,
  columnNumber: number,
  styles: Record<string, string>
): string {
  let updatedCode = code;
  for (const [property, value] of Object.entries(styles)) {
    updatedCode = updateStyleInAST(updatedCode, filePath, lineNumber, columnNumber, property, value);
  }
  return updatedCode;
}

/**
 * Update text content in React/JSX code using AST parsing
 */
export function updateTextContentInAST(
  code: string,
  filePath: string,
  lineNumber: number,
  columnNumber: number,
  textContent: string
): string {
  try {
    // Determine parser options based on file extension
    const parserOptions: ParserOptions = {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      tokens: false,
      ranges: false,
    };
    
    // Parse the code to AST
    const ast = parse(code, parserOptions);
    
    let targetPath: any = null;
    let bestMatchDistance = Infinity;
    
    // Find the JSX element at the specified location
    traverse(ast, {
      JSXOpeningElement(path) {
        const loc = path.node.loc;
        if (!loc) return;
        
        // Check if this element matches the target location
        if (loc.start.line === lineNumber) {
          const columnDistance = Math.abs(loc.start.column - columnNumber);
          if (columnDistance < bestMatchDistance) {
            targetPath = path;
            bestMatchDistance = columnDistance;
          }
        }
      },
    });
    
    if (!targetPath) {
      console.warn(`Could not find JSX element at line ${lineNumber}, column ${columnNumber} in ${filePath}`);
      return code;
    }
    
    // Get the parent JSX element (which contains both opening and children)
    const parentPath = targetPath.parentPath;
    if (!parentPath || !t.isJSXElement(parentPath.node)) {
      console.warn(`Could not find JSX element parent at line ${lineNumber} in ${filePath}`);
      return code;
    }
    
    const jsxElement = parentPath.node;
    
    // Replace text nodes while preserving JSX elements
    // Find and replace only text nodes, keep JSX elements
    const newChildren: t.JSXChild[] = [];
    let hasTextNode = false;
    
    // Log the text content we're trying to set for debugging
    console.log(`[AST] Updating text content to: "${textContent}" (length: ${textContent.length})`);
    
    for (const child of jsxElement.children) {
      if (t.isJSXText(child)) {
        // Replace the first text node with new content, skip others
        if (!hasTextNode) {
          // Create JSX text node - Babel will handle escaping automatically
          // Ensure we're using the full text content, not truncated
          const textNode = t.jsxText(textContent);
          // Verify the text node was created correctly
          if (textNode.value !== textContent) {
            console.warn(`[AST] Text node value mismatch! Expected: "${textContent}", Got: "${textNode.value}"`);
          }
          newChildren.push(textNode);
          hasTextNode = true;
          console.log(`[AST] Replaced text node with: "${textContent}" (node value: "${textNode.value}")`);
        }
        // Skip other text nodes
      } else {
        // Keep JSX elements and expressions
        newChildren.push(child);
      }
    }
    
    // If no text node was found, add one at the beginning
    if (!hasTextNode) {
      const textNode = t.jsxText(textContent);
      // Verify the text node was created correctly
      if (textNode.value !== textContent) {
        console.warn(`[AST] Text node value mismatch! Expected: "${textContent}", Got: "${textNode.value}"`);
      }
      newChildren.unshift(textNode);
      console.log(`[AST] Added new text node: "${textContent}" (node value: "${textNode.value}")`);
    }
    
    jsxElement.children = newChildren;
    
    // Generate code from AST
    // Use retainLines: true to preserve line structure better
    const output = generate(ast, {
      retainLines: true,
      compact: false,
      comments: true,
      // Don't use jsescOption for JSX text - let Babel handle it naturally
    }, code);
    
    // Verify the generated code contains our text
    const containsText = output.code.includes(textContent);
    if (!containsText) {
      // Try to find a partial match (in case of escaping)
      const partialMatch = textContent.length > 0 && output.code.includes(textContent.substring(0, Math.min(3, textContent.length)));
      if (partialMatch) {
        console.warn(`[AST] Generated code contains partial text match. Full text: "${textContent}"`);
      } else {
        console.error(`[AST] Generated code does NOT contain expected text: "${textContent}"`);
      }
    }
    
    // Log the generated code snippet for debugging
    const generatedSnippet = output.code.split('\n').slice(Math.max(0, lineNumber - 2), lineNumber + 2).join('\n');
    console.log(`[AST] Generated code snippet around line ${lineNumber}:\n${generatedSnippet}`);
    console.log(`[AST] Text content in generated code: ${containsText ? 'FOUND' : 'NOT FOUND'}`);
    
    return output.code;
  } catch (error) {
    console.error(`Failed to update text content in AST for ${filePath}:`, error);
    // Fall back to original code if AST parsing fails
    return code;
  }
}
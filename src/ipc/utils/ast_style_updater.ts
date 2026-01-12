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
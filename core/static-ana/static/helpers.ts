import { NodePath } from '@babel/traverse';
import { Node } from '@babel/types';

/**
 * Get the name of the parent component
 * Walks up the AST tree to find the nearest component name
 */
export function getParentComponentName(path: NodePath): string {
  let current: NodePath | null = path;
  
  while (current) {
    // Check for FunctionDeclaration with a name
    if (current.isFunctionDeclaration() && current.node.id) {
      return current.node.id.name;
    }
    
    // Check for VariableDeclarator (const Component = ...)
    if (current.isVariableDeclarator() && current.node.id.type === 'Identifier') {
      return current.node.id.name;
    }
    
    current = current.parentPath;
  }
  
  return 'Unknown';
}

/**
 * Check if a function/component returns JSX
 * Safely handles null/undefined paths
 * 
 * @param path - NodePath to check (can be null/undefined)
 * @returns true if the path contains JSX elements or fragments
 */
export function returnsJSX(path: NodePath | NodePath<Node | null | undefined> | null | undefined): boolean {
  // Guard against null/undefined
  if (!path || !path.node) return false;
  
  let hasJSX = false;
  
  try {
    path.traverse({
      JSXElement() {
        hasJSX = true;
      },
      JSXFragment() {
        hasJSX = true;
      }
    });
  } catch (error) {
    // If traversal fails for any reason, safely assume no JSX
    return false;
  }
  
  return hasJSX;
}

/**
 * Count the number of lines in a node
 * 
 * @param node - AST node with location info
 * @returns number of lines, or 0 if no location info
 */
export function getLineCount(node: any): number {
  if (!node || !node.loc) return 0;
  return node.loc.end.line - node.loc.start.line;
}

/**
 * Generate a unique issue ID
 * 
 * @param type - Type of issue (e.g., 'console', 'large-component')
 * @param filePath - File path where issue was found
 * @param line - Line number
 * @returns Unique identifier string
 */
export function generateIssueId(type: string, filePath: string, line: number): string {
  // Sanitize file path to create valid ID
  const sanitizedPath = filePath.replace(/[^a-zA-Z0-9]/g, '_');
  return `${type}-${sanitizedPath}-${line}`;
}
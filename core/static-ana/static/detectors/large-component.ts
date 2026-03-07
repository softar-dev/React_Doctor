import * as traverse from '@babel/traverse';
import { File } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { getLineCount, returnsJSX, generateIssueId } from '../helpers';

// Threshold: components over this many lines are considered large
const MAX_COMPONENT_LINES = 300;

/**
 * Detect components that are too large (>300 lines)
 * 
 * Why this is bad:
 * - Hard to understand and maintain
 * - Likely doing too many things (violates Single Responsibility)
 * - Hard to test
 * - Harder to reuse
 */
export function detectLargeComponents(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse.default(ast, {
    // Check function declarations
    FunctionDeclaration(path) {
      const node = path.node;
      
      // Only check if it's actually a React component (returns JSX)
      if (!returnsJSX(path)) return;
      
      const lineCount = getLineCount(node);
      
      if (lineCount > MAX_COMPONENT_LINES) {
        const componentName = node.id?.name || 'Unknown';
        const line = node.loc?.start.line || 0;

        issues.push({
          id: generateIssueId('large-component', filePath, line),
          component: componentName,
          file: filePath,
          line,
          column: node.loc?.start.column,
          severity: 'warning',
          message: `Component "${componentName}" is ${lineCount} lines long`,
          suggestion: `Split into smaller components (recommended max: ${MAX_COMPONENT_LINES} lines)`,
        });
      }
    },

    // Check arrow function components (const Component = () => ...)
    VariableDeclarator(path) {
      const node = path.node;
      
      // Check if it's an arrow function
      if (node.init?.type !== 'ArrowFunctionExpression') return;
      
      // Check if it returns JSX (now works with updated helper!)
      if (!returnsJSX(path.get('init'))) return;
      
      const lineCount = getLineCount(node.init);
      
      if (lineCount > MAX_COMPONENT_LINES) {
        const componentName = node.id.type === 'Identifier' ? node.id.name : 'Unknown';
        const line = node.loc?.start.line || 0;

        issues.push({
          id: generateIssueId('large-component', filePath, line),
          component: componentName,
          file: filePath,
          line,
          column: node.loc?.start.column,
          severity: 'warning',
          message: `Component "${componentName}" is ${lineCount} lines long`,
          suggestion: `Split into smaller components (recommended max: ${MAX_COMPONENT_LINES} lines)`,
        });
      }
    },
  });

  return issues;
}
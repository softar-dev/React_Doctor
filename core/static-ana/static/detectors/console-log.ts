import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { getParentComponentName, generateIssueId } from '../helpers';

/**
 * Detect console.log, console.warn, console.error statements
 * 
 * Why this is bad:
 * - Performance impact in production
 * - Exposes internal information
 * - Clutters browser console
 */
export function detectConsoleLogs(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    CallExpression(path) {  // 1. Guard finds a function call
      const node = path.node;

      // Check if it's a console.* call
      if (
        node.callee.type === 'MemberExpression' &&  // 2. Is it a "Something.Something"?
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'console' // 3. Is the first "Something" 'console'?
      ) {
        const method = node.callee.property.type === 'Identifier' 
          ? node.callee.property.name 
          : 'unknown';

        const line = node.loc?.start.line || 0;
        const component = getParentComponentName(path);

        issues.push({
          id: generateIssueId('console', filePath, line),
          component,
          file: filePath,
          line,
          column: node.loc?.start.column,
          severity: 'info',
          message: `console.${method}() statement found`,
          suggestion: 'Remove console statements before deploying to production',
        });
      }
    },
  });

  return issues;
}
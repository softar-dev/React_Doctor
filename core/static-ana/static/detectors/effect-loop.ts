import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { getParentComponentName, generateIssueId } from '../helpers';

/**
 * Detect potential infinite loops in useEffect hooks
 */
export function detectInfiniteLoops(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;

      // 1. Is the function being called named 'useEffect'?
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'useEffect'
      ) {
        
        // 2. Check the number of arguments
        // useEffect(callback, dependencies) should have 2 arguments.
        // If it only has 1, it runs on EVERY render.
        if (node.arguments.length === 1) {
          const line = node.loc?.start.line || 0;
          const component = getParentComponentName(path);

          issues.push({
            id: generateIssueId('infinite-loop', filePath, line),
            component,
            file: filePath,
            line,
            column: node.loc?.start.column,
            severity: 'critical', // This is a "Critical" issue!
            message: `Potential Infinite Loop: "useEffect" is missing a dependency array`,
            suggestion: 'Add a dependency array (e.g., [], [data]) as the second argument to control when the effect runs.',
          });
        }
      }
    },
  });

  return issues;
}
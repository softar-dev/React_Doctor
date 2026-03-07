import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { getParentComponentName, generateIssueId } from '../helpers';

/**
 * Detect inline functions in JSX props
 * 
 * Example of bad code:
 *   <button onClick={() => handleClick()}>Click</button>
 * 
 * Why this is bad:
 * - Creates a new function on every render
 * - Causes child components to re-render unnecessarily
 * - Performance impact
 * 
 * Better approach:
 *   const handleClick = useCallback(() => {...}, []);
 *   <button onClick={handleClick}>Click</button>
 */
export function detectInlineFunctions(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    JSXAttribute(path) {
      const node = path.node;
      
      // Check if the attribute value is an expression container
      if (!node.value || node.value.type !== 'JSXExpressionContainer') {
        return;
      }
      
      const expression = node.value.expression;
      
      // Check if the expression is an inline function
      if (
        expression.type === 'ArrowFunctionExpression' ||
        expression.type === 'FunctionExpression'
      ) {
        const attributeName = node.name.type === 'JSXIdentifier' ? node.name.name : 'unknown';
        const line = node.loc?.start.line || 0;
        const component = getParentComponentName(path);

        issues.push({
          id: generateIssueId('inline-function', filePath, line),
          component,
          file: filePath,
          line,
          column: node.loc?.start.column,
          severity: 'info',
          message: `Inline ${expression.type} in prop "${attributeName}"`,
          suggestion: 'Use useCallback or define function outside component to prevent re-renders',
        });
      }
    },
  });

  return issues;
}
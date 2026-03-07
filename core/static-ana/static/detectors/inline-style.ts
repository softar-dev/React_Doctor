import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { getParentComponentName, generateIssueId } from '../helpers';

// Threshold: If an inline style has more than this many properties, flag it.
const MAX_STYLE_PROPS = 5;

/**
 * Detect large inline style objects in JSX
 */
export function detectInlineStyles(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    JSXAttribute(path) {
      const node = path.node;

      // 1. Is the attribute named "style"?
      if (node.name.name !== 'style') return;

      // 2. Is the value an expression like {{ ... }}?
      if (node.value?.type === 'JSXExpressionContainer') {
        const expression = node.value.expression;

        // 3. Is it an object (ObjectExpression)?
        if (expression.type === 'ObjectExpression') {
          const propCount = expression.properties.length;

          // 4. Check if it's too big
          if (propCount > MAX_STYLE_PROPS) {
            const line = node.loc?.start.line || 0;
            const component = getParentComponentName(path);

            issues.push({
              id: generateIssueId('inline-style', filePath, line),
              component,
              file: filePath,
              line,
              column: node.loc?.start.column,
              severity: 'warning',
              message: `Large inline style object found (${propCount} properties)`,
              suggestion: 'Move large style objects to a constant or use CSS/Styled-components to improve performance and readability.',
            });
          }
        }
      }
    },
  });

  return issues;
}
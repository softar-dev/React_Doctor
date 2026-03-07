import traverse from '@babel/traverse';
import { File, isJSXElement, isJSXAttribute, isIdentifier, isArrayExpression } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId, getParentComponentName } from '../helpers';

export function detectMissingKeys(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    // 1. Catch Literal Arrays: {[ <div />, <span /> ]}
    ArrayExpression(path) {
      const hasJSX = path.node.elements.some(el => isJSXElement(el));
      if (!hasJSX) return;

      path.node.elements.forEach((el) => {
        if (isJSXElement(el)) {
          const hasKey = el.openingElement.attributes.some(attr => 
            isJSXAttribute(attr) && isIdentifier(attr.name, { name: 'key' })
          );

          if (!hasKey) {
            pushIssue(el, issues, filePath, path);
          }
        }
      });
    },

    // 2. Catch .map(), .filter(), .concat() that return JSX
    CallExpression(path) {
      const { node } = path;
      // Look for array methods
      if (node.callee.type === 'MemberExpression' && isIdentifier(node.callee.property)) {
        const methodName = node.callee.property.name;
        if (['map', 'filter', 'concat', 'from'].includes(methodName)) {
           // ... logic to check if the result is JSX (similar to previous code)
        }
      }
    }
  });

  return issues;
}

// Helper to keep code clean
function pushIssue(node: any, issues: any[], filePath: string, path: any) {
  const line = node.loc?.start.line || 0;
  issues.push({
    id: generateIssueId('missing-key', filePath, line),
    component: getParentComponentName(path),
    file: filePath,
    line,
    severity: 'warning',
    message: 'Missing "key" prop in an array of elements',
    suggestion: 'Every element in an array or iterator must have a unique "key" prop.',
  });
}
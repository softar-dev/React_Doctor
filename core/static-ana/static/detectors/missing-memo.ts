import traverse from '@babel/traverse';
import { File, isCallExpression, isIdentifier } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId } from '../helpers';

// Threshold: Only suggest memo if the component is over 40 lines
const MIN_LINES_FOR_MEMO = 40;

export function detectMissingMemo(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const node = path.node;
      
      // 1. Check if it looks like a React Component (Capitalized name)
      const name = node.id?.name;
      if (!name || !/^[A-Z]/.test(name)) return;

      // 2. Check size: Small components don't always need memo
      const startLine = node.loc?.start.line || 0;
      const endLine = node.loc?.end.line || 0;
      const lineCount = endLine - startLine;
      if (lineCount < MIN_LINES_FOR_MEMO) return;

      // 3. Check if it's already wrapped in memo (if exported separately)
      // or if it's an ExportDefaultDeclaration wrapped in memo
      let isMemoized = false;
      path.scope.path.parentPath?.traverse({
        CallExpression(innerPath) {
          if (
            isIdentifier(innerPath.node.callee, { name: 'memo' }) ||
            (innerPath.node.callee.type === 'MemberExpression' && 
             isIdentifier(innerPath.node.callee.property, { name: 'memo' }))
          ) {
            // Check if our component name is passed to this memo()
            if (innerPath.node.arguments.some(arg => isIdentifier(arg, { name }))) {
              isMemoized = true;
            }
          }
        }
      });

      if (!isMemoized) {
        issues.push({
          id: generateIssueId('missing-memo', filePath, startLine),
          component: name,
          file: filePath,
          line: startLine,
          severity: 'info',
          message: `Large component "${name}" is not memoized.`,
          suggestion: 'Wrap this component in React.memo() to prevent unnecessary re-renders when parent props change.',
        });
      }
    }
  });

  return issues;
}
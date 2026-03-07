import traverse from '@babel/traverse';
import { File, isFunctionDeclaration, isArrowFunctionExpression, isObjectProperty, isIdentifier } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId } from '../helpers';

/**
 * Detect potential prop drilling (props passed through without being used)
 */
export function detectPropDrilling(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    // We target both declaration styles
    "FunctionDeclaration|ArrowFunctionExpression"(path) {
      const node = path.node;

      // 1. Tell TypeScript: "Trust me, this node has params"
      if (!isFunctionDeclaration(node) && !isArrowFunctionExpression(node)) return;
      
      const params = node.params;
      if (params.length === 0) return;

      const propsNode = params[0];
      let propNames: string[] = [];

      // Handle destructured props: ({ user, theme })
      if (propsNode.type === 'ObjectPattern') {
        propNames = propsNode.properties
          .filter((p): p is any => isObjectProperty(p) && isIdentifier(p.key))
          .map(p => (p.key as any).name);
      } 
      // Handle single prop object: (props)
      else if (propsNode.type === 'Identifier') {
        propNames = [propsNode.name];
      }

      // 2. For each prop, check its references in the component scope
      propNames.forEach(name => {
        const binding = path.scope.getBinding(name);
        if (!binding) return;

        const totalRefs = binding.referencePaths.length;
        const jsxRefs = binding.referencePaths.filter(refPath => 
          refPath.findParent(p => p.isJSXAttribute())
        ).length;

        // If used, but ONLY as a pass-through to a JSX attribute
        if (totalRefs > 0 && totalRefs === jsxRefs) {
          const line = node.loc?.start.line || 0;

          issues.push({
            id: generateIssueId('prop-drilling', filePath, line),
            component: (node as any).id?.name || 'UnknownComponent',
            file: filePath,
            line,
            severity: 'info',
            message: `Potential Prop Drilling: The prop "${name}" is passed through this component without being used locally.`,
            suggestion: 'Consider using React Context or a State Management library (Redux/Zustand) to avoid deep prop drilling.',
          });
        }
      });
    }
  });

  return issues;
}
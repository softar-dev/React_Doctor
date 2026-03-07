import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId } from '../helpers';

/**
 * Detect unused variables and imports
 */
export function detectDeadCode(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    Program(path) {
      // Babel automatically collects all "bindings" (variables/imports) 
      // in the current scope.
      const bindings = path.scope.getAllBindings();

      for (const name in bindings) {
        const binding = bindings[name];

        // 1. Check if the variable was ever referenced (used)
        if (!binding.referenced) {
          
          // 2. Ignore variables that start with "_" 
          // (Standard dev practice for "intentionally unused")
          if (name.startsWith('_')) continue;

          // 3. Identify if it's an Import or a local Variable
          const isImport = binding.kind === 'module';
          const typeLabel = isImport ? 'Import' : 'Variable';
          
          const node = binding.path.node;
          const line = node.loc?.start.line || 0;

          issues.push({
            id: generateIssueId('dead-code', filePath, line),
            component: 'Global/Module', // Dead code is often outside components
            file: filePath,
            line,
            column: node.loc?.start.column,
            severity: 'warning',
            message: `Unused ${typeLabel} found: "${name}"`,
            suggestion: `Remove the unused ${typeLabel.toLowerCase()} to clean up the code and reduce bundle size.`,
          });
        }
      }
    },
  });

  return issues;
}
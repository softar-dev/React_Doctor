import traverse from '@babel/traverse';
import {
  File,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isArrowFunctionExpression,
  isFunctionExpression,
  isJSXElement,
  isJSXFragment,
  isReturnStatement,
  isBlockStatement,
} from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId } from '../helpers';

// Minimum number of statements inside the component body to be flagged.
// Using statement count instead of line count makes the threshold
// consistent regardless of code formatting style.
const MIN_STATEMENTS_FOR_MEMO = 8;

export function detectMissingMemo(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    // ── 1. function Foo() {} declarations ──────────────────────────
    FunctionDeclaration(path) {
      const node = path.node;
      const name = node.id?.name;

      if (!name || !/^[A-Z]/.test(name)) return;
      if (!functionReturnsJSX(node.body)) return;

      // Use statement count — more reliable than line count
      const stmtCount = node.body?.body?.length || 0;
      if (stmtCount < MIN_STATEMENTS_FOR_MEMO) return;

      if (isMemoized(name, path)) return;

      const line = node.loc?.start.line || 0;
      issues.push(makeIssue(name, filePath, line));
    },

    // ── 2. const Foo = () => {} / const Foo = function() {} ────────
    //
    // The most common modern React pattern — was completely missing
    // from the original detector. The component name lives on the
    // VariableDeclarator (const [Foo] = ...) not on the function
    // node itself, so node.id?.name always returned undefined here.
    VariableDeclarator(path) {
      const node = path.node;

      if (!isIdentifier(node.id)) return;
      const name = (node.id as any).name;
      if (!/^[A-Z]/.test(name)) return;

      const init = node.init;
      if (!init) return;

      // Already memoized: const Foo = React.memo(() => ...)
      if (isCallExpression(init) && isReactMemoCall(init)) return;

      if (!isArrowFunctionExpression(init) && !isFunctionExpression(init)) return;

      // Must return JSX — check both concise and block-body forms
      let returnsJSX = false;
      const body = (init as any).body;

      if (isJSXElement(body) || isJSXFragment(body)) {
        // Concise arrow returning JSX is always a small component — skip
        return;
      } else if (isBlockStatement(body)) {
        returnsJSX = functionReturnsJSX(body);
      }
      if (!returnsJSX) return;

      // Statement count gate
      const stmtCount = body?.body?.length || 0;
      if (stmtCount < MIN_STATEMENTS_FOR_MEMO) return;

      if (isMemoized(name, path)) return;

      const line = (init.loc?.start.line || node.loc?.start.line) || 0;
      issues.push(makeIssue(name, filePath, line));
    },
  });

  return issues;
}

// ── Helpers ───────────────────────────────────────────────────────

function makeIssue(name: string, filePath: string, line: number): ComponentIssue {
  return {
    id:        generateIssueId('missing-memo', filePath, line),
    component: name,
    file:      filePath,
    line,
    severity:  'info',
    message:   `Component "${name}" is not wrapped in React.memo().`,
    suggestion:
      `Wrap "${name}" in React.memo() to prevent unnecessary re-renders when parent re-renders with the same props:\n` +
      `  export default React.memo(${name});\n` +
      `Or inline:\n` +
      `  const ${name} = React.memo(({ prop }) => { ... });`,
  };
}

function functionReturnsJSX(body: any): boolean {
  if (!isBlockStatement(body)) return false;
  return body.body.some((stmt: any) => {
    if (!isReturnStatement(stmt)) return false;
    const arg = stmt.argument;
    return arg && (isJSXElement(arg) || isJSXFragment(arg));
  });
}

function isReactMemoCall(callExpr: any): boolean {
  const callee = callExpr.callee;
  if (isIdentifier(callee, { name: 'memo' })) return true;
  if (
    isMemberExpression(callee) &&
    isIdentifier(callee.object, { name: 'React' }) &&
    isIdentifier(callee.property, { name: 'memo' })
  ) return true;
  return false;
}

function isMemoized(name: string, path: any): boolean {
  let found = false;
  const root = path.findParent((p: any) => p.isProgram());
  if (!root) return false;

  root.traverse({
    CallExpression(innerPath: any) {
      if (found) return;
      if (!isReactMemoCall(innerPath.node)) return;
      if (innerPath.node.arguments.some((arg: any) => isIdentifier(arg, { name }))) {
        found = true;
      }
    },
  });

  return found;
}
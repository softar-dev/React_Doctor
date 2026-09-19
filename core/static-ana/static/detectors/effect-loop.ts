import traverse from '@babel/traverse';
import { NodePath } from '@babel/traverse';
import {
  File,
  CallExpression,
  isIdentifier,
  isArrowFunctionExpression,
  isFunctionExpression,
  isVariableDeclarator,
  isArrayPattern,
  isCallExpression,
  isIfStatement,
  isConditionalExpression,
  isLogicalExpression,
} from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { getParentComponentName, generateIssueId } from '../helpers';

/**
 * Detect useEffect calls that are genuinely at risk of looping forever.
 *
 * A missing dependency array alone is NOT a bug — it's a valid, common
 * pattern (e.g. syncing a DOM measurement or a ref on every render).
 * The real risk only exists when ALL of the following are true:
 *
 *   1. useEffect has no dependency array (runs after every render)
 *   2. The effect body calls a genuine useState setter — verified via
 *      binding resolution back to a `const [x, setX] = useState(...)`
 *      in the same component scope, not just a "setX"-shaped name
 *   3. That setter call is unconditional — not gated behind an
 *      if / ternary / && that would eventually stop it from firing
 *
 * Only when all three hold do we flag it, and only then is "critical"
 * justified: state changing unconditionally on every render, with an
 * effect that reruns after every render, is a real infinite loop.
 */
export function detectInfiniteLoops(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;

      // 1. Is the function being called named 'useEffect'?
      if (!isIdentifier(node.callee, { name: 'useEffect' })) return;

      // 2. Must be missing a dependency array — the first necessary
      // condition, but no longer sufficient on its own.
      if (node.arguments.length !== 1) return;

      const callback = node.arguments[0];
      if (!isArrowFunctionExpression(callback) && !isFunctionExpression(callback)) {
        return; // not a recognizable inline function — can't analyze the body
      }

      // 3. Find every useState setter available in this component scope.
      const setterNames = findUseStateSetters(path);
      if (setterNames.size === 0) return; // no local state to loop on

      // 4. Does the effect body call one of those setters unconditionally?
      const bodyPath = path.get('arguments.0') as NodePath;
      if (!hasUnconditionalSetterCall(bodyPath, setterNames)) return;

      const line = node.loc?.start.line || 0;
      const component = getParentComponentName(path);

      issues.push({
        id: generateIssueId('infinite-loop', filePath, line),
        component,
        file: filePath,
        line,
        column: node.loc?.start.column,
        severity: 'critical',
        message:
          `Potential Infinite Loop: "useEffect" has no dependency array and ` +
          `unconditionally calls a state setter — this effect will re-run after ` +
          `every render, forever.`,
        suggestion:
          'Add a dependency array to control when the effect runs, or move the ' +
          'setter call behind a condition so it only fires when actually needed.',
      });
    },
  });

  return issues;
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Walks up to the enclosing component/function scope and finds every
 * `const [x, setX] = useState(...)` destructure, returning the set of
 * setter identifier names. This is binding resolution, not a naming
 * guess — a function merely named "setSomething" that isn't the second
 * element of a useState() array pattern will NOT be included.
 */
function findUseStateSetters(effectPath: NodePath): Set<string> {
  const setters = new Set<string>();

  // Walk up to the nearest function scope (the component), then scan
  // its whole body for useState destructures — a setter can be declared
  // anywhere in the component, not just before the effect.
  const scopeFn = effectPath.getFunctionParent();
  const root = scopeFn ?? effectPath.findParent((p) => p.isProgram());
  if (!root) return setters;

  root.traverse({
    VariableDeclarator(declPath) {
      const { id, init } = declPath.node;

      if (
        isArrayPattern(id) &&
        id.elements.length >= 2 &&
        isCallExpression(init) &&
        isIdentifier(init.callee, { name: 'useState' })
      ) {
        const setterEl = id.elements[1];
        if (isIdentifier(setterEl)) {
          setters.add(setterEl.name);
        }
      }
    },
  });

  return setters;
}

/**
 * Returns true if the effect body calls one of the given setter names
 * WITHOUT that call being nested inside an if / ternary / logical (&&, ||)
 * condition. A conditional setter call means the effect can stabilize
 * (stop calling it) once the condition is no longer met — not a
 * guaranteed loop. An unconditional call fires on every single run.
 */
function hasUnconditionalSetterCall(
  bodyPath: NodePath,
  setterNames: Set<string>,
): boolean {
  let found = false;

  bodyPath.traverse({
    CallExpression(callPath) {
      if (found) return;
      const callee = callPath.node.callee;
      if (!isIdentifier(callee) || !setterNames.has(callee.name)) return;

      // Walk up from this call to the effect body, checking whether any
      // ancestor is a conditional construct. Stop at the effect body
      // boundary so we don't escape into an outer scope by mistake.
      let current: NodePath | null = callPath;
      let gated = false;

      while (current && current !== bodyPath) {
        if (
          isIfStatement(current.node) ||
          isConditionalExpression(current.node) ||
          isLogicalExpression(current.node)
        ) {
          gated = true;
          break;
        }
        current = current.parentPath;
      }

      if (!gated) found = true;
    },
  });

  return found;
}
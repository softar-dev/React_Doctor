import traverse from '@babel/traverse';
import {
  File,
  isJSXElement,
  isJSXAttribute,
  isIdentifier,
  isReturnStatement,
  isBlockStatement,
  isArrowFunctionExpression,
  isFunctionExpression,
} from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId, getParentComponentName } from '../helpers';

export function detectMissingKeys(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    // ── 1. Literal arrays: {[ <Foo />, <Bar /> ]} ─────────────────────
    // These are uncommon but still a React mistake — every JSX element
    // inside a literal array must have a key prop.
    ArrayExpression(path) {
      const hasJSX = path.node.elements.some(el => isJSXElement(el));
      if (!hasJSX) return;

      path.node.elements.forEach((el) => {
        if (isJSXElement(el) && !jsxHasKey(el)) {
          pushIssue(el, issues, filePath, path);
        }
      });
    },

    // ── 2. Array iterators: .map(), .flatMap(), .filter(), Array.from() ─
    //
    // This branch was previously a stub ("// ... logic"). It now handles
    // all four common patterns:
    //
    //   a) Concise arrow:  items.map(x => <li>{x}</li>)
    //   b) Block arrow:    items.map(x => { return <li>{x}</li>; })
    //   c) Function expr:  items.map(function(x) { return <li>{x}</li>; })
    //   d) Array.from:     Array.from({length:3}, (_, i) => <li>{i}</li>)
    //
    // For filter/flatMap/concat/from the callback is a predicate, not a
    // renderer — we only flag them when the callback's return value is
    // a JSX element without a key. This avoids false positives on
    // .filter(x => x.active) which obviously returns a boolean.
    CallExpression(path) {
      const { node } = path;

      // ── Determine if this is a relevant array-method call ─────────
      let callbackArgIndex = 0; // which argument is the render callback

      if (node.callee.type === 'MemberExpression' &&
          isIdentifier(node.callee.property)) {
        const method = node.callee.property.name;
        if (!['map', 'flatMap', 'filter', 'concat', 'from'].includes(method)) return;
        // Array.from(iterable, mapFn) — the render callback is arg[1]
        if (method === 'from') callbackArgIndex = 1;
      } else {
        return; // not a member-expression call, skip
      }

      const callback = node.arguments[callbackArgIndex];
      if (!callback) return;

      // ── Extract the JSX node returned by the callback ─────────────
      let returnedJSX: any = null;

      if (isArrowFunctionExpression(callback) || isFunctionExpression(callback)) {
        if (isJSXElement(callback.body)) {
          // Concise arrow: x => <li>{x}</li>
          returnedJSX = callback.body;
        } else if (isBlockStatement(callback.body)) {
          // Block body: x => { return <li>{x}</li>; }
          for (const stmt of callback.body.body) {
            if (isReturnStatement(stmt) && stmt.argument &&
                isJSXElement(stmt.argument)) {
              returnedJSX = stmt.argument;
              break;
            }
          }
        }
      }

      if (!returnedJSX) return; // callback doesn't return JSX — skip
      if (jsxHasKey(returnedJSX)) return; // already has key — fine

      pushIssue(returnedJSX, issues, filePath, path);
    },
  });

  return issues;
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Returns true if a JSX element already has a key={...} or key="..."
 * attribute directly on its opening element.
 *
 * NOTE: JSX attribute names are JSXIdentifier nodes, NOT Identifier nodes.
 * Babel's isIdentifier() helper only matches Identifier — using it against
 * attr.name silently returns false for every JSX attribute name, making the
 * key check a no-op. We check .name === 'key' directly instead.
 */
function jsxHasKey(jsxEl: any): boolean {
  return jsxEl.openingElement.attributes.some(
    (attr: any) =>
      isJSXAttribute(attr) &&
      attr.name?.name === 'key',
  );
}

/**
 * Pushes a missing-key issue. Kept separate so both visitors share
 * the same message/severity/suggestion text without duplication.
 */
function pushIssue(node: any, issues: any[], filePath: string, path: any) {
  const line = node.loc?.start.line || 0;
  issues.push({
    id:        generateIssueId('missing-key', filePath, line),
    component: getParentComponentName(path),
    file:      filePath,
    line,
    severity:  'warning',
    message:   'Missing "key" prop on a JSX element returned from an array or iterator.',
    suggestion:
      'Add a unique "key" prop to each element. Example:\n' +
      '  items.map(item => <li key={item.id}>{item.name}</li>)\n' +
      'The key must be stable and unique among siblings — avoid array index as key when the list can reorder.',
  });
}
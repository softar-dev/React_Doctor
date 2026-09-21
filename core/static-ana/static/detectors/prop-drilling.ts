import traverse from '@babel/traverse';
import {
  File,
  isFunctionDeclaration,
  isArrowFunctionExpression,
  isObjectProperty,
  isIdentifier,
  isJSXIdentifier,
  isJSXMemberExpression,
  JSXOpeningElement,
} from '@babel/types';
import { ComponentIssue } from '../../../../shared/src/types';
import { generateIssueId, getParentComponentName } from '../helpers';

/**
 * Detect genuine prop drilling: a prop received by this component that is
 * forwarded UNCHANGED into a child *component* (capitalized JSX tag),
 * without this component ever actually using the value itself.
 *
 * This does NOT flag a prop consumed as a native DOM element attribute
 * (e.g. <img src={src} />, <button onClick={onClick} />) — that's just
 * ordinary prop usage, not drilling. It also does not flag a prop that's
 * used for BOTH a DOM attribute and forwarded to a child — using it on a
 * DOM element is real, local usage, so it isn't a pure pass-through.
 *
 * Scope note: this only proves ONE hop of forwarding (this component
 * received the prop and relayed it, unused, into a direct child). It does
 * NOT trace whether that child forwards it further — doing so would need
 * a cross-file component-usage graph, not just this file's AST. The
 * message and suggestion below are worded to match that: they describe
 * a single unnecessary hop, not a "chain" or "multiple layers," since we
 * never actually verified more than one.
 *
 * Component names in messages are wrapped in quotes, not angle brackets
 * (<Component>) — angle-bracket text risks being silently stripped by any
 * downstream renderer (CLI table, dashboard HTML) that treats it as an
 * unrecognized tag, which is exactly what happened during testing.
 */
export function detectPropDrilling(ast: File, filePath: string): ComponentIssue[] {
  const issues: ComponentIssue[] = [];

  traverse(ast, {
    "FunctionDeclaration|ArrowFunctionExpression"(path) {
      const node = path.node;

      if (!isFunctionDeclaration(node) && !isArrowFunctionExpression(node)) return;

      const params = node.params;
      if (params.length === 0) return;

      const propsNode = params[0];
      let propNames: string[] = [];

      if (propsNode.type === 'ObjectPattern') {
        propNames = propsNode.properties
          .filter((p): p is any => isObjectProperty(p) && isIdentifier(p.key))
          .map(p => (p.key as any).name);
      } else if (propsNode.type === 'Identifier') {
        propNames = [propsNode.name];
      }

      propNames.forEach(name => {
        const binding = path.scope.getBinding(name);
        if (!binding) return;

        const totalRefs = binding.referencePaths.length;
        if (totalRefs === 0) return;

        // For every reference, figure out what actually consumes it:
        // a DOM element attribute, a custom component's prop, or
        // something else entirely (a real usage — computation, condition,
        // passed to a non-JSX function call, etc).
        const targetComponents = new Set<string>();
        let hasNonForwardingUsage = false;

        for (const refPath of binding.referencePaths) {
          const jsxAttr = refPath.findParent(p => p.isJSXAttribute());
          if (!jsxAttr) {
            // Used somewhere other than a JSX attribute — real usage.
            hasNonForwardingUsage = true;
            continue;
          }

          const openingElement = jsxAttr.parentPath?.node as JSXOpeningElement | undefined;
          const tagName = getJsxTagName(openingElement);

          if (tagName && isCustomComponentTag(tagName)) {
            targetComponents.add(tagName);
          } else {
            // Consumed by a native DOM element (<div>, <img>, <button>...)
            // — that's genuine local usage, not a pass-through.
            hasNonForwardingUsage = true;
          }
        }

        // Only flag when EVERY reference was a pure forward into a child
        // component, and none were real local usage of any kind.
        if (hasNonForwardingUsage || targetComponents.size === 0) return;

        const line = node.loc?.start.line || 0;
        const componentName = getParentComponentName(path);
        const targets = Array.from(targetComponents).sort();
        const targetList = targets.length === 1
          ? `"${targets[0]}"`
          : targets.map(t => `"${t}"`).join(', ');

        issues.push({
          id: generateIssueId('prop-drilling', filePath, line),
          component: componentName,
          file: filePath,
          line,
          severity: 'info',
          message: `Prop "${name}" is forwarded unchanged into ${targetList} without being used in "${componentName}" itself.`,
          suggestion: targets.length === 1
            ? `If nothing between the source and ${targetList} needs "${name}", consider passing it directly instead of relaying it through "${componentName}". Reach for Context or a state library only if this same prop is relayed unused through several more components below this one.`
            : `"${name}" is relayed unused to multiple children here — consider whether each of them truly needs it passed this way, or whether it should come from a shared source instead.`,
        });
      });
    }
  });

  return issues;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getJsxTagName(openingElement: JSXOpeningElement | undefined): string | undefined {
  if (!openingElement) return undefined;
  const name = openingElement.name;

  if (isJSXIdentifier(name)) return name.name;
  // <Foo.Bar /> style — member expressions are always custom components.
  if (isJSXMemberExpression(name)) return `${(name.object as any).name}.${name.property.name}`;
  return undefined;
}

function isCustomComponentTag(tagName: string): boolean {
  // Namespaced/member tags (Foo.Bar) are always custom components.
  if (tagName.includes('.')) return true;
  // React convention: components start with an uppercase letter;
  // native DOM elements (div, img, button...) are always lowercase.
  return /^[A-Z]/.test(tagName);
}
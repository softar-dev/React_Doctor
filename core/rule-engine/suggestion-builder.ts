// Takes a fired rule and the evaluation context, and produces
// a clean Suggestion object ready for the report.
//
// The key job of this file is PLACEHOLDER RESOLUTION.
// Rule messages in rules.json contain tokens like {metrics.lcp}
// that get replaced with real values from the context.
//
// Example:
//   Template: "Your LCP is {metrics.lcp}ms."
//   Context:   metrics.lcp = 2396
//   Output:    "Your LCP is 2396ms."
//
// This makes every suggestion specific to the actual project
// being analyzed — not just generic advice.
// ─────────────────────────────────────────────────────────────

import { Suggestion } from "../../shared/src/types";
import { RuleDefinition, EvaluationContext } from "./types";

/**
 * Builds a Suggestion object from a fired rule and the context.
 *
 * The returned Suggestion has:
 *   id                — same as the rule id
 *   title             — the rule title (no placeholders)
 *   description       — the rule message with placeholders resolved
 *   severity          — copied from the rule
 *   affectedComponent — the most relevant component name (if any)
 *   fix               — the concrete fix instructions
 *
 * @param rule    — the rule that fired
 * @param context — the context used to resolve placeholders
 */
export function buildSuggestion(
  rule:    RuleDefinition,
  context: EvaluationContext,
): Suggestion {
  // Resolve all {placeholder} tokens in the message string.
  // The fix string can also contain placeholders like {component}.
  const description = resolvePlaceholders(rule.message, context);
  const fix         = resolvePlaceholders(rule.fix,     context);

  // Find the most relevant component name for this suggestion.
  // We use this to populate the affectedComponent field, which
  // the dashboard uses to highlight the specific component.
  const affectedComponent = resolveAffectedComponent(rule, context);

  return {
    id:          rule.id,
    title:       rule.title,
    description,
    severity:    rule.severity,
    fix,
    ...(affectedComponent ? { affectedComponent } : {}),
  };
}

/**
 * Resolves {placeholder} tokens in a template string.
 *
 * Supported placeholders and what they resolve to:
 *
 *   {metrics.lcp}     → actual LCP value rounded to nearest ms
 *   {metrics.fcp}     → actual FCP value rounded to nearest ms
 *   {metrics.cls}     → CLS score rounded to 3 decimal places
 *   {metrics.inp}     → INP value rounded to nearest ms
 *   {metrics.ttfb}    → TTFB value rounded to nearest ms
 *   {renderTime}      → total render time in ms
 *   {commitDuration}  → slowest React commit duration in ms
 *   {avgCommit}       → average commit duration in ms (1 decimal)
 *   {rerenders}       → re-render count of the top component
 *   {component}       → name of the most re-rendered component
 *   {domNodes}        → number of DOM nodes
 *   {payloadMB}       → page weight in MB (2 decimal places)
 *   {jsHeapMB}        → JS heap usage in MB (2 decimal places)
 *   {errorCount}      → number of JS errors
 *   {performanceScore}→ 0-100 performance score
 *
 * Unknown placeholders are left as-is so they don't silently
 * disappear if there's a typo in rules.json.
 */
function resolvePlaceholders(
  template: string,
  context:  EvaluationContext,
): string {
  // Build a map of all known placeholder names → resolved values.
  // We format numbers here so the messages read naturally.
  const values: Record<string, string> = {
    "metrics.lcp":      `${Math.round(context.metrics.lcp)}`,
    "metrics.fcp":      `${Math.round(context.metrics.fcp)}`,
    "metrics.cls":      `${context.metrics.cls.toFixed(3)}`,
    "metrics.inp":      `${Math.round(context.metrics.inp)}`,
    "metrics.ttfb":     `${Math.round(context.metrics.ttfb)}`,
    "renderTime":       `${context.renderTime}`,
    "commitDuration":   `${context.slowestCommit.toFixed(1)}`,
    "avgCommit":        `${context.avgCommit.toFixed(1)}`,
    "rerenders":        `${context.topRerenderCount}`,
    "component":        context.topRerenderComponent || "unknown",
    "domNodes":         `${context.domNodes}`,
    "payloadMB":        `${context.payloadMB.toFixed(2)}`,
    "jsHeapMB":         `${context.jsHeapMB.toFixed(2)}`,
    "errorCount":       `${context.errorCount}`,
    "slowCommitCount":  `${context.slowCommitCount}`,
    "performanceScore": `${context.performanceScore}`,
  };

  // Replace every {placeholder} in the template string.
  // The regex matches anything between { and } and looks it up
  // in the values map above.
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    // If the key is known, return its value. Otherwise keep the
    // original {key} so the developer knows something is missing.
    return values[key] ?? match;
  });
}

/**
 * Determines which component is most relevant to this suggestion.
 *
 * Priority order:
 *   1. If the rule is about re-renders, use the top re-render component
 *   2. If there's a static issue matching the rule category, use that component
 *   3. Otherwise return undefined (no specific component to blame)
 *
 * The affectedComponent name is shown in the dashboard to help
 * the developer navigate directly to the problematic file.
 */
function resolveAffectedComponent(
  rule:    RuleDefinition,
  context: EvaluationContext,
): string | undefined {
  // For re-render related rules, the top re-render component is the target.
  // These rules fire because a specific component is re-rendering too much,
  // so we point the developer directly at that component.
  //
  // NOTE: "inline-function" is intentionally excluded here now — the new
  // static-only "inline-functions-detected" rule should resolve its component
  // from the static issues map below, not from the re-render data. The cross
  // rule "inline-functions-with-high-rerenders" still uses the re-render data
  // because it fires when both are true.
  if (
    rule.id.includes("excessive-rerender") ||
    rule.id.includes("missing-memo")       ||
    rule.id.includes("slow-commit")        ||
    rule.id === "inline-functions-with-high-rerenders"
  ) {
    if (context.topRerenderComponent) {
      return context.topRerenderComponent;
    }
  }

  // For static rules (and cross rules with a static component), find the
  // first matching issue's component name from the static report.
  //
  // The map below links each rule ID to the issue ID prefix it targets.
  // Example: "missing-list-keys" targets issues starting with "missing-key"
  // because generateIssueId('missing-key', file, line) is how the detector
  // names them. startsWith() catches all of them regardless of file/line.
  //
  // FIX: Added "inline-functions-detected" for the new static-only rule.
  // FIX: console-log and dead-code issues DO carry a component name from
  //      the detector — they were already in the map and working correctly.
  const staticPrefixMap: Record<string, string> = {
    "console-logs-in-production":           "console-log",
    "missing-list-keys":                    "missing-key",
    "inline-styles-detected":               "inline-style",
    "prop-drilling-detected":               "prop-drilling",
    "dead-code-detected":                   "dead-code",
    "effect-loop-risk":                     "effect-loop",
    "missing-memo-with-rerenders":          "missing-memo",
    "large-component-with-slow-commit":     "large-component",
    "inline-functions-with-high-rerenders": "inline-function",
    "inline-functions-detected":            "inline-function",  // FIX: new rule
    "missing-memo-with-slow-commit":        "missing-memo",
    "prop-drilling-with-rerenders":         "prop-drilling",
  };

  const prefix = staticPrefixMap[rule.id];
  if (prefix) {
    const matchingIssue = context.issues.find(i => i.id.startsWith(prefix));
    if (matchingIssue?.component) {
      return matchingIssue.component;
    }
  }

  // Rules like slow-lcp, slow-ttfb, heavy-payload, high-dom-nodes,
  // low-performance-score are page-level — no single component to blame.
  return undefined;
}

/**
 * Builds all suggestions from a list of fired rules.
 * Sorts them by severity: critical → warning → info.
 *
 * @param firedRules — rules whose conditions evaluated to true
 * @param context    — the evaluation context for placeholder resolution
 */
export function buildAllSuggestions(
  firedRules: RuleDefinition[],
  context:    EvaluationContext,
): Suggestion[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 };

  return firedRules
    .map(rule => buildSuggestion(rule, context))
    .sort((a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
    );
}
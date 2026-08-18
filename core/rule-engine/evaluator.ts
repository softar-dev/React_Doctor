// Evaluates whether a rule's conditions are met given the
// current EvaluationContext.
//
// HOW CONDITION EVALUATION WORKS:
//
// A rule condition is a plain JavaScript expression string:
//   "metrics.lcp > 2500"
//   "hasIssue('missing-memo')"
//   "topRerenderCount >= 5 && slowCommitCount > 0"
//
// We evaluate these strings by building a Function() that
// receives the context fields as named parameters:
//
//   new Function('metrics', 'lcp', ..., 'return metrics.lcp > 2500')
//
// This is safe here because:
//   1. The condition strings come from our own rules.json file,
//      not from user input
//   2. The context only contains numbers, strings, arrays, and
//      safe helper functions — no file system or network access
//
// Each condition is wrapped in a try/catch. If a condition
// throws (e.g. a typo in rules.json), it logs a warning and
// returns false so the app doesn't crash.
// ─────────────────────────────────────────────────────────────

import { RuleDefinition, EvaluationContext } from "./types";

/**
 * Which reports were actually produced for this analysis run.
 *
 * This is separate from whether the *context* has runtime/static
 * fields — buildContext() always fills in zero/empty defaults when a
 * report is missing so that condition expressions don't throw. That
 * convenience is exactly what causes false positives (e.g.
 * `performanceScore < 50` reading a fabricated 0) unless we also
 * track — and check — whether the report genuinely existed.
 */
export interface ReportAvailability {
  hasStatic:  boolean;
  hasRuntime: boolean;
}

/**
 * Evaluates a single rule against the current context.
 *
 * Returns true if the rule should fire (i.e. the problem exists).
 * Returns false if the condition is not met, a required report is
 * missing, or the condition throws an error.
 *
 * For "cross" rules: BOTH the static AND runtime conditions must
 * be true, AND both reports must be present. If either is false or
 * missing, the rule does not fire.
 *
 * For "static" rules:  only condition.static is evaluated, and only
 *                       if a static report was provided.
 * For "runtime" rules: only condition.runtime is evaluated, and only
 *                       if a runtime report was provided.
 */
export function evaluateRule(
  rule:        RuleDefinition,
  context:     EvaluationContext,
  reportsAvailable: ReportAvailability,
): boolean {
  // ── Category gate ──────────────────────────────────────────
  // Skip the rule entirely if it needs a report that wasn't run.
  // This must happen BEFORE any condition is evaluated: the context
  // always has zero/empty defaults for a missing report, and those
  // defaults can accidentally satisfy a condition (e.g. an empty
  // `errors` array making `errorCount > 0` false is fine, but
  // `performanceScore` defaulting to 0 makes `performanceScore < 50`
  // TRUE — a fabricated finding on data that was never collected).
  if (rule.category === "runtime" && !reportsAvailable.hasRuntime) return false;
  if (rule.category === "static"  && !reportsAvailable.hasStatic)  return false;
  if (rule.category === "cross"   && (!reportsAvailable.hasRuntime || !reportsAvailable.hasStatic)) {
    return false;
  }

  try {
    // Evaluate the runtime condition if this rule has one
    if (rule.condition.runtime !== undefined) {
      const result = evaluateExpression(rule.condition.runtime, context);
      // For cross rules: if the runtime condition is false, stop here.
      // No need to check the static condition — both must be true.
      if (!result) return false;
    }

    // Evaluate the static condition if this rule has one
    if (rule.condition.static !== undefined) {
      const result = evaluateExpression(rule.condition.static, context);
      if (!result) return false;
    }

    // If we reach here, all conditions that exist have passed
    return true;

  } catch (err) {
    // A condition threw an error — most likely a typo in rules.json.
    // Log it clearly so it can be fixed, but don't crash the engine.
    console.warn(
      `⚠️  Rule Engine: condition evaluation failed for rule "${rule.id}".\n` +
      `   Condition: ${rule.condition.runtime ?? rule.condition.static}\n` +
      `   Error: ${(err as Error).message}\n` +
      `   This rule will be skipped.`,
    );
    return false;
  }
}

/**
 * Evaluates a single expression string against the context.
 *
 * HOW IT WORKS:
 * We extract all the keys from the context object, then build a
 * new Function that receives those keys as named parameters and
 * returns the evaluated expression.
 *
 * Example — for the expression "metrics.lcp > 2500":
 *   new Function(
 *     'metrics', 'renderTime', 'rerenders', ...,
 *     'return metrics.lcp > 2500'
 *   )(context.metrics, context.renderTime, context.rerenders, ...)
 *
 * The context keys become the function's parameter names, and the
 * context values become the arguments. This means any field on
 * the context is directly accessible in the condition string by
 * its name — no "context." prefix needed.
 *
 * @param expression — the condition string from rules.json
 * @param context    — the evaluation context built from both reports
 */
function evaluateExpression(
  expression: string,
  context: EvaluationContext,
): boolean {
  // Get all the keys and values from the context
  const keys   = Object.keys(context) as (keyof EvaluationContext)[];
  const values = keys.map(k => context[k]);

  // Build a function: (key1, key2, ...) => expression
  // The 'return' ensures the expression result is returned
  const fn = new Function(...keys, `return (${expression});`);

  // Call the function with the context values as arguments
  const result = fn(...values);

  // Coerce to boolean — conditions should always be truthy/falsy
  return Boolean(result);
}

/**
 * Evaluates all rules against the context and returns only
 * the rules that fired (whose conditions were true).
 *
 * This is the main function called by index.ts.
 *
 * @param rules   — all rule definitions from rules.json
 * @param context — the assembled evaluation context
 * @param reportsAvailable — which reports were actually produced this run
 */
export function evaluateAllRules(
  rules:            RuleDefinition[],
  context:          EvaluationContext,
  reportsAvailable: ReportAvailability,
): RuleDefinition[] {
  return rules.filter(rule => evaluateRule(rule, context, reportsAvailable));
}

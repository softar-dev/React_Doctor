import { StaticReport, RuntimeReport, Suggestion } from "../../shared/src/types";
// ─────────────────────────────────────────────────────────────
// RULE DEFINITION
//
// This is the shape of each entry inside rules.json.
// When you add a new rule, you write it as this interface.
//
// Example rule:
//   {
//     "id": "slow-lcp",
//     "category": "runtime",
//     "severity": "critical",
//     "title": "LCP is too slow",
//     "condition": { "runtime": "metrics.lcp > 2500" },
//     "message": "Your LCP is {metrics.lcp}ms. Consider lazy-loading your hero image.",
//     "fix": "Add loading='lazy' to your largest above-the-fold image."
//   }
// ─────────────────────────────────────────────────────────────

export interface RuleCondition {
  // A JavaScript expression string evaluated against the runtime report.
  // Example: "metrics.lcp > 2500"
  // Example: "rerenders['Divider'] >= 5"
  // Can be undefined if this rule doesn't check runtime data.
  runtime?: string;

  // A JavaScript expression string evaluated against the static report.
  // Example: "issues.some(i => i.id.startsWith('missing-memo'))"
  // Example: "issues.filter(i => i.id.startsWith('console-log')).length > 0"
  // Can be undefined if this rule doesn't check static data.
  static?: string;
}

export interface RuleDefinition {
  // Unique identifier for this rule — used to deduplicate suggestions
  // and reference specific rules in tests.
  // Example: "slow-lcp", "missing-memo-with-rerenders"
  id: string;

  // Which category this rule belongs to:
  //   "runtime" — only uses data from the runtime profiler
  //   "static"  — only uses data from the static analyzer
  //   "cross"   — combines both reports for a deeper insight
  //               Cross rules are the most powerful — they catch
  //               problems that neither analysis alone could find.
  category: "runtime" | "static" | "cross";

  // How serious this problem is:
  //   "critical" — must fix, directly hurts users
  //   "warning"  — should fix, noticeable impact
  //   "info"     — nice to fix, minor improvement
  severity: "critical" | "warning" | "info";

  // Short headline shown in the dashboard and terminal output.
  // Example: "LCP is too slow"
  title: string;

  // The condition(s) that must be true for this rule to fire.
  // For "runtime" category: only condition.runtime is required.
  // For "static"  category: only condition.static is required.
  // For "cross"   category: BOTH must be true simultaneously.
  condition: RuleCondition;

  // The explanation message shown to the developer.
  // Supports {placeholder} tokens that get replaced with real values.
  // Available tokens:
  //   {metrics.lcp}     — actual LCP value from the runtime report
  //   {metrics.fcp}     — actual FCP value
  //   {renderTime}      — total render time
  //   {component}       — name of the affected component (if found)
  //   {rerenders}       — re-render count of the affected component
  //   {commitDuration}  — slowest commit duration
  // Example: "Your LCP is {metrics.lcp}ms — users wait too long."
  message: string;

  // A concrete, actionable fix the developer can apply right now.
  // Be specific — not "improve performance" but "add React.lazy() to..."
  fix: string;
}

// ─────────────────────────────────────────────────────────────
// EVALUATION CONTEXT
//
// This object is assembled from both reports and passed to the
// evaluator. It contains everything a rule condition can access.
//
// When a condition string like "metrics.lcp > 2500" is evaluated,
// it runs as a JS expression with this object as its scope.
// ─────────────────────────────────────────────────────────────

export interface EvaluationContext {
  // ── Runtime fields ──────────────────────────────────────────
  // The 5 web vitals (all in ms except cls which is a score)
  metrics: {
    lcp:  number;
    fcp:  number;
    cls:  number;
    inp:  number;
    ttfb: number;
  };

  // Total time from navigation start to networkidle0 (ms)
  renderTime: number;

  // Re-render counts per component: { "Divider": 5, "App": 1, ... }
  rerenders: Record<string, number>;

  // How long each React commit took in ms: [40.2, 1.1, 8.7]
  commitDurations: number[];

  // Slowest single commit duration in ms (0 if no commits recorded)
  slowestCommit: number;

  // Average commit duration in ms (0 if no commits recorded)
  avgCommit: number;

  // Number of commits that exceeded the 16ms 60fps budget
  slowCommitCount: number;

  // Total number of DOM elements on the page
  domNodes: number;

  // Total page payload in MB (as a number, not a string)
  payloadMB: number;

  // JS heap usage in MB (as a number, not a string)
  jsHeapMB: number;

  // JS errors caught during page load
  errors: Array<{ type: "error" | "warning"; message: string }>;

  // Number of JS errors (shorthand for errors.filter(...).length)
  errorCount: number;

  // Number of console warnings
  warningCount: number;

  // The 0–100 performance score calculated by the profiler
  performanceScore: number;

  // ── Static fields ────────────────────────────────────────────
  // All issues found by the static analyzer
  issues: Array<{
    id: string;
    component: string;
    file: string;
    line: number;
    severity: string;
    message: string;
  }>;

  // Shorthand counts by severity
  criticalIssueCount: number;
  warningIssueCount:  number;

  // True if any issue ID starts with the given prefix.
  // Used in conditions like: hasIssue('missing-memo')
  // This is a function placed on the context object so conditions
  // can call it: "hasIssue('missing-memo')"
  hasIssue: (prefix: string) => boolean;

  // Returns all issues whose ID starts with the given prefix.
  // Used when you need the actual issue objects in a condition.
  // Example: "getIssues('large-component').length > 0"
  getIssues: (prefix: string) => EvaluationContext["issues"];

  // The name of the component most affected (highest re-render count).
  // Used in message placeholders: "Wrap {component} in React.memo()"
  topRerenderComponent: string;

  // The re-render count of the top component above
  topRerenderCount: number;
}

// ─────────────────────────────────────────────────────────────
// RULE ENGINE RESULT
//
// The final output of the Rule Engine — what gets written to
// suggestions.json and passed to the Report Compiler.
// ─────────────────────────────────────────────────────────────

export interface RuleEngineResult {
  // ISO timestamp of when the rule engine ran
  timestamp: string;

  // Which route was analyzed (e.g. "/" or "/about")
  route: string;

  // Which device the runtime report came from
  device: string;

  // All generated suggestions, sorted by severity (critical first)
  suggestions: Suggestion[];

  // Summary counts for quick display
  summary: {
    critical: number;
    warning:  number;
    info:     number;
    total:    number;
  };
}
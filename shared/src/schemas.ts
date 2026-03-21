// ─────────────────────────────────────────────────────────────
// STATIC ANALYSIS TYPES
// ─────────────────────────────────────────────────────────────

/**
 * A single issue found in a React component by the static analyzer.
 */
export interface ComponentIssue {
  id: string;                              // e.g. "large-component-App.tsx-12"
  component: string;                       // e.g. "UserDashboard"
  file: string;                            // file path
  line: number;                            // line number where issue was found
  column?: number;                         // column number (optional)
  severity: "critical" | "warning" | "info";
  message: string;                         // what's wrong
  suggestion: string;                      // how to fix it
}

/**
 * Full report produced by the Static Analyzer.
 * Saved to: core/reports/staticreport.json
 */
export interface StaticReport {
  timestamp: string;
  componentCount: number;
  filesAnalyzed: number;
  filesFailed: number;
  issues: ComponentIssue[];
  grade: string;
}

// ─────────────────────────────────────────────────────────────
// RUNTIME PROFILER TYPES
// ─────────────────────────────────────────────────────────────

/**
 * The 5 Core Web Vitals collected by the web-vitals library.
 * All timing values are in milliseconds except CLS (a score).
 *
 * LCP  — Largest Contentful Paint   → good: < 2500ms
 * FCP  — First Contentful Paint     → good: < 1800ms
 * CLS  — Cumulative Layout Shift    → good: < 0.1
 * INP  — Interaction to Next Paint  → good: < 200ms
 * TTFB — Time to First Byte         → good: < 800ms
 */
export interface WebVitals {
  lcp: number;
  fcp: number;
  cls: number;
  inp: number;
  ttfb: number;
}

/**
 * System-level resource stats collected via Puppeteer and
 * the browser's native Performance API.
 *
 * domNodes:    number of HTML elements in the page
 * jsHeapMB:    JavaScript heap memory used (MB as string with 2 decimals)
 * payloadMB:   total network payload transferred (MB as string)
 * topOffender: the single heaviest file downloaded — name and size in MB
 */
export interface SystemStats {
  domNodes: number;
  jsHeapMB: string;
  payloadMB: string;
  topOffender: {
    name: string;
    size: number;
  } | null;
}

/**
 * Full runtime profiling report for a single route.
 * Saved to: core/reports/runtimereport.json
 *
 * metrics:         the 5 core web vitals
 * rerenders:       how many times each component re-rendered
 *                  key = component name, value = render count
 *                  e.g. { "UserDashboard": 12, "Button": 3 }
 * commitDurations: how long each React commit took in ms
 *                  a commit = one full render + reconcile + paint cycle
 *                  e.g. [4.2, 1.1, 8.7]
 * renderTime:      total time from navigation start to networkidle0 in ms
 * stats:           system-level resource usage
 * deviceType:      which device preset was used for this audit
 */
export interface RuntimeReport {
  timestamp: string;
  url: string;
  deviceType: "desktop" | "mobile";
  metrics: WebVitals;
  rerenders: Record<string, number>;
  commitDurations: number[];
  renderTime: number;
  stats: SystemStats;
}

// ─────────────────────────────────────────────────────────────
// RULE ENGINE TYPES
// ─────────────────────────────────────────────────────────────

/**
 * A suggestion produced by the Rule Engine after reading
 * both the static and runtime reports.
 *
 * Example:
 *   IF LCP > 2500 AND component uses <img> without lazy loading
 *   THEN suggest: "Use lazy loading for images in Home.tsx"
 */
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  affectedComponent?: string;
  fix: string;
}

// ─────────────────────────────────────────────────────────────
// FINAL COMBINED REPORT
// ─────────────────────────────────────────────────────────────

/**
 * The complete report that the Report Compiler builds by merging
 * static analysis + runtime profiling + rule engine suggestions.
 * This is what gets sent to the backend API and shown in the dashboard.
 */
export interface FinalReport {
  projectName: string;
  analyzedAt: string;
  static: StaticReport;
  runtime: Record<string, RuntimeReport>;  // keyed by route: "/" | "/about" | etc.
  suggestions: Suggestion[];
  performanceScore: number;                // 0–100
}
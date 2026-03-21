// ─────────────────────────────────────────────────────────────
// STATIC ANALYSIS TYPES
// ─────────────────────────────────────────────────────────────

export interface ComponentIssue {
  id: string;
  component: string;
  file: string;
  line: number;
  column?: number;
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion: string;
}

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

export interface WebVitals {
  lcp: number;   // Largest Contentful Paint  — good: < 2500ms
  fcp: number;   // First Contentful Paint    — good: < 1800ms
  cls: number;   // Cumulative Layout Shift   — good: < 0.1
  inp: number;   // Interaction to Next Paint — good: < 200ms
  ttfb: number;  // Time to First Byte        — good: < 800ms
}

export interface SystemStats {
  domNodes: number;
  jsHeapMB: string;
  payloadMB: string;
  topOffender: { name: string; size: number } | null;
}

/**
 * A JS error or React console warning captured during page load.
 *
 * type:    "error"   — uncaught JS exception or console.error()
 *          "warning" — console.warn() — usually React warnings like
 *                      "Each child in a list should have a unique key"
 *
 * message: the full error/warning text
 * source:  "pageerror" (uncaught exception) | "console" (console.error/warn)
 */
export interface PageError {
  type: "error" | "warning";
  message: string;
  source: "pageerror" | "console";
}

/**
 * A screenshot taken at a specific moment during page load.
 *
 * label:    human-readable name — "fcp", "lcp", "fullLoad"
 * dataUrl:  base64-encoded PNG prefixed with "data:image/png;base64,"
 *           Ready to use directly as an <img src="..."> in the dashboard.
 * takenAt:  ms since navigation start when the screenshot was taken
 */
export interface Screenshot {
  label: string;
  dataUrl: string;
  takenAt: number;
}

/**
 * Full runtime profiling report for a single route + device combination.
 *
 * NEW fields added:
 *   performanceScore  — 0–100 overall score weighted from all metrics
 *   errors            — JS errors and React warnings captured during load
 *   screenshots       — visual filmstrip: FCP moment, LCP moment, full load
 *   cpuThrottling     — which CPU throttle preset was active (1 = none, 4 = slow)
 */
export interface RuntimeReport {
  timestamp: string;
  url: string;
  deviceType: "desktop" | "mobile";

  // Web vitals
  metrics: WebVitals;

  // React profiler
  rerenders: Record<string, number>;
  commitDurations: number[];
  renderTime: number;

  // System stats
  stats: SystemStats;

  // NEW: performance score
  performanceScore: number;

  // NEW: JS errors and console warnings
  errors: PageError[];

  // NEW: screenshots at key moments
  screenshots: Screenshot[];

  // NEW: which CPU throttle was active (1 = real speed, 4 = 4x slowdown)
  cpuThrottling: number;
}

// ─────────────────────────────────────────────────────────────
// RULE ENGINE TYPES
// ─────────────────────────────────────────────────────────────

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

export interface FinalReport {
  projectName: string;
  analyzedAt: string;
  static: StaticReport;
  runtime: Record<string, RuntimeReport>;
  suggestions: Suggestion[];
  performanceScore: number;
}
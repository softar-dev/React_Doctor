// ─────────────────────────────────────────────────────────────
// report-compiler/index.ts
//
// The Report Compiler — the final step inside core.
//
// WHAT IT DOES:
// Reads the three separate JSON files produced by the other
// core components and merges them into one clean FinalReport.
//
// WHY IT EXISTS:
// The Static Analyzer, Runtime Profiler, and Rule Engine each
// save their own JSON files independently. The CLI needs a
// single object to upload to the backend and show to the user.
// This compiler does that merging so the CLI stays clean.
//
// INPUT FILES (all read from core/reports/):
//   staticreport.json   — produced by the Static Analyzer
//   runtimereport.json  — produced by the Runtime Profiler
//   suggestions.json    — produced by the Rule Engine
//
// OUTPUT FILE (saved to core/reports/):
//   finalreport.json    — the complete merged report
//
// FULL FLOW:
//   1. Load all three input files from disk
//   2. Flatten the suggestions array (Rule Engine saves one
//      entry per route — we merge them into one deduplicated list)
//   3. Calculate one overall performance score (average across
//      all routes and devices)
//   4. Assemble the FinalReport object
//   5. Save finalreport.json
//   6. Return the FinalReport for the CLI to use
// ─────────────────────────────────────────────────────────────

import path from "path";
import fs   from "fs-extra";

import {
  StaticReport,
  RuntimeReport,
  Suggestion,
  FinalReport,
} from "../../shared/src/types";

// ─────────────────────────────────────────────────────────────
// INLINE TYPE: RuleEngineResult
//
// The Rule Engine saves suggestions.json as an array of these.
// We define it inline here so the Report Compiler doesn't need
// to import from the rule-engine folder — keeping dependencies
// one-directional (compiler reads files, not code).
// ─────────────────────────────────────────────────────────────
interface RuleEngineResult {
  timestamp:   string;
  route:       string;
  device:      string;
  suggestions: Suggestion[];
  summary: {
    critical: number;
    warning:  number;
    info:     number;
    total:    number;
  };
}

export class ReportCompiler {

  // All report files live in core/reports/ — one level up from
  // this file's location at core/report-compiler/
  private reportsDir: string;

  constructor() {
    // __dirname = core/report-compiler/
    // ".."      = core/
    this.reportsDir = path.resolve(__dirname, "..", "reports");
  }

  // ───────────────────────────────────────────────────────────
  // PUBLIC: compile
  // ───────────────────────────────────────────────────────────

  /**
   * Main entry point. Loads all three reports, merges them,
   * saves finalreport.json, and returns the FinalReport object.
   *
   * @param projectName — display name for the project
   *                      (used in the dashboard and backend)
   *                      e.g. "my-react-app" or "retest"
   *
   * @returns The complete FinalReport ready for the CLI to upload
   *
   * @throws If any required report file is missing — the caller
   *         should run the analyzer/profiler/rule-engine first.
   */
  /**
   * Overloads:
   *   compile(projectName)
   *     — reads all three reports from disk (standalone / test use)
   *
   *   compile(staticReport, runtimeReports, ruleResults)
   *     — receives data directly from the CLI pipeline in memory
   *       (no disk read needed — faster and no stale-file issues)
   *
   * The CLI always passes data directly. The standalone test runner
   * calls compile(projectName) which reads from core/reports/.
   */
  async compile(
    staticReportOrName:  StaticReport | string | null,
    runtimeReportsArg?:  Record<string, RuntimeReport>,
    ruleResultsArg?:     any[],
  ): Promise<FinalReport> {
    console.log("\n📦 Report Compiler starting...");

    let staticReport:   StaticReport;
    let runtimeReports: Record<string, RuntimeReport>;
    let ruleResults:    any[];
    let projectName:    string;

    // ── Determine call mode ────────────────────────────────────
    if (typeof staticReportOrName === "string" || staticReportOrName === null) {
      // Called as compile(projectName) — read from disk
      projectName  = (staticReportOrName as string) ?? "react-app";
      staticReport   = this.loadStaticReport();
      runtimeReports = this.loadRuntimeReports();
      ruleResults    = this.loadSuggestions();
    } else {
      // Called as compile(staticReport, runtimeReports, ruleResults)
      // — data passed directly from the CLI pipeline
      staticReport   = staticReportOrName;
      runtimeReports = runtimeReportsArg ?? {};
      ruleResults    = ruleResultsArg    ?? [];
      // Derive project name from the runtime report URL if available
      const firstUrl = Object.values(runtimeReports)[0]?.url ?? "";
      projectName    = firstUrl ? new URL(firstUrl).hostname : "react-app";
    }

    // Print a quick summary of what was loaded
    console.log(`   Static report:   ${staticReport?.issues?.length ?? 0} issue(s)`);
    console.log(`   Runtime report:  ${Object.keys(runtimeReports).length} route+device entry(s)`);
    console.log(`   Rule results:    ${ruleResults.length} route+device entry(s)`);

    // ── Step 2: Flatten and deduplicate suggestions ────────────
    //
    // The Rule Engine produces one RuleEngineResult per route+device.
    // Example: for "/::desktop" and "/::mobile" you get two results,
    // each with their own suggestions array.
    //
    // The FinalReport has ONE flat suggestions array. We merge all
    // per-route arrays together and deduplicate by suggestion ID so
    // the same fix isn't shown twice just because it fired on both
    // desktop and mobile.
    const suggestions = this.mergeSuggestions(ruleResults);
    console.log(`   Suggestions:     ${suggestions.length} (deduplicated from all routes)`);

    // Log severity breakdown for quick visibility
    const critical = suggestions.filter(s => s.severity === "critical").length;
    const warning  = suggestions.filter(s => s.severity === "warning").length;
    const info     = suggestions.filter(s => s.severity === "info").length;
    if (critical > 0) console.log(`     ❌ ${critical} critical`);
    if (warning  > 0) console.log(`     ⚠️  ${warning} warnings`);
    if (info     > 0) console.log(`     ℹ️  ${info} info`);

    // ── Step 3: Calculate one overall performance score ────────
    //
    // The profiler calculates a 0-100 score per route+device.
    // Here we average them all into a single project-level score
    // that the dashboard can display as the main health metric.
    const performanceScore = this.calculateOverallScore(runtimeReports);
    console.log(`   Overall score:   ${performanceScore}/100`);

    // ── Step 4: Assemble the FinalReport ──────────────────────
    const finalReport: FinalReport = {
      projectName,
      analyzedAt:    new Date().toISOString(),
      static:        staticReport,
      runtime:       runtimeReports,
      suggestions,
      performanceScore,
    };

    // ── Step 5: Save to disk ───────────────────────────────────
    await this.save(finalReport);

    console.log("✅ Report Compiler complete.\n");
    return finalReport;
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: loaders
  // ───────────────────────────────────────────────────────────

  /**
   * Loads staticreport.json.
   * Throws a clear error message if the file is missing so the
   * developer knows exactly which command they need to run first.
   */
  private loadStaticReport(): StaticReport {
    const filePath = path.join(this.reportsDir, "staticreport.json");

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `❌ staticreport.json not found at: ${filePath}\n\n` +
        `   Run the static analyzer first:\n` +
        `   npx ts-node --compiler-options '{"module":"commonjs"}' ` +
        `static-ana/test-analyzer.ts`,
      );
    }

    console.log(`   ✅ Loaded staticreport.json`);
    return fs.readJsonSync(filePath) as StaticReport;
  }

  /**
   * Loads runtimereport.json.
   * The file is keyed by route+device, e.g.:
   *   { "/::desktop": {...}, "/::mobile": {...} }
   */
  private loadRuntimeReports(): Record<string, RuntimeReport> {
    const filePath = path.join(this.reportsDir, "runtimereport.json");

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `❌ runtimereport.json not found at: ${filePath}\n\n` +
        `   Run the runtime profiler first:\n` +
        `   npx ts-node --compiler-options '{"module":"commonjs"}' ` +
        `runtime/test-runtime-profiler.ts <path-to-react-app>`,
      );
    }

    console.log(`   ✅ Loaded runtimereport.json`);
    return fs.readJsonSync(filePath) as Record<string, RuntimeReport>;
  }

  /**
   * Loads suggestions.json.
   * The Rule Engine saves this as an array — one RuleEngineResult
   * per route+device combination that was analyzed.
   */
  private loadSuggestions(): RuleEngineResult[] {
    const filePath = path.join(this.reportsDir, "suggestions.json");

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `❌ suggestions.json not found at: ${filePath}\n\n` +
        `   Run the rule engine first:\n` +
        `   npx ts-node --compiler-options '{"module":"commonjs"}' ` +
        `rule-engine/test-rule-engine.ts`,
      );
    }

    console.log(`   ✅ Loaded suggestions.json`);
    return fs.readJsonSync(filePath) as RuleEngineResult[];
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: mergeSuggestions
  // ───────────────────────────────────────────────────────────

  /**
   * Flattens all per-route suggestion arrays into one flat list
   * and removes duplicates by suggestion ID.
   *
   * WHY DEDUPLICATION IS NEEDED:
   * When the profiler runs both desktop and mobile, the Rule Engine
   * produces two RuleEngineResults for the same route — one for
   * each device. Many rules will fire on both (e.g. "missing key
   * props" is a static issue that applies regardless of device).
   * Without deduplication, the final report would show the same
   * suggestion twice.
   *
   * WHAT "SAME" MEANS:
   * Two suggestions are the same if they have the same id. The id
   * comes from the rule definition (e.g. "missing-list-keys") so
   * it's stable across devices.
   *
   * WHAT WE KEEP:
   * The first occurrence. Suggestions from the same rule are
   * identical in title, description, and fix — only the route
   * they came from differs, which is not part of the Suggestion
   * interface.
   *
   * SORT ORDER:
   * critical → warning → info (most important first).
   */
  private mergeSuggestions(ruleResults: RuleEngineResult[]): Suggestion[] {
    const seen   = new Set<string>();
    const merged: Suggestion[] = [];

    for (const result of ruleResults) {
      for (const suggestion of result.suggestions) {
        // Skip if we've already added a suggestion with this id
        if (!seen.has(suggestion.id)) {
          seen.add(suggestion.id);
          merged.push(suggestion);
        }
      }
    }

    // Sort by severity so critical issues appear first
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return merged.sort(
      (a, b) =>
        (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
    );
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: calculateOverallScore
  // ───────────────────────────────────────────────────────────

  /**
   * Averages the performanceScore from all route+device entries
   * in the runtime report into one overall project health score.
   *
   * EXAMPLE:
   *   /::desktop  → score 63
   *   /::mobile   → score 91
   *   overall     → Math.round((63 + 91) / 2) = 77
   *
   * Returns 0 if no runtime data exists (static-only run).
   */
  private calculateOverallScore(
    runtimeReports: Record<string, RuntimeReport>,
  ): number {
    const entries = Object.values(runtimeReports);
    if (entries.length === 0) return 0;

    const total = entries.reduce(
      (sum, report) => sum + (report.performanceScore ?? 0),
      0,
    );

    return Math.round(total / entries.length);
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: save
  // ───────────────────────────────────────────────────────────

  /**
   * Saves the FinalReport to core/reports/finalreport.json.
   *
   * NOTE ON FILE SIZE:
   * The runtime report embeds screenshot data URLs (base64-encoded
   * PNGs) which can make this file large — typically 2-5MB per
   * screenshot. The PNG files already exist in core/reports/screenshots/
   * so the CLI can strip the base64 data URLs before uploading to
   * the backend if bandwidth is a concern.
   */
  private async save(report: FinalReport): Promise<void> {
    const outputPath = path.join(this.reportsDir, "finalreport.json");
    await fs.writeJson(outputPath, report, { spaces: 2 });
    console.log(`📄 Final report saved to: ${outputPath}`);
  }
}
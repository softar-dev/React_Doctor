// The RuleEngine class — the public API for the rule engine.
// This is what the CLI and Report Compiler call.
//
// FULL FLOW:
//
//   1. RuleEngine.run(staticReport, runtimeReports) is called
//
//   2. rules.json is loaded from disk
//      (JSON with comments is stripped before parsing)
//
//   3. For each route in the runtime reports:
//      a. buildContext()       → assembles the EvaluationContext
//      b. evaluateAllRules()   → finds which rules fired
//      c. buildAllSuggestions()→ converts fired rules to Suggestion objects
//
//   4. All results are written to core/reports/suggestions.json
//
//   5. The RuleEngineResult array is returned for use by the
//      Report Compiler
// ─────────────────────────────────────────────────────────────

import path from "path";
import fs   from "fs-extra";

import { StaticReport, RuntimeReport, Suggestion } from "../../shared/src/types";
import { RuleDefinition, RuleEngineResult }         from "./types";
import { buildContext }                              from "./context-builder";
import { evaluateAllRules }                          from "./evaluator";
import { buildAllSuggestions }                       from "./suggestion-builder";

export class RuleEngine {
  // Path to the rules.json file — same directory as this file
  private rulesPath: string;

  // Path to the reports folder where suggestions.json is saved
  private reportDir: string;

  constructor() {
    this.rulesPath = path.join(__dirname, "rules.json");

    // __dirname = core/rule-engine/
    // 1 level up = core/  → reports folder lives here
    this.reportDir = path.resolve(__dirname, "..", "reports");
    fs.ensureDirSync(this.reportDir);
  }

  /**
   * Runs the Rule Engine against both reports.
   *
   * @param staticReport   — result from the Static Analyzer (can be null
   *                         if only runtime profiling was run)
   * @param runtimeReports — map of route → RuntimeReport from the profiler
   *                         Example: { "/": {...}, "/about": {...} }
   *                         Can be empty {} if only static analysis was run
   *
   * @returns Array of RuleEngineResult — one per route
   */
  async run(
    staticReport:   StaticReport  | null,
    runtimeReports: Record<string, RuntimeReport>,
  ): Promise<RuleEngineResult[]> {
    console.log("\n🧠 Rule Engine starting...");

    // ── Load rules from disk ───────────────────────────────────
    const rules = this.loadRules();
    console.log(`   Loaded ${rules.length} rules`);

    const results: RuleEngineResult[] = [];

    // ── Handle case: only static report, no runtime data ───────
    // If no runtime reports were provided (user ran analyze only),
    // we still run all static-only rules against an empty runtime context.
    if (Object.keys(runtimeReports).length === 0) {
      console.log("   Running static-only rules (no runtime data)...");

      const context    = buildContext(staticReport, null);
      const firedRules = evaluateAllRules(rules, context);
      const suggestions = buildAllSuggestions(firedRules, context);

      results.push(
        this.buildResult("(static-only)", "none", suggestions),
      );
    } else {
      // ── Run rules for each route ───────────────────────────────
      // The runtime report is keyed by route (and optionally device).
      // Keys look like "/" or "/::desktop" or "/about::mobile".
      for (const [key, runtimeReport] of Object.entries(runtimeReports)) {
        // Parse the key — it may include a device suffix
        const [route, device] = key.includes("::")
          ? key.split("::")
          : [key, runtimeReport.deviceType ?? "desktop"];

        console.log(`\n   Analyzing: ${route} [${device}]`);

        // Build the evaluation context from both reports
        const context = buildContext(staticReport, runtimeReport);

        // Find all rules whose conditions are true
        const firedRules = evaluateAllRules(rules, context);
        console.log(`   Rules fired: ${firedRules.length} / ${rules.length}`);

        // Convert fired rules into Suggestion objects
        const suggestions = buildAllSuggestions(firedRules, context);

        // Log the severity breakdown
        const critical = suggestions.filter(s => s.severity === "critical").length;
        const warning  = suggestions.filter(s => s.severity === "warning").length;
        const info     = suggestions.filter(s => s.severity === "info").length;

        if (critical > 0) console.log(`   ❌ ${critical} critical`);
        if (warning  > 0) console.log(`   ⚠️  ${warning} warnings`);
        if (info     > 0) console.log(`   ℹ️  ${info} info`);

        results.push(this.buildResult(route, device, suggestions));
      }
    }

    // ── Save to disk ───────────────────────────────────────────
    await this.saveResults(results);

    const totalSuggestions = results.reduce((sum, r) => sum + r.suggestions.length, 0);
    console.log(`\n✅ Rule Engine complete. ${totalSuggestions} suggestion(s) generated.`);

    return results;
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: load rules
  // ───────────────────────────────────────────────────────────

  /**
   * Loads rules from rules.json and parses them.
   *
   * rules.json uses JavaScript-style comments (// and /* )
   * for readability, but JSON.parse() doesn't support comments.
   * We strip all comment lines before parsing.
   *
   * This lets us write:
   *   // RUNTIME-ONLY RULES
   *   { "id": "slow-lcp", ... }
   *
   * Instead of raw uncommented JSON which is harder to navigate.
   */
  private loadRules(): RuleDefinition[] {
    if (!fs.existsSync(this.rulesPath)) {
      throw new Error(
        `❌ rules.json not found at: ${this.rulesPath}\n` +
        `   Make sure rules.json is in the same folder as index.ts`,
      );
    }

    const raw = fs.readFileSync(this.rulesPath, "utf-8");

    // Strip single-line comments (// ...) and multi-line comments (/* ... */)
    // We do this line by line for single-line comments, then use a regex
    // for multi-line. This is simpler than a full JSON-with-comments parser.
    const stripped = raw
      .split("\n")
      .map(line => {
        // Remove // comments but be careful not to remove // inside strings
        // Simple approach: if the line starts with optional whitespace then //,
        // remove the whole line. This covers the 99% case in rules.json.
        const trimmed = line.trimStart();
        return trimmed.startsWith("//") ? "" : line;
      })
      .join("\n")
      // Remove multi-line block comments /* ... */
      .replace(/\/\*[\s\S]*?\*\//g, "");

    try {
      return JSON.parse(stripped) as RuleDefinition[];
    } catch (err) {
      throw new Error(
        `❌ Failed to parse rules.json: ${(err as Error).message}\n` +
        `   Check rules.json for syntax errors.`,
      );
    }
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: build result
  // ───────────────────────────────────────────────────────────

  /**
   * Wraps the suggestions for one route into a RuleEngineResult.
   * Adds summary counts and metadata.
   */
  private buildResult(
    route:       string,
    device:      string,
    suggestions: Suggestion[],
  ): RuleEngineResult {
    return {
      timestamp: new Date().toISOString(),
      route,
      device,
      suggestions,
      summary: {
        critical: suggestions.filter(s => s.severity === "critical").length,
        warning:  suggestions.filter(s => s.severity === "warning").length,
        info:     suggestions.filter(s => s.severity === "info").length,
        total:    suggestions.length,
      },
    };
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: save results
  // ───────────────────────────────────────────────────────────

  /**
   * Saves all RuleEngineResults to suggestions.json.
   *
   * The file structure is an array — one entry per route.
   * The Report Compiler reads this file when building the
   * final combined report.
   *
   * Location: core/reports/suggestions.json
   */
  private async saveResults(results: RuleEngineResult[]): Promise<void> {
    const outputPath = path.join(this.reportDir, "suggestions.json");
    await fs.writeJson(outputPath, results, { spaces: 2 });
    console.log(`📄 Suggestions saved to: ${outputPath}`);
  }
}
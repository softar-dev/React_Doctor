// Test runner for the Rule Engine.
// Reads the existing staticreport.json and runtimereport.json
// from core/reports/ and runs the Rule Engine against them.
//
// Usage:
//   npx ts-node --compiler-options '{"module":"commonjs"}'
//   rule-engine/test-rule-engine.ts
// ─────────────────────────────────────────────────────────────

import path from "path";
import fs   from "fs-extra";
import { RuleEngine }    from "./index";
import { StaticReport, RuntimeReport } from "../../shared/src/types";
import { RuleEngineResult } from "./types";

// ── Severity badge helpers ────────────────────────────────────

function severityIcon(s: string): string {
  if (s === "critical") return "❌";
  if (s === "warning")  return "⚠️ ";
  return "ℹ️ ";
}

function severityLabel(s: string): string {
  if (s === "critical") return "CRITICAL";
  if (s === "warning")  return "WARNING";
  return "INFO";
}

// ── Load reports ─────────────────────────────────────────────

async function loadReports(): Promise<{
  staticReport:   StaticReport  | null;
  runtimeReports: Record<string, RuntimeReport>;
}> {
  // Reports live in core/reports/ — one level up from rule-engine/
  const reportsDir = path.resolve(__dirname, "..", "reports");

  const staticPath  = path.join(reportsDir, "staticreport.json");
  const runtimePath = path.join(reportsDir, "runtimereport.json");

  let staticReport: StaticReport | null = null;
  let runtimeReports: Record<string, RuntimeReport> = {};

  // Load static report if it exists
  if (fs.existsSync(staticPath)) {
    staticReport = await fs.readJson(staticPath);
    console.log(`✅ Loaded staticreport.json`);
  } else {
    console.log(`⚠️  staticreport.json not found — running without static data`);
  }

  // Load runtime report if it exists
  if (fs.existsSync(runtimePath)) {
    runtimeReports = await fs.readJson(runtimePath);
    const routeCount = Object.keys(runtimeReports).length;
    console.log(`✅ Loaded runtimereport.json (${routeCount} route(s))`);
  } else {
    console.log(`⚠️  runtimereport.json not found — running without runtime data`);
  }

  return { staticReport, runtimeReports };
}

// ── Print results ─────────────────────────────────────────────

function printResults(results: RuleEngineResult[]): void {
  for (const result of results) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📍 Route: ${result.route}  [${result.device}]`);
    console.log(`${"=".repeat(60)}`);
    console.log(`   Total suggestions: ${result.summary.total}`);
    console.log(`   ❌ Critical: ${result.summary.critical}`);
    console.log(`   ⚠️  Warnings: ${result.summary.warning}`);
    console.log(`   ℹ️  Info:     ${result.summary.info}`);

    if (result.suggestions.length === 0) {
      console.log("\n   ✅ No issues found — great work!\n");
      continue;
    }

    console.log();

    for (const suggestion of result.suggestions) {
      const icon = severityIcon(suggestion.severity);
      const label = severityLabel(suggestion.severity);

      console.log(`${icon}  [${label}] ${suggestion.title}`);

      if (suggestion.affectedComponent) {
        console.log(`   Component: ${suggestion.affectedComponent}`);
      }

      console.log(`   ${suggestion.description}`);
      console.log();
      console.log(`   Fix:`);

      // Print each line of the fix indented for readability
      suggestion.fix.split("\n").forEach(line => {
        console.log(`     ${line}`);
      });

      console.log(`${"─".repeat(60)}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("=========================================================");
  console.log("🧠  REACT DOCTOR — RULE ENGINE TEST");
  console.log("=========================================================\n");

  // Load reports from disk
  const { staticReport, runtimeReports } = await loadReports();

  if (!staticReport && Object.keys(runtimeReports).length === 0) {
    console.error(
      "\n❌ No reports found.\n" +
      "   Run the static analyzer or profiler first:\n" +
      "   npx ts-node ... static-ana/test-analyzer.ts\n" +
      "   npx ts-node ... runtime/test-runtime-profiler.ts <path>\n",
    );
    process.exit(1);
  }

  // Run the Rule Engine
  const engine  = new RuleEngine();
  const results = await engine.run(staticReport, runtimeReports);

  // Print results to terminal
  printResults(results);

  console.log("\n=========================================================");
  console.log("✅ Rule Engine test complete.");
  console.log(`📄 Suggestions saved to: core/reports/suggestions.json`);
  console.log("=========================================================\n");
}

main().catch(err => {
  console.error("\n❌ Rule Engine error:", err.message);
  process.exit(1);
});
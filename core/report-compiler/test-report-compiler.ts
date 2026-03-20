// ─────────────────────────────────────────────────────────────
// report-compiler/test-report-compiler.ts
//
// Test runner for the Report Compiler.
// Reads the existing three report files from core/reports/
// and compiles them into finalreport.json.
//
// PREREQUISITES — run these first (from the core/ directory):
//   npx ts-node --compiler-options '{"module":"commonjs"}' static-ana/test-analyzer.ts
//   npx ts-node --compiler-options '{"module":"commonjs"}' runtime/test-runtime-profiler.ts <path>
//   npx ts-node --compiler-options '{"module":"commonjs"}' rule-engine/test-rule-engine.ts
//
// THEN run this (from the core/ directory):
//   npx ts-node --compiler-options '{"module":"commonjs"}' report-compiler/test-report-compiler.ts
// ─────────────────────────────────────────────────────────────

import { ReportCompiler } from "./index";
import { FinalReport }    from "../../shared/src/types";
import path               from "path";

// ── Helpers ───────────────────────────────────────────────────

function scoreBadge(score: number): string {
  if (score >= 90) return `${score}/100 🟢 Excellent`;
  if (score >= 70) return `${score}/100 🟡 Good`;
  if (score >= 50) return `${score}/100 🟠 Needs Work`;
  return `${score}/100 🔴 Poor`;
}

function printSummary(report: FinalReport): void {
  console.log("=".repeat(60));
  console.log(`📋  FINAL REPORT SUMMARY`);
  console.log("=".repeat(60));

  console.log(`\n  Project:    ${report.projectName}`);
  console.log(`  Analyzed:   ${new Date(report.analyzedAt).toLocaleString()}`);
  console.log(`  Score:      ${scoreBadge(report.performanceScore)}`);

  // Static summary
  console.log(`\n  📂 Static Analysis`);
  console.log(`     Files analyzed:  ${report.static.filesAnalyzed}`);
  console.log(`     Issues found:    ${report.static.issues.length}`);
  console.log(`     Grade:           ${report.static.grade}`);

  const critical = report.static.issues.filter(i => i.severity === "critical").length;
  const warnings = report.static.issues.filter(i => i.severity === "warning").length;
  const infos    = report.static.issues.filter(i => i.severity === "info").length;
  if (critical > 0) console.log(`       ❌ ${critical} critical`);
  if (warnings > 0) console.log(`       ⚠️  ${warnings} warnings`);
  if (infos    > 0) console.log(`       ℹ️  ${infos} info`);

  // Runtime summary — one line per route+device
  console.log(`\n  ⚡ Runtime Profiling`);
  for (const [key, entry] of Object.entries(report.runtime)) {
    const [route, device] = key.includes("::") ? key.split("::") : [key, "desktop"];
    const score = entry.performanceScore ?? 0;
    const dot   = score >= 90 ? "🟢" : score >= 70 ? "🟡" : score >= 50 ? "🟠" : "🔴";
    console.log(`     ${dot} ${route} [${device}]  ${score}/100  — LCP: ${entry.metrics.lcp.toFixed(0)}ms  Render: ${entry.renderTime}ms`);
  }

  // Suggestions summary
  console.log(`\n  🧠 Suggestions (${report.suggestions.length} total)`);
  const critSug = report.suggestions.filter(s => s.severity === "critical");
  const warnSug = report.suggestions.filter(s => s.severity === "warning");
  const infoSug = report.suggestions.filter(s => s.severity === "info");

  if (critSug.length > 0) {
    console.log(`\n  ❌ Critical (${critSug.length}):`);
    critSug.forEach(s => {
      const comp = s.affectedComponent ? ` [${s.affectedComponent}]` : "";
      console.log(`     • ${s.title}${comp}`);
    });
  }

  if (warnSug.length > 0) {
    console.log(`\n  ⚠️  Warnings (${warnSug.length}):`);
    warnSug.forEach(s => {
      const comp = s.affectedComponent ? ` [${s.affectedComponent}]` : "";
      console.log(`     • ${s.title}${comp}`);
    });
  }

  if (infoSug.length > 0) {
    console.log(`\n  ℹ️  Info (${infoSug.length}):`);
    infoSug.forEach(s => {
      const comp = s.affectedComponent ? ` [${s.affectedComponent}]` : "";
      console.log(`     • ${s.title}${comp}`);
    });
  }

  console.log("\n" + "=".repeat(60));
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("=========================================================");
  console.log("📦  REACT DOCTOR — REPORT COMPILER");
  console.log("=========================================================");

  // The project name is taken from the command line argument,
  // or defaults to "react-app" if none is provided.
  // Usage: npx ts-node ... test-report-compiler.ts my-project-name
  const projectName = process.argv[2] ?? "react-app";

  const compiler = new ReportCompiler();

  try {
    const finalReport = await compiler.compile(projectName);
    printSummary(finalReport);

    console.log("✅ Done. finalreport.json is ready for the backend.");
    console.log("=========================================================\n");

  } catch (err: unknown) {
    console.error("\n❌ Report Compiler error:");
    console.error((err as Error).message);
    console.error("\nMake sure you have run all three steps first:");
    console.error("  1. static-ana/test-analyzer.ts");
    console.error("  2. runtime/test-runtime-profiler.ts <path>");
    console.error("  3. rule-engine/test-rule-engine.ts\n");
    process.exit(1);
  }
}

main();
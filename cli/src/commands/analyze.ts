// ─────────────────────────────────────────────────────────────
// cli/src/commands/analyze.ts
//
// react-doctor analyze <projectPath>
//
// Runs the Static Analyzer only — no browser needed, fast.
// Reads JSX/TSX source files, runs all 9 detectors, and
// saves staticreport.json to .react-doctor/
//
// Use this when:
//   - You want a quick code quality check
//   - You don't have Chrome installed
//   - You only care about code patterns, not runtime metrics
//
// Use "react-doctor full" when you want everything.
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import path        from "path";
import fs          from "fs";
import chalk       from "chalk";
import {
  printBanner, printSection, printResult,
  printDone, printFail, printInfo,
  severityIcon, spinner,
} from "../ui";
import { runFullCommand } from "./full";

function getCoreModule(relativePath: string) {
  return require(path.resolve(__dirname, "..", "..", "..", "core", relativePath));
}

// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────

export function registerAnalyzeCommand(program: Command): void {
  program
    .command("analyze")
    .description("Run static code analysis only (no browser required)")
    .argument(
      "[projectPath]",
      "Path to the React project (defaults to current directory)",
      process.cwd(),
    )
    .option(
      "--full",
      "After static analysis, also run the runtime profiler and rule engine",
      false,
    )
    .option("--no-banner", "Skip the banner")
    .action(async (projectPath: string, options) => {

      // If --full flag is passed, delegate to the full command
      // which runs the complete pipeline
      if (options.full) {
        await runFullCommand(projectPath, { noBanner: options.noBanner });
        return;
      }

      const resolvedPath = path.resolve(projectPath);

      if (!options.noBanner) printBanner();

      // ── Validate project ────────────────────────────────────
      if (!fs.existsSync(path.join(resolvedPath, "package.json"))) {
        printFail(
          `No package.json found at: ${resolvedPath}\n\n` +
          `  Pass the path to your React project:\n` +
          `  react-doctor analyze ./my-react-app`,
        );
        process.exit(1);
      }

      printSection("Static Analysis");
      printInfo("Project", resolvedPath);
      console.log();

      // ── Run the static analyzer ─────────────────────────────
      const spin = spinner("Scanning JSX/TSX source files...");

      try {
        const { FileScanner }    = getCoreModule("static-ana/static/scanner");
        const { StaticAnalyzer } = getCoreModule("static-ana/static/analyzer");

        const scanner  = new FileScanner();
        const analyzer = new StaticAnalyzer();

        const files = await scanner.findFiles(resolvedPath);
        spin.text = `  Analyzing ${files.length} file(s)...`;

        const report = await analyzer.analyze(files);

        // Save to .react-doctor/
        const outputDir = path.join(resolvedPath, ".react-doctor");
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(
          path.join(outputDir, "staticreport.json"),
          JSON.stringify(report, null, 2),
        );

        spin.succeed(chalk.green(`Analysis complete — ${files.length} file(s) scanned`));

        // ── Results summary ─────────────────────────────────────
        printSection("Results");

        const total    = report.issues?.length ?? 0;
        const critical = report.issues?.filter((i: any) => i.severity === "critical").length ?? 0;
        const warnings = report.issues?.filter((i: any) => i.severity === "warning").length  ?? 0;
        const infos    = report.issues?.filter((i: any) => i.severity === "info").length     ?? 0;

        printResult("Files analyzed",  String(report.filesAnalyzed ?? 0), "info");
        printResult("Components",      String(report.componentCount ?? 0), "info");
        printResult("Total issues",    String(total),    total > 0 ? "warn" : "good");
        printResult("Critical",        String(critical), critical > 0 ? "poor" : "good");
        printResult("Warnings",        String(warnings), warnings > 0 ? "warn" : "good");
        printResult("Info",            String(infos),    "info");
        printResult("Health grade",    report.grade ?? "N/A", "info");

        // ── Detailed issues (top 10) ────────────────────────────
        if (total > 0) {
          printSection("Issues Found");

          const sorted = [...(report.issues ?? [])].sort((a: any, b: any) => {
            const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
            return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
          });

          sorted.slice(0, 10).forEach((issue: any) => {
            const icon = severityIcon(issue.severity);
            console.log(`  ${icon}  ${chalk.bold(issue.component ?? "Unknown")}`);
            console.log(`       ${chalk.gray(issue.file + ":" + issue.line)}`);
            console.log(`       ${issue.message}`);
            console.log(`       ${chalk.cyan("→")} ${issue.suggestion}`);
            console.log();
          });

          if (total > 10) {
            console.log(chalk.gray(`  ... and ${total - 10} more. See the full report:\n`));
            console.log(chalk.cyan(`  ${path.join(resolvedPath, ".react-doctor", "staticreport.json")}\n`));
          }
        } else {
          console.log(chalk.green("  ✅  No issues found — your code looks great!\n"));
        }

        printResult("Report saved", path.join(resolvedPath, ".react-doctor", "staticreport.json"), "info");
        console.log();

        printDone("Static analysis finished.");
        console.log(
          chalk.gray("  Tip: run ") +
          chalk.cyan("react-doctor full ./") +
          chalk.gray(" to also measure runtime performance.\n"),
        );

      } catch (err: any) {
        spin.fail(chalk.red("Static analysis failed"));
        console.log(chalk.red(`\n  ${err.message}\n`));
        process.exit(1);
      }
    });
}
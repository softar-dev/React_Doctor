// ─────────────────────────────────────────────────────────────
// cli/src/commands/profile.ts
//
// react-doctor profile <projectPath>
//
// Runs the Runtime Profiler only — needs Chrome.
// Boots the React dev server, opens headless Chrome,
// measures Web Vitals + React profiler data, saves
// runtimereport.json to .react-doctor/
//
// Use this when:
//   - You already ran static analysis and want performance data
//   - You want a quick runtime check without code analysis
//   - You want to compare desktop vs mobile performance
//
// Options:
//   --mobile          also profile on mobile viewport
//   --cpu 4           simulate 4x CPU slowdown (Lighthouse preset)
//   --throttle slow4g simulate slow network (deployed URLs only)
//
// Use "react-doctor full" to run everything together.
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import path        from "path";
import fs          from "fs";
import chalk       from "chalk";
import {
  printBanner, printSection, printResult,
  printDone, printFail, printInfo,
  scoreBadge, vitalStatus, spinner,
} from "../ui";

function getCoreModule(relativePath: string) {
  return require(path.resolve(__dirname, "..", "..", "..", "core", relativePath));
}

// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────

export function registerProfileCommand(program: Command): void {
  program
    .command("profile")
    .description("Run the runtime profiler only (requires Chrome)")
    .argument(
      "[projectPath]",
      "Path to the React project (defaults to current directory)",
      process.cwd(),
    )
    .option(
      "--desktop",
      "Profile on desktop viewport 1280x720 (default if neither flag is passed)",
      false,
    )
    .option(
      "--mobile",
      "Profile on mobile viewport — iPhone 12 Pro 390x844",
      false,
    )
    .option(
      "--cpu <rate>",
      "CPU throttle: 1 (real speed) | 4 (Lighthouse mobile) | 6 (low-end)",
      (v: string) => parseInt(v) as 1 | 4 | 6,
      1,
    )
    .option(
      "--throttle <preset>",
      "Network throttle: none | slow4g | 3g  (only meaningful against deployed URLs)",
      "none",
    )
    .option("--no-banner", "Skip the banner")
    .action(async (projectPath: string, options) => {

      const resolvedPath = path.resolve(projectPath);

      if (!options.noBanner) printBanner();

      // ── Validate project ────────────────────────────────────
      if (!fs.existsSync(path.join(resolvedPath, "package.json"))) {
        printFail(
          `No package.json found at: ${resolvedPath}\n\n` +
          `  Pass the path to your React project:\n` +
          `  react-doctor profile ./my-react-app`,
        );
        process.exit(1);
      }

      // ── Determine devices ────────────────────────────────────
      // --desktop and --mobile are independent flags.
      // If neither is passed, desktop is the default.
      // If only --mobile is passed, only mobile runs.
      // If both are passed, both run in one pass.
      const wantDesktop = options.desktop || (!options.desktop && !options.mobile);
      const wantMobile  = options.mobile ?? false;

      const devices: ("desktop" | "mobile")[] | "desktop" | "mobile" =
        wantDesktop && wantMobile ? ["desktop", "mobile"] :
        wantMobile                ? "mobile"              :
                                    "desktop";

      const deviceLabel =
        wantDesktop && wantMobile ? "desktop + mobile" :
        wantMobile                ? "mobile"           :
                                    "desktop";

      printSection("Runtime Profiler");
      printInfo("Project",  resolvedPath);
      printInfo("Device",   deviceLabel);
      printInfo("CPU",      `${options.cpu}x`);
      printInfo("Network",  options.throttle);
      console.log();

      // ── Run the profiler ────────────────────────────────────
      const spin = spinner("Starting dev server...");

      try {
        const { RuntimeProfiler } = getCoreModule("runtime/profiler/index");

        const profiler = new RuntimeProfiler(resolvedPath);
        spin.text = "  Launching headless Chrome...";

        const runtimeReports = await profiler.profile([], {
          device:      devices,
          throttle:    options.throttle as "none" | "slow4g" | "3g",
          cpuThrottle: options.cpu as 1 | 4 | 6,
        });

        // Save to .react-doctor/
        const outputDir = path.join(resolvedPath, ".react-doctor");
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(
          path.join(outputDir, "runtimereport.json"),
          JSON.stringify(runtimeReports, null, 2),
        );

        const routeKeys = Object.keys(runtimeReports);
        spin.succeed(chalk.green(`Profiling complete — ${routeKeys.length} route/device combination(s)`));

        // ── Results ─────────────────────────────────────────────
        printSection("Results");

        for (const [key, report] of Object.entries(runtimeReports) as [string, any][]) {
          const [route, device] = key.includes("::") ? key.split("::") : [key, "desktop"];

          console.log();
          console.log(
            `  ${chalk.bold("Route:")} ${route}  ` +
            `${chalk.gray(`[${device}]`)}  ` +
            `Score: ${scoreBadge(report.performanceScore)}`,
          );
          console.log();

          // Web vitals
          printResult("LCP",         `${report.metrics.lcp.toFixed(0)}ms`,   vitalStatus("lcp",  report.metrics.lcp));
          printResult("FCP",         `${report.metrics.fcp.toFixed(0)}ms`,   vitalStatus("fcp",  report.metrics.fcp));
          printResult("TTFB",        `${report.metrics.ttfb.toFixed(0)}ms`,  vitalStatus("ttfb", report.metrics.ttfb));
          printResult("CLS",         report.metrics.cls.toFixed(3),           vitalStatus("cls",  report.metrics.cls));
          printResult("INP",         `${report.metrics.inp.toFixed(0)}ms`,   vitalStatus("inp",  report.metrics.inp));
          printResult("Render time", `${report.renderTime}ms`,
            report.renderTime <= 2000 ? "good" : report.renderTime <= 4000 ? "warn" : "poor");

          // React profiler
          if (report.commitDurations?.length > 0) {
            const avg  = (report.commitDurations.reduce((a: number, b: number) => a + b, 0) /
                          report.commitDurations.length).toFixed(1);
            const slow = report.commitDurations.filter((d: number) => d > 16).length;
            printResult(
              "React commits",
              `${report.commitDurations.length} total, avg ${avg}ms`,
              slow > 0 ? "warn" : "good",
            );
          }

          // Top re-render component
          const rerenderEntries = Object.entries(report.rerenders ?? {})
            .sort(([, a], [, b]) => (b as number) - (a as number));
          if (rerenderEntries.length > 0) {
            const [topName, topCount] = rerenderEntries[0];
            printResult(
              "Most re-renders",
              `${topName} (${topCount}x)`,
              (topCount as number) >= 10 ? "poor" : (topCount as number) >= 5 ? "warn" : "good",
            );
          }

          // System stats
          printResult("Page weight",  `${report.stats.payloadMB} MB`, "info");
          printResult("JS heap",      `${report.stats.jsHeapMB} MB`,  "info");
          printResult("DOM nodes",    String(report.stats.domNodes),   "info");

          if (report.stats.topOffender) {
            printResult(
              "Heaviest file",
              `${report.stats.topOffender.name} (${report.stats.topOffender.size.toFixed(2)} MB)`,
              "warn",
            );
          }

          // Errors
          const errorCount   = (report.errors ?? []).filter((e: any) => e.type === "error").length;
          const warningCount = (report.errors ?? []).filter((e: any) => e.type === "warning").length;
          if (errorCount > 0 || warningCount > 0) {
            printResult(
              "Issues",
              `${errorCount} error(s)  ${warningCount} warning(s)`,
              errorCount > 0 ? "poor" : "warn",
            );
            (report.errors ?? []).slice(0, 3).forEach((e: any) => {
              const icon = e.type === "error" ? chalk.red("  ✗") : chalk.yellow("  !");
              console.log(`${icon} ${chalk.gray(e.message.slice(0, 90))}`);
            });
          } else {
            printResult("Issues", "None detected", "good");
          }

          // Screenshots
          if (report.screenshots?.length > 0) {
            const labels = report.screenshots.map((s: any) => `${s.label}@${s.takenAt}ms`).join("  ");
            printResult("Screenshots", labels, "info");
          }

          console.log();
        }

        printResult(
          "Report saved",
          path.join(resolvedPath, ".react-doctor", "runtimereport.json"),
          "info",
        );
        console.log();

        printDone("Runtime profiling finished.");
        console.log(
          chalk.gray("  Tip: run ") +
          chalk.cyan("react-doctor full ./") +
          chalk.gray(" to also get static analysis and improvement suggestions.\n"),
        );

      } catch (err: any) {
        spin.fail(chalk.red("Runtime profiling failed"));
        console.log(chalk.red(`\n  ${err.message}\n`));
        process.exit(1);
      }
    });
}
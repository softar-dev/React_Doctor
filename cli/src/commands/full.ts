// ─────────────────────────────────────────────────────────────
// cli/src/commands/full.ts
//
// react-doctor full <projectPath>
//
// The main command. Runs the entire React Doctor pipeline:
//
//   1. FileScanner      → finds all JSX/TSX files
//   2. StaticAnalyzer   → detects bad code patterns
//   3. RuntimeProfiler  → measures live browser performance
//   4. RuleEngine       → combines both reports into suggestions
//   5. ReportCompiler   → merges everything into finalreport.json
//   6. Upload           → sends the report to the backend API
//
// HOW IMPORTS WORK:
// The CLI imports core modules directly as TypeScript classes.
// No shell commands, no spawning child processes, no ts-node
// inside ts-node. Everything runs in the same Node.js process,
// which means objects are passed between steps in memory —
// fast, clean, and no disk reads between steps.
//
// The core folder is 2 levels up from cli/src/commands/:
//   cli/src/commands/full.ts
//   → ../../..  = react-tool root
//   → ../../../core = core folder
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import axios from "axios";
import { spawn } from "child_process";
import {
  printBanner,
  printSection,
  printResult,
  printDone,
  printFail,
  printInfo,
  scoreBadge,
  severityIcon,
  vitalStatus,
  spinner,
} from "../ui";

// ── Core imports ──────────────────────────────────────────────
// These are the actual classes from the core folder.
// We use require() with a resolved path so they work whether
// the CLI is run from its own folder or from the project root.

function getCoreModule(relativePath: string) {
  // __dirname = cli/src/commands/
  // 3 levels up = react-tool root
  // then into core/
  return require(
    path.resolve(__dirname, "..", "..", "..", "core", relativePath),
  );
}

// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────

export function registerFullCommand(program: Command): void {
  program
    .command("full")
    .description(
      "Run the complete React Doctor diagnostic (static + runtime + rules)",
    )
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
      "CPU throttle rate for profiler: 1 (real speed) | 4 (Lighthouse mobile) | 6 (low-end)",
      (v: string) => parseInt(v) as 1 | 4 | 6,
      1,
    )
    .option(
      "--throttle <preset>",
      "Network throttle: none | slow4g | 3g  (only meaningful against deployed URLs)",
      "none",
    )
    .option(
      "--upload",
      "Upload the final report to the React Doctor backend API",
      false,
    )
    .option(
      "--api-url <url>",
      "Backend API URL to upload to",
      "http://localhost:3000",
    )
    // ✅ Single --api-key option (defined BEFORE .action)
    .option(
      "--api-key <key>",
      "API key for backend authentication (overrides REACT_DOCTOR_API_KEY env var)",
      process.env.REACT_DOCTOR_API_KEY || "react-doctor-secret-key-change-this",
    )
    .option("--no-banner", "Skip the banner")
    // ✅ .action() comes LAST, with no trailing semicolon/comment
    .action(async (projectPath: string, options) => {
      await runFullCommand(projectPath, options);
    });
}
// ─────────────────────────────────────────────────────────────
// MAIN RUNNER
// Exported so other commands (analyze --full) can call it too.
// ─────────────────────────────────────────────────────────────

export async function runFullCommand(
  projectPath: string,
  options: {
    desktop?: boolean;
    mobile?: boolean;
    cpu?: 1 | 4 | 6;
    throttle?: string;
    upload?: boolean;
    apiUrl?: string;
    noBanner?: boolean;
    apiKey?: string;
  } = {},
): Promise<void> {
  const resolvedPath = path.resolve(projectPath);

  if (!options.noBanner) printBanner();

  // ── Validate that target is a React project ────────────────
  if (!fs.existsSync(path.join(resolvedPath, "package.json"))) {
    printFail(
      `No package.json found at: ${resolvedPath}\n\n` +
        `  Make sure you point to the root of a React project.\n` +
        `  Example: react-doctor full ./my-react-app`,
    );
    process.exit(1);
  }

  // ── Determine device configuration ──────────────────────────
  // --desktop and --mobile are independent flags.
  // If neither is passed, desktop is the default.
  // If only --mobile is passed, only mobile runs.
  // If both are passed, both run in one pass.
  const wantDesktop = options.desktop || (!options.desktop && !options.mobile);
  const wantMobile = options.mobile ?? false;

  const devices: ("desktop" | "mobile")[] | "desktop" | "mobile" =
    wantDesktop && wantMobile
      ? ["desktop", "mobile"]
      : wantMobile
        ? "mobile"
        : "desktop";

  const deviceLabel =
    wantDesktop && wantMobile
      ? "desktop + mobile"
      : wantMobile
        ? "mobile"
        : "desktop";

  const throttleLabel = options.throttle ?? "none";
  const cpuLabel = options.cpu ?? 1;

  printSection("Full Diagnostic");
  printInfo("Project", resolvedPath);
  printInfo("Device", deviceLabel);
  printInfo("CPU", `${cpuLabel}x`);
  printInfo("Network", throttleLabel);

  // ── Output directory ───────────────────────────────────────
  // Reports are saved inside the user's project in a hidden
  // .react-doctor/ folder — easy to find, easy to gitignore.
  const outputDir = path.join(resolvedPath, ".react-doctor");
  fs.mkdirSync(outputDir, { recursive: true });

  // ════════════════════════════════════════════════════════════
  // STEP 1 — STATIC ANALYSIS
  // ════════════════════════════════════════════════════════════

  printSection("Step 1 / 4 — Static Analysis");

  let staticReport: any;

  const staticSpin = spinner("Scanning JSX/TSX source files...");
  try {
    const { FileScanner } = getCoreModule("static-ana/static/scanner");
    const { StaticAnalyzer } = getCoreModule("static-ana/static/analyzer");

    const scanner = new FileScanner();
    const analyzer = new StaticAnalyzer();

    const files = await scanner.findFiles(resolvedPath);
    staticSpin.text = `  Analyzing ${files.length} file(s)...`;

    staticReport = await analyzer.analyze(files);

    fs.writeFileSync(
      path.join(outputDir, "staticreport.json"),
      JSON.stringify(staticReport, null, 2),
    );

    const critical =
      staticReport.issues?.filter((i: any) => i.severity === "critical")
        .length ?? 0;
    const warnings =
      staticReport.issues?.filter((i: any) => i.severity === "warning")
        .length ?? 0;
    const infos =
      staticReport.issues?.filter((i: any) => i.severity === "info").length ??
      0;
    const total = staticReport.issues?.length ?? 0;

    staticSpin.succeed(
      chalk.green(`Static analysis complete — ${files.length} files scanned`),
    );

    printResult(
      "Files analyzed",
      String(staticReport.filesAnalyzed ?? 0),
      "info",
    );
    printResult("Total issues", String(total), total > 0 ? "warn" : "good");
    printResult("Critical", String(critical), critical > 0 ? "poor" : "good");
    printResult("Warnings", String(warnings), warnings > 0 ? "warn" : "good");
    printResult("Info", String(infos), "info");
    printResult("Health grade", staticReport.grade ?? "N/A", "info");
  } catch (err: any) {
    staticSpin.fail(chalk.red("Static analysis failed"));
    console.log(chalk.red(`\n  ${err.message}\n`));
    staticReport = null;
  }

  // ════════════════════════════════════════════════════════════
  // STEP 2 — RUNTIME PROFILING
  // ════════════════════════════════════════════════════════════

  printSection("Step 2 / 4 — Runtime Profiler");

  let runtimeReports: Record<string, any> = {};

  const profilingSpin = spinner("Starting dev server and launching Chrome...");
  try {
    const { RuntimeProfiler } = getCoreModule("runtime/profiler/index");

    const profiler = new RuntimeProfiler(resolvedPath, outputDir);
    profilingSpin.text = "  Profiling... (this takes ~30 seconds per route)";

    runtimeReports = await profiler.profile([], {
      device: devices,
      throttle: throttleLabel,
      cpuThrottle: cpuLabel,
    });

    fs.writeFileSync(
      path.join(outputDir, "runtimereport.json"),
      JSON.stringify(runtimeReports, null, 2),
    );

    const routeKeys = Object.keys(runtimeReports);
    profilingSpin.succeed(
      chalk.green(
        `Profiling complete — ${routeKeys.length} route/device combination(s)`,
      ),
    );

    // Print results for each route
    for (const [key, report] of Object.entries(runtimeReports)) {
      const [route, device] = key.includes("::")
        ? key.split("::")
        : [key, "desktop"];

      console.log();
      console.log(
        `  ${chalk.bold(route)} ${chalk.gray(`[${device}]`)}  Score: ${scoreBadge(report.performanceScore)}`,
      );
      // ── Device / CPU / Network line ──────────────────────────
      console.log(
        `  ${chalk.gray("Device:")} ${device}  ` +
          `${chalk.gray("CPU:")} ${report.cpuThrottling ?? cpuLabel}x  ` +
          `${chalk.gray("Network:")} ${throttleLabel}`,
      );

      printResult(
        "LCP",
        `${report.metrics.lcp.toFixed(0)}ms`,
        vitalStatus("lcp", report.metrics.lcp),
      );
      printResult(
        "FCP",
        `${report.metrics.fcp.toFixed(0)}ms`,
        vitalStatus("fcp", report.metrics.fcp),
      );
      printResult(
        "TTFB",
        `${report.metrics.ttfb.toFixed(0)}ms`,
        vitalStatus("ttfb", report.metrics.ttfb),
      );
      printResult(
        "CLS",
        report.metrics.cls.toFixed(3),
        vitalStatus("cls", report.metrics.cls),
      );
      printResult(
        "INP",
        `${report.metrics.inp.toFixed(0)}ms`,
        vitalStatus("inp", report.metrics.inp),
      );
      printResult(
        "Render time",
        `${report.renderTime}ms`,
        report.renderTime <= 2000
          ? "good"
          : report.renderTime <= 4000
            ? "warn"
            : "poor",
      );

      if ((report.errors ?? []).length > 0) {
        const errs = report.errors.filter(
          (e: any) => e.type === "error",
        ).length;
        const warn = report.errors.filter(
          (e: any) => e.type === "warning",
        ).length;
        printResult(
          "Issues",
          `${errs} error(s)  ${warn} warning(s)`,
          errs > 0 ? "poor" : "warn",
        );
      } else {
        printResult("Issues", "None detected", "good");
      }
    }
  } catch (err: any) {
    profilingSpin.fail(chalk.red("Runtime profiling failed"));
    console.log(chalk.red(`\n  ${err.message}\n`));
    // Profiling failure is not fatal — rule engine can still run on static data
  }

  // ════════════════════════════════════════════════════════════
  // STEP 3 — RULE ENGINE
  // ════════════════════════════════════════════════════════════

  printSection("Step 3 / 4 — Rule Engine");

  let ruleResults: any[] = [];

  const ruleSpin = spinner("Evaluating rules against both reports...");
  try {
    const { RuleEngine } = getCoreModule("rule-engine/index");

    const engine = new RuleEngine(outputDir);
    ruleResults = await engine.run(staticReport, runtimeReports);

    const allSuggestions = ruleResults.flatMap((r: any) => r.suggestions);
    fs.writeFileSync(
      path.join(outputDir, "suggestions.json"),
      JSON.stringify(ruleResults, null, 2),
    );

    const total = allSuggestions.length;
    const critical = allSuggestions.filter(
      (s: any) => s.severity === "critical",
    ).length;
    const warnings = allSuggestions.filter(
      (s: any) => s.severity === "warning",
    ).length;
    const infos = allSuggestions.filter(
      (s: any) => s.severity === "info",
    ).length;

    ruleSpin.succeed(
      chalk.green(`Rule Engine complete — ${total} suggestion(s) generated`),
    );

    printResult("Critical", String(critical), critical > 0 ? "poor" : "good");
    printResult("Warnings", String(warnings), warnings > 0 ? "warn" : "good");
    printResult("Info", String(infos), "info");

    if (total > 0) {
      console.log();
      console.log(chalk.gray("  Top suggestions:"));
      allSuggestions.slice(0, 5).forEach((s: any) => {
        const icon = severityIcon(s.severity);
        const comp = s.affectedComponent
          ? chalk.cyan(` [${s.affectedComponent}]`)
          : "";
        console.log(`    ${icon}  ${s.title}${comp}`);
      });
      if (total > 5) {
        console.log(
          chalk.gray(`\n    ... and ${total - 5} more in the full report.`),
        );
      }
    }
  } catch (err: any) {
    ruleSpin.fail(chalk.red("Rule Engine failed"));
    console.log(chalk.red(`\n  ${err.message}\n`));
  }

  // ════════════════════════════════════════════════════════════
  // STEP 4 — REPORT COMPILER
  // ════════════════════════════════════════════════════════════

  printSection("Step 4 / 4 — Report Compiler");

  let finalReport: any = null;

  const compilerSpin = spinner("Compiling final report...");
  try {
    const { ReportCompiler } = getCoreModule("report-compiler/index");

    const compiler = new ReportCompiler(outputDir);

    finalReport = await compiler.compile(
      staticReport,
      runtimeReports,
      ruleResults,
    );

    fs.writeFileSync(
      path.join(outputDir, "finalreport.json"),
      JSON.stringify(finalReport, null, 2),
    );

    compilerSpin.succeed(chalk.green("Final report compiled"));
    printResult(
      "Overall score",
      scoreBadge(finalReport.performanceScore),
      "none",
    );
    printResult(
      "Report saved",
      path.join(outputDir, "finalreport.json"),
      "info",
    );
  } catch (err: any) {
    compilerSpin.fail(chalk.red("Report Compiler failed"));
    console.log(chalk.red(`\n  ${err.message}\n`));
  }

  // ════════════════════════════════════════════════════════════
  // OPTIONAL — UPLOAD TO BACKEND API
  // ════════════════════════════════════════════════════════════

  if (options.upload && finalReport) {
  printSection("Uploading to Backend");

  const uploadSpin = spinner(`Connecting to ${options.apiUrl}...`);
  
  try {
    // Ensure apiUrl has a default
    const apiUrl = options.apiUrl ?? "http://localhost:3000";
    
    // 1. Check if backend is already running
    try {
      await axios.get(`${apiUrl}/health`, { timeout: 2000 });
      uploadSpin.text = "Backend detected. Preparing upload...";
    } catch (err) {
      // 2. If not running, start it automatically
      
      // Determine the project root directory (where cli/ and backend/ are siblings)
      const projectRoot = path.resolve(__dirname, "..", "..", "..");
      
      // Backend is a sibling folder to cli at projectRoot
      const backendRoot = path.resolve(projectRoot, "backend");
      
      // Check for compiled JS first (for installed packages)
      const backendDist = path.join(backendRoot, "dist", "index.js");
      // Check for TS source (for local dev)
      const backendSrc = path.join(backendRoot, "src", "index.ts");

      let command: string;
      let args: string[];

      if (fs.existsSync(backendDist)) {
        command = "node";
        args = [backendDist];
      } else if (fs.existsSync(backendSrc)) {
        command = "npx";
        args = ["ts-node", backendSrc];
      } else {
        throw new Error(`Cannot find backend at: ${backendRoot}. Ensure 'backend' folder exists next to 'cli'.`);
      }

      uploadSpin.text = "Backend not found. Starting local server automatically...";

      // Extract port safely
      const port = new URL(apiUrl).port || "3000";

      // Spawn the backend process
      const backendProcess = spawn(command, args, {
        stdio: "inherit",
        env: {
          ...process.env,
          API_KEY: options.apiKey || "react-doctor-secret-key-change-this",
          PORT: port,
        },
        cwd: backendRoot
      });

      // 3. Wait for backend to be ready
      let isReady = false;
      let retries = 0;
      while (!isReady && retries < 15) {
        try {
          await axios.get(`${apiUrl}/health`, { timeout: 1000 });
          isReady = true;
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
          retries++;
        }
      }

      if (!isReady) throw new Error("Backend failed to start after 15 seconds.");
      uploadSpin.text = "Backend started successfully!";
    }

    // 4. Perform the actual upload
    uploadSpin.text = "Uploading report...";
    await axios.post(`${apiUrl}/api/reports/upload`, finalReport, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": options.apiKey || "react-doctor-secret-key-change-this",
      } as Record<string, string>,
      timeout: 10000,
    });

    uploadSpin.succeed(chalk.green("Report uploaded successfully"));
  } catch (err: any) {
    uploadSpin.fail(chalk.yellow("Upload failed — report saved locally"));
    console.log(chalk.gray(`  ${err.message}`));
  }
}
  // ════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════

  printSection("Summary");

  console.log(chalk.gray("  Reports saved to:"));
  console.log(chalk.cyan(`    ${path.join(outputDir, "staticreport.json")}`));
  console.log(chalk.cyan(`    ${path.join(outputDir, "runtimereport.json")}`));
  console.log(chalk.cyan(`    ${path.join(outputDir, "suggestions.json")}`));
  console.log(chalk.cyan(`    ${path.join(outputDir, "finalreport.json")}`));
  console.log();

  if (!options.upload) {
    console.log(
      chalk.gray("  Tip: add ") +
        chalk.cyan("--upload") +
        chalk.gray(" to send results to the dashboard."),
    );
  }

  printDone("Full diagnostic finished.");
}

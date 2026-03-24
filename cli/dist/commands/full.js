"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFullCommand = registerFullCommand;
exports.runFullCommand = runFullCommand;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const axios_1 = __importDefault(require("axios"));
const ui_1 = require("../ui");
// ── Core imports ──────────────────────────────────────────────
// These are the actual classes from the core folder.
// We use require() with a resolved path so they work whether
// the CLI is run from its own folder or from the project root.
function getCoreModule(relativePath) {
    // __dirname = cli/src/commands/
    // 3 levels up = react-tool root
    // then into core/
    return require(path_1.default.resolve(__dirname, "..", "..", "..", "core", relativePath));
}
// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────
function registerFullCommand(program) {
    program
        .command("full")
        .description("Run the complete React Doctor diagnostic (static + runtime + rules)")
        .argument("[projectPath]", "Path to the React project (defaults to current directory)", process.cwd())
        .option("--desktop", "Profile on desktop viewport 1280x720 (default if neither flag is passed)", false)
        .option("--mobile", "Profile on mobile viewport — iPhone 12 Pro 390x844", false)
        .option("--cpu <rate>", "CPU throttle rate for profiler: 1 (real speed) | 4 (Lighthouse mobile) | 6 (low-end)", (v) => parseInt(v), 1)
        .option("--throttle <preset>", "Network throttle: none | slow4g | 3g  (only meaningful against deployed URLs)", "none")
        .option("--upload", "Upload the final report to the React Doctor backend API", false)
        .option("--api-url <url>", "Backend API URL to upload to", "http://localhost:3000")
        .option("--no-banner", "Skip the banner")
        .action(async (projectPath, options) => {
        await runFullCommand(projectPath, options);
    });
}
// ─────────────────────────────────────────────────────────────
// MAIN RUNNER
// Exported so other commands (analyze --full) can call it too.
// ─────────────────────────────────────────────────────────────
async function runFullCommand(projectPath, options = {}) {
    const resolvedPath = path_1.default.resolve(projectPath);
    if (!options.noBanner)
        (0, ui_1.printBanner)();
    // ── Validate that target is a React project ────────────────
    if (!fs_1.default.existsSync(path_1.default.join(resolvedPath, "package.json"))) {
        (0, ui_1.printFail)(`No package.json found at: ${resolvedPath}\n\n` +
            `  Make sure you point to the root of a React project.\n` +
            `  Example: react-doctor full ./my-react-app`);
        process.exit(1);
    }
    // ── Determine device configuration ──────────────────────────
    // --desktop and --mobile are independent flags.
    // If neither is passed, desktop is the default.
    // If only --mobile is passed, only mobile runs.
    // If both are passed, both run in one pass.
    const wantDesktop = options.desktop || (!options.desktop && !options.mobile);
    const wantMobile = options.mobile ?? false;
    const devices = wantDesktop && wantMobile
        ? ["desktop", "mobile"]
        : wantMobile
            ? "mobile"
            : "desktop";
    const deviceLabel = wantDesktop && wantMobile
        ? "desktop + mobile"
        : wantMobile
            ? "mobile"
            : "desktop";
    (0, ui_1.printSection)("Full Diagnostic");
    (0, ui_1.printInfo)("Project", resolvedPath);
    (0, ui_1.printInfo)("Device", deviceLabel);
    (0, ui_1.printInfo)("CPU", `${options.cpu ?? 1}x`);
    (0, ui_1.printInfo)("Network", options.throttle ?? "none");
    // ── Output directory ───────────────────────────────────────
    // Reports are saved inside the user's project in a hidden
    // .react-doctor/ folder — easy to find, easy to gitignore.
    const outputDir = path_1.default.join(resolvedPath, ".react-doctor");
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    // ════════════════════════════════════════════════════════════
    // STEP 1 — STATIC ANALYSIS
    // ════════════════════════════════════════════════════════════
    (0, ui_1.printSection)("Step 1 / 4 — Static Analysis");
    let staticReport;
    const staticSpin = (0, ui_1.spinner)("Scanning JSX/TSX source files...");
    try {
        // Import the FileScanner and StaticAnalyzer from core
        const { FileScanner } = getCoreModule("static-ana/static/scanner");
        const { StaticAnalyzer } = getCoreModule("static-ana/static/analyzer");
        const scanner = new FileScanner();
        const analyzer = new StaticAnalyzer();
        // Find all JSX/TSX files in the project
        const files = await scanner.findFiles(resolvedPath);
        staticSpin.text = `  Analyzing ${files.length} file(s)...`;
        // Run all 9 detectors on each file
        staticReport = await analyzer.analyze(files);
        // Save static report to the project's .react-doctor/ folder
        fs_1.default.writeFileSync(path_1.default.join(outputDir, "staticreport.json"), JSON.stringify(staticReport, null, 2));
        const critical = staticReport.issues?.filter((i) => i.severity === "critical")
            .length ?? 0;
        const warnings = staticReport.issues?.filter((i) => i.severity === "warning")
            .length ?? 0;
        const infos = staticReport.issues?.filter((i) => i.severity === "info").length ??
            0;
        const total = staticReport.issues?.length ?? 0;
        staticSpin.succeed(chalk_1.default.green(`Static analysis complete — ${files.length} files scanned`));
        // Print a quick summary
        (0, ui_1.printResult)("Files analyzed", String(staticReport.filesAnalyzed ?? 0), "info");
        (0, ui_1.printResult)("Total issues", String(total), total > 0 ? "warn" : "good");
        (0, ui_1.printResult)("Critical", String(critical), critical > 0 ? "poor" : "good");
        (0, ui_1.printResult)("Warnings", String(warnings), warnings > 0 ? "warn" : "good");
        (0, ui_1.printResult)("Info", String(infos), "info");
        (0, ui_1.printResult)("Health grade", staticReport.grade ?? "N/A", "info");
    }
    catch (err) {
        staticSpin.fail(chalk_1.default.red("Static analysis failed"));
        console.log(chalk_1.default.red(`\n  ${err.message}\n`));
        // Static failure is not fatal — we continue with profiling
        staticReport = null;
    }
    // ════════════════════════════════════════════════════════════
    // STEP 2 — RUNTIME PROFILING
    // ════════════════════════════════════════════════════════════
    (0, ui_1.printSection)("Step 2 / 4 — Runtime Profiler");
    let runtimeReports = {};
    const profilingSpin = (0, ui_1.spinner)("Starting dev server and launching Chrome...");
    try {
        const { RuntimeProfiler } = getCoreModule("runtime/profiler/index");
        const profiler = new RuntimeProfiler(resolvedPath, outputDir);
        profilingSpin.text = "  Profiling... (this takes ~30 seconds per route)";
        runtimeReports = await profiler.profile([], {
            device: devices,
            throttle: options.throttle ?? "none",
            cpuThrottle: options.cpu ?? 1,
        });
        // Save runtime report to .react-doctor/
        fs_1.default.writeFileSync(path_1.default.join(outputDir, "runtimereport.json"), JSON.stringify(runtimeReports, null, 2));
        const routeKeys = Object.keys(runtimeReports);
        profilingSpin.succeed(chalk_1.default.green(`Profiling complete — ${routeKeys.length} route/device combination(s)`));
        // Print results for each route
        for (const [key, report] of Object.entries(runtimeReports)) {
            const [route, device] = key.includes("::")
                ? key.split("::")
                : [key, "desktop"];
            console.log();
            console.log(`  ${chalk_1.default.bold(route)} ${chalk_1.default.gray(`[${device}]`)}  Score: ${(0, ui_1.scoreBadge)(report.performanceScore)}`);
            (0, ui_1.printResult)("LCP", `${report.metrics.lcp.toFixed(0)}ms`, (0, ui_1.vitalStatus)("lcp", report.metrics.lcp));
            (0, ui_1.printResult)("FCP", `${report.metrics.fcp.toFixed(0)}ms`, (0, ui_1.vitalStatus)("fcp", report.metrics.fcp));
            (0, ui_1.printResult)("TTFB", `${report.metrics.ttfb.toFixed(0)}ms`, (0, ui_1.vitalStatus)("ttfb", report.metrics.ttfb));
            (0, ui_1.printResult)("CLS", report.metrics.cls.toFixed(3), (0, ui_1.vitalStatus)("cls", report.metrics.cls));
            (0, ui_1.printResult)("INP", `${report.metrics.inp.toFixed(0)}ms`, (0, ui_1.vitalStatus)("inp", report.metrics.inp));
            (0, ui_1.printResult)("Render time", `${report.renderTime}ms`, report.renderTime <= 2000
                ? "good"
                : report.renderTime <= 4000
                    ? "warn"
                    : "poor");
            if ((report.errors ?? []).length > 0) {
                const errs = report.errors.filter((e) => e.type === "error").length;
                const warn = report.errors.filter((e) => e.type === "warning").length;
                (0, ui_1.printResult)("Issues", `${errs} error(s)  ${warn} warning(s)`, errs > 0 ? "poor" : "warn");
            }
            else {
                (0, ui_1.printResult)("Issues", "None detected", "good");
            }
        }
    }
    catch (err) {
        profilingSpin.fail(chalk_1.default.red("Runtime profiling failed"));
        console.log(chalk_1.default.red(`\n  ${err.message}\n`));
        // Profiling failure is not fatal — rule engine can still run on static data
    }
    // ════════════════════════════════════════════════════════════
    // STEP 3 — RULE ENGINE
    // ════════════════════════════════════════════════════════════
    (0, ui_1.printSection)("Step 3 / 4 — Rule Engine");
    let ruleResults = [];
    const ruleSpin = (0, ui_1.spinner)("Evaluating rules against both reports...");
    try {
        const { RuleEngine } = getCoreModule("rule-engine/index");
        const engine = new RuleEngine(outputDir);
        ruleResults = await engine.run(staticReport, runtimeReports);
        // Save suggestions to .react-doctor/
        const allSuggestions = ruleResults.flatMap((r) => r.suggestions);
        fs_1.default.writeFileSync(path_1.default.join(outputDir, "suggestions.json"), JSON.stringify(ruleResults, null, 2));
        const total = allSuggestions.length;
        const critical = allSuggestions.filter((s) => s.severity === "critical").length;
        const warnings = allSuggestions.filter((s) => s.severity === "warning").length;
        const infos = allSuggestions.filter((s) => s.severity === "info").length;
        ruleSpin.succeed(chalk_1.default.green(`Rule Engine complete — ${total} suggestion(s) generated`));
        (0, ui_1.printResult)("Critical", String(critical), critical > 0 ? "poor" : "good");
        (0, ui_1.printResult)("Warnings", String(warnings), warnings > 0 ? "warn" : "good");
        (0, ui_1.printResult)("Info", String(infos), "info");
        // Print top suggestions (max 5, critical first)
        if (total > 0) {
            console.log();
            console.log(chalk_1.default.gray("  Top suggestions:"));
            allSuggestions.slice(0, 5).forEach((s) => {
                const icon = (0, ui_1.severityIcon)(s.severity);
                const comp = s.affectedComponent
                    ? chalk_1.default.cyan(` [${s.affectedComponent}]`)
                    : "";
                console.log(`    ${icon}  ${s.title}${comp}`);
            });
            if (total > 5) {
                console.log(chalk_1.default.gray(`\n    ... and ${total - 5} more in the full report.`));
            }
        }
    }
    catch (err) {
        ruleSpin.fail(chalk_1.default.red("Rule Engine failed"));
        console.log(chalk_1.default.red(`\n  ${err.message}\n`));
    }
    // ════════════════════════════════════════════════════════════
    // STEP 4 — REPORT COMPILER
    // ════════════════════════════════════════════════════════════
    (0, ui_1.printSection)("Step 4 / 4 — Report Compiler");
    let finalReport = null;
    const compilerSpin = (0, ui_1.spinner)("Compiling final report...");
    try {
        const { ReportCompiler } = getCoreModule("report-compiler/index");
        const compiler = new ReportCompiler();
        finalReport = await compiler.compile(staticReport, runtimeReports, ruleResults);
        // Save final report to .react-doctor/
        fs_1.default.writeFileSync(path_1.default.join(outputDir, "finalreport.json"), JSON.stringify(finalReport, null, 2));
        compilerSpin.succeed(chalk_1.default.green("Final report compiled"));
        (0, ui_1.printResult)("Overall score", (0, ui_1.scoreBadge)(finalReport.performanceScore), "none");
        (0, ui_1.printResult)("Report saved", path_1.default.join(outputDir, "finalreport.json"), "info");
    }
    catch (err) {
        compilerSpin.fail(chalk_1.default.red("Report Compiler failed"));
        console.log(chalk_1.default.red(`\n  ${err.message}\n`));
    }
    // ════════════════════════════════════════════════════════════
    // OPTIONAL — UPLOAD TO BACKEND API
    // ════════════════════════════════════════════════════════════
    if (options.upload && finalReport) {
        (0, ui_1.printSection)("Uploading to Backend");
        const uploadSpin = (0, ui_1.spinner)(`Uploading to ${options.apiUrl}...`);
        try {
            await axios_1.default.post(`${options.apiUrl}/api/report/upload`, finalReport, {
                headers: { "Content-Type": "application/json" },
                timeout: 10000,
            });
            uploadSpin.succeed(chalk_1.default.green("Report uploaded successfully"));
        }
        catch (err) {
            uploadSpin.fail(chalk_1.default.yellow("Upload failed — report saved locally"));
            console.log(chalk_1.default.gray(`  ${err.message}`));
        }
    }
    // ════════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ════════════════════════════════════════════════════════════
    (0, ui_1.printSection)("Summary");
    console.log(chalk_1.default.gray("  Reports saved to:"));
    console.log(chalk_1.default.cyan(`    ${path_1.default.join(outputDir, "staticreport.json")}`));
    console.log(chalk_1.default.cyan(`    ${path_1.default.join(outputDir, "runtimereport.json")}`));
    console.log(chalk_1.default.cyan(`    ${path_1.default.join(outputDir, "suggestions.json")}`));
    console.log(chalk_1.default.cyan(`    ${path_1.default.join(outputDir, "finalreport.json")}`));
    console.log();
    if (!options.upload) {
        console.log(chalk_1.default.gray("  Tip: add ") +
            chalk_1.default.cyan("--upload") +
            chalk_1.default.gray(" to send results to the dashboard."));
    }
    (0, ui_1.printDone)("Full diagnostic finished.");
}

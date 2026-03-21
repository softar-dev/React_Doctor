"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProfileCommand = registerProfileCommand;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const ui_1 = require("../ui");
function getCoreModule(relativePath) {
    return require(path_1.default.resolve(__dirname, "..", "..", "..", "core", relativePath));
}
// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────
function registerProfileCommand(program) {
    program
        .command("profile")
        .description("Run the runtime profiler only (requires Chrome)")
        .argument("[projectPath]", "Path to the React project (defaults to current directory)", process.cwd())
        .option("--desktop", "Profile on desktop viewport 1280x720 (default if neither flag is passed)", false)
        .option("--mobile", "Profile on mobile viewport — iPhone 12 Pro 390x844", false)
        .option("--cpu <rate>", "CPU throttle: 1 (real speed) | 4 (Lighthouse mobile) | 6 (low-end)", (v) => parseInt(v), 1)
        .option("--throttle <preset>", "Network throttle: none | slow4g | 3g  (only meaningful against deployed URLs)", "none")
        .option("--no-banner", "Skip the banner")
        .action(async (projectPath, options) => {
        const resolvedPath = path_1.default.resolve(projectPath);
        if (!options.noBanner)
            (0, ui_1.printBanner)();
        // ── Validate project ────────────────────────────────────
        if (!fs_1.default.existsSync(path_1.default.join(resolvedPath, "package.json"))) {
            (0, ui_1.printFail)(`No package.json found at: ${resolvedPath}\n\n` +
                `  Pass the path to your React project:\n` +
                `  react-doctor profile ./my-react-app`);
            process.exit(1);
        }
        // ── Determine devices ────────────────────────────────────
        // --desktop and --mobile are independent flags.
        // If neither is passed, desktop is the default.
        // If only --mobile is passed, only mobile runs.
        // If both are passed, both run in one pass.
        const wantDesktop = options.desktop || (!options.desktop && !options.mobile);
        const wantMobile = options.mobile ?? false;
        const devices = wantDesktop && wantMobile ? ["desktop", "mobile"] :
            wantMobile ? "mobile" :
                "desktop";
        const deviceLabel = wantDesktop && wantMobile ? "desktop + mobile" :
            wantMobile ? "mobile" :
                "desktop";
        (0, ui_1.printSection)("Runtime Profiler");
        (0, ui_1.printInfo)("Project", resolvedPath);
        (0, ui_1.printInfo)("Device", deviceLabel);
        (0, ui_1.printInfo)("CPU", `${options.cpu}x`);
        (0, ui_1.printInfo)("Network", options.throttle);
        console.log();
        // ── Run the profiler ────────────────────────────────────
        const spin = (0, ui_1.spinner)("Starting dev server...");
        try {
            const { RuntimeProfiler } = getCoreModule("runtime/profiler/index");
            const profiler = new RuntimeProfiler(resolvedPath);
            spin.text = "  Launching headless Chrome...";
            const runtimeReports = await profiler.profile([], {
                device: devices,
                throttle: options.throttle,
                cpuThrottle: options.cpu,
            });
            // Save to .react-doctor/
            const outputDir = path_1.default.join(resolvedPath, ".react-doctor");
            fs_1.default.mkdirSync(outputDir, { recursive: true });
            fs_1.default.writeFileSync(path_1.default.join(outputDir, "runtimereport.json"), JSON.stringify(runtimeReports, null, 2));
            const routeKeys = Object.keys(runtimeReports);
            spin.succeed(chalk_1.default.green(`Profiling complete — ${routeKeys.length} route/device combination(s)`));
            // ── Results ─────────────────────────────────────────────
            (0, ui_1.printSection)("Results");
            for (const [key, report] of Object.entries(runtimeReports)) {
                const [route, device] = key.includes("::") ? key.split("::") : [key, "desktop"];
                console.log();
                console.log(`  ${chalk_1.default.bold("Route:")} ${route}  ` +
                    `${chalk_1.default.gray(`[${device}]`)}  ` +
                    `Score: ${(0, ui_1.scoreBadge)(report.performanceScore)}`);
                console.log();
                // Web vitals
                (0, ui_1.printResult)("LCP", `${report.metrics.lcp.toFixed(0)}ms`, (0, ui_1.vitalStatus)("lcp", report.metrics.lcp));
                (0, ui_1.printResult)("FCP", `${report.metrics.fcp.toFixed(0)}ms`, (0, ui_1.vitalStatus)("fcp", report.metrics.fcp));
                (0, ui_1.printResult)("TTFB", `${report.metrics.ttfb.toFixed(0)}ms`, (0, ui_1.vitalStatus)("ttfb", report.metrics.ttfb));
                (0, ui_1.printResult)("CLS", report.metrics.cls.toFixed(3), (0, ui_1.vitalStatus)("cls", report.metrics.cls));
                (0, ui_1.printResult)("INP", `${report.metrics.inp.toFixed(0)}ms`, (0, ui_1.vitalStatus)("inp", report.metrics.inp));
                (0, ui_1.printResult)("Render time", `${report.renderTime}ms`, report.renderTime <= 2000 ? "good" : report.renderTime <= 4000 ? "warn" : "poor");
                // React profiler
                if (report.commitDurations?.length > 0) {
                    const avg = (report.commitDurations.reduce((a, b) => a + b, 0) /
                        report.commitDurations.length).toFixed(1);
                    const slow = report.commitDurations.filter((d) => d > 16).length;
                    (0, ui_1.printResult)("React commits", `${report.commitDurations.length} total, avg ${avg}ms`, slow > 0 ? "warn" : "good");
                }
                // Top re-render component
                const rerenderEntries = Object.entries(report.rerenders ?? {})
                    .sort(([, a], [, b]) => b - a);
                if (rerenderEntries.length > 0) {
                    const [topName, topCount] = rerenderEntries[0];
                    (0, ui_1.printResult)("Most re-renders", `${topName} (${topCount}x)`, topCount >= 10 ? "poor" : topCount >= 5 ? "warn" : "good");
                }
                // System stats
                (0, ui_1.printResult)("Page weight", `${report.stats.payloadMB} MB`, "info");
                (0, ui_1.printResult)("JS heap", `${report.stats.jsHeapMB} MB`, "info");
                (0, ui_1.printResult)("DOM nodes", String(report.stats.domNodes), "info");
                if (report.stats.topOffender) {
                    (0, ui_1.printResult)("Heaviest file", `${report.stats.topOffender.name} (${report.stats.topOffender.size.toFixed(2)} MB)`, "warn");
                }
                // Errors
                const errorCount = (report.errors ?? []).filter((e) => e.type === "error").length;
                const warningCount = (report.errors ?? []).filter((e) => e.type === "warning").length;
                if (errorCount > 0 || warningCount > 0) {
                    (0, ui_1.printResult)("Issues", `${errorCount} error(s)  ${warningCount} warning(s)`, errorCount > 0 ? "poor" : "warn");
                    (report.errors ?? []).slice(0, 3).forEach((e) => {
                        const icon = e.type === "error" ? chalk_1.default.red("  ✗") : chalk_1.default.yellow("  !");
                        console.log(`${icon} ${chalk_1.default.gray(e.message.slice(0, 90))}`);
                    });
                }
                else {
                    (0, ui_1.printResult)("Issues", "None detected", "good");
                }
                // Screenshots
                if (report.screenshots?.length > 0) {
                    const labels = report.screenshots.map((s) => `${s.label}@${s.takenAt}ms`).join("  ");
                    (0, ui_1.printResult)("Screenshots", labels, "info");
                }
                console.log();
            }
            (0, ui_1.printResult)("Report saved", path_1.default.join(resolvedPath, ".react-doctor", "runtimereport.json"), "info");
            console.log();
            (0, ui_1.printDone)("Runtime profiling finished.");
            console.log(chalk_1.default.gray("  Tip: run ") +
                chalk_1.default.cyan("react-doctor full ./") +
                chalk_1.default.gray(" to also get static analysis and improvement suggestions.\n"));
        }
        catch (err) {
            spin.fail(chalk_1.default.red("Runtime profiling failed"));
            console.log(chalk_1.default.red(`\n  ${err.message}\n`));
            process.exit(1);
        }
    });
}

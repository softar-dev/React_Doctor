"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAnalyzeCommand = registerAnalyzeCommand;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const ui_1 = require("../ui");
const full_1 = require("./full");
function getCoreModule(relativePath) {
    return require(path_1.default.resolve(__dirname, "..", "..", "..", "core", relativePath));
}
// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────
function registerAnalyzeCommand(program) {
    program
        .command("analyze")
        .description("Run static code analysis only (no browser required)")
        .argument("[projectPath]", "Path to the React project (defaults to current directory)", process.cwd())
        .option("--full", "After static analysis, also run the runtime profiler and rule engine", false)
        .option("--no-banner", "Skip the banner")
        .action(async (projectPath, options) => {
        // If --full flag is passed, delegate to the full command
        // which runs the complete pipeline
        if (options.full) {
            await (0, full_1.runFullCommand)(projectPath, { noBanner: options.noBanner });
            return;
        }
        const resolvedPath = path_1.default.resolve(projectPath);
        if (!options.noBanner)
            (0, ui_1.printBanner)();
        // ── Validate project ────────────────────────────────────
        if (!fs_1.default.existsSync(path_1.default.join(resolvedPath, "package.json"))) {
            (0, ui_1.printFail)(`No package.json found at: ${resolvedPath}\n\n` +
                `  Pass the path to your React project:\n` +
                `  react-doctor analyze ./my-react-app`);
            process.exit(1);
        }
        (0, ui_1.printSection)("Static Analysis");
        (0, ui_1.printInfo)("Project", resolvedPath);
        console.log();
        // ── Run the static analyzer ─────────────────────────────
        const spin = (0, ui_1.spinner)("Scanning JSX/TSX source files...");
        try {
            const { FileScanner } = getCoreModule("static-ana/static/scanner");
            const { StaticAnalyzer } = getCoreModule("static-ana/static/analyzer");
            const scanner = new FileScanner();
            const analyzer = new StaticAnalyzer();
            const files = await scanner.findFiles(resolvedPath);
            spin.text = `  Analyzing ${files.length} file(s)...`;
            const report = await analyzer.analyze(files);
            // Save to .react-doctor/
            const outputDir = path_1.default.join(resolvedPath, ".react-doctor");
            fs_1.default.mkdirSync(outputDir, { recursive: true });
            fs_1.default.writeFileSync(path_1.default.join(outputDir, "staticreport.json"), JSON.stringify(report, null, 2));
            spin.succeed(chalk_1.default.green(`Analysis complete — ${files.length} file(s) scanned`));
            // ── Results summary ─────────────────────────────────────
            (0, ui_1.printSection)("Results");
            const total = report.issues?.length ?? 0;
            const critical = report.issues?.filter((i) => i.severity === "critical").length ?? 0;
            const warnings = report.issues?.filter((i) => i.severity === "warning").length ?? 0;
            const infos = report.issues?.filter((i) => i.severity === "info").length ?? 0;
            (0, ui_1.printResult)("Files analyzed", String(report.filesAnalyzed ?? 0), "info");
            (0, ui_1.printResult)("Components", String(report.componentCount ?? 0), "info");
            (0, ui_1.printResult)("Total issues", String(total), total > 0 ? "warn" : "good");
            (0, ui_1.printResult)("Critical", String(critical), critical > 0 ? "poor" : "good");
            (0, ui_1.printResult)("Warnings", String(warnings), warnings > 0 ? "warn" : "good");
            (0, ui_1.printResult)("Info", String(infos), "info");
            (0, ui_1.printResult)("Health grade", report.grade ?? "N/A", "info");
            // ── Detailed issues (top 10) ────────────────────────────
            if (total > 0) {
                (0, ui_1.printSection)("Issues Found");
                const sorted = [...(report.issues ?? [])].sort((a, b) => {
                    const order = { critical: 0, warning: 1, info: 2 };
                    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
                });
                sorted.slice(0, 10).forEach((issue) => {
                    const icon = (0, ui_1.severityIcon)(issue.severity);
                    console.log(`  ${icon}  ${chalk_1.default.bold(issue.component ?? "Unknown")}`);
                    console.log(`       ${chalk_1.default.gray(issue.file + ":" + issue.line)}`);
                    console.log(`       ${issue.message}`);
                    console.log(`       ${chalk_1.default.cyan("→")} ${issue.suggestion}`);
                    console.log();
                });
                if (total > 10) {
                    console.log(chalk_1.default.gray(`  ... and ${total - 10} more. See the full report:\n`));
                    console.log(chalk_1.default.cyan(`  ${path_1.default.join(resolvedPath, ".react-doctor", "staticreport.json")}\n`));
                }
            }
            else {
                console.log(chalk_1.default.green("  ✅  No issues found — your code looks great!\n"));
            }
            (0, ui_1.printResult)("Report saved", path_1.default.join(resolvedPath, ".react-doctor", "staticreport.json"), "info");
            console.log();
            (0, ui_1.printDone)("Static analysis finished.");
            console.log(chalk_1.default.gray("  Tip: run ") +
                chalk_1.default.cyan("react-doctor full ./") +
                chalk_1.default.gray(" to also measure runtime performance.\n"));
        }
        catch (err) {
            spin.fail(chalk_1.default.red("Static analysis failed"));
            console.log(chalk_1.default.red(`\n  ${err.message}\n`));
            process.exit(1);
        }
    });
}

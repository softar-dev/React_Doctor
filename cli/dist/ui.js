"use strict";
// ─────────────────────────────────────────────────────────────
// cli/src/ui.ts
//
// Shared terminal output helpers used by every command.
// All chalk colors, ora spinners, and print functions live
// here so the visual style is consistent across the CLI.
//
// WHY ONE FILE FOR ALL UI:
// If each command file had its own chalk/ora setup, changing
// a color or spacing would require editing every file. This
// way you change it once here and it applies everywhere.
// ─────────────────────────────────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBanner = printBanner;
exports.printSection = printSection;
exports.spinner = spinner;
exports.printResult = printResult;
exports.scoreBadge = scoreBadge;
exports.severityIcon = severityIcon;
exports.printDone = printDone;
exports.printFail = printFail;
exports.printInfo = printInfo;
exports.vitalStatus = vitalStatus;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
// ── Banner ────────────────────────────────────────────────────
// Printed once at the start of every command run.
function printBanner() {
    console.log();
    console.log(chalk_1.default.cyan.bold("  ┌─────────────────────────────────┐"));
    console.log(chalk_1.default.cyan.bold("  │       🩺  React Doctor          │"));
    console.log(chalk_1.default.cyan.bold("  │   React Performance Analyzer    │"));
    console.log(chalk_1.default.cyan.bold("  └─────────────────────────────────┘"));
    console.log();
}
// ── Section headers ───────────────────────────────────────────
// Visually separates sections within a command's output.
function printSection(title) {
    console.log();
    console.log(chalk_1.default.cyan.bold(`  ── ${title} `).padEnd(58, "─"));
    console.log();
}
// ── Spinner ───────────────────────────────────────────────────
// Returns a running ora spinner.
// Caller calls .succeed() or .fail() when done.
function spinner(text) {
    return (0, ora_1.default)({ text: `  ${text}`, color: "cyan", spinner: "dots" }).start();
}
// ── Single result line ────────────────────────────────────────
// Prints one labeled metric with a colored status dot.
function printResult(label, value, status = "none") {
    const dot = status === "good" ? chalk_1.default.green("●") :
        status === "warn" ? chalk_1.default.yellow("●") :
            status === "poor" ? chalk_1.default.red("●") :
                status === "info" ? chalk_1.default.blue("●") :
                    chalk_1.default.gray("·");
    console.log(`  ${dot}  ${chalk_1.default.gray(label.padEnd(24))} ${value}`);
}
// ── Score badge ───────────────────────────────────────────────
// Formats a 0-100 score with a color band.
function scoreBadge(score) {
    if (score >= 90)
        return chalk_1.default.green.bold(`${score}/100`) + chalk_1.default.green("  Excellent");
    if (score >= 70)
        return chalk_1.default.yellow.bold(`${score}/100`) + chalk_1.default.yellow("  Good");
    if (score >= 50)
        return chalk_1.default.hex("#FFA500").bold(`${score}/100`) + chalk_1.default.hex("#FFA500")("  Needs Work");
    return chalk_1.default.red.bold(`${score}/100`) + chalk_1.default.red("  Poor");
}
// ── Severity icon ─────────────────────────────────────────────
function severityIcon(s) {
    if (s === "critical")
        return chalk_1.default.red("❌");
    if (s === "warning")
        return chalk_1.default.yellow("⚠️ ");
    return chalk_1.default.blue("ℹ️ ");
}
// ── Done / fail ───────────────────────────────────────────────
function printDone(message) {
    console.log();
    console.log(chalk_1.default.green.bold(`  ✅  ${message}`));
    console.log();
}
function printFail(message) {
    console.log();
    console.log(chalk_1.default.red.bold(`  ❌  ${message}`));
    console.log();
}
// ── Muted info line ───────────────────────────────────────────
function printInfo(label, value) {
    console.log(`  ${chalk_1.default.gray(label.padEnd(16))} ${chalk_1.default.white(value)}`);
}
// ── Web vital threshold helper ────────────────────────────────
// Maps a metric value to good/warn/poor for colored output.
function vitalStatus(metric, value) {
    const thresholds = {
        lcp: { good: 2500, poor: 4000 },
        fcp: { good: 1800, poor: 3000 },
        ttfb: { good: 800, poor: 1800 },
        inp: { good: 200, poor: 500 },
        cls: { good: 0.1, poor: 0.25 },
    };
    const t = thresholds[metric];
    if (value <= t.good)
        return "good";
    if (value <= t.poor)
        return "warn";
    return "poor";
}

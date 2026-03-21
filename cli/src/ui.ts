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

import chalk from "chalk";
import ora, { Ora } from "ora";

// ── Banner ────────────────────────────────────────────────────
// Printed once at the start of every command run.

export function printBanner(): void {
  console.log();
  console.log(chalk.cyan.bold("  ┌─────────────────────────────────┐"));
  console.log(chalk.cyan.bold("  │       🩺  React Doctor          │"));
  console.log(chalk.cyan.bold("  │   React Performance Analyzer    │"));
  console.log(chalk.cyan.bold("  └─────────────────────────────────┘"));
  console.log();
}

// ── Section headers ───────────────────────────────────────────
// Visually separates sections within a command's output.

export function printSection(title: string): void {
  console.log();
  console.log(chalk.cyan.bold(`  ── ${title} `).padEnd(58, "─"));
  console.log();
}

// ── Spinner ───────────────────────────────────────────────────
// Returns a running ora spinner.
// Caller calls .succeed() or .fail() when done.

export function spinner(text: string): Ora {
  return ora({ text: `  ${text}`, color: "cyan", spinner: "dots" }).start();
}

// ── Single result line ────────────────────────────────────────
// Prints one labeled metric with a colored status dot.

export function printResult(
  label:  string,
  value:  string,
  status: "good" | "warn" | "poor" | "info" | "none" = "none",
): void {
  const dot =
    status === "good" ? chalk.green("●") :
    status === "warn" ? chalk.yellow("●") :
    status === "poor" ? chalk.red("●")    :
    status === "info" ? chalk.blue("●")   :
    chalk.gray("·");

  console.log(`  ${dot}  ${chalk.gray(label.padEnd(24))} ${value}`);
}

// ── Score badge ───────────────────────────────────────────────
// Formats a 0-100 score with a color band.

export function scoreBadge(score: number): string {
  if (score >= 90) return chalk.green.bold(`${score}/100`) + chalk.green("  Excellent");
  if (score >= 70) return chalk.yellow.bold(`${score}/100`) + chalk.yellow("  Good");
  if (score >= 50) return chalk.hex("#FFA500").bold(`${score}/100`) + chalk.hex("#FFA500")("  Needs Work");
  return chalk.red.bold(`${score}/100`) + chalk.red("  Poor");
}

// ── Severity icon ─────────────────────────────────────────────

export function severityIcon(s: string): string {
  if (s === "critical") return chalk.red("❌");
  if (s === "warning")  return chalk.yellow("⚠️ ");
  return chalk.blue("ℹ️ ");
}

// ── Done / fail ───────────────────────────────────────────────

export function printDone(message: string): void {
  console.log();
  console.log(chalk.green.bold(`  ✅  ${message}`));
  console.log();
}

export function printFail(message: string): void {
  console.log();
  console.log(chalk.red.bold(`  ❌  ${message}`));
  console.log();
}

// ── Muted info line ───────────────────────────────────────────

export function printInfo(label: string, value: string): void {
  console.log(`  ${chalk.gray(label.padEnd(16))} ${chalk.white(value)}`);
}

// ── Web vital threshold helper ────────────────────────────────
// Maps a metric value to good/warn/poor for colored output.

export function vitalStatus(
  metric: "lcp" | "fcp" | "ttfb" | "inp" | "cls",
  value:  number,
): "good" | "warn" | "poor" {
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp:  { good: 2500, poor: 4000 },
    fcp:  { good: 1800, poor: 3000 },
    ttfb: { good: 800,  poor: 1800 },
    inp:  { good: 200,  poor: 500  },
    cls:  { good: 0.1,  poor: 0.25 },
  };
  const t = thresholds[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "warn";
  return "poor";
}
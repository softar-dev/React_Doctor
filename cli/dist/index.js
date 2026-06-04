#!/usr/bin/env node
"use strict";
// ─────────────────────────────────────────────────────────────
// cli/src/index.ts  —  CLI entry point
// ─────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const analyze_1 = require("./commands/analyze");
const profile_1 = require("./commands/profile");
const full_1 = require("./commands/full");
const dashboard_1 = require("./commands/dashboard");
const program = new commander_1.Command();
// ── Program metadata ──────────────────────────────────────────
program
    .name("react-doctor")
    .description("React performance analyzer — static analysis + runtime profiling + smart suggestions")
    .version("1.0.2");
// ── Register commands ─────────────────────────────────────────
(0, full_1.registerFullCommand)(program); // react-doctor full
(0, analyze_1.registerAnalyzeCommand)(program); // react-doctor analyze
(0, profile_1.registerProfileCommand)(program); // react-doctor profile
(0, dashboard_1.registerDashboardCommand)(program); // react-doctor dashboard
// ── Usage examples ────────────────────────────────────────────
program.addHelpText("after", `
Examples:
  $ react-doctor full ./my-app                          Run full diagnostic (desktop)
  $ react-doctor full ./my-app --mobile                 Include mobile viewport
  $ react-doctor full ./my-app --desktop --mobile       Both desktop and mobile
  $ react-doctor full ./my-app --cpu 4                  Simulate slow Android device
  $ react-doctor full ./my-app --throttle slow4g        Simulate slow 4G network
  $ react-doctor full ./my-app --throttle 3g            Simulate 3G network
  $ react-doctor full ./my-app --cpu 4 --throttle 3g   Slow device + slow network
  $ react-doctor full ./my-app --upload                 Run + save report to dashboard

  $ react-doctor analyze ./my-app                       Static code analysis only
  $ react-doctor analyze ./my-app --full                Static + runtime + rules

  $ react-doctor profile ./my-app                       Runtime profiling only (desktop)
  $ react-doctor profile ./my-app --mobile              Mobile viewport
  $ react-doctor profile ./my-app --desktop --mobile    Both devices
  $ react-doctor profile ./my-app --cpu 4               4x CPU slowdown simulation
  $ react-doctor profile ./my-app --throttle slow4g     Simulate slow 4G network
  $ react-doctor profile ./my-app --throttle 3g         Simulate 3G network

  $ react-doctor dashboard                              Open dashboard (auto-starts backend)
  $ react-doctor dashboard --port 4000                  Use custom port
`);
// ── Show help if called with no arguments ─────────────────────
if (process.argv.length < 3) {
    program.help();
}
program.parse(process.argv);

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
    .version("1.2.2");
// ── Register commands ─────────────────────────────────────────
(0, full_1.registerFullCommand)(program); // react-doctor full
(0, analyze_1.registerAnalyzeCommand)(program); // react-doctor analyze
(0, profile_1.registerProfileCommand)(program); // react-doctor profile
(0, dashboard_1.registerDashboardCommand)(program); // react-doctor dashboard
// ── Usage examples ────────────────────────────────────────────
program.addHelpText("after", `
Examples:
  $ react-doctor full ./my-app                                    Run full diagnostic (desktop)
  $ react-doctor full ./my-app --mobile                          Mobile viewport
  $ react-doctor full ./my-app --desktop --mobile                Both desktop and mobile
  $ react-doctor full ./my-app --cpu 4                           Simulate slow Android device
  $ react-doctor full ./my-app --throttle slow4g                 Simulate slow 4G network
  $ react-doctor full ./my-app --throttle 3g                     Simulate 3G network
  $ react-doctor full ./my-app --cpu 4 --throttle 3g             Slow device + slow network

  $ react-doctor full ./my-app --upload                          Run + upload + open dashboard
  $ react-doctor full ./my-app --mobile --upload                 Mobile + upload + open dashboard
  $ react-doctor full ./my-app --cpu 4 --upload                  Slow CPU + upload + open dashboard
  $ react-doctor full ./my-app --throttle slow4g --upload        Slow 4G + upload + open dashboard
  $ react-doctor full ./my-app --throttle 3g --upload            3G + upload + open dashboard
  $ react-doctor full ./my-app --cpu 4 --throttle 3g --upload    Slow device + slow network + upload

  $ react-doctor analyze ./my-app                                Static code analysis only
  $ react-doctor analyze ./my-app --full                         Static + runtime + rules

  $ react-doctor profile ./my-app                                Runtime profiling only (desktop)
  $ react-doctor profile ./my-app --mobile                       Mobile viewport
  $ react-doctor profile ./my-app --desktop --mobile             Both devices
  $ react-doctor profile ./my-app --cpu 4                        4x CPU slowdown simulation
  $ react-doctor profile ./my-app --throttle slow4g              Simulate slow 4G network
  $ react-doctor profile ./my-app --throttle 3g                  Simulate 3G network
`);
// ── Show help if called with no arguments ─────────────────────
if (process.argv.length < 3) {
    program.help();
}
program.parse(process.argv);

#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// cli/src/index.ts
//
// The CLI entry point. This is the file that runs when the
// user types "react-doctor" in their terminal.
//
// HOW IT WORKS:
// 1. Commander.js parses the command and flags from argv
// 2. The matching command handler is called
// 3. The handler imports core modules and runs the pipeline
//
// HOW THE BINARY REGISTRATION WORKS:
// package.json has a "bin" field:
//   "bin": { "react-doctor": "./dist/index.js" }
//
// After "npm link" (dev) or "npm install" (production),
// npm creates a symlink from the system's bin directory
// to this file. That's what makes "react-doctor" a real
// terminal command available anywhere.
//
// THE SHEBANG (#!/usr/bin/env node) on line 1:
// This tells the OS to run this file with Node.js when
// called directly as a script. Without it, the OS doesn't
// know which interpreter to use.
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import { registerAnalyzeCommand } from "./commands/analyze";
import { registerProfileCommand } from "./commands/profile";
import { registerFullCommand }    from "./commands/full";
import { registerInstallCommand }  from "./commands/install";

const program = new Command();

// ── Program metadata ──────────────────────────────────────────
program
  .name("react-doctor")
  .description("React performance analyzer — static analysis + runtime profiling + smart suggestions")
  .version("1.0.0");

// ── Register all commands ─────────────────────────────────────
// Each function adds one command to the program.
// The order here is the order they appear in --help output.

registerFullCommand(program);      // react-doctor full
registerAnalyzeCommand(program);   // react-doctor analyze
registerProfileCommand(program);   // react-doctor profile
registerInstallCommand(program);   // react-doctor install

// ── Usage examples shown at bottom of --help ─────────────────
program.addHelpText("after", `
Examples:
  $ react-doctor full ./my-app                       Desktop only (default)
  $ react-doctor full ./my-app --mobile              Mobile only
  $ react-doctor full ./my-app --desktop --mobile    Both desktop and mobile
  $ react-doctor full ./my-app --cpu 4               Simulate slow Android device
  $ react-doctor full ./my-app --throttle slow4g     Simulate slow 4G network
  $ react-doctor full ./my-app --throttle 3g         Simulate 3G network
  $ react-doctor full ./my-app --cpu 4 --throttle 3g Slow device + slow network
  $ react-doctor full ./my-app --upload              Upload results to dashboard

  $ react-doctor analyze ./my-app                    Static code analysis only
  $ react-doctor analyze ./my-app --full             Static + runtime + rules

  $ react-doctor profile ./my-app                    Desktop only (default)
  $ react-doctor profile ./my-app --mobile           Mobile only
  $ react-doctor profile ./my-app --desktop --mobile Both devices
  $ react-doctor profile ./my-app --cpu 4            4x CPU slowdown simulation
  $ react-doctor profile ./my-app --throttle slow4g  Simulate slow 4G network
  $ react-doctor profile ./my-app --throttle 3g      Simulate 3G network

  $ react-doctor install                       Install from GitHub into a project
  $ react-doctor install --path ./my-app       Install into a specific folder
`);

// ── Show help if called with no arguments ─────────────────────
// Without this, calling "react-doctor" with no command just
// exits silently, which is confusing. This prints help instead.
if (process.argv.length < 3) {
  program.help();
}

program.parse(process.argv);
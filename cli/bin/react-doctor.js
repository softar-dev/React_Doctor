#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// bin/react-doctor.js
//
// This is the file that npm registers as the "react-doctor"
// terminal command via the "bin" field in package.json.
//
// WHY THIS FILE EXISTS (instead of pointing bin at dist/index.js):
//
// On Linux and macOS, the shebang (#!/usr/bin/env node) on the
// first line tells the OS to run this with Node.js. That works.
//
// On Windows, cmd.exe and PowerShell do not understand shebangs.
// npm works around this by generating a .cmd wrapper file when
// you run "npm link" or install the package. That .cmd wrapper
// calls "node path/to/this/file". So the shebang is ignored on
// Windows but the .cmd wrapper takes care of invoking Node.
//
// The shebang MUST be on the very first line with no blank line
// before it — npm reads it to know how to generate the wrapper.
//
// WHY NOT POINT bin AT dist/index.js DIRECTLY:
// dist/index.js is the compiled TypeScript output. It does not
// have a shebang because tsc does not add one. Without a shebang
// on Linux, running the file directly fails with "permission
// denied" or "exec format error". This wrapper is the correct
// pattern used by all major Node.js CLI tools (ESLint, Prettier,
// tsx, ts-node, etc).
//
// WHAT THIS FILE DOES:
// It simply calls the compiled dist/index.js using require().
// All the real logic lives there. This file is just the door.
// ─────────────────────────────────────────────────────────────

"use strict";

// Check Node.js version — React Doctor needs at least Node 18
const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error(
    "\n  ❌  React Doctor requires Node.js 18 or higher.\n" +
    `     You are running Node.js ${process.versions.node}.\n` +
    "     Please upgrade: https://nodejs.org\n"
  );
  process.exit(1);
}

// Register ts-node so that require() can load .ts files directly
// from the core/ folder without needing to compile them first.
//
// WHY THIS IS NEEDED:
// The core/ folder contains .ts source files — scanner.ts,
// analyzer.ts, profiler/index.ts, rule-engine/index.ts etc.
// When the CLI does require("...core/static-ana/static/scanner"),
// Node looks for scanner.js which doesn't exist. ts-node intercepts
// the require() call and compiles the .ts file on the fly instead.
//
// This means the core never needs its own build step — the CLI
// handles TypeScript resolution for the whole project.
require("ts-node").register({
  // Don't type-check on every require() — just transpile.
  // Type checking happens at build time, not at runtime.
  // This makes startup much faster.
  transpileOnly: true,

  // Use commonjs modules to match how the CLI is compiled.
  compilerOptions: {
    module: "commonjs",
  },
});

// Now that ts-node is registered, require() can load .ts files.
// Load the compiled CLI entry point — this then imports core .ts
// files directly as TypeScript modules.
require("../dist/index.js");
#!/usr/bin/env node

"use strict";

const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error(
    "\n  ❌  React Doctor requires Node.js 18 or higher.\n" +
    `     You are running Node.js ${process.versions.node}.\n` +
    "     Please upgrade: https://nodejs.org\n"
  );
  process.exit(1);
}

require(
  require.resolve("ts-node", { paths: [__dirname] })
).register({
  transpileOnly: true,
  skipIgnore: true,
  // Without this, ts-node walks UP from process.cwd() (the directory the
  // user ran `react-doctor` from — i.e. THEIR project, not this tool's)
  // looking for the nearest tsconfig.json, and applies its settings as a
  // base for every .ts file it compiles afterwards, including this tool's
  // own core/ source. If the target project's tsconfig sets things like
  // moduleResolution: "bundler" (extremely common in modern Vite/Next
  // projects) and it conflicts with the compilerOptions below, TypeScript
  // throws a hard config error (TS5095, TS5107, TS5011, etc.) before a
  // single file of THIS tool's code can even run. skipProject makes
  // ts-node ignore any tsconfig.json on disk entirely and rely only on
  // the compilerOptions passed here — this tool analyzes arbitrary
  // third-party projects, so its own compilation must never depend on
  // what's sitting in the directory being analyzed.
  skipProject: true,
  compilerOptions: {
    target: "ES2020",
    lib: ["ES2020"],
    // module + moduleResolution: "nodenext" (not "commonjs" + "node10")
    // deliberately avoids the deprecated node10 resolution strategy
    // entirely, rather than trying to silence its deprecation warning.
    //
    // We previously used module: "commonjs" + moduleResolution: "node10"
    // with an explicit "ignoreDeprecations" value to suppress TS5107
    // ("Option 'moduleResolution=node10' is deprecated..."). That broke
    // in practice: the exact ignoreDeprecations value TypeScript accepts
    // has changed across 5.x releases, and on TypeScript 5.9.3 specifically
    // the value the error message itself recommends ("6.0") is rejected
    // with TS5103 ("Invalid value for '--ignoreDeprecations'") — a real
    // inconsistency in that TypeScript version, not a config mistake on
    // our end. Any hardcoded ignoreDeprecations value is a moving target
    // as long as we're still using a deprecated setting, so instead we
    // just stop using it: "nodenext" is TypeScript's actively-supported
    // Node.js resolution strategy and triggers no deprecation diagnostics
    // at all. transpileOnly means this doesn't add any extension-strictness
    // burden to the projects being analyzed — verified clean across every
    // core/ module and against real-world tsconfig.json shapes (including
    // moduleResolution: "bundler", the setting that originally crashed
    // static analysis on a live project).
    module: "nodenext",
    moduleResolution: "nodenext",
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
});

require("../dist/index.js");
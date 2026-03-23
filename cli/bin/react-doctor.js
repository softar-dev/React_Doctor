#!/usr/bin/env node

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
require(
  require.resolve("ts-node", { paths: [__dirname] })
).register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
  },
  skipIgnore: true,
});

// Now that ts-node is registered, load the compiled CLI entry point.
require("../dist/index.js");
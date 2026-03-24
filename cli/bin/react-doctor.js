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
  compilerOptions: {
    module: "commonjs",
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
});

require("../dist/index.js");
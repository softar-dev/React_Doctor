// ─────────────────────────────────────────────────────────────
// cli/src/commands/install.ts
//
// react-doctor install
//
// Installs React Doctor from GitHub into a React project.
// Runs the equivalent of:
//
//   npm install --save-dev softar-dev/React_Doctor
//
// WHY THIS COMMAND EXISTS:
// When React Doctor is published and another developer wants
// to use it, they can run "npx react-doctor install" instead
// of having to remember the GitHub package name. It also
// detects their package manager (npm/yarn/pnpm) automatically.
//
// NOTE: This command is only useful once the GitHub repo is
// public and the project is ready for other developers to use.
// During development you run the tool directly from the
// react-tool/ folder with ts-node, so this command is not
// needed for your own workflow.
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import { spawn }   from "child_process";
import path        from "path";
import fs          from "fs";
import chalk       from "chalk";
import {
  printBanner, printSection,
  printDone, printFail, printInfo, spinner,
} from "../ui";

// The GitHub package identifier — owner/repo format.
// npm, yarn, and pnpm all understand this without any registry.
const GITHUB_PACKAGE = "softar-dev/React_Doctor";

// ─────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────

export function registerInstallCommand(program: Command): void {
  program
    .command("install")
    .description(`Install React Doctor from GitHub (${GITHUB_PACKAGE})`)
    .option(
      "-p, --path <projectPath>",
      "Path to the React project to install into (defaults to current directory)",
      process.cwd(),
    )
    .option("--no-banner", "Skip the banner")
    .action(async (options) => {

      const projectPath = path.resolve(options.path);

      if (!options.noBanner) printBanner();

      // ── Validate this is a React project ────────────────────
      const pkgJsonPath = path.join(projectPath, "package.json");
      if (!fs.existsSync(pkgJsonPath)) {
        printFail(
          `No package.json found at: ${projectPath}\n\n` +
          `  Make sure you are inside a React project, or pass the path:\n` +
          `  react-doctor install --path ./my-react-app`,
        );
        process.exit(1);
      }

      // Warn if React is not in the project's dependencies
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
        const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
        if (!deps["react"]) {
          console.log(chalk.yellow(
            "  ⚠️  React not found in this project's dependencies.\n" +
            "     Installing anyway — make sure this is a React project.\n",
          ));
        }
      } catch {
        // If we can't read package.json, just continue
      }

      // ── Detect package manager ───────────────────────────────
      // Check for lock files to know which package manager the
      // project uses. Order matters — check yarn and pnpm first
      // since npm is the fallback.
      const pkgManager =
        fs.existsSync(path.join(projectPath, "yarn.lock"))       ? "yarn" :
        fs.existsSync(path.join(projectPath, "pnpm-lock.yaml"))  ? "pnpm" :
        "npm";

      printSection("Installing React Doctor");
      printInfo("Project",  projectPath);
      printInfo("Manager",  pkgManager);
      printInfo("Source",   `github.com/${GITHUB_PACKAGE}`);
      console.log();

      // ── Build the install command ────────────────────────────
      // The "owner/repo" format is understood natively by all
      // three package managers — no npm registry needed.
      let args: string[];
      if (pkgManager === "yarn") {
        args = ["add", "--dev", GITHUB_PACKAGE];
      } else if (pkgManager === "pnpm") {
        args = ["add", "--save-dev", GITHUB_PACKAGE];
      } else {
        args = ["install", "--save-dev", GITHUB_PACKAGE];
      }

      console.log(chalk.gray(`  Running: `) + chalk.cyan(`${pkgManager} ${args.join(" ")}\n`));

      const spin = spinner("Downloading from GitHub...");

      await new Promise<void>((resolve, reject) => {
        const isWin = process.platform === "win32";

        const proc = spawn(pkgManager, args, {
          cwd:   projectPath,
          shell: isWin ? true : "/bin/bash",
          stdio: ["ignore", "pipe", "pipe"],
        });

        let output = "";
        proc.stdout?.on("data", (d: Buffer) => { output += d.toString(); });
        proc.stderr?.on("data", (d: Buffer) => { output += d.toString(); });

        proc.on("close", (code) => {
          if (code === 0) {
            spin.succeed(chalk.green("Installed successfully!"));
            resolve();
          } else {
            spin.fail(chalk.red("Installation failed."));
            if (output) console.log(chalk.gray(`\n${output}`));
            reject(new Error(`${pkgManager} exited with code ${code}`));
          }
        });

        proc.on("error", reject);
      });

      // ── Show usage after install ─────────────────────────────
      printSection("You are ready");
      console.log("  Run these commands from inside your React project:\n");

      const commands: [string, string][] = [
        ["npx react-doctor full ./",           "Run the full diagnostic (recommended)"],
        ["npx react-doctor full ./ --mobile",  "Include mobile viewport profiling"],
        ["npx react-doctor analyze ./",        "Static code analysis only (no Chrome needed)"],
        ["npx react-doctor profile ./",        "Runtime profiling only"],
        ["npx react-doctor --help",            "See all available options"],
      ];

      commands.forEach(([cmd, desc]) => {
        console.log(
          `  ${chalk.cyan(cmd.padEnd(44))}` +
          chalk.gray(desc),
        );
      });

      console.log();
      printDone("React Doctor is installed and ready.");
    });
}
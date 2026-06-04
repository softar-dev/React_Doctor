// ─────────────────────────────────────────────────────────────
// cli/src/commands/dashboard.ts
//
// react-doctor dashboard
//
// Opens the React Doctor dashboard in the browser.
//
// WHAT IT DOES:
//   1. Checks if the backend is already running on the port
//   2. If not — starts it automatically (same logic as --upload)
//   3. Opens http://localhost:PORT in the default browser
//
// This command is the natural companion to --upload.
// Workflow:
//   react-doctor full ./my-app --upload   ← runs analysis + saves report
//   react-doctor dashboard                ← opens the dashboard to view it
//
// Or in one shot:
//   react-doctor full ./my-app --upload && react-doctor dashboard
// ─────────────────────────────────────────────────────────────

import { Command } from "commander";
import path        from "path";
import fs          from "fs";
import axios       from "axios";
import { spawn }   from "child_process";
import chalk       from "chalk";
import {
  printBanner, printSection,
  printDone, printFail, printInfo, spinner,
} from "../ui";

export function registerDashboardCommand(program: Command): void {
  program
    .command("dashboard")
    .description("Open the React Doctor dashboard (auto-starts backend if needed)")
    .option(
      "--port <port>",
      "Port the backend runs on",
      "3000",
    )
    .option(
      "--api-key <key>",
      "API key for the backend",
      process.env.REACT_DOCTOR_API_KEY || "react-doctor-secret-key-change-this",
    )
    .option("--no-banner", "Skip the banner")
    .action(async (options) => {

      if (!options.noBanner) printBanner();

      const port   = options.port;
      const apiUrl = `http://localhost:${port}`;

      printSection("Dashboard");
      printInfo("Backend URL", apiUrl);
      console.log();

      const spin = spinner("Checking backend status...");

      try {
        // ── 1. Check if backend is already up ─────────────────
        let backendRunning = false;
        try {
          await axios.get(`${apiUrl}/health`, { timeout: 2000 });
          backendRunning = true;
        } catch {
          backendRunning = false;
        }

        // ── 2. Start backend if not running ───────────────────
        if (!backendRunning) {
          spin.text = "  Backend not running — starting automatically...";

          // Locate backend folder (sibling of cli/)
          const projectRoot  = path.resolve(__dirname, "..", "..", "..");
          const backendRoot  = path.resolve(projectRoot, "backend");
          const backendDist  = path.join(backendRoot, "dist", "index.js");
          const backendSrc   = path.join(backendRoot, "src",  "index.ts");

          let command: string;
          let args: string[];

          if (fs.existsSync(backendDist)) {
            command = "node";
            args    = [backendDist];
          } else if (fs.existsSync(backendSrc)) {
            command = "npx";
            args    = ["ts-node", backendSrc];
          } else {
            spin.fail(chalk.red("Backend not found"));
            printFail(
              `Could not find backend at: ${backendRoot}\n\n` +
              `  Make sure the 'backend/' folder exists next to 'cli/'.`,
            );
            process.exit(1);
          }

          // Create data dir inside npm global cache for the backend DB
          const dataDir = path.join(backendRoot, "data");
          fs.mkdirSync(dataDir, { recursive: true });

          spawn(command, args, {
            stdio: "ignore",
            detached: true,
            env: {
              ...process.env,
              API_KEY: options.apiKey,
              PORT:    port,
              DB_PATH: path.join(dataDir, "reports.db"),
            },
            cwd: backendRoot,
          }).unref(); // let CLI exit without killing the server

          // Wait for backend to be ready (up to 15 seconds)
          let ready   = false;
          let retries = 0;
          while (!ready && retries < 15) {
            try {
              await axios.get(`${apiUrl}/health`, { timeout: 1000 });
              ready = true;
            } catch {
              await new Promise(r => setTimeout(r, 1000));
              retries++;
            }
          }

          if (!ready) {
            spin.fail(chalk.red("Backend failed to start"));
            printFail("Backend did not respond after 15 seconds.");
            process.exit(1);
          }

          spin.succeed(chalk.green("Backend started successfully"));
        } else {
          spin.succeed(chalk.green("Backend already running"));
        }

        // ── 3. Open dashboard in default browser ──────────────
        const dashboardUrl = apiUrl;

        console.log();
        printInfo("Opening", dashboardUrl);
        console.log();

        // Cross-platform browser open
        const openCmd =
          process.platform === "win32"  ? ["cmd",  ["/c", "start", dashboardUrl]] :
          process.platform === "darwin" ? ["open", [dashboardUrl]] :
                                          ["xdg-open", [dashboardUrl]];

        spawn(openCmd[0] as string, openCmd[1] as string[], {
          stdio: "ignore",
          detached: true,
        }).unref();

        printDone(`Dashboard opened at ${chalk.cyan(dashboardUrl)}`);

        // ── 4. Show quick API reference ───────────────────────
        console.log(chalk.gray("  Available endpoints:"));
        console.log(chalk.cyan(`    GET  ${apiUrl}/health`));
        console.log(chalk.cyan(`    GET  ${apiUrl}/api/reports`));
        console.log(chalk.cyan(`    GET  ${apiUrl}/api/reports/:id`));
        console.log(chalk.cyan(`    GET  ${apiUrl}/api/reports/project/:name`));
        console.log(chalk.cyan(`    POST ${apiUrl}/api/reports/upload`));
        console.log();
        console.log(
          chalk.gray("  Tip: run ") +
          chalk.cyan("react-doctor full ./ --upload") +
          chalk.gray(" to add a new report.\n"),
        );

      } catch (err: any) {
        spin.fail(chalk.red("Dashboard failed to open"));
        console.log(chalk.red(`\n  ${err.message}\n`));
        process.exit(1);
      }
    });
}

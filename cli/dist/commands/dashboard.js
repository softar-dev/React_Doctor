"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDashboardCommand = registerDashboardCommand;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const ui_1 = require("../ui");
function registerDashboardCommand(program) {
    program
        .command("dashboard")
        .description("Open the React Doctor dashboard (auto-starts backend if needed)")
        .option("--port <port>", "Port the backend runs on", "3000")
        .option("--api-key <key>", "API key for the backend", process.env.REACT_DOCTOR_API_KEY || "react-doctor-secret-key-change-this")
        .option("--no-banner", "Skip the banner")
        .action(async (options) => {
        if (!options.noBanner)
            (0, ui_1.printBanner)();
        const port = options.port;
        const apiUrl = `http://localhost:${port}`;
        (0, ui_1.printSection)("Dashboard");
        (0, ui_1.printInfo)("Backend URL", apiUrl);
        console.log();
        const spin = (0, ui_1.spinner)("Checking backend status...");
        try {
            // ── 1. Check if backend is already up ─────────────────
            let backendRunning = false;
            try {
                await axios_1.default.get(`${apiUrl}/health`, { timeout: 2000 });
                backendRunning = true;
            }
            catch {
                backendRunning = false;
            }
            // ── 2. Start backend if not running ───────────────────
            if (!backendRunning) {
                spin.text = "  Backend not running — starting automatically...";
                // Locate backend folder (sibling of cli/)
                const projectRoot = path_1.default.resolve(__dirname, "..", "..", "..");
                const backendRoot = path_1.default.resolve(projectRoot, "backend");
                const backendDist = path_1.default.join(backendRoot, "dist", "index.js");
                const backendSrc = path_1.default.join(backendRoot, "src", "index.ts");
                let command;
                let args;
                if (fs_1.default.existsSync(backendDist)) {
                    command = "node";
                    args = [backendDist];
                }
                else if (fs_1.default.existsSync(backendSrc)) {
                    command = "npx";
                    args = ["ts-node", backendSrc];
                }
                else {
                    spin.fail(chalk_1.default.red("Backend not found"));
                    (0, ui_1.printFail)(`Could not find backend at: ${backendRoot}\n\n` +
                        `  Make sure the 'backend/' folder exists next to 'cli/'.`);
                    process.exit(1);
                }
                // Create data dir inside npm global cache for the backend DB
                const dataDir = path_1.default.join(backendRoot, "data");
                fs_1.default.mkdirSync(dataDir, { recursive: true });
                (0, child_process_1.spawn)(command, args, {
                    stdio: "ignore",
                    detached: true,
                    env: {
                        ...process.env,
                        API_KEY: options.apiKey,
                        PORT: port,
                        DB_PATH: path_1.default.join(dataDir, "reports.db"),
                    },
                    cwd: backendRoot,
                }).unref(); // let CLI exit without killing the server
                // Wait for backend to be ready (up to 15 seconds)
                let ready = false;
                let retries = 0;
                while (!ready && retries < 15) {
                    try {
                        await axios_1.default.get(`${apiUrl}/health`, { timeout: 1000 });
                        ready = true;
                    }
                    catch {
                        await new Promise(r => setTimeout(r, 1000));
                        retries++;
                    }
                }
                if (!ready) {
                    spin.fail(chalk_1.default.red("Backend failed to start"));
                    (0, ui_1.printFail)("Backend did not respond after 15 seconds.");
                    process.exit(1);
                }
                spin.succeed(chalk_1.default.green("Backend started successfully"));
            }
            else {
                spin.succeed(chalk_1.default.green("Backend already running"));
            }
            // ── 3. Open dashboard in default browser ──────────────
            const dashboardUrl = apiUrl;
            console.log();
            (0, ui_1.printInfo)("Opening", dashboardUrl);
            console.log();
            // Cross-platform browser open
            const openCmd = process.platform === "win32" ? ["cmd", ["/c", "start", dashboardUrl]] :
                process.platform === "darwin" ? ["open", [dashboardUrl]] :
                    ["xdg-open", [dashboardUrl]];
            (0, child_process_1.spawn)(openCmd[0], openCmd[1], {
                stdio: "ignore",
                detached: true,
            }).unref();
            (0, ui_1.printDone)(`Dashboard opened at ${chalk_1.default.cyan(dashboardUrl)}`);
            // ── 4. Show quick API reference ───────────────────────
            console.log(chalk_1.default.gray("  Available endpoints:"));
            console.log(chalk_1.default.cyan(`    GET  ${apiUrl}/health`));
            console.log(chalk_1.default.cyan(`    GET  ${apiUrl}/api/reports`));
            console.log(chalk_1.default.cyan(`    GET  ${apiUrl}/api/reports/:id`));
            console.log(chalk_1.default.cyan(`    GET  ${apiUrl}/api/reports/project/:name`));
            console.log(chalk_1.default.cyan(`    POST ${apiUrl}/api/reports/upload`));
            console.log();
            console.log(chalk_1.default.gray("  Tip: run ") +
                chalk_1.default.cyan("react-doctor full ./ --upload") +
                chalk_1.default.gray(" to add a new report.\n"));
        }
        catch (err) {
            spin.fail(chalk_1.default.red("Dashboard failed to open"));
            console.log(chalk_1.default.red(`\n  ${err.message}\n`));
            process.exit(1);
        }
    });
}

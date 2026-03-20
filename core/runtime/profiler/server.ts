import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs-extra";
import os from "os";

/**
 * Detects which package manager the project uses by checking
 * for lock files, then spawns the dev server as a background
 * child process.
 *
 * Windows spawn rules:
 *   shell:true + bare name "npm" — cmd.exe resolves npm → npm.cmd correctly.
 *   shell:false breaks for .cmd files (EINVAL).
 *   shell:true + "npm.cmd" double-wraps and causes ENOENT.
 *
 * Linux spawn rules:
 *   shell:"/bin/bash" ensures nvm/volta PATH hooks are loaded.
 *   detached:true lets process.kill(-pid) kill the whole process group
 *   (npm → vite → esbuild and all children at once).
 *
 * Returns the ChildProcess so the caller can attach listeners
 * and kill it during cleanup.
 */
export function spawnDevServer(projectPath: string): ChildProcess {
  const isWin = os.platform() === "win32";

  const pkgManager = fs.existsSync(path.join(projectPath, "yarn.lock"))
    ? "yarn"
    : fs.existsSync(path.join(projectPath, "pnpm-lock.yaml"))
    ? "pnpm"
    : "npm";

  console.log(`📦 Starting ${pkgManager} dev server...`);

  return spawn(pkgManager, ["run", "dev"], {
    cwd:         projectPath,
    shell:       isWin ? true : "/bin/bash",
    env:         {
      ...process.env,
      ...(isWin ? {} : { PATH: process.env.PATH + ":/usr/local/bin:/usr/bin:/bin" }),
    },
    detached:    !isWin,
    stdio:       ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

/**
 * Watches the dev server's stdout and stderr for a "localhost:PORT"
 * line, then resolves with the port number.
 *
 * Why ANSI stripping is needed:
 *   Vite colorizes its output with escape codes like \x1B[32m.
 *   Without stripping, "localhost:5173" looks like
 *   "localhost\x1B[0m:5173" and the regex never matches.
 *
 * Why the 2-second delay:
 *   Vite prints the port slightly before it is fully bound and
 *   ready to accept connections. Resolving immediately causes
 *   Puppeteer to hit the server too early and get refused.
 */
export function waitForServer(devServer: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(
      () => reject(new Error("⏱️ Dev server timed out after 30 seconds!")),
      30000,
    );

    const onData = (data: Buffer) => {
      // Strip ANSI color codes before running the regex
      const output = data.toString().replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
      console.log(`   ${output.trim()}`);

      const match = output.match(/localhost:(\d+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        devServer.stdout?.off("data", onData);
        devServer.stderr?.off("data", onData);
        const port = parseInt(match[1], 10);
        // 2-second buffer: Vite announces port before it's fully bound
        setTimeout(() => resolve(port), 2000);
      }
    };

    devServer.stdout?.on("data", onData);
    devServer.stderr?.on("data", onData);

    devServer.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`❌ Dev server failed to start: ${err.message}`));
    });
  });
}

/**
 * Kills the dev server process tree cleanly.
 *
 * Linux:   process.kill(-pid) sends SIGTERM to the entire process group,
 *          stopping npm, vite, esbuild and any other children at once.
 * Windows: taskkill /F /T kills the process tree with the same effect.
 *
 * ESRCH error (No Such Process) means the server already stopped — ignored.
 */
export function killDevServer(devServer: ChildProcess): void {
  if (!devServer.pid) return;

  try {
    if (os.platform() === "win32") {
      spawn("taskkill", ["/pid", devServer.pid.toString(), "/f", "/t"]);
    } else {
      process.kill(-devServer.pid);
    }
  } catch (error) {
    const err = error as any;
    if (err.code !== "ESRCH") {
      console.warn(`   ⚠️ Cleanup warning: ${err.message}`);
    }
  }
}
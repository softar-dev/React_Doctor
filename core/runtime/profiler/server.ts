import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";
import fs from "fs-extra";
import os from "os";

/**
 * Detects which package manager the project uses by checking
 * for lock files, then spawns the dev server as a background
 * child process.
 *
 * Windows: shell:true so npm.cmd resolves correctly.
 * Linux:   tries /bin/bash first, falls back to /bin/sh if bash
 *          is not present (Alpine, minimal containers, etc).
 */
export function spawnDevServer(projectPath: string): ChildProcess {
  const isWin = os.platform() === "win32";

  const pkgManager = fs.existsSync(path.join(projectPath, "yarn.lock"))
    ? "yarn"
    : fs.existsSync(path.join(projectPath, "pnpm-lock.yaml"))
    ? "pnpm"
    : "npm";

  console.log(`📦 Starting ${pkgManager} dev server...`);

  // On Linux, prefer bash but fall back to sh if bash is missing
  const shell = isWin
    ? true
    : fs.existsSync("/bin/bash")
    ? "/bin/bash"
    : "/bin/sh";

  return spawn(pkgManager, ["run", "dev"], {
    cwd:         projectPath,
    shell,
    env: {
      ...process.env,
      ...(isWin ? {} : { PATH: process.env.PATH + ":/usr/local/bin:/usr/bin:/bin" }),
    },
    detached:    !isWin,
    stdio:       ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

/**
 * Watches the dev server's stdout and stderr for a port number.
 *
 * Handles both "localhost:PORT" and "127.0.0.1:PORT" since
 * some Linux setups print the IP instead of the hostname.
 * Also handles "port PORT" format used by some dev servers.
 */
export function waitForServer(devServer: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(
      () => reject(new Error("⏱️ Dev server timed out after 60 seconds!")),
      60000,
    );

    const onData = (data: Buffer) => {
      // Strip ANSI color codes before running the regex
      const output = data.toString().replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
      console.log(`   ${output.trim()}`);

      // Match "localhost:PORT", "127.0.0.1:PORT", or "port PORT"
      const match =
        output.match(/(?:localhost|127\.0\.0\.1):(\d+)/) ??
        output.match(/port\s+(\d+)/i);

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
 * Kills the dev server process tree cleanly on both platforms.
 *
 * Linux:   process.kill(-pid) sends SIGTERM to the entire process group.
 * Windows: taskkill /F /T kills the process tree.
 * ESRCH:   process already stopped — ignored safely.
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
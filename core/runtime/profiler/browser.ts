import os from "os";
import path from "path";
import fs from "fs-extra";

/**
 * Finds and returns the path to the Chrome/Chromium executable.
 *
 * Windows: checks three common installation paths including the
 *          per-user AppData location.
 * Linux:   checks system-wide and Snap paths for Google Chrome
 *          and Chromium.
 * macOS:   checks the standard Applications folder.
 *
 * Throws a clear error if no browser is found.
 */
export function getBrowserPath(): string {
  if (os.platform() === "win32") {
    const winPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(
      "❌ Chrome not found! Please install Google Chrome on Windows.",
    );
  }

  const unixPaths = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  for (const p of unixPaths) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    "❌ No compatible browser found! Please install Google Chrome or Chromium.",
  );
}

/**
 * Reads the web-vitals IIFE bundle from local node_modules.
 *
 * WHY NOT USE A CDN URL:
 *   The original approach used page.addScriptTag({ url: "https://unpkg.com/..." })
 *   which requires an internet connection every run. If the connection drops,
 *   the profiler crashes. This version reads from disk — works 100% offline.
 *
 * HOW IT WORKS:
 *   The IIFE build exposes window.webVitals in the browser. We inject it with
 *   page.addScriptTag({ content: code }) which inlines the script without
 *   making any network request.
 *
 * SEARCH ORDER:
 *   1. react-tool/node_modules      (standard after npm install)
 *   2. one level higher             (monorepo hoisting fallback)
 *   3. target project's node_modules
 *   4. Node's require.resolve()     (most reliable — finds it wherever Node would)
 *
 * projectPath is needed for candidate 3.
 * __profilerDir is the directory of the calling file (__dirname equivalent).
 */
export function getWebVitalsScript(projectPath: string, profilerDir: string): string {
  const filename = "web-vitals.iife.js";

  // profilerDir = core/runtime/profiler/
  // 3 levels up = react-tool/  → node_modules lives there
  const candidates: string[] = [
    path.resolve(profilerDir, "..", "..", "..", "node_modules", "web-vitals", "dist", filename),
    path.resolve(profilerDir, "..", "..", "..", "..", "node_modules", "web-vitals", "dist", filename),
    path.join(projectPath, "node_modules", "web-vitals", "dist", filename),
  ];

  try {
    const pkgJson = require.resolve("web-vitals/package.json");
    candidates.push(path.join(path.dirname(pkgJson), "dist", filename));
  } catch {
    // not resolvable from this module — fine, we have other candidates
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`   ✅ web-vitals loaded from disk (offline-safe)`);
      return fs.readFileSync(candidate, "utf-8");
    }
  }

  const searched = candidates.map(c => `\n      ${c}`).join("");
  throw new Error(
    `❌ web-vitals not found.\n\n   Searched in:${searched}\n\n` +
    `   Fix: run "npm install web-vitals" inside react-tool/\n`,
  );
}
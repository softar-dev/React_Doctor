import os from "os";
import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";

/**
 * Finds and returns the path to the Chrome/Chromium executable.
 *
 * Windows: checks common installation paths including per-user AppData.
 * Linux:   checks all known system paths + tries `which` as a fallback.
 * macOS:   checks the standard Applications folder.
 *
 * Throws a clear error if no browser is found.
 */
export function getBrowserPath(): string {
  const platform = os.platform();

  if (platform === "win32") {
    const winPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(
      "❌ Chrome not found! Please install Google Chrome on Windows.\n" +
      "   Download: https://www.google.com/chrome/",
    );
  }

  if (platform === "darwin") {
    const macPaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(
      "❌ Chrome not found! Please install Google Chrome on macOS.\n" +
      "   Download: https://www.google.com/chrome/",
    );
  }

  // Linux — check all known install locations
  const linuxPaths = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/local/bin/chrome",
    "/usr/local/bin/chromium",
    "/opt/google/chrome/chrome",
    "/opt/google/chrome/google-chrome",
    "/snap/bin/chromium",
    "/snap/bin/google-chrome",
  ];

  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  // Last resort: try `which` to find it anywhere on PATH
  for (const cmd of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      const result = execSync(`which ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
      if (result && fs.existsSync(result)) return result;
    } catch {
      // not found via which, try next
    }
  }

  throw new Error(
    "❌ No compatible browser found on Linux!\n\n" +
    "   Install one of the following:\n" +
    "     Ubuntu/Debian: sudo apt install chromium-browser\n" +
    "     Fedora:        sudo dnf install chromium\n" +
    "     Snap:          sudo snap install chromium\n" +
    "     Or install Google Chrome from: https://www.google.com/chrome/",
  );
}

/**
 * Reads the web-vitals IIFE bundle from local node_modules.
 *
 * Uses { content } injection — NO network request, works offline.
 */
export function getWebVitalsScript(projectPath: string, profilerDir: string): string {
  const filename = "web-vitals.iife.js";

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
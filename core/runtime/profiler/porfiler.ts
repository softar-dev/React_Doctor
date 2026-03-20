import puppeteer, { Browser, Page } from "puppeteer-core";
import { spawn, ChildProcess } from "child_process";
import {
  RuntimeReport,
  WebVitals,
  SystemStats,
  PageError,
  Screenshot,
} from "../../../shared/src/types";
import os from "os";
import path from "path";
import fs from "fs-extra";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ReactProfilerData {
  rerenders: Record<string, number>;
  commitDurations: number[];
  renderTime: number;
}

export type DeviceType    = "desktop" | "mobile";
export type ThrottlePreset = "none" | "slow4g" | "3g";

/**
 * CPU throttle rate passed to Chrome's Emulation.setCPUThrottlingRate.
 * 1  = no throttling (real hardware speed)
 * 4  = 4x slowdown  (matches Lighthouse "mobile" preset — mid-range Android)
 * 6  = 6x slowdown  (low-end device simulation)
 *
 * Unlike network throttling, CPU throttling works on localhost because
 * it slows down JavaScript EXECUTION itself, not data transfer.
 * A commit that takes 40ms at 1x will take ~160ms at 4x — revealing
 * real-world mobile performance problems that fast dev machines hide.
 */
export type CpuThrottle = 1 | 4 | 6;

export interface ProfileOptions {
  // Single device or array for both in one run
  device?: DeviceType | DeviceType[];
  throttle?: ThrottlePreset;
  // 1 = no throttle (default), 4 = Lighthouse mobile preset, 6 = low-end
  cpuThrottle?: CpuThrottle;
}

// ─────────────────────────────────────────────────────────────
// NETWORK PRESETS  (Chrome DevTools Protocol values)
// ─────────────────────────────────────────────────────────────
const NETWORK_PRESETS = {
  none: null,
  slow4g: {
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput:   (750 * 1024) / 8,
    latency: 170,
  },
  "3g": {
    downloadThroughput: (1.5 * 1024 * 1024) / 8,
    uploadThroughput:   (750 * 1024) / 8,
    latency: 300,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// DEVICE PRESETS
// ─────────────────────────────────────────────────────────────
const DEVICE_PRESETS = {
  desktop: {
    viewport:  { width: 1280, height: 720 },
    userAgent: null,
    hasTouch:  false,
    isMobile:  false,
  },
  mobile: {
    viewport:  { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 " +
      "Mobile/15E148 Safari/604.1",
    hasTouch:  true,
    isMobile:  true,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// PERFORMANCE SCORE
// ─────────────────────────────────────────────────────────────

/**
 * Calculates a 0–100 performance score from all collected metrics.
 *
 * HOW IT WORKS:
 * Each metric is normalized to a 0–100 scale based on its good/poor
 * thresholds. Then a weighted average is taken — metrics that matter
 * most to the user experience get higher weights.
 *
 * Weights (must sum to 1.0):
 *   LCP         0.30  — biggest impact on perceived load speed
 *   Render time 0.20  — total time to interactive
 *   FCP         0.15  — first sign of life
 *   Commit avg  0.15  — React rendering efficiency
 *   TTFB        0.10  — server response speed
 *   CLS         0.05  — visual stability
 *   INP         0.05  — interaction responsiveness
 *
 * A score of 90–100 = excellent, 70–89 = good, 50–69 = needs work,
 * below 50 = poor.
 *
 * Errors and warnings penalize the score:
 *   Each JS error    → -5 points (capped at -20)
 *   Each warning     → -2 points (capped at -10)
 */
export function calculatePerformanceScore(
  vitals: WebVitals,
  renderTime: number,
  commitDurations: number[],
  errors: PageError[],
): number {
  // Normalize a value to 0–100 where lower is better
  function normalize(value: number, good: number, poor: number): number {
    if (value <= good) return 100;
    if (value >= poor) return 0;
    // Linear interpolation between good and poor
    return Math.round(100 * (1 - (value - good) / (poor - good)));
  }

  const avgCommit = commitDurations.length > 0
    ? commitDurations.reduce((a, b) => a + b, 0) / commitDurations.length
    : 0;

  const scores = {
    lcp:        normalize(vitals.lcp,    2500, 4000)  * 0.30,
    renderTime: normalize(renderTime,    2000, 5000)  * 0.20,
    fcp:        normalize(vitals.fcp,    1800, 3000)  * 0.15,
    commitAvg:  normalize(avgCommit,     16,   100)   * 0.15,
    ttfb:       normalize(vitals.ttfb,   800,  1800)  * 0.10,
    cls:        normalize(vitals.cls,    0.1,  0.25)  * 0.05,
    inp:        normalize(vitals.inp,    200,  500)   * 0.05,
  };

  let score = Object.values(scores).reduce((a, b) => a + b, 0);

  // Penalize for errors and warnings
  const errorCount   = errors.filter(e => e.type === "error").length;
  const warningCount = errors.filter(e => e.type === "warning").length;
  score -= Math.min(errorCount   * 5, 20);
  score -= Math.min(warningCount * 2, 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─────────────────────────────────────────────────────────────
// ROUTE SCANNER
// ─────────────────────────────────────────────────────────────

class RouteScanner {
  static async scanForRoutes(projectPath: string): Promise<string[]> {
    const routes: string[] = ["/"];

    const potentialFiles = [
      path.join(projectPath, "src", "App.tsx"),
      path.join(projectPath, "src", "App.jsx"),
      path.join(projectPath, "src", "main.tsx"),
      path.join(projectPath, "src", "routes.tsx"),
    ];

    for (const filePath of potentialFiles) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const code = await fs.readFile(filePath, "utf-8");
        const ast  = parser.parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });
        traverse(ast, {
          JSXOpeningElement(p) {
            const isRoute = (p.node.name as any).name === "Route";
            if (isRoute) {
              const pathAttr = p.node.attributes.find(
                (attr: any) => attr.name?.name === "path",
              );
              if (
                pathAttr &&
                "value" in pathAttr &&
                pathAttr.value?.type === "StringLiteral"
              ) {
                routes.push(pathAttr.value.value);
              }
            }
          },
        });
      } catch {
        // skip unparseable files silently
      }
    }

    return [...new Set(routes)];
  }
}

// ─────────────────────────────────────────────────────────────
// RUNTIME PROFILER
// ─────────────────────────────────────────────────────────────

export class RuntimeProfiler {
  private projectPath: string;
  private devServer?: ChildProcess;
  private browser?: Browser;
  private reportDir: string;
  private screenshotDir: string;

  constructor(projectPath: string) {
    this.projectPath  = path.resolve(projectPath);
    // __dirname = core/runtime/profiler/
    // 2 levels up (.., ..) = core/  ← reports folder lives here
    this.reportDir    = path.resolve(__dirname, "..", "..", "reports");
    this.screenshotDir = path.join(this.reportDir, "screenshots");
    fs.ensureDirSync(this.reportDir);
    fs.ensureDirSync(this.screenshotDir);
  }

  /**
   * Main entry point.
   *
   * New options:
   *   cpuThrottle: 1 (default, no throttle) | 4 (Lighthouse mobile) | 6 (low-end)
   *
   * Flow:
   *   1. startDevServer()      → boots the React app
   *   2. RouteScanner          → finds routes from source code
   *   3. For each device × route:
   *      a. collectErrors()    → attach listeners BEFORE navigation
   *      b. page.goto()        → load the page
   *      c. runVitalsScript()  → LCP, FCP, CLS, INP, TTFB
   *      d. runReactProfiler() → re-renders, commit durations
   *      e. captureScreenshots()→ FCP moment, LCP moment, full load
   *      f. getResourceUsage() → heap, DOM, payload, top offender
   *      g. calculateScore()   → 0–100 weighted score
   *   4. cleanup()             → kills browser + dev server
   *   5. writeJson()           → saves runtimereport.json
   */
  async profile(
    manualRoutes: string[] = [],
    options: ProfileOptions = {},
  ): Promise<Record<string, RuntimeReport>> {
    const throttle    = options.throttle    ?? "none";
    const cpuThrottle = options.cpuThrottle ?? 1;

    const rawDevice = options.device ?? "desktop";
    const devices: DeviceType[] = Array.isArray(rawDevice) ? rawDevice : [rawDevice];
    const multiDevice = devices.length > 1;

    console.log("🚀 Starting React Doctor Analysis...");
    console.log(`   Devices:  ${devices.join(", ")} | Network: ${throttle} | CPU: ${cpuThrottle}x`);

    const masterReport: Record<string, RuntimeReport> = {};

    try {
      const port    = await this.startDevServer();
      const baseUrl = `http://localhost:${port}`;

      let targetRoutes = manualRoutes;
      if (targetRoutes.length === 0) {
        console.log("🔍 Smart Scanning source code for routes...");
        targetRoutes = await RouteScanner.scanForRoutes(this.projectPath);
        console.log(`🎯 Discovered ${targetRoutes.length} route(s): ${targetRoutes.join(", ")}`);
      }

      for (const device of devices) {
        console.log(`\n📱 Starting ${device.toUpperCase()} pass...`);

        for (const route of targetRoutes) {
          const url = `${baseUrl}${route}`;
          console.log(`\n   📍 Auditing [${device}]: ${route}`);

          const { vitals, reactData, stats, errors, screenshots } =
            await this.collectMetrics(url, device, throttle, cpuThrottle);

          const performanceScore = calculatePerformanceScore(
            vitals,
            reactData.renderTime,
            reactData.commitDurations,
            errors,
          );

          console.log(`   🏆 Score: ${performanceScore}/100`);

          const key = multiDevice ? `${route}::${device}` : route;

          masterReport[key] = {
            timestamp: new Date().toISOString(),
            url,
            deviceType: device,
            metrics: vitals,
            rerenders: reactData.rerenders,
            commitDurations: reactData.commitDurations,
            renderTime: reactData.renderTime,
            stats,
            performanceScore,
            errors,
            screenshots,
            cpuThrottling: cpuThrottle,
          };
        }
      }

      await this.cleanup();

      const reportPath = path.join(this.reportDir, "runtimereport.json");
      await fs.writeJson(reportPath, masterReport, { spaces: 2 });
      console.log(`\n📄 Report saved to: ${reportPath}`);

      return masterReport;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: web-vitals loader
  // ───────────────────────────────────────────────────────────

  private getWebVitalsScript(): string {
    const filename = "web-vitals.iife.js";

    const candidates: string[] = [
      // __dirname = react-tool/core/runtime/profiler/ → 3 levels up = react-tool/
      path.resolve(__dirname, "..", "..", "..", "node_modules", "web-vitals", "dist", filename),
      path.resolve(__dirname, "..", "..", "..", "..", "node_modules", "web-vitals", "dist", filename),
      path.join(this.projectPath, "node_modules", "web-vitals", "dist", filename),
    ];

    try {
      const pkgJson = require.resolve("web-vitals/package.json");
      candidates.push(path.join(path.dirname(pkgJson), "dist", filename));
    } catch {}

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

  // ───────────────────────────────────────────────────────────
  // PRIVATE: browser path
  // ───────────────────────────────────────────────────────────

  private getBrowserPath(): string {
    if (os.platform() === "win32") {
      const winPaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
      ];
      for (const p of winPaths) {
        if (fs.existsSync(p)) return p;
      }
      throw new Error("❌ Chrome not found! Please install Google Chrome.");
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

    throw new Error("❌ No compatible browser found! Please install Google Chrome or Chromium.");
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: dev server
  // ───────────────────────────────────────────────────────────

  private async startDevServer(): Promise<number> {
    const isWin = os.platform() === "win32";

    const pkgManager = fs.existsSync(path.join(this.projectPath, "yarn.lock"))
      ? "yarn"
      : fs.existsSync(path.join(this.projectPath, "pnpm-lock.yaml"))
      ? "pnpm"
      : "npm";

    console.log(`📦 Starting ${pkgManager} dev server...`);

    this.devServer = spawn(pkgManager, ["run", "dev"], {
      cwd:        this.projectPath,
      shell:      isWin ? true : "/bin/bash",
      env:        { ...process.env, ...(isWin ? {} : { PATH: process.env.PATH + ":/usr/local/bin:/usr/bin:/bin" }) },
      detached:   !isWin,
      stdio:      ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    return this.waitForServer();
  }

  private async waitForServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const timeout = setTimeout(
        () => reject(new Error("⏱️ Dev server timed out after 30 seconds!")),
        30000,
      );

      const onData = (data: Buffer) => {
        const output = data.toString().replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
        console.log(`   ${output.trim()}`);

        const match = output.match(/localhost:(\d+)/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.devServer?.stdout?.off("data", onData);
          this.devServer?.stderr?.off("data", onData);
          setTimeout(() => resolve(parseInt(match[1], 10)), 2000);
        }
      };

      this.devServer?.stdout?.on("data", onData);
      this.devServer?.stderr?.on("data", onData);
      this.devServer?.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`❌ Dev server failed to start: ${err.message}`));
      });
    });
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: collectMetrics — orchestrates one full page audit
  // ───────────────────────────────────────────────────────────

  private async collectMetrics(
    url: string,
    device: DeviceType,
    throttle: ThrottlePreset,
    cpuThrottle: CpuThrottle,
  ) {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        executablePath: this.getBrowserPath(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    }

    const page         = await this.browser.newPage();
    const devicePreset = DEVICE_PRESETS[device];

    await page.setViewport({
      ...devicePreset.viewport,
      hasTouch: devicePreset.hasTouch,
      isMobile: devicePreset.isMobile,
    });

    if (devicePreset.userAgent) {
      await page.setUserAgent(devicePreset.userAgent);
    }

    // CDP session used for cache clearing, network throttling, and CPU throttling
    const cdpClient = await page.createCDPSession();
    await cdpClient.send("Network.clearBrowserCache");

    if (NETWORK_PRESETS[throttle]) {
      await cdpClient.send("Network.emulateNetworkConditions", {
        offline: false,
        ...NETWORK_PRESETS[throttle],
      });
      console.log(`   🌐 Network: ${throttle}`);
    }

    // CPU throttling — works on localhost unlike network throttling.
    // Slows down JavaScript execution to simulate low-end hardware.
    // rate 1 = real speed, rate 4 = 4x slower (Lighthouse mobile preset).
    if (cpuThrottle > 1) {
      await cdpClient.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
      console.log(`   ⚙️  CPU: ${cpuThrottle}x slowdown`);
    }

    // ── Error & warning collection ────────────────────────────
    // Attach listeners BEFORE navigation so we catch errors that
    // happen during the initial page load, not just after it settles.
    //
    // pageerror: uncaught JS exceptions (TypeError, ReferenceError, etc.)
    // console:   anything logged via console.error() or console.warn()
    //            React warns about missing keys, prop-type errors, etc.
    //            via console.error, so we capture those here.
    const errors: PageError[] = [];

    page.on("pageerror", (err) => {
      // Puppeteer types pageerror as unknown in newer versions.
      // Cast to Error since that is always what the browser sends.
      const error = err as Error;
      errors.push({
        type:    "error",
        message: error?.message ?? String(err),
        source:  "pageerror",
      });
    });

    // Internal messages generated by our own profiler scripts that
    // would show up as false positives in the app's error report.
    const PROFILER_NOISE = [
      "Deprecated API for given entry type",   // from getEntriesByType("largest-contentful-paint")
      "web-vitals",                             // from our web-vitals injection
    ];

    page.on("console", (msg) => {
      const text = msg.text();

      // Skip messages that come from our own injected scripts
      if (PROFILER_NOISE.some(noise => text.includes(noise))) return;

      if (msg.type() === "error") {
        errors.push({
          type:    "error",
          message: text,
          source:  "console",
        });
      } else if (msg.type() === "warn") {
        errors.push({
          type:    "warning",
          message: text,
          source:  "console",
        });
      }
    });

    // ── React DevTools hook injection ─────────────────────────
    await page.evaluateOnNewDocument(() => {
      const win = (globalThis as any);
      const rerenders: Record<string, number> = {};
      const commitDurations: number[] = [];

      function walkFiber(fiber: any): void {
        if (!fiber) return;
        const name: string =
          fiber.type?.displayName ||
          fiber.type?.name ||
          (typeof fiber.type === "string" ? fiber.type : null);
        if (name && /^[A-Z]/.test(name)) {
          rerenders[name] = (rerenders[name] || 0) + 1;
        }
        walkFiber(fiber.child);
        walkFiber(fiber.sibling);
      }

      function patchHook(hook: any): void {
        if (hook.__reactDoctorPatched__) return;
        hook.__reactDoctorPatched__ = true;
        const originalOnCommit = hook.onCommitFiberRoot;
        hook.onCommitFiberRoot = (rendererID: any, fiberRoot: any) => {
          if (originalOnCommit) originalOnCommit.call(hook, rendererID, fiberRoot);
          try {
            const rootFiber = fiberRoot.current;
            if (rootFiber?.actualDuration != null) {
              commitDurations.push(parseFloat(rootFiber.actualDuration.toFixed(2)));
            }
            walkFiber(rootFiber);
          } catch (e) {}
        };
      }

      win.__reactDoctorData__ = { rerenders, commitDurations };

      if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        patchHook(win.__REACT_DEVTOOLS_GLOBAL_HOOK__);
      } else {
        win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          isDisabled: false,
          supportsFiber: true,
          renderers: new Map(),
          onScheduleFiberRoot: () => {},
          onCommitFiberUnmount: () => {},
          onCommitFiberRoot: () => {},
          inject(renderer: any) {
            patchHook(win.__REACT_DEVTOOLS_GLOBAL_HOOK__);
          },
        };
      }
    });

    try {
      const navStart = Date.now();
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
      const renderTime = Date.now() - navStart;

      // Simulate click for INP
      await page.mouse.click(
        devicePreset.viewport.width  / 2,
        devicePreset.viewport.height / 2,
      );

      const perfMetrics  = await page.metrics();
      const vitals       = await this.runVitalsScript(page);
      const reactData    = await this.runReactProfiler(page, renderTime);
      const resources    = await this.getResourceUsage(page);
      const screenshots  = await this.captureScreenshots(page, url, device, renderTime);

      await page.close();

      // Reset CPU throttling for next page (doesn't persist across pages
      // automatically, but good practice to reset explicitly)
      if (cpuThrottle > 1) {
        // cdpClient is bound to the closed page — new page gets fresh session
      }

      return {
        vitals,
        reactData,
        errors,
        screenshots,
        stats: {
          domNodes:    perfMetrics.Nodes ?? 0,
          jsHeapMB:    ((perfMetrics.JSHeapUsedSize ?? 0) / 1024 / 1024).toFixed(2),
          payloadMB:   resources.totalMB.toFixed(2),
          topOffender: resources.topFile,
        },
      };
    } catch (err: unknown) {
      await page.close();
      throw err;
    }
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: web vitals
  // ───────────────────────────────────────────────────────────

  private async runVitalsScript(page: Page): Promise<WebVitals> {
    const webVitalsCode = this.getWebVitalsScript();
    await page.addScriptTag({ content: webVitalsCode });

    return (await page.evaluate(() => {
      return new Promise((resolve) => {
        const results: any = { lcp: 0, fcp: 0, cls: 0, inp: 0, ttfb: 0 };
        let count = 0;
        let resolved = false;

        const v = (globalThis as any).webVitals;

        const finalize = () => {
          if (results.lcp === 0) results.lcp = results.fcp;
          return results;
        };

        const done = () => {
          if (++count === 5 && !resolved) { resolved = true; resolve(finalize()); }
        };

        v.onLCP((m: any)  => { results.lcp  = m.value; done(); });
        v.onFCP((m: any)  => { results.fcp  = m.value; done(); });
        v.onCLS((m: any)  => { results.cls  = m.value; done(); });
        v.onINP((m: any)  => { results.inp  = m.value; done(); });
        v.onTTFB((m: any) => { results.ttfb = m.value; done(); });

        setTimeout(() => {
          if (!resolved) { resolved = true; resolve(finalize()); }
        }, 8000);
      });
    })) as WebVitals;
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: React Profiler API
  // ───────────────────────────────────────────────────────────

  private async runReactProfiler(page: Page, renderTime: number): Promise<ReactProfilerData> {
    await new Promise((r) => setTimeout(r, 3000));

    const result = await page.evaluate((renderTimeMs: number) => {
      const win  = globalThis as any;
      const data = win.__reactDoctorData__;
      const hookExists       = !!win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      const hookSupportsFiber = win.__REACT_DEVTOOLS_GLOBAL_HOOK__?.supportsFiber ?? false;

      return {
        hookExists,
        hookSupportsFiber,
        dataExists:      !!data,
        rerenders:       data?.rerenders       ?? {},
        commitDurations: data?.commitDurations ?? [],
        renderTime:      renderTimeMs,
      };
    }, renderTime);

    console.log(`   ⚛️  Hook exists: ${result.hookExists} | supportsFiber: ${result.hookSupportsFiber} | data captured: ${result.dataExists}`);
    console.log(`   ⚛️  Commits: ${result.commitDurations.length} | Components: ${Object.keys(result.rerenders).length}`);

    return {
      rerenders:       result.rerenders,
      commitDurations: result.commitDurations,
      renderTime:      result.renderTime,
    };
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: screenshot capture
  // ───────────────────────────────────────────────────────────

  /**
   * Takes three screenshots that form a visual filmstrip of the load:
   *
   * 1. "fcp"      — taken right after FCP fires (first content appears)
   * 2. "lcp"      — taken right after LCP fires (main content appears)
   * 3. "fullLoad" — taken after networkidle0 (page fully settled)
   *
   * HOW IT WORKS:
   * We can't go back in time to capture FCP/LCP exactly as they happened
   * because those events fired during page.goto(). Instead we take the
   * full-load screenshot immediately (the page is still visible), and
   * for FCP/LCP we use the browser's PerformanceObserver timestamps to
   * know WHEN they happened — then annotate the screenshot with that info.
   *
   * Screenshots are saved as:
   *   - Base64 data URLs in the JSON report (for the dashboard <img> tags)
   *   - PNG files in core/reports/screenshots/ (for direct viewing)
   *
   * The dataUrl format is: "data:image/png;base64,<base64string>"
   * Drop it directly into an <img src="..."> in the dashboard.
   */
  private async captureScreenshots(
    page: Page,
    url: string,
    device: DeviceType,
    renderTime: number,
  ): Promise<Screenshot[]> {
    const screenshots: Screenshot[] = [];

    // Get the FCP and LCP timestamps from the browser's Performance API
    // so we can annotate the screenshots with when those events happened
    const timings = await page.evaluate(() => {
      const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
      const lcpEntries = (performance as any).getEntriesByType("largest-contentful-paint");
      return {
        fcp: fcpEntry?.startTime ?? 0,
        lcp: lcpEntries.length > 0
          ? lcpEntries[lcpEntries.length - 1].startTime
          : 0,
      };
    });

    // Build a safe filename prefix from the URL and device
    // e.g. "localhost-2004---desktop" for http://localhost:2004/
    const urlSafe = url
      .replace(/https?:\/\//, "")
      .replace(/[/:?#]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const timestamp = Date.now();

    // Take the full-load screenshot (page is currently at networkidle0 state)
    const fullLoadBuffer = await page.screenshot({ type: "png", fullPage: false });
    const fullLoadBase64 = `data:image/png;base64,${Buffer.from(fullLoadBuffer as any).toString("base64")}`;
    const fullLoadFilename = `${urlSafe}-${device}-fullLoad-${timestamp}.png`;

    await fs.writeFile(
      path.join(this.screenshotDir, fullLoadFilename),
      fullLoadBuffer,
    );

    screenshots.push({
      label:   "fullLoad",
      dataUrl: fullLoadBase64,
      takenAt: renderTime,
    });

    // For FCP and LCP we record when they happened relative to navigation.
    // We can't re-render those exact moments, but we store the timing
    // so the dashboard can annotate the filmstrip correctly.
    // We add them as metadata-only entries (same screenshot, different label)
    // so the dashboard knows which frame corresponds to which event.
    if (timings.fcp > 0) {
      screenshots.push({
        label:   "fcp",
        dataUrl: fullLoadBase64, // same visual — annotated with timing in dashboard
        takenAt: Math.round(timings.fcp),
      });
    }

    if (timings.lcp > 0) {
      screenshots.push({
        label:   "lcp",
        dataUrl: fullLoadBase64,
        takenAt: Math.round(timings.lcp),
      });
    }

    console.log(`   📸 Screenshot saved: ${fullLoadFilename}`);

    return screenshots;
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: resource usage
  // ───────────────────────────────────────────────────────────

  private async getResourceUsage(page: Page) {
    return await page.evaluate(() => {
      const entries    = performance.getEntriesByType("resource");
      const totalBytes = entries.reduce((acc, e: any) => acc + (e.transferSize || 0), 0);
      const sorted     = [...entries].sort(
        (a: any, b: any) => (b.transferSize || 0) - (a.transferSize || 0),
      );
      const heaviest = sorted[0] as any;

      return {
        totalMB: totalBytes / 1024 / 1024,
        topFile: heaviest
          ? {
              name: heaviest.name.split("/").pop() || "unknown",
              size: (heaviest.transferSize || 0) / 1024 / 1024,
            }
          : null,
      };
    });
  }

  // ───────────────────────────────────────────────────────────
  // PRIVATE: cleanup
  // ───────────────────────────────────────────────────────────

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }

    if (this.devServer && this.devServer.pid) {
      console.log("🧹 Cleaning up background processes...");
      try {
        if (os.platform() === "win32") {
          spawn("taskkill", ["/pid", this.devServer.pid.toString(), "/f", "/t"]);
        } else {
          process.kill(-this.devServer.pid);
        }
      } catch (error) {
        const err = error as any;
        if (err.code !== "ESRCH") console.warn(`   ⚠️ Cleanup warning: ${err.message}`);
      }
      this.devServer = undefined;
    }
  }
}
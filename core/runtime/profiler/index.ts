// ─────────────────────────────────────────────────────────────
// index.ts
// RuntimeProfiler — the main class.
// Orchestrates all the other modules to run a full audit.
// ─────────────────────────────────────────────────────────────

import puppeteer, { Browser } from "puppeteer-core";
import { ChildProcess } from "child_process";
import { RuntimeReport } from "../../../shared/src/types";
import os from "os";
import path from "path";
import fs from "fs-extra";

import {
  ProfileOptions,
  DeviceType,
  ThrottlePreset,
  CpuThrottle,
  NETWORK_PRESETS,
  DEVICE_PRESETS,
} from "./types";
import { calculatePerformanceScore }  from "./score";
import { RouteScanner }               from "./route-scanner";
import { spawnDevServer, waitForServer, killDevServer } from "./server";
import { getBrowserPath, getWebVitalsScript }          from "./browser";
import {
  collectWebVitals,
  collectReactProfilerData,
  collectResourceUsage,
  captureScreenshots,
  attachErrorListeners,
} from "./collectors";

export { calculatePerformanceScore } from "./score";
export type { ProfileOptions, DeviceType, ThrottlePreset, CpuThrottle } from "./types";

export class RuntimeProfiler {
  private projectPath:   string;
  private devServer?:    ChildProcess;
  private browser?:      Browser;
  private reportDir:     string;
  private screenshotDir: string;

  constructor(projectPath: string, outputDir?: string) {
  this.projectPath   = path.resolve(projectPath);
  this.reportDir     = outputDir ?? path.resolve(__dirname, "..", "..", "reports");
  this.screenshotDir = path.join(this.reportDir, "screenshots");
  fs.ensureDirSync(this.reportDir);
  fs.ensureDirSync(this.screenshotDir);
}

  /**
   * Main entry point. Runs the full profiling pipeline.
   *
   * Pass [] for manualRoutes to auto-discover routes via AST scanning.
   * Pass a routes array like ["/", "/about"] to test only those pages.
   *
   * Flow:
   *   1. spawnDevServer()           → boots the React app
   *   2. RouteScanner               → finds routes from source code
   *   3. For each device x route:
   *      a. attachErrorListeners()  → listen before navigation
   *      b. page.goto()             → load the page
   *      c. collectWebVitals()      → LCP, FCP, CLS, INP, TTFB
   *      d. collectReactProfiler()  → re-renders, commit durations
   *      e. captureScreenshots()    → PNG + base64 + FCP/LCP timestamps
   *      f. collectResourceUsage()  → heap, DOM, payload, top offender
   *      g. calculateScore()        → 0-100 weighted score
   *   4. cleanup()                  → kills browser + dev server
   *   5. writeJson()                → saves runtimereport.json
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
      this.devServer = spawnDevServer(this.projectPath);
      const port     = await waitForServer(this.devServer);
      const baseUrl  = `http://localhost:${port}`;

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
            vitals, reactData.renderTime, reactData.commitDurations, errors,
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
             networkThrottle: throttle,
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
  // PRIVATE: single page audit
  // ───────────────────────────────────────────────────────────

  private async collectMetrics(
    url: string,
    device: DeviceType,
    throttle: ThrottlePreset,
    cpuThrottle: CpuThrottle,
  ) {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        executablePath: getBrowserPath(),
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

    // CDP session: cache clearing, network throttling, CPU throttling
    const cdpClient = await page.createCDPSession();
    await cdpClient.send("Network.clearBrowserCache");

    if (NETWORK_PRESETS[throttle]) {
      await cdpClient.send("Network.emulateNetworkConditions", {
        offline: false,
        ...NETWORK_PRESETS[throttle],
      });
      console.log(`   🌐 Network: ${throttle}`);
    }

    if (cpuThrottle > 1) {
      await cdpClient.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
      console.log(`   ⚙️  CPU: ${cpuThrottle}x slowdown`);
    }

    // Attach error listeners BEFORE navigation so nothing is missed
    const errors = attachErrorListeners(page);

    // Inject the React DevTools hook BEFORE the page loads.
    // evaluateOnNewDocument() runs before any page script executes,
    // so React finds our hook already in place and uses it.
    // Uses inject() as the trigger point — fires when React first
    // registers itself, guaranteed before the first commit.
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
      const navStart   = Date.now();
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
      const renderTime = Date.now() - navStart;

      // Simulate a click so INP has a real interaction to measure
      await page.mouse.click(
        devicePreset.viewport.width  / 2,
        devicePreset.viewport.height / 2,
      );

      const perfMetrics = await page.metrics();
      const webVitalsCode = getWebVitalsScript(this.projectPath, __dirname);
      const vitals      = await collectWebVitals(page, webVitalsCode);
      const reactData   = await collectReactProfilerData(page, renderTime);
      const screenshots = await captureScreenshots(page, url, device, renderTime, this.screenshotDir);
      const resources   = await collectResourceUsage(page);

      await page.close();

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
  // PRIVATE: cleanup
  // ───────────────────────────────────────────────────────────

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }

    if (this.devServer) {
      console.log("🧹 Cleaning up background processes...");
      killDevServer(this.devServer);
      this.devServer = undefined;
    }
  }
}
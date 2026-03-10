import puppeteer, { Browser, Page } from "puppeteer";
import { spawn, ChildProcess } from "child_process";
import { RuntimeReport, WebVitals } from "shared/src/types";

export class RuntimeProfiler {
  private projectPath: string;
  private devServer?: ChildProcess;
  private browser?: Browser;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Run complete runtime profiling
   */
  async profile(): Promise<RuntimeReport> {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 Runtime Profiler - Starting Performance Analysis");
    console.log("=".repeat(70));

    try {
      // Step 1: Start dev server
      const port = await this.startDevServer();
      const url = `http://localhost:${port}`;

      // Step 2: Launch browser and collect metrics
      const metrics = await this.collectMetrics(url);

      // Step 3: Cleanup
      await this.cleanup();

      console.log("=".repeat(70));
      console.log("✅ Runtime profiling complete!");
      console.log("=".repeat(70));

      return {
        timestamp: new Date().toISOString(),
        metrics,
        url,
        deviceType: "desktop",
      };
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Start the development server
   */
  private async startDevServer(): Promise<number> {
    console.log("\n📦 Starting development server...");

    const packageManager = this.detectPackageManager();

    // ✅ shell: true is required on Windows for .cmd scripts (npm, yarn, pnpm)
    // ✅ Pass command and args separately (not concatenated) to avoid deprecation warning
    // ✅ Explicitly inherit env so PATH is available inside the child process
    this.devServer = spawn(packageManager, ["run", "dev"], {
      cwd: this.projectPath,
      shell: true,
      env: { ...process.env },
      stdio: "pipe",
      windowsHide: true, // prevent ghost terminal window on Windows
    });

    const port = await this.waitForServer();

    console.log(`✅ Server running on port ${port}`);

    return port;
  }

  /**
   * Detect package manager (npm, yarn, or pnpm)
   */
  private detectPackageManager(): string {
    const fs = require("fs");
    const path = require("path");

    if (fs.existsSync(path.join(this.projectPath, "yarn.lock"))) {
      return "yarn";
    }
    if (fs.existsSync(path.join(this.projectPath, "pnpm-lock.yaml"))) {
      return "pnpm";
    }
    return "npm";
  }

  /**
   * Wait for dev server to start and detect port
   */
  private async waitForServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      let port = 3000;
      let resolved = false;

      const timeout = setTimeout(() => {
        reject(new Error("Dev server failed to start within 30 seconds"));
      }, 30000);

      const handleOutput = (data: Buffer) => {
        const raw = data.toString();

        // ✅ Strip ANSI escape codes (Vite colorizes output, which breaks regex matching)
        const output = raw.replace(/\x1B\[[0-9;]*[mGKHF]/g, "");

        console.log(`   ${output.trim()}`);

        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch && !resolved) {
          resolved = true;
          port = parseInt(portMatch[1], 10);
          clearTimeout(timeout);
          setTimeout(() => resolve(port), 2000);
        }
      };

      // ✅ Listen on BOTH stdout and stderr — Vite prints to stderr
      this.devServer!.stdout?.on("data", handleOutput);
      this.devServer!.stderr?.on("data", handleOutput);

      this.devServer!.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start dev server: ${error.message}`));
      });
    });
  }

  /**
   * Collect Web Vitals metrics
   */
  private async collectMetrics(url: string): Promise<WebVitals> {
    console.log(`\n🌐 Opening ${url} in headless Chrome...`);

    // Launch Puppeteer
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await this.browser.newPage();

    // Set viewport (desktop size)
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    console.log("📊 Collecting Web Vitals...");

    // Navigate to the page
    await page.goto(url, {
      waitUntil: "networkidle0", // Wait for network to be idle
      timeout: 30000,
    });

    // Inject Web Vitals library and collect metrics
    const metrics = await this.injectAndCollectWebVitals(page);

    console.log("\n✅ Metrics collected:");
    console.log(`   LCP: ${metrics.lcp.toFixed(0)}ms`);
    console.log(`   FCP: ${metrics.fcp.toFixed(0)}ms`);
    console.log(`   CLS: ${metrics.cls.toFixed(3)}`);
    console.log(`   INP: ${metrics.inp.toFixed(0)}ms`);
    console.log(`   TTFB: ${metrics.ttfb.toFixed(0)}ms`);

    await this.browser.close();

    return metrics;
  }

  /**
   * Inject Web Vitals library and collect metrics
   */
  private async injectAndCollectWebVitals(page: Page): Promise<WebVitals> {
    // Inject web-vitals library from CDN
    await page.addScriptTag({
      url: "https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js",
    });

    // Collect metrics
    const metrics = await page.evaluate(() => {
      return new Promise<WebVitals>((resolve) => {
        const results: any = {
          lcp: 0,
          fcp: 0,
          cls: 0,
          inp: 0,
          ttfb: 0,
        };

        let metricsCollected = 0;
        const totalMetrics = 5;

        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics) {
            resolve(results as WebVitals);
          }
        };

        // @ts-ignore - webVitals is loaded from CDN
        if (window.webVitals) {
          // @ts-ignore
          window.webVitals.onLCP((metric: any) => {
            results.lcp = metric.value;
            checkComplete();
          });

          // @ts-ignore
          window.webVitals.onFCP((metric: any) => {
            results.fcp = metric.value;
            checkComplete();
          });

          // @ts-ignore
          window.webVitals.onCLS((metric: any) => {
            results.cls = metric.value;
            checkComplete();
          });

          // @ts-ignore
          window.webVitals.onINP((metric: any) => {
            results.inp = metric.value;
            checkComplete();
          });

          // @ts-ignore
          window.webVitals.onTTFB((metric: any) => {
            results.ttfb = metric.value;
            checkComplete();
          });

          // Timeout fallback - resolve after 10 seconds even if not all metrics fired
          setTimeout(() => {
            resolve(results as WebVitals);
          }, 10000);
        } else {
          // Web Vitals not available
          resolve(results as WebVitals);
        }
      });
    });

    return metrics;
  }

  /**
   * Cleanup - close browser and stop dev server
   */
 private async cleanup(): Promise<void> {
  console.log("\n🧹 Cleaning up...");

  if (this.browser) {
    await this.browser.close();
    console.log("   ✅ Browser closed");
  }

  if (this.devServer) {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(this.devServer!.pid), '/f', '/t'], {
        shell: false,
        env: { ...process.env },
      });
      killer.on('close', () => resolve());
    });
    console.log("   ✅ Dev server stopped");
  }
}
}

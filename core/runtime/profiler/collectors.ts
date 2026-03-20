import { Page } from "puppeteer-core";
import path from "path";
import fs from "fs-extra";
import {
  WebVitals,
  PageError,
  Screenshot,
} from "../../../shared/src/types";
import { ReactProfilerData, DeviceType } from "./types";

// ─────────────────────────────────────────────────────────────
// WEB VITALS
// ─────────────────────────────────────────────────────────────

/**
 * Injects the web-vitals library (as pre-loaded string content) into
 * the page and collects all 5 Core Web Vitals.
 *
 * Uses { content } injection — NO network request, works offline.
 *
 * The 8-second fallback resolves with whatever metrics fired so far
 * in case INP or LCP never fire (e.g. on a static page with no images).
 * The resolved flag prevents the fallback from firing a second time
 * after the metrics already resolved normally.
 *
 * LCP fallback: if LCP never fired (no large elements on page),
 * FCP is used as the baseline so we never report 0ms.
 */
export async function collectWebVitals(
  page: Page,
  webVitalsCode: string,
): Promise<WebVitals> {
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
        if (++count === 5 && !resolved) {
          resolved = true;
          resolve(finalize());
        }
      };

      v.onLCP((m: any)  => { results.lcp  = m.value; done(); });
      v.onFCP((m: any)  => { results.fcp  = m.value; done(); });
      v.onCLS((m: any)  => { results.cls  = m.value; done(); });
      v.onINP((m: any)  => { results.inp  = m.value; done(); });
      v.onTTFB((m: any) => { results.ttfb = m.value; done(); });

      // Fail-safe: resolve after 8s with whatever metrics we have
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(finalize()); }
      }, 8000);
    });
  })) as WebVitals;
}

// ─────────────────────────────────────────────────────────────
// REACT PROFILER
// ─────────────────────────────────────────────────────────────

/**
 * Reads the React profiler data that was collected by the
 * __REACT_DEVTOOLS_GLOBAL_HOOK__ injected in evaluateOnNewDocument.
 *
 * Waits 3 seconds after page load to capture deferred renders,
 * lazy-loaded components, and data-fetch re-renders.
 *
 * The hook injection itself happens in index.ts inside collectMetrics()
 * via page.evaluateOnNewDocument() before navigation — this function
 * only reads what was accumulated during and after page load.
 */
export async function collectReactProfilerData(
  page: Page,
  renderTime: number,
): Promise<ReactProfilerData> {
  // Wait for deferred renders to settle
  await new Promise((r) => setTimeout(r, 3000));

  const result = await page.evaluate((renderTimeMs: number) => {
    const win  = globalThis as any;
    const data = win.__reactDoctorData__;
    const hookExists        = !!win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
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

  console.log(
    `   ⚛️  Hook exists: ${result.hookExists} | ` +
    `supportsFiber: ${result.hookSupportsFiber} | ` +
    `data captured: ${result.dataExists}`,
  );
  console.log(
    `   ⚛️  Commits: ${result.commitDurations.length} | ` +
    `Components: ${Object.keys(result.rerenders).length}`,
  );

  return {
    rerenders:       result.rerenders,
    commitDurations: result.commitDurations,
    renderTime:      result.renderTime,
  };
}

// ─────────────────────────────────────────────────────────────
// RESOURCE USAGE
// ─────────────────────────────────────────────────────────────

/**
 * Uses the browser's native Performance API to measure:
 *   - Total page weight (sum of all transferred bytes)
 *   - The single heaviest file downloaded (the "top offender")
 *
 * performance.getEntriesByType("resource") returns every JS bundle,
 * CSS file, image, and font downloaded to render the page.
 * transferSize is the actual compressed bytes sent over the wire.
 */
export async function collectResourceUsage(page: Page) {
  return await page.evaluate(() => {
    const entries    = performance.getEntriesByType("resource");
    const totalBytes = entries.reduce(
      (acc, e: any) => acc + (e.transferSize || 0), 0,
    );
    const sorted   = [...entries].sort(
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

// ─────────────────────────────────────────────────────────────
// SCREENSHOTS
// ─────────────────────────────────────────────────────────────

/**
 * Captures a screenshot of the page at its current state (full load)
 * and records FCP / LCP timestamps from the Performance API.
 *
 * Saved in two formats:
 *   1. PNG file on disk in screenshotDir — directly viewable
 *   2. Base64 data URL in the JSON report — ready for <img src="..."> in dashboard
 *
 * FCP and LCP entries share the same screenshot image but carry the
 * timestamp of when that event fired, so the dashboard can annotate
 * the filmstrip with the correct timing.
 */
export async function captureScreenshots(
  page: Page,
  url: string,
  device: DeviceType,
  renderTime: number,
  screenshotDir: string,
): Promise<Screenshot[]> {
  const screenshots: Screenshot[] = [];

  // Read FCP and LCP timestamps from the browser's Performance API
  const timings = await page.evaluate(() => {
    const fcpEntry   = performance.getEntriesByName("first-contentful-paint")[0];
    const lcpEntries = (performance as any).getEntriesByType("largest-contentful-paint");
    return {
      fcp: fcpEntry?.startTime ?? 0,
      lcp: lcpEntries.length > 0
        ? lcpEntries[lcpEntries.length - 1].startTime
        : 0,
    };
  });

  // Build a safe filename from the URL and device
  const urlSafe = url
    .replace(/https?:\/\//, "")
    .replace(/[/:?#]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const timestamp      = Date.now();
  const fullLoadBuffer = await page.screenshot({ type: "png", fullPage: false });
  const fullLoadBase64 = `data:image/png;base64,${Buffer.from(fullLoadBuffer as any).toString("base64")}`;
  const fullLoadFilename = `${urlSafe}-${device}-fullLoad-${timestamp}.png`;

  await fs.writeFile(path.join(screenshotDir, fullLoadFilename), fullLoadBuffer);
  console.log(`   📸 Screenshot saved: ${fullLoadFilename}`);

  screenshots.push({ label: "fullLoad", dataUrl: fullLoadBase64, takenAt: renderTime });

  if (timings.fcp > 0) {
    screenshots.push({ label: "fcp", dataUrl: fullLoadBase64, takenAt: Math.round(timings.fcp) });
  }
  if (timings.lcp > 0) {
    screenshots.push({ label: "lcp", dataUrl: fullLoadBase64, takenAt: Math.round(timings.lcp) });
  }

  return screenshots;
}

// ─────────────────────────────────────────────────────────────
// ERROR LISTENERS
// ─────────────────────────────────────────────────────────────

/**
 * Attaches error and warning listeners to the page BEFORE navigation.
 * Returns the errors array — it fills itself as the page loads.
 *
 * pageerror: uncaught JS exceptions (TypeError, ReferenceError, etc.)
 * console:   console.error() and console.warn() — React sends all its
 *            developer warnings (missing keys, bad hooks, etc.) here.
 *
 * Profiler-generated noise (web-vitals warnings, DevTools hook messages)
 * is filtered out so it doesn't appear as false positives.
 */
export function attachErrorListeners(page: Page): PageError[] {
  const errors: PageError[] = [];

  const PROFILER_NOISE = [
    "Deprecated API for given entry type",
    "web-vitals",
  ];

  page.on("pageerror", (err) => {
    const error = err as Error;
    errors.push({
      type:    "error",
      message: error?.message ?? String(err),
      source:  "pageerror",
    });
  });

  page.on("console", (msg) => {
    const text = msg.text();
    if (PROFILER_NOISE.some(noise => text.includes(noise))) return;

    if (msg.type() === "error") {
      errors.push({ type: "error",   message: text, source: "console" });
    } else if (msg.type() === "warn") {
      errors.push({ type: "warning", message: text, source: "console" });
    }
  });

  return errors;
}
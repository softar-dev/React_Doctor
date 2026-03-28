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

export async function collectReactProfilerData(
  page: Page,
  renderTime: number,
): Promise<ReactProfilerData> {
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

export async function captureScreenshots(
  page: Page,
  url: string,
  device: DeviceType,
  renderTime: number,
  screenshotDir: string,
): Promise<Screenshot[]> {
  const screenshots: Screenshot[] = [];

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

  const urlSafe = url
    .replace(/https?:\/\//, "")
    .replace(/[/:?#]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const timestamp      = Date.now();
  const fullLoadBuffer = await page.screenshot({ type: "png", fullPage: false });

  // ── Safe Buffer conversion — works on both Windows and Linux
  // Puppeteer can return Buffer or Uint8Array depending on version/platform.
  // Converting through Uint8Array first guarantees it works either way.
  const bufferSafe = Buffer.isBuffer(fullLoadBuffer)
    ? fullLoadBuffer
    : Buffer.from(fullLoadBuffer as Uint8Array);

  const fullLoadBase64   = `data:image/png;base64,${bufferSafe.toString("base64")}`;
  const fullLoadFilename = `${urlSafe}-${device}-fullLoad-${timestamp}.png`;

  await fs.writeFile(path.join(screenshotDir, fullLoadFilename), bufferSafe);
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
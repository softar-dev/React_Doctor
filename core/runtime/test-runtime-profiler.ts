import { RuntimeProfiler } from "./profiler";

import path from "path";

// ─────────────────────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────────────────────

type VitalKey = "lcp" | "fcp" | "ttfb" | "inp" | "cls";

const vitalThresholds: Record<VitalKey, { good: number; poor: number }> = {
  lcp:  { good: 2500, poor: 4000 },
  fcp:  { good: 1800, poor: 3000 },
  ttfb: { good: 800,  poor: 1800 },
  inp:  { good: 200,  poor: 500  },
  cls:  { good: 0.1,  poor: 0.25 },
};

function getStatus(metric: string, value: number): string {
  const limit = vitalThresholds[metric.toLowerCase() as VitalKey];
  if (!limit) return "⚪ Unknown";
  return value <= limit.good ? "🟢 Good" : value <= limit.poor ? "🟡 Needs Improvement" : "🔴 Poor";
}

type HealthKey = "heap" | "weight" | "nodes";

const healthThresholds: Record<HealthKey, { good: number; poor: number }> = {
  heap:   { good: 150,  poor: 300  },
  weight: { good: 3,    poor: 8    },
  nodes:  { good: 1500, poor: 3000 },
};

function getSystemStatus(metric: string, value: number): string {
  const limit = healthThresholds[metric.toLowerCase() as HealthKey];
  if (!limit) return "⚪ Unknown";
  return value <= limit.good ? "🟢 Good" : value <= limit.poor ? "🟡 Needs Improvement" : "🔴 Poor";
}

function getRenderTimeStatus(ms: number): string {
  return ms <= 2000 ? "🟢 Good" : ms <= 4000 ? "🟡 Needs Improvement" : "🔴 Poor";
}

// Score badge — clear visual band so you know at a glance how the app did
function getScoreBadge(score: number): string {
  if (score >= 90) return `${score}/100 🟢 Excellent`;
  if (score >= 70) return `${score}/100 🟡 Good`;
  if (score >= 50) return `${score}/100 🟠 Needs Work`;
  return `${score}/100 🔴 Poor`;
}

function describeDevice(device: string): string {
  return device === "mobile"
    ? "📱 Mobile (iPhone 12 Pro, 390×844)"
    : "🖥️  Desktop (1280×720)";
}

function describeThrottle(throttle: string): string {
  if (throttle === "3g")     return "🐢 3G  (1.5 Mbps / 300ms RTT)";
  if (throttle === "slow4g") return "🐌 Slow 4G  (9 Mbps / 170ms RTT)";
  return "⚡ No throttle  (localhost speed)";
}

function describeCpu(rate: number): string {
  if (rate === 4) return "⚙️  CPU 4x slowdown (Lighthouse mobile preset)";
  if (rate === 6) return "⚙️  CPU 6x slowdown (low-end device)";
  return "⚙️  CPU no throttle (real hardware speed)";
}

// ─────────────────────────────────────────────────────────────
// AUDIT OPTIONS
// ─────────────────────────────────────────────────────────────

// device:      "desktop" | "mobile" | ["desktop", "mobile"]
// throttle:    "none" | "slow4g" | "3g"
//              ⚠️  Only meaningful against deployed URLs, not localhost.
//
// cpuThrottle: 1 (default) | 4 (Lighthouse mobile) | 6 (low-end)
//              ✅ Works on localhost — slows JS execution, not data transfer.
//              Use 4 to simulate what a mid-range Android phone feels like.
const AUDIT_OPTIONS = {
  device:      ["desktop", "mobile"] as ("desktop" | "mobile")[],
  throttle:    "none" as const,
  cpuThrottle: 1 as 1 | 4 | 6,
};

// ─────────────────────────────────────────────────────────────
// MAIN TEST
// ─────────────────────────────────────────────────────────────

export async function startTest() {
  console.log("=========================================================");
  console.log("🩺  REACT DOCTOR: FULL SMART DIAGNOSTIC  🩺");
  console.log("=========================================================");

  const targetProject = path.resolve(
    process.argv[2] || process.env.TARGET_PROJECT || process.cwd(),
  );

  console.log(`📁 Target:   ${targetProject}`);

  const deviceList = Array.isArray(AUDIT_OPTIONS.device)
    ? AUDIT_OPTIONS.device
    : [AUDIT_OPTIONS.device];
  deviceList.forEach(d => console.log(describeDevice(d)));
  console.log(describeThrottle(AUDIT_OPTIONS.throttle));
  console.log(describeCpu(AUDIT_OPTIONS.cpuThrottle));

  const profiler = new RuntimeProfiler(targetProject);

  try {
    const masterReport = await profiler.profile([], AUDIT_OPTIONS);
    const routesFound  = Object.keys(masterReport);

    if (routesFound.length === 0) {
      console.log("\n⚠️  No routes were audited.");
      return;
    }

    routesFound.forEach((key) => {
      const report = masterReport[key];
      const [route] = key.includes("::") ? key.split("::") : [key];

      console.log(`\n📍 ROUTE: ${route}`);
      console.log(`   Device: ${report.deviceType} | CPU: ${report.cpuThrottling}x | Network: ${AUDIT_OPTIONS.throttle}`);

      // ── PERFORMANCE SCORE ───────────────────────────────────
      console.log(`\n🏆 PERFORMANCE SCORE: ${getScoreBadge(report.performanceScore)}`);
      console.log("---------------------------------------------------------");

      // ── TABLE 1: WEB VITALS ─────────────────────────────────
      console.log("⚡ SPEED METRICS");
      console.table({
        "LCP (Paint)":    { Value: `${report.metrics.lcp.toFixed(0)}ms`,  Status: getStatus("lcp",  report.metrics.lcp)  },
        "FCP (Content)":  { Value: `${report.metrics.fcp.toFixed(0)}ms`,  Status: getStatus("fcp",  report.metrics.fcp)  },
        "TTFB (Server)":  { Value: `${report.metrics.ttfb.toFixed(0)}ms`, Status: getStatus("ttfb", report.metrics.ttfb) },
        "CLS (Stability)":{ Value: report.metrics.cls.toFixed(3),         Status: getStatus("cls",  report.metrics.cls)  },
        "INP (Response)": { Value: `${report.metrics.inp.toFixed(0)}ms`,  Status: getStatus("inp",  report.metrics.inp)  },
      });

      // ── TABLE 2: SYSTEM HEALTH ──────────────────────────────
      console.log("🩺 SYSTEM HEALTH");
      console.table({
        "Memory (RAM)": { Value: `${report.stats.jsHeapMB} MB`,  Status: getSystemStatus("heap",   parseFloat(report.stats.jsHeapMB))  },
        "Page Weight":  { Value: `${report.stats.payloadMB} MB`, Status: getSystemStatus("weight", parseFloat(report.stats.payloadMB)) },
        "DOM Nodes":    { Value: report.stats.domNodes,          Status: getSystemStatus("nodes",  report.stats.domNodes)              },
        "Render Time":  { Value: `${report.renderTime}ms`,       Status: getRenderTimeStatus(report.renderTime)                        },
      });

      if (report.stats.topOffender) {
        console.log(`🔍 TOP OFFENDER: ${report.stats.topOffender.name} (${report.stats.topOffender.size.toFixed(2)} MB)`);
      }

      // ── TABLE 3: REACT PROFILER ─────────────────────────────
      console.log("\n⚛️  REACT PROFILER");

      if (report.commitDurations.length > 0) {
        const total = report.commitDurations.reduce((a, b) => a + b, 0);
        const avg   = (total / report.commitDurations.length).toFixed(2);
        const max   = Math.max(...report.commitDurations).toFixed(2);
        const slow  = report.commitDurations.filter(d => d > 16).length;

        console.log(`   Commits:    ${report.commitDurations.length} total`);
        console.log(`   Avg commit: ${avg}ms`);
        console.log(`   Slowest:    ${max}ms`);
        if (slow > 0) {
          console.log(`   ⚠️  ${slow} commit(s) exceeded 16ms (60fps budget)`);
        }
      } else {
        console.log("   Commits:    none recorded (app may not be in dev mode)");
      }

      const rerenderEntries = Object.entries(report.rerenders);
      if (rerenderEntries.length > 0) {
        console.log("\n   Re-renders per component:");
        const rerenderTable: Record<string, { Renders: number; Status: string }> = {};
        for (const [name, count] of rerenderEntries.sort(([, a], [, b]) => b - a)) {
          rerenderTable[name] = {
            Renders: count,
            Status:  count >= 10 ? "🔴 Excessive" : count >= 5 ? "🟡 High" : "🟢 Normal",
          };
        }
        console.table(rerenderTable);
      }

      // ── ERRORS & WARNINGS ───────────────────────────────────
      console.log("\n🐛 ERRORS & WARNINGS");
      if (report.errors.length === 0) {
        console.log("   ✅ No errors or warnings detected");
      } else {
        const jsErrors  = report.errors.filter(e => e.type === "error");
        const warnings  = report.errors.filter(e => e.type === "warning");

        if (jsErrors.length > 0) {
          console.log(`   ❌ ${jsErrors.length} error(s):`);
          jsErrors.forEach(e => console.log(`      [${e.source}] ${e.message.slice(0, 120)}`));
        }
        if (warnings.length > 0) {
          console.log(`   ⚠️  ${warnings.length} warning(s):`);
          warnings.forEach(e => console.log(`      [${e.source}] ${e.message.slice(0, 120)}`));
        }
      }

      // ── SCREENSHOTS ─────────────────────────────────────────
      console.log("\n📸 SCREENSHOTS");
      if (report.screenshots.length === 0) {
        console.log("   No screenshots captured");
      } else {
        report.screenshots.forEach(s => {
          console.log(`   ${s.label.padEnd(10)} → captured at ${s.takenAt}ms`);
        });
        console.log(`   📁 PNG files saved to: core/reports/screenshots/`);
      }

      console.log("---------------------------------------------------------");
    });

    console.log("\n✅ Full Diagnostic Finished Successfully.");
  } catch (error) {
    console.error("\n❌ PROFILER ERROR!");
    console.error(error);
  }
}

if (require.main === module) {
  startTest();
}
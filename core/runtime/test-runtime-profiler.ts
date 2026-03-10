import { RuntimeProfiler } from './profiler/porfiler';
import path from 'path';

async function testRuntimeProfiler() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 Testing Runtime Profiler");
  console.log("=".repeat(70));

  try {
    // ✅ Use the absolute path directly — do NOT wrap with path.join(process.cwd(), ...)
    // path.join(cwd, absolutePath) corrupts the path on Windows by prepending cwd to it
    const projectPath = 'C:\\Users\\Ozma\\Desktop\\Pro\\Re\\retest';

    console.log(`\n📂 Project: ${projectPath}`);
    console.log("\n⚠️  NOTE: Make sure your test project has:");
    console.log("   - package.json with 'dev' script");
    console.log("   - Working React app that starts on a port");

    const profiler = new RuntimeProfiler(projectPath);
    const report = await profiler.profile();

    // Display results
    console.log("\n📊 Runtime Report:");
    console.log("=".repeat(70));
    console.log(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`URL: ${report.url}`);
    console.log(`Device: ${report.deviceType}`);

    console.log("\n🎯 Web Vitals:");
    console.log(`   LCP: ${report.metrics.lcp.toFixed(0)}ms ${getMetricStatus('lcp', report.metrics.lcp)}`);
    console.log(`   FCP: ${report.metrics.fcp.toFixed(0)}ms ${getMetricStatus('fcp', report.metrics.fcp)}`);
    console.log(`   CLS: ${report.metrics.cls.toFixed(3)} ${getMetricStatus('cls', report.metrics.cls)}`);
    console.log(`   INP: ${report.metrics.inp.toFixed(0)}ms ${getMetricStatus('inp', report.metrics.inp)}`);
    console.log(`   TTFB: ${report.metrics.ttfb.toFixed(0)}ms ${getMetricStatus('ttfb', report.metrics.ttfb)}`);

    console.log("\n" + "=".repeat(70));

  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error((error as Error).message);
    console.error("\nStack trace:");
    console.error((error as Error).stack);
    process.exit(1);
  }
}

function getMetricStatus(metric: string, value: number): string {
  const thresholds: Record<string, { good: number; poor: number }> = {
    lcp: { good: 2500, poor: 4000 },
    fcp: { good: 1800, poor: 3000 },
    cls: { good: 0.1, poor: 0.25 },
    inp: { good: 200, poor: 500 },
    ttfb: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[metric];
  if (!threshold) return '';

  if (value <= threshold.good) return '🟢 Good';
  if (value <= threshold.poor) return '🟡 Needs Improvement';
  return '🔴 Poor';
}

testRuntimeProfiler();
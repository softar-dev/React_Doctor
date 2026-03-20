import { WebVitals, PageError } from "../../../shared/src/types";

/**
 * Calculates a 0–100 performance score from all collected metrics.
 *
 * Each metric is normalized to 0–100 based on its good/poor threshold,
 * then a weighted average is computed. Weights must sum to 1.0:
 *
 *   LCP         0.30  — biggest impact on perceived load speed
 *   Render time 0.20  — total time to interactive
 *   FCP         0.15  — first sign of life
 *   Commit avg  0.15  — React rendering efficiency
 *   TTFB        0.10  — server response speed
 *   CLS         0.05  — visual stability
 *   INP         0.05  — interaction responsiveness
 *
 * Score bands: 90–100 Excellent, 70–89 Good, 50–69 Needs Work, <50 Poor.
 *
 * Penalties:
 *   Each JS error   → -5 points (capped at -20)
 *   Each warning    → -2 points (capped at -10)
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
    return Math.round(100 * (1 - (value - good) / (poor - good)));
  }

  const avgCommit = commitDurations.length > 0
    ? commitDurations.reduce((a, b) => a + b, 0) / commitDurations.length
    : 0;

  const scores = {
    lcp:        normalize(vitals.lcp,  2500, 4000) * 0.30,
    renderTime: normalize(renderTime,  2000, 5000) * 0.20,
    fcp:        normalize(vitals.fcp,  1800, 3000) * 0.15,
    commitAvg:  normalize(avgCommit,   16,   100)  * 0.15,
    ttfb:       normalize(vitals.ttfb, 800,  1800) * 0.10,
    cls:        normalize(vitals.cls,  0.1,  0.25) * 0.05,
    inp:        normalize(vitals.inp,  200,  500)  * 0.05,
  };

  let score = Object.values(scores).reduce((a, b) => a + b, 0);

  const errorCount   = errors.filter(e => e.type === "error").length;
  const warningCount = errors.filter(e => e.type === "warning").length;
  score -= Math.min(errorCount   * 5, 20);
  score -= Math.min(warningCount * 2, 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}


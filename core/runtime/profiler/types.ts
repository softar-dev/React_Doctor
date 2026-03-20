export interface ReactProfilerData {
  rerenders: Record<string, number>;
  commitDurations: number[];
  renderTime: number;
}

export type DeviceType     = "desktop" | "mobile";
export type ThrottlePreset = "none" | "slow4g" | "3g";

/**
 * CPU throttle rate for Chrome's Emulation.setCPUThrottlingRate.
 * 1 = real hardware speed
 * 4 = 4x slowdown — matches Lighthouse mobile preset (mid-range Android)
 * 6 = 6x slowdown — low-end device simulation
 *
 * Works on localhost because it slows JS execution itself, not network.
 */
export type CpuThrottle = 1 | 4 | 6;

export interface ProfileOptions {
  // Single device or array to test both in one run
  device?: DeviceType | DeviceType[];
  throttle?: ThrottlePreset;
  // 1 = no throttle (default), 4 = Lighthouse mobile, 6 = low-end
  cpuThrottle?: CpuThrottle;
}

// ─────────────────────────────────────────────────────────────
// NETWORK PRESETS  (Chrome DevTools Protocol values)
// downloadThroughput and uploadThroughput are in bytes/sec
// ─────────────────────────────────────────────────────────────
export const NETWORK_PRESETS = {
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
export const DEVICE_PRESETS = {
  desktop: {
    viewport:  { width: 1280, height: 720 },
    userAgent: null,
    hasTouch:  false,
    isMobile:  false,
  },
  mobile: {
    viewport:  { width: 390, height: 844 },  // iPhone 12 Pro
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 " +
      "Mobile/15E148 Safari/604.1",
    hasTouch:  true,
    isMobile:  true,
  },
} as const;
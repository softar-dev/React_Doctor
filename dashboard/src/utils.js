// ─────────────────────────────────────────────────────────────
// js/utils.js — pure helper functions used across all pages
// ─────────────────────────────────────────────────────────────

// Escapes text before it's interpolated into an innerHTML template.
//
// WHY THIS EXISTS:
// Suggestion text (title/description/fix) can legitimately contain
// literal HTML-looking snippets — e.g. a rule's fix text saying
// "preload with <link rel='preload' as='image'>" or "render-blocking
// resources in <head>". When that string is dropped straight into an
// innerHTML template (see buildSuggestionCard in pages.js), the
// browser parses <link> and <head> as REAL markup instead of
// displaying them as text, so they silently disappear from the
// rendered page — the exact bug this fixes.
//
// Escaping also closes off the same code path as an XSS vector: even
// though suggestion text currently only comes from our own
// rules.json, any future rule (or dynamic message content) that
// echoes back scanned source, a component name, or a file path could
// otherwise inject arbitrary markup into the dashboard.
//
// Only escape values headed into innerHTML — DOM APIs that already
// use `.textContent` (see most of this codebase) don't need this,
// since textContent never parses its input as HTML.
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export function scoreColor(score) {
  if (score >= 90) return "var(--green)";
  if (score >= 75) return "var(--blue)";
  if (score >= 50) return "var(--orange)";
  return "var(--red)";
}

export function gradeBadgeClass(grade) {
  const g = grade ? grade[0] : 'N';
  if (g === "A") return "grade-a";
  if (g === "B") return "grade-b";
  if (g === "C") return "grade-c";
  if (g === "D") return "grade-d";
  return "grade-d";
}

export function severityIcon(severity) {
  return { critical: "🔴", warning: "🟠", info: "🔵" }[severity] || "⚪";
}

export function severityLabel(sev) {
  return `<span class="badge ${sev}">${severityIcon(sev)} ${sev}</span>`;
}

// Vital thresholds: [good_max, warn_max]  (above warn_max = bad)
const VITAL_THRESHOLDS = {
  lcp:  [2500,  4000],
  fcp:  [1800,  3000],
  ttfb: [800,   1800],
  inp:  [200,   500],
  cls:  [0.1,   0.25],
  render: [2000, 4000], // ← Added Render Time threshold
};

export function vitalClass(metric, value) {
  const [good, warn] = VITAL_THRESHOLDS[metric] || [Infinity, Infinity];
  if (value <= good) return "good";
  if (value <= warn) return "warn";
  return "bad";
}

export function vitalColor(metric, value) {
  const cls = vitalClass(metric, value);
  return cls === "good" ? "var(--green)" : cls === "warn" ? "var(--orange)" : "var(--red)";
}

// Percentage fill for the bar — capped to 100%
export function vitalBarPct(metric, value) {
  const limits = { 
    lcp: 5000, 
    fcp: 4000, 
    ttfb: 2500, 
    inp: 600, 
    cls: 0.35, 
    render: 6000  // ← Added Render Time limit
  };
  const max = limits[metric] || 100;
  return Math.min((value / max) * 100, 100).toFixed(1);
}

export function formatMs(ms) {
  if (ms === undefined || ms === null) return "–";
  if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
  return ms.toFixed(0) + "ms";
}

export function formatCls(v) {
  return typeof v === "number" ? v.toFixed(3) : "–";
}

export function formatDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    "  " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Build the SVG score ring with VISIBLE text ──────────────
export function buildScoreRing(score, size = 140, strokeWidth = 10) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score / 100, 0), 1);
  const color = scoreColor(score);

  // Map score to a color for the text
  let textColor;
  if (score >= 90) textColor = '#3FB950';      // green
  else if (score >= 75) textColor = '#58A6FF'; // blue
  else if (score >= 50) textColor = '#F0883E'; // orange
  else textColor = '#FF7B72';                   // red

  return `
    <div class="score-ring" style="width:${size}px;height:${size}px;position:relative;flex-shrink:0;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg);display:block;">
        <circle 
          cx="${c}" cy="${c}" r="${r}" 
          fill="none" 
          stroke="#1C2333" 
          stroke-width="${strokeWidth}" />
        <circle 
          cx="${c}" cy="${c}" r="${r}" 
          fill="none" 
          stroke="${textColor}" 
          stroke-width="${strokeWidth}" 
          stroke-linecap="round"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${circ * (1 - pct)}"
          style="transition: stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1);" />
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;width:100%;z-index:10;">
        <div style="font-size:2.4rem;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1;color:${textColor};text-shadow:0 0 20px rgba(0,0,0,0.5);">${Math.round(score)}</div>
        <div style="font-size:0.7rem;font-weight:600;color:#8B949E;margin-top:2px;">/ 100</div>
      </div>
    </div>
  `;
}

// Vital bar row HTML
export function buildVitalRow(label, metric, value) {
  const display = metric === "cls" ? formatCls(value) : formatMs(value);
  const color   = vitalColor(metric, value);
  const pct     = vitalBarPct(metric, value);
  return `
    <div class="vital-row">
      <div class="vital-row-head">
        <span class="vname">${label}</span>
        <span class="vval" style="color:${color}">${display}</span>
      </div>
      <div class="vital-track">
        <div class="vital-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
}

// Lightbox
export function openLightbox(src, caption) {
  const lb = document.getElementById("lightbox");
  const img = lb.querySelector("img");
  if (img) img.src = src;
  const cap = document.getElementById("lb-caption");
  if (cap) cap.textContent = caption || "";
  lb.classList.add("open");
}

export function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
}

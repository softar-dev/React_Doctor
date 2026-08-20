// ─────────────────────────────────────────────────────────────
// js/pages.js — Complete Fixed Version
// All pages fetch live data from the backend API
// ─────────────────────────────────────────────────────────────

import { Chart } from 'chart.js';
import api from './api.js';
import { REPORT_DATA, HISTORY_DATA } from './data.js';
import {
  scoreColor, gradeBadgeClass, severityIcon, severityLabel,
  vitalClass, vitalColor, vitalBarPct,
  formatMs, formatCls, formatDate, relativeTime,
  buildScoreRing, buildVitalRow,
  openLightbox, closeLightbox,
  escapeHtml,
} from './utils.js';

// ── Normalize API data to match expected structure ──────────
function normalizeReport(apiData) {
  if (apiData.static && apiData.runtime && apiData.suggestions) {
    return apiData;
  }
  
  const score = apiData.performanceScore || apiData.score || 0;
  
  return {
    projectName: apiData.project || apiData.projectName || 'Unknown',
    analyzedAt: apiData.analyzedAt || apiData.analyzed_at || new Date().toISOString(),
    performanceScore: score,
    score: score,
    overallScore: score,
    static: apiData.static || {
      issues: apiData.issues || [],
      grade: apiData.grade || 'N/A',
      componentCount: apiData.componentCount || 0,
      filesAnalyzed: apiData.filesAnalyzed || 0,
    },
    runtime: apiData.runtime || {},
    suggestions: apiData.suggestions || [],
  };
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW PAGE
// ══════════════════════════════════════════════════════════════
let overviewDone = false;
let cachedReport = null;

export async function initOverview() {
  if (overviewDone) return;
  overviewDone = true;

  let R;
  try {
    const rawData = await api.getLatestReport();
    R = normalizeReport(rawData);
    cachedReport = R;
    console.log('📊 Overview loaded:', R);
  } catch (err) {
    console.warn('⚠️ Using static fallback:', err.message);
    R = REPORT_DATA;
  }

  const st = R.static || { issues: [], grade: 'N/A' };
  const el = id => document.getElementById(id);

  const score = R.performanceScore || R.score || R.overallScore || 0;

  const scoreRingEl = el("ov-score-ring");
  if (scoreRingEl) {
    scoreRingEl.innerHTML = buildScoreRing(score, 148, 11);
  }

  const grade = st.grade || 'N/A';
  const gc = gradeBadgeClass(grade);
  const gradeEl = el("ov-grade");
  if (gradeEl) {
    gradeEl.innerHTML = `<span class="badge ${gc}">${grade}</span>`;
  }

  const issues = st.issues || [];
  const suggestions = R.suggestions || [];
  const critical = suggestions.filter(s => s.severity === "critical").length;
  const warning = suggestions.filter(s => s.severity === "warning").length;
  const summaryEl = el("ov-summary");
  if (summaryEl) {
    summaryEl.textContent =
      `Score: ${score}/100 · ` +
      `Analyzed ${st.filesAnalyzed || 0} files · ${st.componentCount || 0} components · ` +
      `${critical} critical issue${critical !== 1 ? "s" : ""} · ${warning} warnings`;
  }

  const projectEl = el("ov-project");
  if (projectEl) {
    projectEl.textContent = R.projectName || R.project || 'Unknown';
  }
  
  const analyzedEl = el("ov-analyzed");
  if (analyzedEl) {
    analyzedEl.textContent = formatDate(R.analyzedAt || R.analyzed_at);
  }

  const runtime = R.runtime || {};
  const routes = Object.values(runtime);
  const avgLcp = routes.length ? routes.reduce((s, r) => s + (r.metrics?.lcp || 0), 0) / routes.length : 0;
  const avgFcp = routes.length ? routes.reduce((s, r) => s + (r.metrics?.fcp || 0), 0) / routes.length : 0;
  const avgCls = routes.length ? routes.reduce((s, r) => s + (r.metrics?.cls || 0), 0) / routes.length : 0;
  const totalIssues = issues.length;

  function tile(elId, metricKey, value, display) {
    const cls = metricKey === "none" ? "blue" : vitalClass(metricKey, value);
    const el2 = document.getElementById(elId);
    if (!el2) return;
    el2.className = `stat-tile ${cls}`;
    const valEl = el2.querySelector(".stat-value");
    if (valEl) {
      valEl.className = `stat-value ${cls === "good" ? "good" : cls === "warn" ? "warn" : cls === "bad" ? "bad" : "blue"}`;
      valEl.textContent = display;
    }
  }
  
  tile("tile-lcp", "lcp", avgLcp, formatMs(avgLcp));
  tile("tile-fcp", "fcp", avgFcp, formatMs(avgFcp));
  tile("tile-cls", "cls", avgCls, formatCls(avgCls));
  tile("tile-issues", "none", 0, totalIssues);

  const issuesTile = document.getElementById("tile-issues");
  if (issuesTile) {
    const issCls = critical > 0 ? "bad" : warning > 0 ? "warn" : "good";
    issuesTile.className = `stat-tile ${issCls}`;
    const valEl = issuesTile.querySelector(".stat-value");
    if (valEl) valEl.className = `stat-value ${issCls}`;
  }

  const sugWrap = el("ov-suggestions");
  if (sugWrap) {
    const topSuggestions = suggestions.slice(0, 3);
    sugWrap.innerHTML = topSuggestions.length ? 
      topSuggestions.map(buildSuggestionCard).join("") :
      '<div style="color:var(--text3);padding:12px;text-align:center;">No suggestions available</div>';
  }

  const routeWrap = el("ov-routes");
  if (routeWrap) {
    const entries = Object.entries(runtime);
    if (entries.length === 0) {
      routeWrap.innerHTML = `<div style="color:var(--text3);padding:12px;text-align:center;">No runtime data available</div>`;
    } else {
      const rows = entries.map(([key, r]) => {
        const [path, dev] = key.split("::");
        const sc = r.performanceScore || 0;
        const clr = scoreColor(sc);
        const metrics = r.metrics || {};
        const errors = r.errors || [];
        return `<tr>
          <td class="mono">${path || '/'}</td>
          <td><span class="badge info">${dev || 'desktop'}</span></td>
          <td class="score-cell" style="color:${clr}">${sc}</td>
          <td>${formatMs(metrics.lcp || 0)}</td>
          <td>${formatMs(metrics.fcp || 0)}</td>
          <td><span class="badge ${vitalClass("cls", metrics.cls || 0)}">${formatCls(metrics.cls || 0)}</span></td>
          <td>${errors.length > 0 ? `<span class="badge critical">${errors.length}</span>` : '<span class="badge good">0</span>'}</td>
        </tr>`;
      }).join("");
      routeWrap.innerHTML = `
        <table class="rd-table">
          <thead><tr>
            <th>Route</th><th>Device</th><th>Score</th>
            <th>LCP</th><th>FCP</th><th>CLS</th><th>Errors</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    }
  }
}

// ══════════════════════════════════════════════════════════════
// VITALS PAGE
// ══════════════════════════════════════════════════════════════
let vitalsDone = false;
let vitalsReport = null;

export async function initVitals() {
  if (vitalsDone) return;
  vitalsDone = true;

  let R;
  try {
    const rawData = await api.getLatestReport();
    R = normalizeReport(rawData);
    vitalsReport = R;
    console.log('📊 Vitals loaded:', R);
  } catch (err) {
    console.warn('⚠️ Using static fallback for vitals:', err.message);
    R = REPORT_DATA;
    vitalsReport = R;
  }

  const runtime = R.runtime || {};
  const routes = Object.entries(runtime);
  if (routes.length === 0) {
    const tabsEl = document.getElementById("vitals-tabs");
    if (tabsEl) {
      tabsEl.innerHTML = `<div style="color:var(--text3);padding:12px;">No runtime data available</div>`;
    }
    return;
  }

  const routeKeys = routes.map(([k]) => k);
  let activeRoute = routeKeys[0];

  const tabsEl = document.getElementById("vitals-tabs");
  if (tabsEl) {
    tabsEl.innerHTML = routeKeys.map((k, i) => {
      const [path, dev] = k.split("::");
      return `<button class="route-tab${i === 0 ? " active" : ""}" data-key="${k}">${path || '/'} <span style="opacity:.6">[${dev || 'desktop'}]</span></button>`;
    }).join("");

    tabsEl.querySelectorAll(".route-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        tabsEl.querySelectorAll(".route-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeRoute = btn.dataset.key;
        renderVitalsRoute(activeRoute);
      });
    });
  }

  renderVitalsChart(routes);
  renderVitalsRoute(activeRoute);
}

function renderVitalsChart(routes) {
  const ctx = document.getElementById("vitals-chart");
  if (!ctx) return;

  const labels = routes.map(([k]) => {
    const [path, dev] = k.split("::");
    return path || '/';
  });
  const metrics = ["lcp", "fcp", "ttfb"];
  const colors = ["#C778DD", "#00FFC2", "#58A6FF"];
  const names = ["LCP (ms)", "FCP (ms)", "TTFB (ms)"];

  if (ctx._chart) ctx._chart.destroy();
  ctx._chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: metrics.map((m, i) => ({
        label: names[i],
        data: routes.map(([, r]) => r.metrics?.[m] || 0),
        backgroundColor: colors[i] + "33",
        borderColor: colors[i],
        borderWidth: 1.5,
        borderRadius: 4,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#8B949E", font: { family: "Inter", size: 11 } } }
      },
      scales: {
        x: { ticks: { color: "#6E7681", font: { size: 10 } }, grid: { color: "#21262D" } },
        y: { ticks: { color: "#6E7681" }, grid: { color: "#21262D" } }
      }
    }
  });
}

function renderVitalsRoute(key) {
  const R = vitalsReport || REPORT_DATA;
  const runtime = R.runtime || {};
  const r = runtime[key];
  if (!r) {
    const barsEl = document.getElementById("vitals-bars");
    if (barsEl) {
      barsEl.innerHTML = `<div style="color:var(--text3);padding:12px;">No data for this route</div>`;
    }
    return;
  }

  const m = r.metrics || {};

  // ── Bars with Render Time added ──────────────────────────
  const barsEl = document.getElementById("vitals-bars");
  if (barsEl) {
    barsEl.innerHTML = [
      buildVitalRow("Largest Contentful Paint (LCP)", "lcp", m.lcp || 0),
      buildVitalRow("First Contentful Paint (FCP)", "fcp", m.fcp || 0),
      buildVitalRow("Time to First Byte (TTFB)", "ttfb", m.ttfb || 0),
      buildVitalRow("Interaction to Next Paint (INP)", "inp", m.inp || 0),
      buildVitalRow("Cumulative Layout Shift (CLS)", "cls", m.cls || 0),
      buildVitalRow("Render Time (Total)", "render", r.renderTime || 0),
    ].join("");
  }

  // ── Meta section with Render Time highlighted ────────────
  const stats = r.stats || {};
  const metaEl = document.getElementById("vitals-meta");
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="badge info">${r.deviceType || 'desktop'}</span>
      <span style="color:var(--text3);font-size:.75rem">CPU ×${r.cpuThrottling || 1}</span>
      <span style="color:var(--text3);font-size:.75rem">${r.networkThrottle || 'No throttle'}</span>
      <span style="color:var(--teal);font-size:.75rem;font-weight:bold">⏱ Render ${formatMs(r.renderTime || 0)}</span>
      <span style="color:var(--text3);font-size:.75rem">${stats.domNodes || 0} DOM nodes</span>
      <span style="color:var(--text3);font-size:.75rem">${stats.jsHeapMB || '—'} MB heap</span>`;
  }

  const sc = r.performanceScore || 0;
  const clr = scoreColor(sc);
  const scoreEl = document.getElementById("vitals-score");
  if (scoreEl) {
    scoreEl.innerHTML =
      `<span style="font-family:'JetBrains Mono',monospace;font-size:1.6rem;font-weight:700;color:${clr}">${sc}</span>
       <span style="color:var(--text3);font-size:.78rem">/ 100</span>`;
  }

  const rerenders = Object.entries(r.rerenders || {}).sort((a, b) => b[1] - a[1]);
  const rerendersEl = document.getElementById("vitals-rerenders");
  if (rerendersEl) {
    rerendersEl.innerHTML = rerenders.length === 0
      ? `<div style="color:var(--text3);padding:8px 0">No re-render data available</div>`
      : `
      <table class="rd-table">
        <thead><tr><th>Component</th><th>Re-renders</th></tr></thead>
        <tbody>${rerenders.map(([name, count]) => `
          <tr>
            <td class="mono">${name}</td>
            <td><span style="color:${count > 10 ? "var(--red)" : count > 5 ? "var(--orange)" : "var(--green)"};font-family:'JetBrains Mono',monospace;font-weight:600">${count}</span></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  const errors = r.errors || [];
  const errorsEl = document.getElementById("vitals-errors");
  if (errorsEl) {
    errorsEl.innerHTML = errors.length === 0
      ? `<div style="color:var(--text3);font-size:.82rem;padding:8px 0">✅ No JS errors or React warnings captured</div>`
      : errors.map(e => `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
            <span class="badge ${e.type === "error" ? "critical" : "warning"}">${e.type || 'warning'}</span>
            <span style="font-size:.78rem;font-family:'JetBrains Mono',monospace;color:var(--text2);word-break:break-word">${e.message}</span>
          </div>`).join("");
  }

  // ── Screenshots ──────────────────────────────────────────
  renderFilmstrip("vitals-filmstrip", r.screenshots || [], key);
}

// ══════════════════════════════════════════════════════════════
// ISSUES PAGE
// ══════════════════════════════════════════════════════════════
const ISSUES_PER_PAGE = 8;
let issuesFilter = "all";
let issuesPage = 1;
let issuesDone = false;
let issuesData = [];

export async function initIssues() {
  if (issuesDone) return;
  issuesDone = true;

  try {
    const rawData = await api.getLatestReport();
    const R = normalizeReport(rawData);
    issuesData = R.static?.issues || [];
    console.log('📊 Issues loaded:', issuesData.length);
  } catch (err) {
    console.warn('⚠️ Using static fallback for issues:', err.message);
    issuesData = REPORT_DATA.static?.issues || [];
  }

  const btns = document.querySelectorAll("#issues-filters .filter-btn");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      issuesFilter = btn.dataset.filter;
      issuesPage = 1;
      renderIssues();
    });
  });

  renderIssues();
}

function renderIssues() {
  const all = issuesData;
  const filtered = issuesFilter === "all"
    ? all
    : all.filter(i => i.severity === issuesFilter);

  const totalPages = Math.ceil(filtered.length / ISSUES_PER_PAGE) || 1;
  const page = filtered.slice((issuesPage - 1) * ISSUES_PER_PAGE, issuesPage * ISSUES_PER_PAGE);

  const wrap = document.getElementById("issues-table");
  if (!wrap) return;
  
  if (all.length === 0) {
    wrap.innerHTML = `<div style="color:var(--text3);padding:12px;text-align:center;">No issues found</div>`;
  } else {
    wrap.innerHTML = `
      <table class="rd-table">
        <thead><tr>
          <th>Severity</th>
          <th>Component</th>
          <th>File</th>
          <th>Line</th>
          <th>Issue</th>
          <th>Fix</th>
        </tr></thead>
        <tbody>${page.map(issue => `
          <tr>
            <td>${severityLabel(issue.severity)}</td>
            <td class="mono">${issue.component || '—'}</td>
            <td class="file">${issue.file || '—'}</td>
            <td class="mono" style="color:var(--text3)">${issue.line || '—'}</td>
            <td style="color:var(--text);font-size:.8rem">${issue.message}</td>
            <td style="font-size:.76rem;color:var(--text2)">${issue.suggestion || '—'}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  const counts = { all: all.length };
  ["critical", "warning", "info"].forEach(s => counts[s] = all.filter(i => i.severity === s).length);
  document.querySelectorAll("#issues-filters .filter-btn").forEach(btn => {
    const f = btn.dataset.filter;
    let badge = btn.querySelector(".nav-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "nav-badge";
      btn.appendChild(badge);
    }
    badge.textContent = counts[f] || 0;
  });

  renderPagination("issues-pagination", issuesPage, totalPages, p => {
    issuesPage = p;
    renderIssues();
  });
}

// ══════════════════════════════════════════════════════════════
// SUGGESTIONS PAGE
// ══════════════════════════════════════════════════════════════
let sugFilter = "all";
let sugPage = 1;
let sugDone = false;
const SUGS_PER_PAGE = 5;
let suggestionsData = [];

export async function initSuggestions() {
  if (sugDone) return;
  sugDone = true;

  try {
    const rawData = await api.getLatestReport();
    const R = normalizeReport(rawData);
    suggestionsData = R.suggestions || [];
    console.log('📊 Suggestions loaded:', suggestionsData.length);
  } catch (err) {
    console.warn('⚠️ Using static fallback for suggestions:', err.message);
    suggestionsData = REPORT_DATA.suggestions || [];
  }

  document.querySelectorAll("#sug-filters .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#sug-filters .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      sugFilter = btn.dataset.filter;
      sugPage = 1;
      renderSuggestions();
    });
  });

  renderSuggestions();
}

function renderSuggestions() {
  const all = suggestionsData;
  const filtered = sugFilter === "all" ? all : all.filter(s => s.severity === sugFilter);
  const totalPages = Math.ceil(filtered.length / SUGS_PER_PAGE) || 1;
  const page = filtered.slice((sugPage - 1) * SUGS_PER_PAGE, sugPage * SUGS_PER_PAGE);

  const listEl = document.getElementById("sug-list");
  if (!listEl) return;
  
  if (all.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text3);padding:12px;text-align:center;">No suggestions available</div>`;
  } else {
    listEl.innerHTML = page.map(buildSuggestionCard).join("");
  }

  renderPagination("sug-pagination", sugPage, totalPages, p => { 
    sugPage = p;
    renderSuggestions(); 
  });

  const counts = {};
  ["critical", "warning", "info"].forEach(s => counts[s] = all.filter(x => x.severity === s).length);
  const countsEl = document.getElementById("sug-counts");
  if (countsEl) {
    countsEl.innerHTML =
      `<span class="badge critical">🔴 ${counts.critical || 0} critical</span>
       <span class="badge warning">🟠 ${counts.warning || 0} warnings</span>
       <span class="badge info">🔵 ${counts.info || 0} info</span>`;
  }
}

// ══════════════════════════════════════════════════════════════
// HISTORY PAGE
// ══════════════════════════════════════════════════════════════
const HIST_PER_PAGE = 6;
let histPage = 1;
let histDone = false;
let historyData = [];

export async function initHistory() {
  if (histDone) return;
  histDone = true;

  try {
    const result = await api.listReports();
    historyData = result.reports || [];
    console.log('📊 History loaded:', historyData.length);
  } catch (err) {
    console.warn('⚠️ Using static fallback for history:', err.message);
    historyData = HISTORY_DATA;
  }

  renderHistory();
  renderHistoryChart();
}

function renderHistory() {
  const total = Math.ceil(historyData.length / HIST_PER_PAGE) || 1;
  const page = historyData.slice((histPage - 1) * HIST_PER_PAGE, histPage * HIST_PER_PAGE);

  const tableEl = document.getElementById("hist-table");
  if (!tableEl) return;
  
  if (historyData.length === 0) {
    tableEl.innerHTML = `<div style="color:var(--text3);padding:12px;text-align:center;">No history available</div>`;
  } else {
    tableEl.innerHTML = `
      <table class="rd-table">
        <thead><tr>
          <th>#</th><th>Project</th><th>Score</th><th>Grade</th>
          <th>Analyzed</th><th>Saved</th>
        </tr></thead>
        <tbody>${page.map(r => {
          const clr = scoreColor(r.score);
          const gc = gradeBadgeClass(r.grade);
          return `<tr style="cursor:pointer" onclick="alert('Open report #${r.id}')">
            <td class="mono" style="color:var(--text3)">${r.id}</td>
            <td><span class="mono">${r.project}</span></td>
            <td class="score-cell" style="color:${clr}">${r.score}</td>
            <td><span class="badge ${gc}">${r.grade}</span></td>
            <td style="font-size:.78rem">${formatDate(r.analyzed_at)}</td>
            <td style="font-size:.75rem;color:var(--text3)">${relativeTime(r.created_at)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  }

  renderPagination("hist-pagination", histPage, total, p => { 
    histPage = p;
    renderHistory(); 
  });
}

function renderHistoryChart() {
  const ctx = document.getElementById("hist-chart");
  if (!ctx) return;

  if (historyData.length === 0) {
    return;
  }

  const projectName = historyData[0]?.project || "Unknown Project";
  const titleEl = document.querySelector('#page-history .card:first-child .card-title');
  if (titleEl) {
    titleEl.textContent = `Score Trend — ${projectName}`;
  }

  const trend = historyData
    .filter(r => r.project === projectName)
    .reverse();

  if (trend.length === 0) return;

  if (ctx._chart) ctx._chart.destroy();
  ctx._chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: trend.map(r => formatDate(r.analyzed_at).split("  ")[0]),
      datasets: [{
        label: "Performance Score",
        data: trend.map(r => r.score),
        borderColor: "#C778DD",
        backgroundColor: "rgba(199,120,221,0.08)",
        borderWidth: 2,
        pointBackgroundColor: "#C778DD",
        pointRadius: 4,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          labels: { color: "#8B949E", font: { size: 11 } } 
        } 
      },
      scales: {
        x: { 
          ticks: { color: "#6E7681", font: { size: 10 } }, 
          grid: { color: "#21262D" } 
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#6E7681" },
          grid: { color: "#21262D" }
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════

function buildSuggestionCard(s) {
  const icon = { critical: "🔴", warning: "🟠", info: "🔵" }[s.severity] || "⚪";
  return `
    <div class="suggestion-card">
      <div class="sug-icon ${s.severity}">${icon}</div>
      <div class="sug-body">
        <div class="sug-title">
          ${escapeHtml(s.title) || 'Untitled suggestion'}
          <span class="badge ${s.severity}">${s.severity}</span>
        </div>
        <div class="sug-desc">${escapeHtml(s.description) || 'No description'}</div>
        <div class="sug-fix">${escapeHtml(s.fix) || 'No fix provided'}</div>
        ${s.affectedComponent ? `<div class="sug-component">${escapeHtml(s.affectedComponent)}</div>` : ""}
      </div>
    </div>`;
}

// ── FIXED: Screenshots rendering with deduplication ──────────
function renderFilmstrip(elId, screenshots, routeKey) {
  const el = document.getElementById(elId);
  if (!el) return;
  
  // Clear the element
  el.innerHTML = "";
  
  // Check if we have screenshots
  if (!screenshots || screenshots.length === 0) {
    el.innerHTML = `<div class="film-placeholder"><span>📸 No screenshots<br>captured</span></div>`;
    return;
  }

  // ── Filter out invalid screenshots ──────────────────────
  const validScreenshots = screenshots.filter(s => {
    if (!s.dataUrl) return false;
    // Skip placeholder/pending screenshots
    if (s.dataUrl.startsWith('__PENDING__')) return false;
    if (s.dataUrl === 'null' || s.dataUrl === 'undefined') return false;
    return true;
  });

  // ── Deduplicate by label (keep only one of each label) ──
  const seenLabels = new Set();
  const uniqueScreenshots = validScreenshots.filter(s => {
    const label = s.label || 'screenshot';
    if (seenLabels.has(label)) return false;
    seenLabels.add(label);
    return true;
  });

  if (uniqueScreenshots.length === 0) {
    el.innerHTML = `<div class="film-placeholder"><span>📸 No valid screenshots<br>available</span></div>`;
    return;
  }

  // ── Render each unique screenshot ──────────────────────
  uniqueScreenshots.forEach((s, index) => {
    const frame = document.createElement("div");
    frame.className = "film-frame";

    const img = document.createElement("img");
    img.className = "film-img";
    
    const label = s.label || `screenshot-${index}`;
    const time = s.takenAt || 0;
    
    // ── Handle different dataUrl formats ──────────────────
    if (s.dataUrl && s.dataUrl.startsWith('data:image')) {
      // It's a base64 image - use it directly
      img.src = s.dataUrl;
      img.alt = `${label} screenshot`;
    } else if (s.dataUrl && s.dataUrl.startsWith('http')) {
      // It's a URL - use it
      img.src = s.dataUrl;
      img.alt = `${label} screenshot`;
    } else if (s.dataUrl && s.dataUrl.startsWith('/screenshots/')) {
      // It's a local path - use it directly
      img.src = s.dataUrl;
      img.alt = `${label} screenshot`;
    } else {
      // No valid image - show placeholder with correct time
      const placeholderText = `${label} ${formatMs(time)}`;
      img.src = `https://placehold.co/420x256/1C2333/8B949E?text=${encodeURIComponent(placeholderText)}`;
      img.alt = `${label} (placeholder)`;
    }
    
    img.addEventListener("click", () => {
      if (s.dataUrl && (s.dataUrl.startsWith('data:image') || s.dataUrl.startsWith('http') || s.dataUrl.startsWith('/screenshots/'))) {
        const fullSrc = s.dataUrl.startsWith('/screenshots/') 
          ? window.location.origin + s.dataUrl 
          : s.dataUrl;
        openLightbox(fullSrc, `${routeKey} — ${label} @ ${formatMs(time)}`);
      } else {
        alert(`📸 ${label}\n⏱ Taken at: ${formatMs(time)}\n\n(Image not available)`);
      }
    });

    const labelEl = document.createElement("div");
    labelEl.className = "film-label";
    labelEl.textContent = label;

    const timeEl = document.createElement("div");
    timeEl.className = "film-time";
    timeEl.textContent = formatMs(time);

    frame.append(img, labelEl, timeEl);
    el.appendChild(frame);
  });
}

function renderPagination(elId, current, total, onClick) {
  const el = document.getElementById(elId);
  if (!el || total <= 1) {
    if (el) el.innerHTML = "";
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "pagination";

  function makeBtn(label, page, disabled, active) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (active ? " active" : "");
    btn.textContent = label;
    if (disabled) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => onClick(page));
    }
    return btn;
  }

  wrap.appendChild(makeBtn("Prev", current - 1, current === 1, false));

  for (let p = 1; p <= total; p++) {
    if (total > 7 && Math.abs(p - current) > 2 && p !== 1 && p !== total) {
      if (p === 2 || p === total - 1) {
        const dots = document.createElement("span");
        dots.className = "page-info";
        dots.textContent = "…";
        wrap.appendChild(dots);
      }
      continue;
    }
    wrap.appendChild(makeBtn(String(p), p, false, p === current));
  }

  wrap.appendChild(makeBtn("Next", current + 1, current === total, false));

  const info = document.createElement("span");
  info.className = "page-info";
  info.textContent = `${current} / ${total}`;
  wrap.appendChild(info);

  el.innerHTML = "";
  el.appendChild(wrap);
}

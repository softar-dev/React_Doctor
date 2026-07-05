import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// Fonts
import '@fontsource/tajawal/300.css';
import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import './css/main.css';
import { REPORT_DATA, HISTORY_DATA } from './data.js';
import api from './api.js';
import { initRouter } from './router.js';
import { formatDate } from './utils.js';

// ── Update sidebar with live data ────────────────────────────
async function updateSidebar() {
  try {
    const report = await api.getLatestReport();
    document.getElementById('nav-score').textContent = report.performanceScore;
    document.getElementById('nav-issues-count').textContent = report.static.issues.length;
    document.getElementById('nav-sug-count').textContent = report.suggestions.length;
    document.getElementById('sidebar-project').textContent = report.project;
    document.getElementById('sidebar-date').textContent = formatDate(report.analyzedAt);
    
    // Also update history count
    const { reports } = await api.listReports();
    document.getElementById('nav-hist-count').textContent = reports.length;
  } catch (err) {
    console.warn('⚠️ Using static fallback data for sidebar:', err.message);
    // Fallback to static data
    document.getElementById('nav-score').textContent = REPORT_DATA.performanceScore;
    document.getElementById('nav-issues-count').textContent = REPORT_DATA.static.issues.length;
    document.getElementById('nav-sug-count').textContent = REPORT_DATA.suggestions.length;
    document.getElementById('nav-hist-count').textContent = HISTORY_DATA.length;
    document.getElementById('sidebar-project').textContent = REPORT_DATA.projectName;
    document.getElementById('sidebar-date').textContent = formatDate(REPORT_DATA.analyzedAt);
  }
}

// ── Clock ─────────────────────────────────────────────────────
function tick() {
  document.getElementById('topbar-time').textContent = new Date().toLocaleTimeString('en-GB');
}
tick();
setInterval(tick, 1000);

// ── Init ─────────────────────────────────────────────────────
updateSidebar().then(() => {
  initRouter();
});
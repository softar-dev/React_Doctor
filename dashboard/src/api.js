// ─────────────────────────────────────────────────────────────
// js/api.js — API client for the React Doctor backend
// ─────────────────────────────────────────────────────────────

const api = (() => {

  const BASE_URL = "http://localhost:3000";
  const API_KEY = "react-doctor-secret-key-change-this";

  async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const defaultHeaders = { "Content-Type": "application/json" };

    const res = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    });

    if (!res.ok) {
      let errBody = null;
      try { errBody = await res.json(); } catch {}
      const msg = errBody?.error || errBody?.message || res.statusText;
      throw new Error(`API ${res.status}: ${msg}`);
    }

    return res.json();
  }

  async function healthCheck() {
    return request("/health");
  }

  async function listReports() {
    return request("/api/reports");
  }

  // ── Get a single report with screenshots ──────────────────
  async function getReport(id) {
    // Fetch the main report
    const data = await request(`/api/reports/${id}`);
    
    // Fetch screenshots for this report
    try {
      const screenshotData = await request(`/api/reports/${id}/screenshots`);
      if (screenshotData && screenshotData.screenshots && screenshotData.screenshots.length > 0) {
        // Group screenshots by route
        const screenshotsByRoute = {};
        for (const screenshot of screenshotData.screenshots) {
          const route = screenshot.route || '';
          if (!screenshotsByRoute[route]) {
            screenshotsByRoute[route] = [];
          }
          screenshotsByRoute[route].push({
            label: screenshot.label,
            takenAt: screenshot.taken_at || screenshot.takenAt,
            dataUrl: screenshot.data_url || screenshot.dataUrl,
          });
        }
        
        // Replace existing screenshots with the ones from the API
        for (const [route, screenshots] of Object.entries(screenshotsByRoute)) {
          if (data.runtime && data.runtime[route]) {
            data.runtime[route].screenshots = screenshots;
          }
        }
        console.log(`📸 Loaded ${screenshotData.screenshots.length} screenshots from API`);
      }
    } catch (err) {
      console.warn('No screenshots found for this report');
    }
    
    return data;
  }

  async function getReportsByProject(projectName) {
    return request(`/api/reports/project/${encodeURIComponent(projectName)}`);
  }

  async function uploadReport(finalReport) {
    return request("/api/reports/upload", {
      method: "POST",
      headers: { "x-api-key": API_KEY },
      body: JSON.stringify(finalReport),
    });
  }

  async function getLatestReport() {
    const { reports } = await listReports();
    if (!reports || reports.length === 0) {
      throw new Error("No reports found in the database");
    }
    return getReport(reports[0].id);
  }

  return {
    healthCheck,
    listReports,
    getReport,
    getReportsByProject,
    uploadReport,
    getLatestReport,
    BASE_URL,
  };

})();

export default api;
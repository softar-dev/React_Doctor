// ─────────────────────────────────────────────────────────────
// js/router.js — hash-based SPA router
// Maps #hash → page element + init function
// ─────────────────────────────────────────────────────────────

import { initOverview, initVitals, initIssues, initSuggestions, initHistory } from './pages.js';
import { closeLightbox } from './utils.js';

const ROUTES = {
  "overview":    { id: "page-overview",    init: initOverview    },
  "vitals":      { id: "page-vitals",      init: initVitals      },
  "issues":      { id: "page-issues",      init: initIssues      },
  "suggestions": { id: "page-suggestions", init: initSuggestions },
  "history":     { id: "page-history",     init: initHistory     },
};

let currentRoute = null;

async function navigate(hash) {
  const route = ROUTES[hash] || ROUTES["overview"];
  if (currentRoute === hash) return;
  currentRoute = hash;

  // Hide all pages
  document.querySelectorAll(".page-content").forEach(el => el.classList.remove("active"));
  // Show target
  const page = document.getElementById(route.id);
  if (page) page.classList.add("active");

  // Update nav
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.route === hash);
  });

  // Update topbar
  const titles = {
    overview:    ["Overview",    "Performance summary"],
    vitals:      ["Web Vitals",  "Core Web Vitals per route & device"],
    issues:      ["Code Issues", "Static analysis results"],
    suggestions: ["Suggestions", "Rule engine recommendations"],
    history:     ["History",     "Previous analysis runs"],
  };
  const [title, sub] = titles[hash] || titles.overview;
  document.getElementById("topbar-title").textContent = title;
  document.getElementById("topbar-sub").textContent   = sub;

  // Run page init (await it!)
  try {
    await route.init();
  } catch (err) {
    console.error('Error initializing page:', err);
  }
}

export function initRouter() {
  // Nav clicks
  document.querySelectorAll(".nav-item[data-route]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.hash = btn.dataset.route;
    });
  });

  // Hash change
  window.addEventListener("hashchange", () => {
    navigate(location.hash.replace("#", "") || "overview");
  });

  // Lightbox close
  document.getElementById("lightbox").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeLightbox();
  });
  document.getElementById("lb-close").addEventListener("click", closeLightbox);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });

  // Initial route
  navigate(location.hash.replace("#", "") || "overview");
}
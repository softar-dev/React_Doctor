// ─────────────────────────────────────────────────────────────
// js/data.js  — static mock data (mirrors a real finalreport.json)
// When you wire up the backend, replace REPORT_DATA with the
// response from GET /api/reports/:id and HISTORY_DATA from GET /api/reports
// ─────────────────────────────────────────────────────────────

export const REPORT_DATA = {
  projectName: "my-react-app",
  analyzedAt: "2025-03-29T09:24:25.438Z",
  performanceScore: 62,

  static: {
    timestamp: "2025-03-29T09:24:20.000Z",
    grade: "C",
    componentCount: 14,
    filesAnalyzed: 14,
    filesFailed: 0,
    issues: [
      { id: "console-log-1",    component: "App",           file: "src/App.jsx",               line: 12,  severity: "warning",  message: "console.log() left in production code",                        suggestion: "Remove or replace with a proper logging library" },
      { id: "console-log-2",    component: "UserList",       file: "src/components/UserList.jsx", line: 8,  severity: "warning",  message: "console.log() left in production code",                        suggestion: "Remove or replace with a proper logging library" },
      { id: "large-comp-1",     component: "Dashboard",      file: "src/pages/Dashboard.jsx",    line: 1,  severity: "critical", message: "Component is 487 lines — too large to maintain or optimize",   suggestion: "Split into smaller focused components" },
      { id: "inline-fn-1",      component: "UserCard",       file: "src/components/UserCard.jsx", line: 34, severity: "warning",  message: "Inline arrow function passed as prop causes re-renders",        suggestion: "Extract to a named callback with useCallback" },
      { id: "inline-fn-2",      component: "FilterBar",      file: "src/components/FilterBar.jsx",line: 22, severity: "warning",  message: "Inline arrow function passed as prop causes re-renders",        suggestion: "Extract to a named callback with useCallback" },
      { id: "inline-style-1",   component: "Header",         file: "src/components/Header.jsx",  line: 18, severity: "info",     message: "Inline style object recreated on every render",                 suggestion: "Move to a CSS class or useMemo" },
      { id: "missing-key-1",    component: "UserList",       file: "src/components/UserList.jsx", line: 41, severity: "critical", message: "List items rendered without unique key prop",                   suggestion: "Add a stable unique key prop to each list element" },
      { id: "missing-memo-1",   component: "UserCard",       file: "src/components/UserCard.jsx", line: 1,  severity: "warning",  message: "Component re-renders on every parent update (not memoized)",   suggestion: "Wrap with React.memo() to prevent unnecessary re-renders" },
      { id: "missing-memo-2",   component: "Sidebar",        file: "src/components/Sidebar.jsx",  line: 1,  severity: "warning",  message: "Component re-renders on every parent update (not memoized)",   suggestion: "Wrap with React.memo() to prevent unnecessary re-renders" },
      { id: "effect-loop-1",    component: "DataFetcher",    file: "src/components/DataFetcher.jsx",line:19, severity: "critical", message: "useEffect dependency array contains an object — causes infinite loop", suggestion: "Wrap the object in useMemo or extract primitive deps" },
      { id: "dead-code-1",      component: "OldWidget",      file: "src/components/OldWidget.jsx", line: 1, severity: "info",     message: "Component is defined but never imported",                       suggestion: "Delete the file or add it to the component tree" },
      { id: "prop-drilling-1",  component: "App",            file: "src/App.jsx",               line: 44, severity: "info",     message: "Prop 'userId' passed through 4 component levels",               suggestion: "Move to React Context or a state manager like Zustand" },
    ]
  },

  runtime: {
    "/::desktop": {
      url: "http://localhost:5173/",
      deviceType: "desktop",
      timestamp: "2025-03-29T09:24:22.000Z",
      performanceScore: 71,
      cpuThrottling: 1,
      networkThrottle: "No throttle",
      metrics: { lcp: 2180, fcp: 820, cls: 0.04, inp: 95, ttfb: 310 },
      rerenders: { App: 3, Dashboard: 8, UserCard: 22, Sidebar: 3, Header: 2 },
      commitDurations: [12.4, 8.2, 34.1, 6.8, 15.3, 9.1, 42.7],
      renderTime: 1240,
      stats: { domNodes: 1420, jsHeapMB: "38.4", payloadMB: "2.1", topOffender: { name: "lodash.js", size: 68400 } },
      errors: [
        { type: "warning", message: "Each child in a list should have a unique 'key' prop.", source: "console" }
      ],
      screenshots: [
        { label: "fcp",      dataUrl: "/screenshots/1-desktop-fcp.png",      takenAt: 820  },
        { label: "fullLoad", dataUrl: "/screenshots/1-desktop-fullLoad.png",  takenAt: 2800 }
      ]
    },
    "/::mobile": {
      url: "http://localhost:5173/",
      deviceType: "mobile",
      timestamp: "2025-03-29T09:24:23.500Z",
      performanceScore: 53,
      cpuThrottling: 4,
      networkThrottle: "Slow 3G",
      metrics: { lcp: 4150, fcp: 1620, cls: 0.09, inp: 245, ttfb: 680 },
      rerenders: { App: 3, Dashboard: 8, UserCard: 22, Sidebar: 3, Header: 2 },
      commitDurations: [22.1, 18.4, 67.3, 14.5, 28.7],
      renderTime: 2180,
      stats: { domNodes: 1420, jsHeapMB: "38.4", payloadMB: "2.1", topOffender: { name: "lodash.js", size: 68400 } },
      errors: [
        { type: "warning", message: "Each child in a list should have a unique 'key' prop.", source: "console" },
        { type: "error",   message: "Cannot read properties of undefined (reading 'map')",  source: "pageerror" }
      ],
      screenshots: [
        { label: "fcp",      dataUrl: "/screenshots/1-mobile-fcp.png",      takenAt: 1620 },
        { label: "fullLoad", dataUrl: "/screenshots/1-mobile-fullLoad.png",  takenAt: 4800 }
      ]
    },
    "/about::desktop": {
      url: "http://localhost:5173/about",
      deviceType: "desktop",
      timestamp: "2025-03-29T09:24:24.200Z",
      performanceScore: 91,
      cpuThrottling: 1,
      networkThrottle: "No throttle",
      metrics: { lcp: 960, fcp: 420, cls: 0.01, inp: 48, ttfb: 210 },
      rerenders: { App: 1, Header: 1, Footer: 1 },
      commitDurations: [4.2, 3.8, 5.1],
      renderTime: 380,
      stats: { domNodes: 320, jsHeapMB: "12.1", payloadMB: "0.8", topOffender: null },
      errors: [],
      screenshots: [
        { label: "fcp",      dataUrl: "/screenshots/1-about-fcp.png",      takenAt: 420  },
        { label: "fullLoad", dataUrl: "/screenshots/1-about-fullLoad.png",  takenAt: 1100 }
      ]
    }
  },

  suggestions: [
    {
      id: "missing-list-keys",
      title: "Add key props to list items",
      description: "React uses key props to efficiently reconcile list updates. Without keys, React re-renders every list item on every change, causing severe performance degradation for long lists.",
      severity: "critical",
      affectedComponent: "UserList",
      fix: "Add key={item.id} to each list element in UserList.jsx line 41"
    },
    {
      id: "effect-infinite-loop",
      title: "useEffect dependency causes infinite loop",
      description: "An object in the useEffect dependency array is recreated on every render, causing the effect to run endlessly and hammering your API.",
      severity: "critical",
      affectedComponent: "DataFetcher",
      fix: "Wrap the dep object in useMemo, or extract primitive values as deps"
    },
    {
      id: "large-component",
      title: "Split oversized Dashboard component",
      description: "The Dashboard component is 487 lines — far beyond the recommended 150-200 line limit. Large components are harder to memoize, test, and tree-shake.",
      severity: "critical",
      affectedComponent: "Dashboard",
      fix: "Extract into DashboardHeader, DashboardMetrics, and DashboardTable sub-components"
    },
    {
      id: "slow-lcp-mobile",
      title: "LCP too high on mobile (4.15s)",
      description: "Largest Contentful Paint on mobile is 4.15s — well above the 2.5s target. The main culprit is likely an unoptimised hero image or render-blocking resource.",
      severity: "critical",
      affectedComponent: null,
      fix: "Use lazy loading for hero images, preload critical assets, and check for render-blocking scripts"
    },
    {
      id: "inline-callbacks",
      title: "Extract inline callback props",
      description: "Inline arrow functions as props create a new function reference every render, causing child components that use React.memo to re-render unnecessarily.",
      severity: "warning",
      affectedComponent: "UserCard",
      fix: "Extract to useCallback(fn, [deps]) in the parent component"
    },
    {
      id: "missing-memo",
      title: "Memoize pure components",
      description: "UserCard and Sidebar re-render on every parent update even when their props haven't changed. Wrapping them with React.memo will prevent this.",
      severity: "warning",
      affectedComponent: "UserCard, Sidebar",
      fix: "export default React.memo(UserCard)"
    },
    {
      id: "console-logs",
      title: "Remove console.log statements",
      description: "console.log calls in App.jsx and UserList.jsx will ship to production, slowing serialisation and leaking internal data to users' browsers.",
      severity: "warning",
      affectedComponent: "App, UserList",
      fix: "Delete console.log calls or replace with a conditional logger"
    },
    {
      id: "high-inp-mobile",
      title: "INP too high on mobile (245ms)",
      description: "Interaction to Next Paint on mobile is 245ms, above the 200ms target. Long tasks are blocking the main thread after user interactions.",
      severity: "warning",
      affectedComponent: null,
      fix: "Break long tasks with scheduler.postTask or setTimeout(0), defer non-critical work"
    },
    {
      id: "excessive-rerenders",
      title: "Dashboard component re-renders 8 times",
      description: "React Profiler captured 8 commits on Dashboard during a single page load. This suggests state or context updates are cascading unnecessarily.",
      severity: "warning",
      affectedComponent: "Dashboard",
      fix: "Use React DevTools Profiler to identify which state change triggers each commit"
    },
    {
      id: "inline-styles",
      title: "Avoid inline style objects",
      description: "Inline style objects in Header are recreated on every render. While minor, at scale these small allocations add up.",
      severity: "info",
      affectedComponent: "Header",
      fix: "Move static styles to a CSS class; dynamic styles to useMemo"
    },
    {
      id: "prop-drilling",
      title: "Reduce prop drilling depth",
      description: "userId is passed through 4 levels of components. This makes refactoring painful and means every intermediate component re-renders when userId changes.",
      severity: "info",
      affectedComponent: "App",
      fix: "Create a UserContext and consume it with useContext where needed"
    }
  ]
};

// History list — mirrors GET /api/reports
export const HISTORY_DATA = [
  { id: 1,  project: "my-react-app",   score: 62, grade: "C",  analyzed_at: "2025-03-29T09:24:25.438Z", created_at: "2025-03-29T09:24:26.000Z" },
  { id: 2,  project: "my-react-app",   score: 71, grade: "C+", analyzed_at: "2025-03-27T14:11:00.000Z", created_at: "2025-03-27T14:11:01.000Z" },
  { id: 3,  project: "my-react-app",   score: 55, grade: "D",  analyzed_at: "2025-03-25T08:45:00.000Z", created_at: "2025-03-25T08:45:01.000Z" },
  { id: 4,  project: "portfolio-site", score: 94, grade: "A",  analyzed_at: "2025-03-24T19:30:00.000Z", created_at: "2025-03-24T19:30:01.000Z" },
  { id: 5,  project: "portfolio-site", score: 88, grade: "B+", analyzed_at: "2025-03-22T11:00:00.000Z", created_at: "2025-03-22T11:00:01.000Z" },
  { id: 6,  project: "admin-panel",    score: 48, grade: "D",  analyzed_at: "2025-03-21T16:20:00.000Z", created_at: "2025-03-21T16:20:01.000Z" },
  { id: 7,  project: "admin-panel",    score: 37, grade: "F",  analyzed_at: "2025-03-19T10:05:00.000Z", created_at: "2025-03-19T10:05:01.000Z" },
  { id: 8,  project: "my-react-app",   score: 44, grade: "D",  analyzed_at: "2025-03-17T08:00:00.000Z", created_at: "2025-03-17T08:00:01.000Z" },
  { id: 9,  project: "landing-page",   score: 97, grade: "A+", analyzed_at: "2025-03-16T13:45:00.000Z", created_at: "2025-03-16T13:45:01.000Z" },
  { id: 10, project: "landing-page",   score: 92, grade: "A",  analyzed_at: "2025-03-14T09:20:00.000Z", created_at: "2025-03-14T09:20:01.000Z" },
  { id: 11, project: "ecommerce-app",  score: 58, grade: "D+", analyzed_at: "2025-03-13T15:30:00.000Z", created_at: "2025-03-13T15:30:01.000Z" },
  { id: 12, project: "ecommerce-app",  score: 63, grade: "C",  analyzed_at: "2025-03-11T11:10:00.000Z", created_at: "2025-03-11T11:10:01.000Z" },
];

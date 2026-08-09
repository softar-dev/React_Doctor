# 🩺 React Doctor

**A TypeScript CLI that diagnoses React performance issues through static code analysis and real browser profiling.**

[![npm version](https://img.shields.io/npm/v/react-doctor-cli-dev.svg?style=flat-square)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![npm downloads](https://badgen.net/npm/dt/react-doctor-cli-dev)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![GitHub stars](https://img.shields.io/github/stars/softar-dev/React_Doctor?style=social)](https://github.com/softar-dev/React_Doctor)
[![GitHub forks](https://img.shields.io/github/forks/softar-dev/React_Doctor?style=social)](https://github.com/softar-dev/React_Doctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

---

> 🌍 **3,000+ downloads across 25+ countries** — Trusted by developers in the United States, Germany, United Kingdom, China, France, Japan, Canada, India, and 17+ more  
> ⚡ **Zero configuration** — Works with any React project (Vite, CRA, Next.js, Remix, etc.)

---

## 🎯 What is React Doctor?

React Doctor is your **automated performance consultant**. It combines:
- 🔍 **Static Code Analysis** — Detects anti-patterns (missing memoization, prop drilling, large components)
- ⚡ **Runtime Profiling** — Real browser profiling with Core Web Vitals, React render metrics, and screenshots
- 🧠 **Smart Rule Engine** — 25 intelligent rules that combine both analysis types for actionable insights
- 📊 **Interactive Dashboard** — Beautiful reports with trends, comparisons, and recommendations

**No configuration needed.** Just run it and get instant insights.

---

## 🚀 Quick Start

```bash
# Install globally (recommended)
npm install -g react-doctor-cli-dev

# Run a full diagnostic and open the dashboard
react-doctor full ./my-react-app --upload
```

The dashboard opens automatically at `http://localhost:3000/report/{id}` — no manual setup required.

```bash
# Or use npx (no installation)
npx react-doctor-cli-dev full ./my-app --upload
```

---

## 🔗 Important Links

| Link | Purpose |
|------|---------|
| 🌐 [**Website & Docs**](https://react-doctor-cli.web.app) | Full documentation, guides, and tutorials |
| 📦 [**npm Package**](https://www.npmjs.com/package/react-doctor-cli-dev) | Install from npm registry |
| 🐙 [**GitHub Repository**](https://github.com/softar-dev/React_Doctor) | Source code and issue tracking |
| ☕ [**Support the Project**](https://react-doctor-cli.web.app/support) | Donate or contribute |
| 🐛 [**Report Issues**](https://github.com/softar-dev/React_Doctor/issues) | Bug reports and feature requests |
| 💬 [**Discussions**](https://github.com/softar-dev/React_Doctor/discussions) | Ask questions and share ideas |

---

## ✨ Core Features

### 🔍 Static Code Analysis
- **9 specialized detectors** scanning for React anti-patterns
- Detects missing `memo`, `useCallback`, `useMemo` optimizations
- Identifies prop drilling, inline styles, and dead code
- Console log detection in production builds
- Large component warnings (complexity analysis)
- JSX/TSX parsing with Babel AST traversal

### ⚡ Runtime Performance Profiling
- **Real browser profiling** via Puppeteer (Chrome automation)
- **Core Web Vitals**: LCP, FCP, CLS, INP, TTFB
- React-specific metrics: commit timing, component re-renders
- **Multi-device support**: Desktop (1280×720) & Mobile (390×844)
- CPU throttling: 1× (normal), 4× (mobile), 6× (low-end device)
- Network simulation: None, Slow 4G, 3G
- **Screenshot capture** at critical load moments (visual proof)

### 🧠 Intelligent Rule Engine
- **25 built-in performance rules** combining static + runtime data
- Context-aware suggestions with severity levels (critical/warning/info)
- Affected component identification with direct file links
- Fix recommendations with code examples
- Automatic deduplication across routes and devices

### 📊 Interactive Dashboard
- **Performance Score** with visual ring indicator (0-100)
- **Web Vitals Summary** — color-coded cards (green/orange/red)
- **Route Comparison Charts** — visualize LCP, FCP, TTFB across pages
- **Component Re-render Analysis** — see which components are re-rendering excessively
- **Screenshot Filmstrip** — timeline of page load with timing labels
- **Filterable Issues** — sort by severity (critical → info)
- **Historical Tracking** — trend charts showing score improvements over time
- **Dark Theme** — easy on the eyes during long analysis sessions

### 📈 Report Generation & Upload
- Structured JSON reports saved to `.react-doctor/` directory
- Auto-start backend server when `--upload` flag is used
- Secure API key authentication (configurable)
- SQLite-backed database for persistent historical tracking
- CI/CD ready — JSON output for parsing and threshold enforcement

### 🛠 Developer Experience
- **Zero-config CLI** — no `react-doctor.config.js` needed
- Beautiful terminal output with spinners, colors, and badges
- Works with **any React project** (Vite, Create React App, Next.js, Remix, etc.)
- Cross-platform support (Windows, macOS, Linux)
- Detailed error messages with troubleshooting hints

---

## 📊 Interactive Dashboard

When you run `react-doctor full ./my-app --upload`, the dashboard automatically opens at `http://localhost:3000/report/{id}`.

### Dashboard Pages:

| Page | Content |
|------|---------|
| **Overview** | Performance score, Web Vitals summary, routes table, top suggestions |
| **Web Vitals** | Detailed metrics per route/device, component re-render counts, screenshots |
| **Code Issues** | All static analysis findings with severity filters and pagination |
| **Suggestions** | Actionable recommendations with severity levels and fix examples |
| **History** | Score trends, historical runs, performance improvements over time |

### Key Features:
- ✅ Responsive design — works on desktop and mobile
- ✅ Dark & light themes — choose your preference
- ✅ Interactive charts — visualize performance data with Chart.js
- ✅ Screenshot viewer — see exactly what your users see
- ✅ Filter & search — find issues quickly
- ✅ Export reports — download as PDF or JSON

---

## 📦 Installation

### Option 1: Global Installation (Recommended)

```bash
npm install -g react-doctor-cli-dev

# Verify installation
react-doctor --version
```

Then use it anywhere:
```bash
react-doctor full ./my-app --upload
```

### Option 2: npx (No Installation)

```bash
npx react-doctor-cli-dev full ./my-app --upload
```

### Option 3: Local Installation (Per Project)

```bash
npm install --save-dev react-doctor-cli-dev

# Add to package.json
{
  "scripts": {
    "diagnose": "react-doctor full . --upload"
  }
}

# Run
npm run diagnose
```

### Requirements
- **Node.js**: 18+ (check with `node --version`)
- **Google Chrome**: Must be installed on your system
- **React Project**: Must have `package.json` in the target directory

---

## 🎯 Usage

### Full Diagnostic (Recommended)

The `full` command runs static analysis + runtime profiling + rule engine in one go.

```bash
# Desktop only (default)
react-doctor full ./my-react-app

# Mobile viewport
react-doctor full ./my-react-app --mobile

# Both desktop + mobile
react-doctor full ./my-react-app --desktop --mobile

# Simulate slow Android device (4x CPU throttling + Slow 4G)
react-doctor full ./my-react-app --cpu 4 --throttle slow4g

# Run + upload + open dashboard automatically
react-doctor full ./my-react-app --upload

# All flags combined (comprehensive analysis)
react-doctor full ./my-react-app --desktop --mobile --cpu 4 --throttle slow4g --upload
```

### Static Analysis Only (Fast, No Browser)

```bash
# Quick static analysis (10-30 seconds)
react-doctor analyze ./my-react-app

# Include runtime profiling + rules (not just static)
react-doctor analyze ./my-react-app --full
```

### Runtime Profiling Only

```bash
# Profile just the runtime (skip static analysis)
react-doctor profile ./my-react-app

# Mobile + slow network simulation
react-doctor profile ./my-react-app --mobile --throttle 3g
```

### Open Dashboard

```bash
# Open the dashboard (auto-starts backend if needed)
react-doctor dashboard

# Use a custom port
react-doctor dashboard --port 4000
```

### Get Help

```bash
# Show all available commands
react-doctor --help

# Show help for a specific command
react-doctor full --help
react-doctor analyze --help
```

---

## ⚙️ Options Reference

### `full` Command — Complete Diagnostic

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `[projectPath]` | string | Path to your React project | `process.cwd()` |
| `--desktop` | boolean | Profile on desktop viewport (1280×720) | `true` (if no device flag) |
| `--mobile` | boolean | Profile on mobile viewport (390×844) | `false` |
| `--cpu <rate>` | 1, 4, 6 | CPU throttle: `1` (normal), `4` (mobile), `6` (low-end) | `1` |
| `--throttle <preset>` | string | Network: `none`, `slow4g`, `3g` | `none` |
| `--upload` | boolean | Upload report + open dashboard | `false` |
| `--api-url <url>` | string | Custom backend API URL | `http://localhost:3000` |
| `--api-key <key>` | string | API key for backend authentication | default key |
| `--no-banner` | boolean | Skip the startup banner | `false` |

### `analyze` Command — Static Analysis Only

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `[projectPath]` | string | Path to your React project | `process.cwd()` |
| `--full` | boolean | Include runtime + rules in analysis | `false` |

### `profile` Command — Runtime Profiling

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `[projectPath]` | string | Path to your React project | `process.cwd()` |
| `--desktop` | boolean | Profile on desktop | `true` |
| `--mobile` | boolean | Profile on mobile | `false` |
| `--cpu <rate>` | 1, 4, 6 | CPU throttling | `1` |
| `--throttle <preset>` | string | Network simulation | `none` |

### `dashboard` Command — View Results

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `--port <port>` | number | Port for the dashboard | `3000` |

---

## 🔐 Backend Authentication

### Via CLI Flag

```bash
react-doctor full ./app --upload --api-key my-secret-key
```

### Via Environment Variable

```bash
export REACT_DOCTOR_API_KEY=my-secret-key
react-doctor full ./app --upload
```

### Security Note
⚠️ Change the default API key in production environments before deploying to shared or public servers.

---

## 🧪 Example Output

```
  ┌─────────────────────────────────┐
  │       🩺  React Doctor          │
  │   React Performance Analyzer    │
  └─────────────────────────────────┘

  ── Full Diagnostic ──────────────────
  Project          ./my-react-app
  Device           desktop + mobile
  CPU              4x
  Network          slow4g

  ── Step 1 / 4 — Static Analysis ─────
  ✔ Static analysis complete — 42 files scanned
    ●  Files analyzed     42
    ●  Total issues       18
    ●  Critical           2
    ●  Warnings           5
    ●  Info               11
    ●  Health grade       B

  ── Step 2 / 4 — Runtime Profiler ────
  ✔ Profiling complete — 6 route/device combination(s)
    / [desktop]  Score: 94/100
    / [mobile]   Score: 87/100

  ── Step 3 / 4 — Rule Engine ─────────
  ✔ Rule Engine complete — 14 suggestion(s) generated
    ❌  Unmemoized component is re-rendering excessively [ProductCard]
    ⚠️   React commits are exceeding 16ms budget

  ── Step 4 / 4 — Report Compiler ─────
  ✔ Final report compiled
    ●  Overall score      91/100
    ●  Report saved       ./.react-doctor/finalreport.json

  ── Uploading to Backend ─────────────
  ✔ Backend started successfully
  ✔ Report uploaded successfully (2 screenshots)
    Opening dashboard  http://localhost:3000/report/1

  ✅  Full diagnostic finished.
```

---

## 🔄 React Doctor vs. Alternatives

| Feature | React Doctor | Lighthouse | WebPageTest | Perfume.js |
|---------|--------------|-----------|-------------|-----------|
| **CLI Tool** | ✅ | ❌ | ❌ | ❌ |
| **React-Specific** | ✅ | ❌ | ❌ | ✅ |
| **Interactive Dashboard** | ✅ | ❌ | ✅ | ❌ |
| **Static Code Analysis** | ✅ | ❌ | ❌ | ❌ |
| **Memoization Detection** | ✅ | ❌ | ❌ | ❌ |
| **Component Re-render Tracking** | ✅ | ❌ | ❌ | ✅ |
| **Free & Open Source** | ✅ | ✅ | ❌ | ✅ |
| **No Configuration** | ✅ | ✅ | ❌ | ❌ |
| **Multi-device Testing** | ✅ | ✅ | ✅ | ❌ |
| **CI/CD Ready** | ✅ | ✅ | ✅ | ✅ |

---

## 📁 Project Structure

```
React_Doctor/
├── cli/                              # Command-line interface
│   ├── src/
│   │   ├── commands/
│   │   │   ├── full.ts              # Full diagnostic command
│   │   │   ├── analyze.ts           # Static analysis only
│   │   │   ├── profile.ts           # Runtime profiling only
│   │   │   └── dashboard.ts         # Dashboard viewer
│   │   ├── ui.ts                    # Terminal UI helpers (spinners, colors)
│   │   ├── uploader.ts              # Upload + browser-open logic
│   │   └── index.ts                 # CLI entry point
│   └── package.json
│
├── backend/                          # Express API + SQLite
│   ├���─ src/
│   │   ├── routes/reports.ts        # Upload & query endpoints
│   │   ├── middleware/auth.ts       # API key validation
│   │   ├── db.ts                    # SQLite database setup
│   │   └── index.ts                 # Server entry + dashboard serving
│   ├── public/                       # Built dashboard (served statically)
│   └── package.json
│
├── core/                             # Analysis engines
│   ├── static-ana/                  # Babel-based AST scanner (9 detectors)
│   ├── runtime/                     # Puppeteer profiler + Web Vitals
│   ├── rule-engine/                 # 25-rule suggestion engine
│   └── report-compiler/             # Final report merger
│
├── shared/                           # TypeScript types & schemas
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 🛠 Development

### Setup

```bash
git clone https://github.com/softar-dev/React_Doctor.git
cd React_Doctor
npm install
npm run build
```

### Build & Development Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build CLI + backend |
| `npm run build:cli` | Build CLI only |
| `npm run build:backend` | Build backend only |
| `npm run dev:backend` | Run backend with nodemon (hot reload) |
| `npm run test` | Run test suite (if available) |

### Testing the Upload Flow Locally

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Test CLI with upload
react-doctor full ./my-app --upload --api-key react-doctor-secret-key-change-this
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 1. Fork the Repository
Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork
```bash
git clone https://github.com/YOUR-USERNAME/React_Doctor.git
cd React_Doctor
```

### 3. Create a Branch
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

### 4. Make Your Changes
- Follow the existing code style
- Add tests for new features
- Update documentation if needed

### 5. Commit with Conventional Commits
```bash
git commit -m "feat: add new performance detector"
git commit -m "fix: resolve dashboard crash on mobile"
git commit -m "docs: add troubleshooting section"
```

### 6. Push & Create a Pull Request
```bash
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub with:
- Clear description of changes
- Link to related issue (if any)
- Screenshots (for UI changes)

### Reporting Bugs
[Open an issue](https://github.com/softar-dev/React_Doctor/issues) with:
- Node.js version (`node --version`)
- Operating system
- React version
- Steps to reproduce
- Expected vs. actual behavior

### Questions?
[Start a discussion](https://github.com/softar-dev/React_Doctor/discussions) on GitHub — no question is too small!

---

## ☕ Support & Sponsorship

React Doctor is **completely free and open source**. If it's saved you time or improved your app's performance:

- ⭐ **Star the repo** — Helps other developers discover it
- 🐛 **Report bugs & suggest features** — Your feedback drives development
- 💬 **Spread the word** — Share with your team or on social media
- ☕ **[Support the project](https://react-doctor-cli.web.app/support)** — Bitcoin donations welcome

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgments

Built with ❤️ using:

- [**Puppeteer**](https://pptr.dev/) — Headless browser automation
- [**Babel**](https://babeljs.io/) — JavaScript parser & AST
- [**Express**](https://expressjs.com/) — Web framework
- [**better-sqlite3**](https://github.com/WiseLibs/better-sqlite3) — Database
- [**Chart.js**](https://www.chartjs.org/) — Data visualization
- [**React**](https://react.dev/) — UI framework

Special thanks to everyone who has tested, reported bugs, and contributed ideas!

---

## 📊 Quick Reference

```bash
# Install
npm install -g react-doctor-cli-dev

# Full diagnostic with dashboard
react-doctor full ./my-app --upload

# Multi-device + slow network
react-doctor full ./my-app --desktop --mobile --cpu 4 --throttle slow4g

# Static analysis only (fast)
react-doctor analyze ./my-app

# Runtime profiling only
react-doctor profile ./my-app --mobile --throttle slow4g

# Open dashboard
react-doctor dashboard

# Get help
react-doctor --help
```

---

## 🌟 Who's Using React Doctor?

We're proud to be used by developers and teams around the world:

- 🌍 **25+ countries** with 3,000+ npm downloads
- 🚀 **Development teams** optimizing performance at scale
- 🏢 **Companies** using React Doctor in CI/CD pipelines
- 👥 **Open source projects** improving their performance scores

[Add your project or company](https://github.com/softar-dev/React_Doctor/discussions/1)

---

## 🚀 Roadmap

Features coming soon:

- [ ] Next.js App Router support
- [ ] Vue.js support
- [ ] Custom rule creation
- [ ] GitHub Actions integration
- [ ] Slack notifications
- [ ] Team dashboards with role-based access
- [ ] Performance budgets & thresholds
- [ ] Automated PR comments with suggestions

[Vote on features](https://github.com/softar-dev/React_Doctor/discussions) you'd like to see!

---

*Made with ❤️ by the React Doctor team · Helping React developers build faster, cleaner, smarter apps.*

**[⬆ Back to top](#-react-doctor)**

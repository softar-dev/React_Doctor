
# 🩺 React Doctor

**A TypeScript CLI that diagnoses React performance issues through static code analysis and real browser profiling.**

[![npm version](https://img.shields.io/npm/v/react-doctor-cli-dev.svg?style=flat-square)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![npm downloads](https://badgen.net/npm/dt/react-doctor-cli-dev)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

---

> 🌍 **3,000+ downloads across 25+ countries** — including the United States, Germany, United Kingdom, China, France, and 20+ more

---

## 🔗 Links

|                                 |                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| 🌐**Website & Docs**      | [react-doctor-cli.web.app](https://react-doctor-cli.web.app)                                 |
| 📦**npm Package**         | [npmjs.com/package/react-doctor-cli-dev](https://www.npmjs.com/package/react-doctor-cli-dev) |
| 🐙**GitHub**              | [github.com/softar-dev/React_Doctor](https://github.com/softar-dev/React_Doctor)             |
| ☕**Support the project** | [react-doctor-cli.web.app/support](https://react-doctor-cli.web.app/support)                 |
| 🐛**Bug Reports**         | [GitHub Issues](https://github.com/softar-dev/React_Doctor/issues)                           |
| 💬**Contact**             | Open an issue on GitHub or reach out via the website                                        |

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g react-doctor-cli-dev

# Run a full diagnostic and open the dashboard
react-doctor full ./my-react-app --upload
```

The dashboard opens automatically at `http://localhost:3000/report/{id}` — no manual setup required.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [📊 Dashboard](#-dashboard)
- [📦 Installation](#-installation)
- [🎯 Usage](#-usage)
- [⚙️ Options Reference](#️-options-reference)
- [📁 Project Structure](#-project-structure)
- [🧪 Example Output](#-example-output)
- [🛠 Development](#-development)
- [🤝 Contributing](#-contributing)
- [☕ Support](#-support)
- [📄 License](#-license)

---

## ✨ Features

### 🔍 Static Code Analysis

- Detects performance anti-patterns (missing `memo`, `useCallback`, `useMemo`)
- Identifies prop drilling, inline styles, console logs in production
- Large component detection & dead code analysis
- JSX/TSX parsing with Babel AST traversal
- **9 specialized detectors** for common React issues

### ⚡ Runtime Performance Profiling

- Real browser profiling via Puppeteer (Chrome)
- Core Web Vitals: LCP, FCP, CLS, INP, TTFB
- React commit timing & component render tracking
- Desktop (1280×720) & Mobile (390×844) viewport support
- CPU throttling (1×, 4×, 6×) & network simulation (3G, Slow 4G)
- **Screenshot capture** at key load moments

### 🧠 Intelligent Rule Engine

- **25 built-in rules** combining static + runtime insights
- Cross rules that fire only when both conditions are met
- Context-aware suggestions with severity levels (critical/warning/info)
- Affected component identification & fix recommendations
- Deduplicated suggestions across routes/devices

### 📊 Interactive Dashboard

- **Performance Score** with visual ring indicator
- **Core Web Vitals** displayed as color-coded cards
- **Route comparison charts** for LCP, FCP, TTFB
- **Component re-render analysis** with counts
- **Screenshot filmstrip** with timing labels
- **Filterable issues & suggestions** by severity
- **Historical tracking** with trend charts
- **Zero configuration** — auto-starts backend on first use

### 📈 Report Generation & Upload

- Structured JSON reports saved to `.react-doctor/`
- Auto-start backend server when `--upload` is used
- Secure API key authentication (`x-api-key` header)
- SQLite-backed database for historical tracking

### 🛠 Developer Experience

- Zero-config CLI with intuitive flags
- Beautiful terminal output with spinners, colors, and badges
- Works with any React project (Vite, CRA, Next.js, etc.)
- Cross-platform: Windows, macOS, Linux

---

## 📊 Dashboard

When you run `react-doctor full ./my-app --upload`, the dashboard automatically opens at `http://localhost:3000/report/{id}`.

### What You'll See:

| Page                  | Content                                                              |
| --------------------- | -------------------------------------------------------------------- |
| **Overview**    | Performance score, Web Vitals summary, routes table, top suggestions |
| **Web Vitals**  | Detailed metrics per route, component re-renders, screenshots        |
| **Code Issues** | All static issues with severity filters and pagination               |
| **Suggestions** | Actionable recommendations with code fixes                           |
| **History**     | Score trends and historical runs                                     |

### Dashboard Features:

- ✅ **Responsive design** — works on desktop and mobile
- ✅ **Dark theme** — easy on the eyes
- ✅ **Interactive charts** — visualize performance data
- ✅ **Screenshot viewer** — see what users see
- ✅ **Filter & search** — find issues quickly

---

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g react-doctor-cli-dev

# Verify installation
react-doctor --version
```

### Via npx (No Installation)

```bash
npx react-doctor-cli-dev full ./my-app --upload
```

**Requirements:** Node.js 18+ · Google Chrome · A React project with `package.json`

---

## 🎯 Usage

### Full Diagnostic (Recommended)

```bash
# Desktop only (default)
react-doctor full ./my-react-app

# Mobile viewport
react-doctor full ./my-react-app --mobile

# Both desktop + mobile
react-doctor full ./my-react-app --desktop --mobile

# Simulate slow Android device
react-doctor full ./my-react-app --cpu 4 --throttle slow4g

# Run + upload + open dashboard automatically
react-doctor full ./my-react-app --upload

# All flags combined
react-doctor full ./my-react-app --desktop --mobile --cpu 4 --throttle slow4g --upload
```

### Static Analysis Only (Fast, No Browser)

```bash
react-doctor analyze ./my-react-app

# Include runtime + rules
react-doctor analyze ./my-react-app --full
```

### Runtime Profiling Only

```bash
react-doctor profile ./my-react-app

# Mobile + slow network
react-doctor profile ./my-react-app --mobile --throttle 3g
```

### Open Dashboard

```bash
# Open dashboard (auto-starts backend if needed)
react-doctor dashboard

# Use a custom port
react-doctor dashboard --port 4000
```

---

## ⚙️ Options Reference

### `full` Command

| Flag                    | Description                                                | Default                      |
| ----------------------- | ---------------------------------------------------------- | ---------------------------- |
| `[projectPath]`       | Path to React project                                      | `process.cwd()`            |
| `--desktop`           | Profile on desktop viewport (1280×720)                    | `true` (if no device flag) |
| `--mobile`            | Profile on mobile viewport (390×844)                      | `false`                    |
| `--cpu <rate>`        | CPU throttle:`1` (real), `4` (mobile), `6` (low-end) | `1`                        |
| `--throttle <preset>` | Network:`none`, `slow4g`, `3g`                       | `none`                     |
| `--upload`            | Upload report + open dashboard                             | `false`                    |
| `--api-url <url>`     | Backend API URL                                            | `http://localhost:3000`    |
| `--api-key <key>`     | API key for backend auth                                   | default key                  |
| `--no-banner`         | Skip the startup banner                                    | `false`                    |

### `analyze` Command

| Flag              | Description                         | Default           |
| ----------------- | ----------------------------------- | ----------------- |
| `[projectPath]` | Path to React project               | `process.cwd()` |
| `--full`        | Include runtime + rules in analysis | `false`         |

### `profile` Command

| Flag                         | Description            | Default           |
| ---------------------------- | ---------------------- | ----------------- |
| `[projectPath]`            | Path to React project  | `process.cwd()` |
| `--desktop` / `--mobile` | Viewport to profile    | `desktop`       |
| `--cpu` / `--throttle`   | Performance simulation | `1` / `none`  |

### `dashboard` Command

| Flag              | Description            | Default  |
| ----------------- | ---------------------- | -------- |
| `--port <port>` | Port for the dashboard | `3000` |

---

## 🔐 Backend Authentication

```bash
# Via CLI flag
react-doctor full ./app --upload --api-key my-secret-key

# Via environment variable
export REACT_DOCTOR_API_KEY=my-secret-key
react-doctor full ./app --upload
```

> ⚠️ Change the default API key before deploying to a shared or public environment.

---

## 📁 Project Structure

```
React_Doctor/
├── cli/                           # Command-line interface
│   ├── src/
│   │   ├── commands/              # full.ts, analyze.ts, profile.ts, dashboard.ts
│   │   ├── ui.ts                  # Terminal UI helpers (spinners, colors)
│   │   ├── uploader.ts            # Shared upload + browser-open logic
│   │   └── index.ts               # CLI entry point
│   └── package.json
│
├── backend/                       # Express API + SQLite
│   ├── src/
│   │   ├── routes/reports.ts      # Upload & query endpoints
│   │   ├── middleware/auth.ts     # API key validation
│   │   ├── db.ts                  # SQLite setup
│   │   └── index.ts               # Server entry + static dashboard serving
│   ├── public/                    # Built dashboard (served statically)
│   └── package.json
│
├── core/                          # Analysis engines
│   ├── static-ana/                # Babel-based AST scanner (9 detectors)
│   ├── runtime/                   # Puppeteer profiler + Web Vitals
│   ├── rule-engine/               # 25-rule suggestion engine
│   └── report-compiler/           # Final report merger
│
├── shared/                        # TypeScript types & schemas
├── package.json
└── README.md
```

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

## 🛠 Development

### Setup

```bash
git clone https://github.com/softar-dev/React_Doctor.git
cd React_Doctor
npm install
npm run build
```

### Scripts

| Command                   | Description              |
| ------------------------- | ------------------------ |
| `npm run build`         | Build CLI + backend      |
| `npm run build:cli`     | Build CLI only           |
| `npm run build:backend` | Build backend only       |
| `npm run dev:backend`   | Run backend with nodemon |

### Testing the Upload Flow Locally

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
react-doctor full ./my-app --upload --api-key react-doctor-secret-key-change-this
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feat/your-feature`
3. **Commit**: `git commit -m 'feat: add your feature'`
4. **Push**: `git push origin feat/your-feature`
5. **Open a Pull Request**

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
Report bugs via [GitHub Issues](https://github.com/softar-dev/React_Doctor/issues) — include Node version, OS, React version, and steps to reproduce.

---

## ☕ Support

React Doctor is completely free and open source. If it saved you time:

- ⭐ **Star the repo** — helps other developers discover it
- ☕ **[Support the project](https://react-doctor-cli.web.app/support)** — Bitcoin donations welcome, any amount helps cover domain and hosting costs
- 🐛 **[Report a bug](https://github.com/softar-dev/React_Doctor/issues)** — contributions are the best support
- 💬 **Spread the word** — share it with your team or on social media

---

## 📄 License

Distributed under the **ISC License**. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgments

[Puppeteer](https://pptr.dev/) · [Babel](https://babeljs.io/) · [Express](https://expressjs.com/) · [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [Chart.js](https://www.chartjs.org/) · [Vite](https://vitejs.dev/) · [Chalk](https://github.com/chalk/chalk) · [Commander](https://github.com/tj/commander.js)

---

## 📊 Quick Reference

```bash
npm install -g react-doctor-cli-dev

react-doctor full ./my-app --upload                              # Full run + dashboard
react-doctor full ./my-app --desktop --mobile --cpu 4 --upload  # All devices + upload
react-doctor analyze ./my-app                                    # Static only
react-doctor profile ./my-app --mobile --throttle slow4g        # Mobile profiling
react-doctor dashboard                                           # Open dashboard
react-doctor --version
react-doctor --help
```

---

*Made with ❤️ · Helping React developers build faster, cleaner, smarter apps.*

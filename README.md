
# 🩺 React Doctor

> **Diagnose, analyze, and optimize your React applications** — static code analysis + runtime performance profiling + intelligent suggestions + interactive dashboard.

[![npm version](https://img.shields.io/npm/v/react-doctor-cli-dev.svg?style=flat-square)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![npm downloads](https://img.shields.io/npm/dt/react-doctor-cli-dev.svg?style=flat-square)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)

---

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [✨ Features](#-features)
- [📊 Dashboard](#-dashboard)
- [📦 Installation](#-installation)
- [🎯 Usage](#-usage)
- [⚙️ Options Reference](#️-options-reference)
- [📁 Project Structure](#-project-structure)
- [🧪 Example Output](#-example-output)
- [🛠 Development](#-development)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g react-doctor-cli-dev

# Run a full diagnostic with dashboard upload
react-doctor full ./my-react-app --upload

# The dashboard will open automatically at http://localhost:3000/report/1
```

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

- **25+ built-in rules** combining static + runtime insights
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
- **Screenshots uploaded as base64** to the backend

### 🛠 Developer Experience

- Zero-config CLI with intuitive flags
- Beautiful terminal output with spinners, colors, and badges
- Works with any React project (Vite, CRA, Next.js, etc.)
- Cross-platform: Windows, macOS, Linux
- **Live dashboard** with real-time data

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
# Install globally
npm install -g react-doctor-cli-dev

# Verify installation
react-doctor --version
```

### Via npx (No Installation)

```bash
# Run without installing globally
npx react-doctor-cli-dev full ./my-app --upload
```

---

## 🎯 Usage

### Full Diagnostic (All-in-One)

```bash
# Basic usage (desktop only)
react-doctor full ./my-react-app

# Profile on mobile viewport
react-doctor full ./my-react-app --mobile

# Profile on both desktop + mobile
react-doctor full ./my-react-app --desktop --mobile

# Simulate slow Android device (4× CPU + Slow 4G)
react-doctor full ./my-react-app --cpu 4 --throttle slow4g

# Upload results to dashboard (RECOMMENDED)
react-doctor full ./my-react-app --upload
```

### Static Analysis Only (No Browser Required)

```bash
# Quick code scan
react-doctor analyze ./my-react-app

# Include runtime profiling in analysis
react-doctor analyze ./my-react-app --full
```

### Runtime Profiling Only

```bash
# Profile desktop performance
react-doctor profile ./my-react-app

# Profile with network throttling
react-doctor profile ./my-react-app --throttle 3g
```

### Dashboard Only

```bash
# Open dashboard (auto-starts backend if needed)
react-doctor dashboard

# Use custom port
react-doctor dashboard --port 4000
```

---

## ⚙️ Options Reference

### Global Options

| Flag              | Description           | Default |
| ----------------- | --------------------- | ------- |
| `-V, --version` | Output version number | —      |
| `-h, --help`    | Display help          | —      |

### `full` Command Options

| Flag                    | Description                                                | Default                                 |
| ----------------------- | ---------------------------------------------------------- | --------------------------------------- |
| `[projectPath]`       | Path to React project                                      | `process.cwd()`                       |
| `--desktop`           | Profile on desktop viewport (1280×720)                    | `true` (if no device flag)            |
| `--mobile`            | Profile on mobile viewport (390×844)                      | `false`                               |
| `--cpu <rate>`        | CPU throttle:`1` (real), `4` (mobile), `6` (low-end) | `1`                                   |
| `--throttle <preset>` | Network:`none`, `slow4g`, `3g`                       | `none`                                |
| `--upload`            | Upload report to backend dashboard                         | `false`                               |
| `--api-url <url>`     | Backend API URL                                            | `http://localhost:3000`               |
| `--api-key <key>`     | API key for backend auth                                   | `react-doctor-secret-key-change-this` |
| `--no-banner`         | Skip the startup banner                                    | `false`                               |

### `analyze` Command Options

| Flag              | Description                         | Default           |
| ----------------- | ----------------------------------- | ----------------- |
| `[projectPath]` | Path to React project               | `process.cwd()` |
| `--full`        | Include runtime + rules in analysis | `false`         |

### `profile` Command Options

| Flag                         | Description            | Default           |
| ---------------------------- | ---------------------- | ----------------- |
| `[projectPath]`            | Path to React project  | `process.cwd()` |
| `--desktop` / `--mobile` | Viewport to profile    | `desktop`       |
| `--cpu` / `--throttle`   | Performance simulation | `1` / `none`  |

### `dashboard` Command Options

| Flag              | Description            | Default  |
| ----------------- | ---------------------- | -------- |
| `--port <port>` | Port for the dashboard | `3000` |

---

## 🔐 Backend Authentication

When using `--upload`, secure your reports with an API key:

```bash
# Via CLI flag
react-doctor full ./app --upload --api-key my-secret-key

# Via environment variable
export REACT_DOCTOR_API_KEY=my-secret-key
react-doctor full ./app --upload
```

**Backend expects**: `x-api-key: <your-key>` header
**Default key**: `react-doctor-secret-key-change-this` (change for production!)

---

## 📁 Project Structure

```
React_Doctor/
├── cli/                           # Command-line interface
│   ├── src/
│   │   ├── commands/              # full.ts, analyze.ts, profile.ts, install.ts
│   │   ├── ui.ts                  # Terminal UI helpers (spinners, colors)
│   │   └── index.ts               # CLI entry point
│   ├── dist/                      # Compiled output
│   └── package.json
│
├── backend/                       # Express API + SQLite dashboard
│   ├── src/
│   │   ├── routes/reports.ts      # Upload & query endpoints
│   │   ├── middleware/auth.ts     # API key validation
│   │   ├── db.ts                  # SQLite setup
│   │   └── index.ts               # Server entry
│   ├── public/                    # Built dashboard (served statically)
│   │   ├── index.html
│   │   ├── assets/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── data/                      # SQLite database & screenshots
│   └── package.json
│
├── dashboard/                     # React dashboard source
│   ├── src/
│   │   ├── pages.js
│   │   ├── api.js
│   │   ├── utils.js
│   │   └── main.js
│   ├── public/
│   └── package.json
│
├── core/                          # Shared analysis engines
│   ├── static-ana/                # Babel-based code scanner
│   ├── runtime/                   # Puppeteer profiler + metrics
│   ├── rule-engine/               # Suggestion generator
│   └── report-compiler/           # Final report merger
│
├── shared/                        # TypeScript types & schemas
├── package.json                   # Root config
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
    / [desktop]  Score: 94/100  Excellent
    / [mobile]   Score: 87/100  Good
    ...

  ── Step 3 / 4 — Rule Engine ─────────
  ✔ Rule Engine complete — 14 suggestion(s) generated
    ❌  Unmemoized component is re-rendering excessively [ProductCard]
    ⚠️   React commits are exceeding 16ms budget
    ...

  ── Step 4 / 4 — Report Compiler ─────
  ✔ Final report compiled
    ·  Overall score     91/100  Excellent
    ●  Report saved      ./.react-doctor/finalreport.json

  ── Uploading to Backend ─────────────
  ✔ Backend started successfully!
  ✔ Report uploaded successfully (2 screenshots)
  📊 Opening dashboard: http://localhost:3000/report/1

  ✅  Full diagnostic finished.
```

---

## 🛠 Development

### Prerequisites

- Node.js 18+
- npm 10+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/softar-dev/React_Doctor.git
cd React_Doctor

# Install dependencies
npm install

# Build all packages
npm run build
```

### Scripts

| Command                     | Description                     |
| --------------------------- | ------------------------------- |
| `npm run build`           | Build CLI + backend + dashboard |
| `npm run build:cli`       | Build CLI only                  |
| `npm run build:backend`   | Build backend only              |
| `npm run build:dashboard` | Build dashboard only            |
| `npm run dev:cli`         | Run CLI in watch mode           |
| `npm run dev:backend`     | Run backend with nodemon        |
| `npm run dev:dashboard`   | Run dashboard with Vite         |

### Testing the Upload Flow Locally

```bash
# Terminal 1: Start backend manually
cd backend && npm run dev

# Terminal 2: Run CLI with upload
npx ts-node cli/src/index.ts full ./my-app \
  --upload \
  --api-key react-doctor-secret-key-change-this \
  --api-url http://localhost:3000
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feat/amazing-feature`
3. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
4. **Push to the branch**: `git push origin feat/amazing-feature`
5. **Open a Pull Request**

### Guidelines

- Follow existing code style (Prettier + ESLint)
- Add tests for new functionality
- Update documentation for user-facing changes
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

### Reporting Issues

- Use the [GitHub Issues](https://github.com/softar-dev/React_Doctor/issues) tab
- Include: Node version, OS, React version, and steps to reproduce
- Attach logs or screenshots when helpful

---

## 📄 License

Distributed under the **ISC License**. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgments

- [Puppeteer](https://pptr.dev/) — Headless Chrome automation
- [Babel](https://babeljs.io/) — JavaScript compiler & AST parsing
- [Express](https://expressjs.com/) — Backend framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast SQLite bindings
- [Chart.js](https://www.chartjs.org/) — Dashboard charts
- [Vite](https://vitejs.dev/) — Dashboard build tool
- [Chalk](https://github.com/chalk/chalk) — Terminal string styling
- [Commander](https://github.com/tj/commander.js) — CLI framework

---

## 📬 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/softar-dev/React_Doctor/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/softar-dev/React_Doctor/discussions)
- ✉️ **Contact**: Open an issue or reach out via GitHub

---

> **Made with ❤️**
> *Helping React developers build faster, cleaner, smarter apps.* 🚀

---

## 📊 Quick Reference

```bash
# Install
npm install -g react-doctor-cli-dev

# Full diagnostic with dashboard
react-doctor full ./my-app --upload

# Full diagnostic with all options
react-doctor full ./my-app --desktop --mobile --cpu 4 --throttle slow4g --upload

# Static analysis only
react-doctor analyze ./my-app

# Runtime profiling only
react-doctor profile ./my-app --mobile

# Open dashboard
react-doctor dashboard

# Version
react-doctor --version

# Help
react-doctor --help
```

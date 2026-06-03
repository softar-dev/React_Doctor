# 🩺 React Doctor

> **Diagnose, analyze, and optimize your React applications** — static code analysis + runtime performance profiling + intelligent suggestions + dashboard upload.

[![npm version](https://img.shields.io/npm/v/react-doctor-cli-dev.svg?style=flat-square)](https://www.npmjs.com/package/react-doctor-cli-dev)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)](https://react.dev/)

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g react-doctor-cli-dev

# Run a full diagnostic on your React project
react-doctor full ./my-react-app

# Upload results to dashboard (backend auto-starts if needed)
react-doctor full ./my-react-app --upload
```

---

## ✨ Features

### 🔍 Static Code Analysis

- Detects performance anti-patterns (missing `memo`, `useCallback`, `useMemo`)
- Identifies prop drilling, inline styles, console logs in production
- Large component detection & dead code analysis
- JSX/TSX parsing with Babel AST traversal

### ⚡ Runtime Performance Profiling

- Real browser profiling via Puppeteer (Chrome)
- Core Web Vitals: LCP, FCP, CLS, INP, TTFB
- React commit timing & component render tracking
- Desktop (1280×720) & Mobile (390×844) viewport support
- CPU throttling (1×, 4×, 6×) & network simulation (3G, Slow 4G)

### 🧠 Intelligent Rule Engine

- 25+ built-in rules combining static + runtime insights
- Context-aware suggestions with severity levels (critical/warning/info)
- Affected component identification & fix recommendations
- Deduplicated suggestions across routes/devices

### 📊 Report Generation & Upload

- Structured JSON reports saved to `.react-doctor/`
- Auto-start backend server when `--upload` is used
- Secure API key authentication (`x-api-key` header)
- SQLite-backed dashboard for historical tracking

### 🛠 Developer Experience

- Zero-config CLI with intuitive flags
- Beautiful terminal output with spinners, colors, and badges
- Works with any React project (Vite, CRA, Next.js, etc.)
- Cross-platform: Windows, macOS, Linux

---

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g react-doctor-cli-dev
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

# Upload results to backend dashboard
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
| `--upload`            | Upload report to backend API                               | `false`                               |
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

### `install` Command Options

| Flag             | Description      | Default  |
| ---------------- | ---------------- | -------- |
| `-g, --global` | Install globally | `true` |

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
├── cli/                    # Command-line interface
│   ├── src/
│   │   ├── commands/       # full.ts, analyze.ts, profile.ts, install.ts
│   │   ├── ui.ts           # Terminal UI helpers (spinners, colors)
│   │   └── index.ts        # CLI entry point
│   ├── dist/               # Compiled output (published)
│   └── package.json
│
├── backend/                # Express API + SQLite dashboard
│   ├── src/
│   │   ├── routes/reports.ts   # Upload & query endpoints
│   │   ├── middleware/auth.ts  # API key validation
│   │   ├── db.ts               # SQLite setup
│   │   └── index.ts            # Server entry
│   ├── dist/                   # Compiled output (published)
│   ├── .env                    # PORT, API_KEY, DB_PATH
│   └── package.json
│
├── core/                   # Shared analysis engines
│   ├── static-ana/         # Babel-based code scanner
│   ├── runtime/            # Puppeteer profiler + metrics
│   ├── rule-engine/        # Suggestion generator
│   └── report-compiler/    # Final report merger
│
├── shared/                 # TypeScript types & schemas
├── package.json            # Root config (merged dependencies)
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
  ✔ Report uploaded successfully

  ✅  Full diagnostic finished.
```

---

## 🛠 Development

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Scripts

| Command                   | Description                    |
| ------------------------- | ------------------------------ |
| `npm run build`         | Build CLI + backend TypeScript |
| `npm run build:cli`     | Build CLI only                 |
| `npm run build:backend` | Build backend only             |
| `npm run dev:cli`       | Run CLI in watch mode          |
| `npm run dev:backend`   | Run backend with nodemon       |
| `npm test`              | Run test suite                 |

### Testing the Upload Flow Locally

```bash
# Terminal 1: Start backend manually (optional)
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
- [Chalk](https://github.com/chalk/chalk) — Terminal string styling
- [Commander](https://github.com/tj/commander.js) — CLI framework

---

## 📬 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/softar-dev/React_Doctor/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/softar-dev/React_Doctor/discussions)
- ✉️ **Contact**: Open an issue or reach out via GitHub

---

> **Made with ❤️ **
> *Helping React developers build faster, cleaner, smarter apps.* 🚀

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotsDir = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ── Initialize database ──────────────────────────────────────
const dbPath = process.env.DB_PATH || path_1.default.join(__dirname, '../../reports.db');
const db = new better_sqlite3_1.default(dbPath);
// ── Enable foreign keys ──────────────────────────────────────
db.pragma('foreign_keys = ON');
// ── Create reports table if it doesn't exist ──────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    score INTEGER NOT NULL,
    grade TEXT NOT NULL,
    analyzed_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    static_json TEXT NOT NULL,
    runtime_json TEXT NOT NULL,
    suggestions TEXT NOT NULL
  )
`);
// ── Create screenshots table if it doesn't exist ───────────
db.exec(`
  CREATE TABLE IF NOT EXISTS screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    route TEXT NOT NULL,
    label TEXT NOT NULL,
    taken_at INTEGER NOT NULL,
    data_url TEXT NOT NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )
`);
// ── Create indexes for performance ──────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project);
  CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_screenshots_report_id ON screenshots(report_id);
`);
// ── Define screenshots directory ────────────────────────────
const screenshotsDir = path_1.default.join(__dirname, '../../data/screenshots');
exports.screenshotsDir = screenshotsDir;
// ── Ensure screenshots directory exists ──────────────────────
if (!fs_1.default.existsSync(screenshotsDir)) {
    fs_1.default.mkdirSync(screenshotsDir, { recursive: true });
}
// ── Export both the database and the screenshots dir ──────
exports.default = db;

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ── Initialize database ──────────────────────────────────────
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../reports.db');
const db = new Database(dbPath);

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
const screenshotsDir = path.join(__dirname, '../../data/screenshots');

// ── Ensure screenshots directory exists ──────────────────────
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// ── Export both the database and the screenshots dir ──────
export default db;
export { screenshotsDir };
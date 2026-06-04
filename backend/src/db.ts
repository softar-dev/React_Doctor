import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PACKAGE_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_DB = path.join(PACKAGE_ROOT, "backend", "data", "reports.db");
const dbPath = process.env.DB_PATH || DEFAULT_DB;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.mkdirSync(path.join(path.dirname(dbPath), "screenshots"), { recursive: true });

const db = new Database(dbPath);

// ✅ NEW SCHEMA WITH SPLIT COLUMNS
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project TEXT NOT NULL,
    score INTEGER NOT NULL,
    grade TEXT NOT NULL,
    analyzed_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    static_json TEXT NOT NULL,
    runtime_json TEXT NOT NULL,
    suggestions TEXT NOT NULL
  );
`);

export const screenshotsDir = path.join(path.dirname(dbPath), "screenshots");
export default db;
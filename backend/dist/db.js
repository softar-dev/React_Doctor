"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotsDir = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, "..", ".env") });
const PACKAGE_ROOT = path_1.default.resolve(__dirname, "..", "..");
const DEFAULT_DB = path_1.default.join(PACKAGE_ROOT, "backend", "data", "reports.db");
const dbPath = process.env.DB_PATH || DEFAULT_DB;
fs_1.default.mkdirSync(path_1.default.dirname(dbPath), { recursive: true });
fs_1.default.mkdirSync(path_1.default.join(path_1.default.dirname(dbPath), "screenshots"), { recursive: true });
const db = new better_sqlite3_1.default(dbPath);
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
exports.screenshotsDir = path_1.default.join(path_1.default.dirname(dbPath), "screenshots");
exports.default = db;

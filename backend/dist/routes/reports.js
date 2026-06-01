"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", (req, res) => {
    try {
        const rows = db_1.default.prepare(`
      SELECT id, project, score, grade, analyzed_at, created_at
      FROM reports
      ORDER BY created_at DESC
      LIMIT 50
    `).all();
        res.json({ count: rows.length, reports: rows });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/project/:name", (req, res) => {
    try {
        const rows = db_1.default.prepare(`
      SELECT id, project, score, grade, analyzed_at, created_at
      FROM reports
      WHERE project = ?
      ORDER BY created_at DESC
    `).all(req.params.name);
        res.json({
            project: req.params.name,
            count: rows.length,
            reports: rows,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
// ==========================================
// Endpoint 1: POST /api/report/upload
// يستقبل التقرير من الـ CLI ويتحقق منه ثم يحفظه
// ==========================================
router.post("/upload", auth_1.requireApiKey, (req, res) => {
    try {
        const report = req.body;
        // التحقق من وجود الحقول الإلزامية الثلاثة
        if (!report || !report.projectName || !report.analyzedAt || report.performanceScore === undefined) {
            res.status(400).json({ error: "Invalid report — missing required fields" });
            return;
        }
        const grade = report.static?.grade ?? "N/A";
        // تجهيز استعلام الإدخال لـ SQLite
        const stmt = db_1.default.prepare(`
      INSERT INTO reports (project, score, grade, analyzed_at, payload)
      VALUES (?, ?, ?, ?, ?)
    `);
        // تنفيذ الاستعلام وحفظ جسم التقرير كـ string
        const result = stmt.run(report.projectName, report.performanceScore, grade, report.analyzedAt, JSON.stringify(report));
        res.status(201).json({
            message: "Report saved successfully",
            id: result.lastInsertRowid,
        });
    }
    catch (err) {
        console.error("Upload error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/:id", (req, res) => {
    try {
        const row = db_1.default.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
        if (!row) {
            res.status(404).json({ error: "Report not found" });
            return;
        }
        res.json({
            id: row.id,
            project: row.project,
            score: row.score,
            grade: row.grade,
            analyzedAt: row.analyzed_at,
            createdAt: row.created_at,
            report: JSON.parse(row.payload),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;

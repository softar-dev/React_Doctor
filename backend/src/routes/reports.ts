
import { Router, Request, Response, RequestHandler } from "express";
import db from "../db";
import { requireApiKey } from "../middleware/auth";
 
const router = Router();
 

router.get("/", (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT id, project, score, grade, analyzed_at, created_at
      FROM reports
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as any[];
 
    res.json({ count: rows.length, reports: rows });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});
 

router.get("/project/:name", (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT id, project, score, grade, analyzed_at, created_at
      FROM reports
      WHERE project = ?
      ORDER BY created_at DESC
    `).all(req.params.name) as any[];
 
    res.json({
      project: req.params.name,
      count: rows.length,
      reports: rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});
 
// ==========================================
// Endpoint 1: POST /api/report/upload
// يستقبل التقرير من الـ CLI ويتحقق منه ثم يحفظه
// ==========================================
router.post("/upload", requireApiKey as RequestHandler, (req: Request, res: Response) => {
  try {
    const report = req.body;
 
    // التحقق من وجود الحقول الإلزامية الثلاثة
    if (!report || !report.projectName || !report.analyzedAt || report.performanceScore === undefined) {
      res.status(400).json({ error: "Invalid report — missing required fields" });
      return;
    }
 
    const grade = report.static?.grade ?? "N/A";
 
    // تجهيز استعلام الإدخال لـ SQLite
    const stmt = db.prepare(`
      INSERT INTO reports (project, score, grade, analyzed_at, payload)
      VALUES (?, ?, ?, ?, ?)
    `);
 
    // تنفيذ الاستعلام وحفظ جسم التقرير كـ string
    const result = stmt.run(
      report.projectName,
      report.performanceScore,
      grade,
      report.analyzedAt,
      JSON.stringify(report)
    );
 
    res.status(201).json({
      message: "Report saved successfully",
      id: result.lastInsertRowid,
    });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
 
router.get("/:id", (req: Request, res: Response) => {
  try {
    const row = db.prepare(
      "SELECT * FROM reports WHERE id = ?"
    ).get(req.params.id) as any;
 
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
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});
 
export default router;
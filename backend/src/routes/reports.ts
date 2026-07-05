// ─────────────────────────────────────────────────────────────
// backend/src/routes/reports.ts
//
// All report endpoints.
//
// ENDPOINTS:
//
//   GET  /api/reports
//     Returns a summary list (no blobs) — fast for the dashboard
//     history page. Each row has id, project, score, grade, dates.
//
//   GET  /api/reports/:id
//     Returns the full report for one run — static + runtime +
//     suggestions all parsed back to objects.
//
//   GET  /api/reports/:id/screenshots
//     Returns all screenshots for a report as base64 data URLs.
//
//   GET  /api/reports/project/:name
//     All runs for a named project, summary only.
//
//   POST /api/reports/upload   (requires x-api-key header)
//     Accepts a FinalReport from the CLI.
//     Strips screenshot dataUrls → saves as .png files.
//     Stores static_json, runtime_json, suggestions in DB.
//
// SCREENSHOT HANDLING ON UPLOAD:
//   The CLI sends the full FinalReport including base64 screenshots
//   (up to 200KB each). We extract those before storing so the DB
//   stays lean. Each screenshot is saved as:
//     data/screenshots/<reportId>-<routeKey>-<label>.png
//   And the dataUrl in runtime_json is replaced with:
//     /screenshots/<filename>
//   so the dashboard can load them as normal <img> tags.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, RequestHandler } from "express";
import path from "path";
import fs from "fs";
import db from "../db";
import { screenshotsDir } from "../db";
import { requireApiKey } from "../middleware/auth";

const router = Router();

// ── GET /api/reports ─────────────────────────────────────────
// Summary list — no blobs, just the columns the history page needs.

router.get("/", (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT id, project, score, grade, analyzed_at, created_at
      FROM   reports
      ORDER  BY created_at DESC
      LIMIT  100
    `).all() as any[];

    res.json({ count: rows.length, reports: rows });
  } catch (err: any) {
    console.error("GET / error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/reports/project/:name ───────────────────────────
// All runs for one project, summary only.

router.get("/project/:name", (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT id, project, score, grade, analyzed_at, created_at
      FROM   reports
      WHERE  project = ?
      ORDER  BY created_at DESC
    `).all(req.params.name) as any[];

    res.json({ project: req.params.name, count: rows.length, reports: rows });
  } catch (err: any) {
    console.error("GET /project/:name error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/reports/:id/screenshots ──────────────────────────
// Returns all screenshots for a report as base64 data URLs.
// This is used by the dashboard to display screenshots.

router.get("/:id/screenshots", (req: Request, res: Response) => {
  try {
    const reportId = req.params.id;
    
    // First, check if screenshots table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='screenshots'
    `).get();
    
    if (!tableCheck) {
      return res.json({ screenshots: [] });
    }
    
    // Get screenshots from the database
    const stmt = db.prepare(`
      SELECT route, label, taken_at, data_url
      FROM screenshots
      WHERE report_id = ?
      ORDER BY taken_at ASC
    `);
    const dbScreenshots = stmt.all(reportId) as any[];
    
    if (dbScreenshots.length === 0) {
      // Fallback: try to extract from runtime_json
      const report = db.prepare(`
        SELECT runtime_json FROM reports WHERE id = ?
      `).get(reportId) as any;

      if (report) {
        const runtime = JSON.parse(report.runtime_json || '{}');
        const screenshots: any[] = [];

        for (const [routeKey, routeData] of Object.entries(runtime)) {
          const route = routeData as any;
          if (route.screenshots && Array.isArray(route.screenshots)) {
            for (const screenshot of route.screenshots) {
              if (screenshot.dataUrl && screenshot.dataUrl.startsWith('/screenshots/')) {
                const filename = screenshot.dataUrl.replace('/screenshots/', '');
                const filePath = path.join(screenshotsDir, filename);
                
                if (fs.existsSync(filePath)) {
                  try {
                    const imageBuffer = fs.readFileSync(filePath);
                    const base64Image = imageBuffer.toString('base64');
                    
                    screenshots.push({
                      route: routeKey,
                      label: screenshot.label || 'screenshot',
                      taken_at: screenshot.takenAt || 0,
                      data_url: `data:image/png;base64,${base64Image}`,
                    });
                  } catch (err) {
                    console.warn(`Could not read screenshot ${filename}: ${err}`);
                  }
                }
              } else if (screenshot.dataUrl && screenshot.dataUrl.startsWith('data:image')) {
                screenshots.push({
                  route: routeKey,
                  label: screenshot.label || 'screenshot',
                  taken_at: screenshot.takenAt || 0,
                  data_url: screenshot.dataUrl,
                });
              }
            }
          }
        }
        return res.json({ screenshots });
      }
    }
    
    // Return screenshots from database
    const screenshots = dbScreenshots.map((s: any) => ({
      route: s.route,
      label: s.label,
      taken_at: s.taken_at,
      data_url: s.data_url,
    }));
    
    res.json({ screenshots });
  } catch (err: any) {
    console.error("GET /:id/screenshots error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/reports/upload ──────────────────────────────────
// Receives a FinalReport from the CLI, strips screenshots to disk,
// and stores the three JSON blobs in separate columns.

router.post(
  "/upload",
  requireApiKey as RequestHandler,
  (req: Request, res: Response) => {
    try {
      const body = req.body;

      // ── Validate required top-level fields ──────────────────
      if (
        !body ||
        !body.projectName ||
        !body.analyzedAt ||
        body.performanceScore === undefined ||
        !body.static ||
        !body.runtime ||
        !body.suggestions
      ) {
        res.status(400).json({
          error: "Invalid report",
          missing: getMissingFields(body),
        });
        return;
      }

      // ── Extract grade from static report ────────────────────
      const grade: string = body.static?.grade ?? "N/A";

      // ── Strip screenshots from runtime, save as .png files ──
      const { cleanedRuntime, pendingScreenshots } = extractScreenshots(body.runtime);

      // ── Insert the row ───────────────────────────────────────
      const stmt = db.prepare(`
        INSERT INTO reports
          (project, score, grade, analyzed_at, static_json, runtime_json, suggestions)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        body.projectName,
        body.performanceScore,
        grade,
        body.analyzedAt,
        JSON.stringify(body.static),
        JSON.stringify(cleanedRuntime),
        JSON.stringify(body.suggestions),
      ) as any;

      const reportId: number = result.lastInsertRowid;

      // ── Save screenshots with final filenames ────────────────
      const savedScreenshots = saveScreenshots(reportId, pendingScreenshots);

      // ── Patch runtime_json with final screenshot paths ───────
      if (savedScreenshots.length > 0) {
        const patchedRuntime = patchScreenshotPaths(
          cleanedRuntime,
          savedScreenshots,
        );
        db.prepare(
          "UPDATE reports SET runtime_json = ? WHERE id = ?"
        ).run(JSON.stringify(patchedRuntime), reportId);
      }

      res.status(201).json({
        message: "Report saved successfully",
        id: reportId,
        screenshots: savedScreenshots.length,
      });
    } catch (err: any) {
      console.error("POST /upload error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET /api/reports/:id ─────────────────────────────────────
// Full report for one run — parses all three JSON columns back
// to objects and returns a unified response.

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
      static: JSON.parse(row.static_json),
      runtime: JSON.parse(row.runtime_json),
      suggestions: JSON.parse(row.suggestions),
    });
  } catch (err: any) {
    console.error("GET /:id error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getMissingFields(body: any): string[] {
  const required = ["projectName", "analyzedAt", "performanceScore", "static", "runtime", "suggestions"];
  return required.filter(f => body?.[f] === undefined || body?.[f] === null);
}

interface PendingScreenshot {
  routeKey: string;
  label: string;
  buffer: Buffer;
  tempPath: string;
}

/**
 * Walk the runtime map, strip every screenshot.dataUrl,
 * and collect them as Buffers ready to write to disk.
 */
function extractScreenshots(
  runtime: Record<string, any>,
): { cleanedRuntime: Record<string, any>; pendingScreenshots: PendingScreenshot[] } {
  const pending: PendingScreenshot[] = [];
  const cleaned: Record<string, any> = {};

  for (const [routeKey, routeData] of Object.entries(runtime)) {
    const routeClone = { ...routeData };

    if (Array.isArray(routeClone.screenshots)) {
      routeClone.screenshots = routeClone.screenshots.map((shot: any) => {
        // Check if it's a base64 data URL
        if (shot.dataUrl && shot.dataUrl.startsWith("data:image/png;base64,")) {
          const base64 = shot.dataUrl.replace("data:image/png;base64,", "");
          const buffer = Buffer.from(base64, "base64");

          const safeRoute = routeKey.replace(/[/:]/g, "-").replace(/^-+/, "");
          const safeLabel = shot.label.replace(/[^a-z0-9]/gi, "-");
          const tempPath = `__PENDING__${safeRoute}__${safeLabel}`;

          pending.push({ routeKey, label: shot.label, buffer, tempPath });

          return { ...shot, dataUrl: tempPath };
        } else if (shot.dataUrl && shot.dataUrl.startsWith('/screenshots/')) {
          // Already a path - keep it
          return shot;
        } else {
          // No valid dataUrl - keep as is or set to null
          return { ...shot, dataUrl: null };
        }
      });
    }

    cleaned[routeKey] = routeClone;
  }

  return { cleanedRuntime: cleaned, pendingScreenshots: pending };
}

interface SavedScreenshot {
  routeKey: string;
  label: string;
  tempPath: string;
  filePath: string;
}

/**
 * Write each screenshot buffer to data/screenshots/<reportId>-<route>-<label>.png
 */
function saveScreenshots(
  reportId: number,
  pending: PendingScreenshot[],
): SavedScreenshot[] {
  const saved: SavedScreenshot[] = [];

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (const shot of pending) {
    const safeRoute = shot.routeKey.replace(/[/:]/g, "-").replace(/^-+/, "");
    const safeLabel = shot.label.replace(/[^a-z0-9]/gi, "-");
    const filename = `${reportId}-${safeRoute}-${safeLabel}.png`;
    const fullPath = path.join(screenshotsDir, filename);

    try {
      fs.writeFileSync(fullPath, shot.buffer);
      saved.push({
        routeKey: shot.routeKey,
        label: shot.label,
        tempPath: shot.tempPath,
        filePath: `/screenshots/${filename}`,
      });
    } catch (err: any) {
      console.warn(`Could not save screenshot ${filename}: ${err.message}`);
    }
  }

  return saved;
}

/**
 * Replace the __PENDING__ markers in runtime_json with
 * the final /screenshots/<file> URL paths.
 */
function patchScreenshotPaths(
  runtime: Record<string, any>,
  saved: SavedScreenshot[],
): Record<string, any> {
  const lookup: Record<string, string> = {};
  for (const s of saved) lookup[s.tempPath] = s.filePath;

  const patched: Record<string, any> = {};

  for (const [routeKey, routeData] of Object.entries(runtime)) {
    const routeClone = { ...routeData };

    if (Array.isArray(routeClone.screenshots)) {
      routeClone.screenshots = routeClone.screenshots.map((shot: any) => {
        if (shot.dataUrl && lookup[shot.dataUrl]) {
          return { ...shot, dataUrl: lookup[shot.dataUrl] };
        }
        return shot;
      });
    }

    patched[routeKey] = routeClone;
  }

  return patched;
}